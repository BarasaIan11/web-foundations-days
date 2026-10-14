# Library Books API

This REST API manages the library's books resource. All request and response bodies use JSON.

## Endpoints

### List books

- **Method:** `GET`
- **Path:** `/books`
- **Description:** Returns all books in the library.
- **Success:** `200 OK`

### Get one book

- **Method:** `GET`
- **Path:** `/books/{id}`
- **Description:** Returns the book with the supplied ID.
- **Success:** `200 OK`

### Create a book

- **Method:** `POST`
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958,
    "isbn": "978-0-385-47454-2"
  }
  ```

- **Success:** `201 Created`

### Update a book

- **Method:** `PUT`
- **Path:** `/books/{id}`
- **Description:** Replaces the details of the book with the supplied ID.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958,
    "isbn": "978-0-385-47454-2"
  }
  ```

- **Success:** `200 OK`

### Delete a book

- **Method:** `DELETE`
- **Path:** `/books/{id}`
- **Description:** Removes the book with the supplied ID.
- **Success:** `204 No Content`

### List books by author

- **Method:** `GET`
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns only books written by the author in the `author` query parameter.
- **Success:** `200 OK`

## Error responses

- **`400 Bad Request`:** The request body for `POST /books` has no title or has an invalid published year.
- **`404 Not Found`:** A request such as `GET /books/9999` refers to a book that does not exist.
