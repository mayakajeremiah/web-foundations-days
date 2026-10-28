# TicketHub — Design Document (Day 8 Capstone)

A ticket-selling website for concerts and events.

Key facts used for this design:
- 2 million registered users
- Normal day: 50,000 visitors, each viewing 10 pages; 5,000 tickets sold
- Big sale: 200,000 people try to buy 20,000 seats within the first 10 minutes

---

## 1. Requirements

### Functional requirements

1. **Accounts** — users can register, log in, and manage a profile; purchase history is tied to the account.
2. **Browse events** — visitors can list upcoming events by city, date, artist, and venue, and view event details (venue, date, price ranges, seat map).
3. **View seats** — for a chosen event, show a seat map with availability per seat/section.
4. **Hold seats** — a user can select seats and place a short hold on them while they pay; other users must not be able to buy held seats.
5. **Pay** — a user with a live hold can pay; payment is processed by an external payment provider.
6. **View tickets** — after payment, the user can see their tickets (QR codes) in their account and download or receive them by email.
7. **Release expires holds** — unpaid holds are automatically released so seats return to the pool.
8. **Handle refunds/cancellations** (v2) — cancelled orders return seats to the pool.

### Non-functional requirements

**Correctness (highest priority).** The system must never sell the same seat twice, even if two people click "buy" at the same millisecond. A lost sale is recoverable; a double sale is a refund, a support ticket, and a damaged reputation. Every seat transition (available → held → sold) happens inside a database transaction guarded by constraints.

**Fairness.** When 200,000 people want 20,000 seats, whoever gets in should get a fair shot, not just whoever hammers refresh fastest. Bots must not beat humans: rate limiting, a waiting room, and hold limits per account.

**Speed.**
- Normal browsing: page loads under 300 ms p95; the site should feel instant for the common read path.
- During a big sale: the buy path must stay under 1 s p95 even under 100× normal load; it is acceptable (and expected) for *reading* the seat map to be slightly stale during the peak, as long as *selling* stays correct.

**Availability.** The site stays up during the big sale (this is the revenue event). Read-heavy components scale horizontally; a single slow component must degrade gracefully (cached seat maps, queued payments) instead of falling over.

**Scalability.** Handle ~100× the normal traffic for short bursts without re-architecture — bursts are predictable (on-sale dates are announced), so capacity can be pre-scaled.

**Security.** Passwords hashed, payment card data never stored on our servers (provider tokenization), per-account hold limits to stop scalper bots.

---

## 2. Estimates

### Normal traffic

| Metric | Calculation | Result |
|---|---|---|
| Page views | 50,000 visitors × 10 pages | 500,000 views/day |
| Average read rate | 500,000 ÷ 86,400 s | ~6 reads/sec |
| Peak read rate (≈10× average, evening on-sale announcements) | | ~60 reads/sec |
| Sales | 5,000 tickets/day ÷ 86,400 s | ~0.06 sales/sec (~4/min) |
| Peak write rate | | a few writes/sec |

Normal traffic is tiny: tens of reads per second and almost no writes. One modest server could handle it — the design must survive the peak, not the average.

### Big-sale peak (20,000 seats on sale, 200,000 buyers)

| Metric | Calculation | Result |
|---|---|---|
| Buyers arriving | 200,000 ÷ 600 s | ~333 buyers/sec sustained for 10 minutes |
| Seat-map views | 200,000 buyers × ~20 views each (browsing + refresh) = 4M views ÷ 600 s | ~6,700 reads/sec |
| Hold attempts | 200,000 buyers ÷ 600 s | ~333 hold attempts/sec |
| Successful orders | 20,000 seats ÷ 600 s | ~33 orders/sec (~2,000/min) |
| Polling amplification | buyers who keep a seat map open and refresh every 2–5 s | up to 40,000 reads/sec if uncontrolled |

### Comparison

- **Reads: ~100–1,000× normal.** 60 reads/sec normally vs thousands to tens of thousands during the sale, dominated by seat-map views and refresh-polling. This is the component to cache, queue, and serve from CDN/Redis.
- **Writes: ~500× normal.** 333 hold attempts and 33 orders per second vs a handful per day's average. Still small in absolute terms — a single well-indexed relational database can absorb it — so correctness can stay on one strongly-consistent primary rather than distributed sharding.
- **Ratio matters more than totals:** reads outnumber successful writes ~200:1. Every design decision (cache, queue, replica reads) exploits this: make reading cheap and nearly-free at the edge, spend the expensive consistency budget only on the ~20,000 real transactions.

---

## 3. API design

REST, JSON, under `/api/v1`, session token or OAuth bearer auth where noted.

| # | Endpoint | Method | Purpose |
|---|---|---|---|
| 1 | `/api/v1/events?city=&date=&q=` | GET | Browse/search events (public, CDN-cacheable). Returns paginated event summaries. |
| 2 | `/api/v1/events/{id}` | GET | Event details: venue, date, price ranges, seat-map availability summary. Public, cached ~10 s. |
| 3 | `/api/v1/events/{id}/seats` | GET | Seat map with per-seat state (`available` / `held` / `sold`). Served from cache during peaks. |
| 4 | `/api/v1/events/{id}/holds` | POST | Auth. Body: `{seat_ids: [...]}`. Atomically holds the seats for 5 minutes; returns `{hold_token, expires_at}` or `409 Conflict` if any seat is no longer available. Rate-limited, max 6 active holds per user. |
| 5 | `/api/v1/orders` | POST | Auth. Body: `{hold_token, payment_token}`. Converts a live hold into an order: charges payment, marks seats `sold`, issues tickets. Idempotent via `Idempotency-Key` header so a retried payment never double-charges. |
| 6 | `/api/v1/orders/{id}/tickets` | GET | Auth. The buyer's tickets for an order (QR codes). |
| 7 | `/api/v1/holds/{token}` | DELETE | Auth. Release a hold early (user backs out). |

Status codes: `201` created, `409 Conflict` when seats were taken between the seat-map view and the hold attempt (client shows the new map), `410 Gone` for an expired hold, `429 Too Many Requests` for rate-limit violations.

---

## 4. Data model

```
users 1 ──── N orders 1 ──── N tickets N ──── 1 seats N ──── 1 events
```

Four core tables:

```sql
users (
  id            UUID PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)

events (
  id          UUID PRIMARY KEY,
  venue_id    UUID NOT NULL REFERENCES venues(id),
  name        TEXT NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,
  on_sale_at  TIMESTAMPTZ,          -- gates when holds are allowed
  status      TEXT NOT NULL DEFAULT 'scheduled'
)

seats (
  id          UUID PRIMARY KEY,
  event_id    UUID NOT NULL REFERENCES events(id),
  section     TEXT NOT NULL,
  row         TEXT NOT NULL,
  number      INT  NOT NULL,
  state       TEXT NOT NULL DEFAULT 'available'
              CHECK (state IN ('available','held','sold')),
  held_until  TIMESTAMPTZ,          -- set only while held
  hold_token  UUID,                 -- set only while held
  order_id    UUID REFERENCES orders(id),  -- set only when sold
  UNIQUE (event_id, section, row, number),          -- no phantom seats
  UNIQUE (id, order_id)
);

-- The core correctness constraint: a seat can be sold at most once, ever.
CREATE UNIQUE INDEX one_sale_per_seat
  ON seats (id) WHERE state = 'sold';

orders (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id),
  event_id      UUID NOT NULL REFERENCES events(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','paid','failed','refunded')),
  total_cents   BIGINT NOT NULL,
  idempotency_key UUID UNIQUE NOT NULL,   -- safe payment retries
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)

tickets (
  id         UUID PRIMARY KEY,
  order_id   UUID NOT NULL REFERENCES orders(id),
  seat_id    UUID NOT NULL REFERENCES seats(id),
  qr_secret  TEXT NOT NULL UNIQUE,       -- for entry scanning
  issued_at  TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

Relationships: an **event** owns many **seats**; an **order** belongs to one **user** and one **event**; each **ticket** belongs to one order and claims exactly one **seat**; a seat that is `sold` points back at the order that bought it.

---

## 5. How double-booking is prevented

Two defenses working together: **transactional seat transitions** and **database constraints**.

### The hold transaction (the critical section)

`POST /events/{id}/holds` runs a single SQL statement inside a transaction:

```sql
UPDATE seats
SET state = 'held', hold_token = $1, held_until = now() + interval '5 minutes'
WHERE event_id = $2 AND id = ANY($3) AND state = 'available';
```

The `WHERE state = 'available'` is the whole trick. Row-level locks taken by the UPDATE serialize the two racing buyers: whichever transaction touches a seat second sees the seat no longer `available`, so its WHERE clause matches fewer rows. If `row_count <> seat_count` (even one seat was lost), the transaction rolls back and the API returns `409 Conflict` with a fresh seat map. There is no window in which two holds overlap, because only one row lock exists per seat at a time.

### The payment transaction

`POST /orders` re-checks ownership inside one transaction: verify `hold_token` matches and `held_until > now()`, then set the seats to `sold` with the new `order_id`, insert the `order` and `tickets`, and commit — seats, order, and tickets succeed or fail atomically. A stale or expired hold fails the check and releases the seats. The `idempotency_key` unique constraint means a network-retried payment returns the original order instead of charging twice.

### Constraints as the last line of defense

Even if application code were buggy, the database refuses to double-sell:

- the partial unique index `one_sale_per_seat` allows at most one row per seat with `state = 'sold'` — two paid orders for the same seat cannot both commit;
- the `state` CHECK constraint plus the `UNIQUE (id, order_id)` prevent impossible states like a sold seat with no order.

### Housekeeping

A background sweeper (plus lazy checks on read) releases holds past `held_until`, returning seats to the pool. Because expiry only transitions `held → available` — never touching sold seats — the unique index is never at risk.

---

## 6. Architecture

```
                        ┌────────────────────────┐
                        │  Waiting-room / queue  │
                        │ (admits buyers in      │
                        │  controlled batches    │
                        │  during big sales)     │
                        └───────────┬────────────┘
                                        │
Users ──► CDN ──► Load Balancer ──► Stateless API servers (N, autoscaled)
 (web +             │                    │
  mobile)           │                    ├─► Redis  (seat-map cache, sessions,
                    │                    │           rate limits, hold TTLs)
                    │                    ├─► Postgres primary  (holds, orders —
                    │                    │    the only writer; strong consistency)
                    │                    │        └─► read replicas (browse queries)
                    │                    └─► Message queue ──► Workers
                    │                          (payment calls, hold expiry,
                    │                           ticket/QR generation, emails)
                    └─► Payment provider (external, tokenized, webhook callbacks)
```

**How it survives the big sale:**

- **Waiting room.** When an event goes on sale, excess traffic is admitted in controlled batches instead of all 333 arrivals/sec hitting the buy path at once. Users see a fair, shuffled queue position — this is the fairness mechanism, not just load shedding.
- **Stateless API servers** behind a load balancer scale horizontally; more servers ≠ more correctness, because all seat truth lives in Postgres.
- **Redis caches the seat map** for a few seconds so the ~6,700 reads/sec (which would be tens of thousands with polling) hit memory, not the database. The cache is invalidated on state changes and deliberately allowed to be slightly stale — a held seat may briefly show available, but the hold transaction re-verifies, so staleness costs a `409 Conflict`, never a double sale.
- **Postgres primary** handles only the small write stream (~333 holds + ~33 orders per second) — well within one strongly-consistent node. Read replicas serve browse/search queries.
- **Async payments.** Payment authorization happens through a queue with webhooks; the API server is never blocked on the provider during the peak.
- **Pre-scale on schedule.** On-sale times are known, so capacity (API servers, DB connections, queue workers) is provisioned ahead of the event.

---

## 7. Trade-offs

**1. A waiting room + seat holds vs. pure optimistic buying (no holds, first successful payment wins).**
Holds add state, TTL sweeps, and a `409` UX step, and they cap throughput because seats lock for up to 5 minutes. But they give buyers a guaranteed checkout window and keep the correctness logic simple and provable (one UPDATE with a WHERE clause). A no-hold design is faster and stateless-ish, but during a 10:1 demand spike most payments would fail after the user already typed a card number — worse UX and more charge disputes. Correctness and fairness were chosen over raw throughput.

**2. One strongly-consistent primary vs. sharding the seats database.**
Sharding seats by event would spread the write load and survive primary failure, but transactions touching seats of one event are already only ~400 ops/sec — sharding adds cross-shard complexity, hot-spot risk (all buyers target one event anyway, so its shard is hot regardless), and much harder reasoning about the double-sale constraint. One primary with read replicas is simpler and has huge headroom; the cost is that the primary is a single point of failure (mitigated by automated failover), and replica reads can be a few seconds stale.

**3. Cached (slightly stale) seat maps vs. always-fresh seat maps.**
Caching risks a user selecting a seat that was just taken (a `409 Conflict`), but removes ~99% of peak read load from the database. Fresh-on-every-view would be truthful but push tens of thousands of reads/sec into Postgres and endanger the sale itself. Accepted the occasional conflict in exchange for stability.

---

## 8. What this design gets right under the numbers

Normal day (~60 reads/sec, ~0.06 writes/sec) is trivially served by the CDN, cache, and one small primary. The big sale's brutal ratio — 200,000 people racing for 20,000 seats — is absorbed by three deliberate layers: the waiting room flattens arrival, the cache flattens reads, and the tiny consistent write path (~33 orders/sec) keeps every seat sold exactly once.
