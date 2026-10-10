# SnapShare Photo App Scaling Plan

## 1. Introduction

SnapShare is a photo-sharing application where users upload photos and scroll through a feed containing photos from people they follow. As the number of users increases, the system must handle photo uploads, feed requests, image storage, and thumbnail generation efficiently.

The goal of this scaling plan is to design an architecture that supports high traffic, stores photos reliably, and provides a fast experience for users.

## 2. Assumptions

The following assumptions are used for the calculations:

- Registered users: 10,000,000.
- Daily active users: 10% of registered users.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each thumbnail size: 50 KB.
- A year contains 365 days.
- Average traffic is calculated over 86,400 seconds per day.
- Peak traffic is estimated at five times the average traffic.
- Every uploaded photo generates one thumbnail.
- All original photos and thumbnails are retained for one year, with no deletion or compression beyond the stated sizes.
- The storage estimates exclude database backups, replication overhead, logs, and other application data.

## 3. Traffic and Storage Calculations

### 3.1 Daily Active Users

Daily active users are 10% of the 10 million registered users.

Daily active users = 10,000,000 × 10%

**Daily active users = 1,000,000 users.**

### 3.2 Photo Uploads Per Second

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1

Daily uploads = 1,000,000 photos.

Average uploads per second = 1,000,000 ÷ 86,400

**Average uploads per second ≈ 11.57 photos.**

Peak uploads per second = 11.57 × 5

**Estimated peak uploads per second ≈ 57.87 photos.**

### 3.3 Feed Views Per Second

Each daily active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50

Daily feed views = 50,000,000 feed page requests.

Average feed views per second = 50,000,000 ÷ 86,400

**Average feed views per second ≈ 578.70 requests.**

Peak feed views per second = 578.70 × 5

**Estimated peak feed views per second ≈ 2,893.52 requests.**

These calculations count feed page requests, not individual photos displayed or image downloads.

### 3.4 Photo Storage Per Year

Each original photo occupies 2 MB, and each thumbnail occupies 50 KB.

Assuming decimal storage units:

- Original photo storage per day = 1,000,000 × 2 MB = 2,000,000 MB = 2 TB.
- Thumbnail storage per day = 1,000,000 × 50 KB = 50,000,000 KB = 50 GB.
- Total image storage per day = 2 TB + 50 GB = 2.05 TB.

Original photo storage per year:

2 TB × 365 = **730 TB**.

Thumbnail storage per year:

50 GB × 365 = **18.25 TB**.

Total new image storage per year:

730 TB + 18.25 TB = **748.25 TB per year**.

Therefore, SnapShare needs approximately **748.25 TB of additional image storage each year**, before accounting for backups, replicas, and other overhead. The estimate assumes every active user uploads one photo every day throughout the year.

## 4. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is primarily a **read-heavy system** because users view 50 feed pages per day but upload only one photo per day.

Daily feed views = 50,000,000 requests.

Daily photo uploads = 1,000,000 photos.

The ratio is 50 feed page requests for every photo upload. Although each upload also creates storage and background-processing work, feed requests greatly outnumber upload requests.

This means the architecture should optimize feed delivery, database reads, caching, and image delivery. A cache and database read replica can reduce pressure on the main database, while a Content Delivery Network (CDN) can serve frequently requested images from locations closer to users.

## 5. Why Photos Should Not Be Stored Inside the Database

Original photos and thumbnails should be stored in object storage rather than directly inside database rows.

Storing large image files in the database would increase database size, make backups and restores heavier, and consume resources that should be used for structured data and queries. It would also make image delivery and independent storage scaling more difficult.

Instead, object storage should hold the original images and thumbnails, while the database stores metadata such as photo ID, owner ID, caption, upload time, object-storage key, and thumbnail key. This separation allows image storage to scale independently from user accounts, relationships, and feed metadata.

## 6. Proposed Architecture Diagram

```text
                       +------------------+
                       |      Users       |
                       | Mobile / Browser |
                       +--------+---------+
                                |
                                v
                       +------------------+
                       |       CDN        |
                       | Cached images    |
                       +--------+---------+
                                |
                     Feed/API requests
                                |
                                v
                       +------------------+
                       |  Load Balancer   |
                       +--------+---------+
                                |
                  +-------------+-------------+
                  |             |             |
                  v             v             v
             +---------+   +---------+   +---------+
             | App     |   | App     |   | App     |
             | Server  |   | Server  |   | Server  |
             +----+----+   +----+----+   +----+----+
                  |             |             |
                  +-------------+-------------+
                                |
                     +----------+----------+
                     |                     |
                     v                     v
              +-------------+       +-------------+
              |    Cache    |       |   Primary   |
              | Feed /      |       |  Database   |
              | Metadata    |       +------+------+
              +-------------+              |
                                            | Replication
                                            v
                                     +-------------+
                                     | Read Replica|
                                     +-------------+

Photo upload and thumbnail processing:

  User
   |
   v
  Load Balancer
   |
   v
  App Server ---------> Object Storage
   |                     Original photo
   |                     Thumbnail
   |
   v
  Message Queue
   |
   v
  Thumbnail Worker
   |
   +-------------------> Object Storage
   |                      Generated thumbnail
   |
   +-------------------> Primary Database
                          Thumbnail metadata/status

  CDN serves original photos and thumbnails from object storage.
```

The diagram separates the main request-handling path from background thumbnail processing. In a production implementation, the application can issue secure upload URLs so clients upload large files directly to object storage without sending the entire image through an application server.

## 7. Components and the Problems They Solve

1. **CDN:** Delivers cached photos and thumbnails from locations closer to users, reducing latency and origin-server traffic.
2. **Load balancer:** Distributes incoming API requests across healthy application servers to avoid overloading one server.
3. **Application servers:** Handle authentication, photo metadata, follow relationships, upload authorization, feed generation, and other business logic.
4. **Cache:** Stores frequently accessed feed data and metadata temporarily to reduce repeated database queries and improve response times.
5. **Primary database:** Stores structured information such as users, follows, photo metadata, captions, and upload status, while handling writes.
6. **Database read replica:** Serves suitable read queries to reduce load on the primary database and improve read capacity.
7. **Object storage:** Stores original photos and thumbnails durably and scales independently of the relational database.
8. **Message queue:** Holds thumbnail-generation jobs until workers can process them, helping absorb traffic spikes and separating uploads from slower image processing.
9. **Thumbnail worker:** Processes queued jobs to resize images, create thumbnails, and update their storage keys and processing status in the database.

## 8. Step-by-Step Photo Upload Flow

1. **User selects a photo:** The user chooses an image and submits it through the SnapShare application.
2. **Request reaches the load balancer:** The load balancer forwards the API request to a healthy application server.
3. **Application validates the request:** The server checks authentication, upload permissions, file type, file size, and applicable limits.
4. **Upload destination is prepared:** The application creates a photo record with a pending status and generates a secure, short-lived upload URL or upload authorization.
5. **Original photo is uploaded:** The client uploads the original image directly to object storage using the authorized destination. This avoids routing large file contents through the application server.
6. **Upload is confirmed:** The application verifies that the upload completed and that the stored object is valid. The photo metadata and processing status are updated in the database.
7. **Thumbnail job is queued:** The application publishes a job containing the photo ID and object-storage key to the message queue.
8. **Worker retrieves the job:** A thumbnail worker consumes the job and downloads or reads the original photo from object storage.
9. **Thumbnail is generated:** The worker resizes the original image, encodes a smaller thumbnail, and uploads it to object storage.
10. **Metadata is updated:** The worker records the thumbnail key and marks thumbnail processing as complete. If processing fails, the job can be retried, with a limit and a dead-letter queue for repeated failures.
11. **Photo becomes available:** Once the original upload and required metadata are ready, the photo can appear in the user's feed according to the application's publishing rules. The thumbnail can be used once processing completes.
12. **Photo is delivered to viewers:** When followers scroll their feeds, application servers return feed metadata and image URLs. The CDN serves cached images and fetches uncached images from object storage.

## 9. Scaling and Reliability Considerations

- **Horizontal scaling:** Add application servers when API traffic increases, instead of depending on one increasingly powerful server.
- **Cache strategy:** Cache popular feed metadata and frequently accessed images, and invalidate or refresh affected entries when necessary.
- **Database scaling:** Use a primary database for writes and a read replica for suitable reads, while monitoring replication lag.
- **Asynchronous processing:** Add thumbnail workers when the queue grows, and monitor queue length, processing latency, and failed jobs.
- **Storage lifecycle:** Monitor annual storage growth and consider lifecycle policies, compression, or archival tiers where appropriate.
- **Observability:** Track request latency, error rates, upload failures, cache hit rates, database performance, and queue delays.

## 10. Trade-Offs

### Trade-Off 1: Caching Versus Data Freshness

Caching improves feed response times and reduces database load, but cached information can become outdated. SnapShare should use suitable expiration times and targeted cache invalidation so that important updates, such as new photos or changed privacy settings, are reflected promptly.

### Trade-Off 2: Asynchronous Thumbnail Processing Versus Immediate Availability

Using a queue makes uploads faster because the user does not need to wait for thumbnail generation. However, thumbnails may not be available immediately, and queue failures or worker delays can postpone processing. SnapShare should show a processing state, retry temporary failures, and monitor queue health.

### Trade-Off 3: Database Read Replicas Versus Strongly Consistent Reads

A read replica increases read capacity, but replication is not always instantaneous. Recently uploaded photos or updated metadata may not immediately appear in queries served by the replica. SnapShare can route critical reads to the primary database or temporarily use primary reads after important writes.

### Trade-Off 4: Direct Object Storage Uploads Versus More Complex Upload Management

Direct uploads reduce application-server bandwidth and improve scalability. However, they require secure upload URLs, validation, expiration rules, and cleanup of incomplete uploads. SnapShare must also verify successful uploads before publishing a photo.

## 11. Conclusion

SnapShare should use a horizontally scalable application tier, a CDN, caching, a primary database with a read replica, object storage, and a queue-based thumbnail-processing system.

With one million daily active users, the initial estimates are approximately 11.57 average photo uploads per second, 578.70 average feed page requests per second, and 748.25 TB of new original-photo and thumbnail storage per year. Because feed requests outnumber uploads by approximately 50 to 1, the design should prioritize fast reads and efficient image delivery while ensuring that uploads and thumbnail jobs remain reliable as the application grows.