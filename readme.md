# Bookstore API Documentation

## Overview
This API allows you to interact with a bookstore database. It supports CRUD (Create, Read, Update, Delete) operations for books.

## Base URL
```
https://kxc-mongo-book-api.onrender.com/api
```

## Common HTTP Status Codes
- `200` OK: The request was successful.
- `201` Created: The resource was successfully created.
- `400` Bad Request: The request was invalid or cannot be served.
- `500` Internal Server Error: The server encountered an unexpected condition.

## Endpoints

### GET /books

Retrieves a list of books from the bookstore.

#### Request
```
GET /api/books
```

#### Response
- `200 OK` on success

```json
[
    {
        "_id": "507f191e810c19729de860ea",
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "year": 1925
    },
    {
        "_id": "507f191e810c19729de860eb",
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "year": 1960
    }
]
```

### POST /books

Creates a new book in the bookstore.

#### Request
```
POST /api/books
```

##### Body
```json
{
    "title": "Moby-Dick",
    "author": "Herman Melville",
    "year": 1851
}
```

#### Response
- `201 Created` on success
- `400 Bad Request` if title, author or year is missing or invalid

##### Body
```json
{
    "message": "Book created successfully",
    "book": {
        "title": "Moby-Dick",
        "author": "Herman Melville",
        "year": 1851
    }
}
```

### PUT /books/:id

Updates an existing book in the bookstore by ID. The book must have a valid title, author, and year.

#### Request
```
PUT /api/books/:id
```

##### Parameters
- `id` (required): The ID of the book you want to update.

##### Body
```json
{
    "title": "Moby-Dick Updated",
    "author": "Herman Melville",
    "year": 1851
}
```

#### Validation

- The `title` field is required and must be a string.
- The `author` field is required and must be a string.
- The `year` field is required, must be a positive integer, and not equal to 0.

If validation fails, a `400 Bad Request` status code is returned with a message indicating which field failed validation.

#### Response
- `200 OK` on success
- `400 Bad Request` if title, author or year is missing or invalid

##### Body
```json
{
    "message": "Book updated",
    "book": {
        "title": "Moby-Dick Updated",
        "author": "Herman Melville",
        "year": 1851
    }
}
```

#### Example Error Response

```json
{
    "message": "Year is required and should be a positive integer"
}
```
### DELETE /books/:id

Deletes a book from the bookstore by ID.

#### Request
```
DELETE /api/books/:id
```

##### Parameters
- `id` (required): The ID of the book you want to delete.

#### Response
- `200 OK` on success

##### Body
```json
{
    "message": "Book deleted"
}
```

## Error Responses

Error responses typically include a `message` field describing the error.

Example:

```json
{
    "message": "Title is required and should be a string"
}
```