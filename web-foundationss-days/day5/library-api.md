# Library Books REST API

This REST API manages books in a library system.

## 1. List Books

- **Method:** GET
- **Path:** `/api/books`
- **Description:** Returns all books.
- **Success status:** `200 OK`

### Example Request

```http
GET /api/books
```

## 2. Get One Book

- **Method:** GET
- **Path:** `/api/books/{id}`
- **Description:** Returns one book by its ID.
- **Success status:** `200 OK`

### Example Request

```http
GET /api/books/1
```

## 3. Create a Book

- **Method:** POST
- **Path:** `/api/books`
- **Description:** Creates a new book.
- **Success status:** `201 Created`

### Example Request Body

```json
{
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
}
```

## 4. Update a Book

- **Method:** PUT
- **Path:** `/api/books/{id}`
- **Description:** Updates an existing book by its ID.
- **Success status:** `200 OK`

### Example Request Body

```json
{
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
}
```

### Example Request

```http
PUT /api/books/1
```

## 5. Delete a Book

- **Method:** DELETE
- **Path:** `/api/books/{id}`
- **Description:** Deletes a book by its ID.
- **Success status:** `204 No Content`

### Example Request

```http
DELETE /api/books/1
```

## 6. List Books by Author

- **Method:** GET
- **Path:** `/api/books?author={author}`
- **Description:** Returns all books written by a specific author.
- **Success status:** `200 OK`

### Example Request

```http
GET /api/books?author=Chinua%20Achebe
```

# Error Codes

## 400 Bad Request

- **Meaning:** The request contains invalid or missing information.
- **Example:** A client tries to create a book without providing a required title.

### Example Request

```http
POST /api/books
```

### Request Body

```json
{
    "author": "Chinua Achebe",
    "year": 1958
}
```

### Response

```text
400 Bad Request
```

## 404 Not Found

- **Meaning:** The requested book or resource does not exist.
- **Example:** A client requests a book with an ID that does not exist.

### Example Request

```http
GET /api/books/9999
```

### Response

```text
404 Not Found
```