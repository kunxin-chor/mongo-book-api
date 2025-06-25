# Bookstore API with Authentication

## Overview
This API provides a secure way to manage a bookstore database with user authentication. It supports user registration, login, and CRUD operations for books, with proper access control and user association.

## Base URL
```
https://kxc-mongo-book-api.onrender.com/api
```

## Authentication
All protected endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Common HTTP Status Codes
- `200` OK: The request was successful.
- `201` Created: The resource was successfully created.
- `400` Bad Request: The request was invalid or cannot be served.
- `401` Unauthorized: Authentication is required or failed.
- `403` Forbidden: The request is not allowed.
- `404` Not Found: The requested resource was not found.
- `500` Internal Server Error: The server encountered an unexpected condition.

---

## Authentication Endpoints

### POST /register
Register a new user.

#### Request
```
POST /api/register
```

##### Body
```json
{
    "username": "johndoe",
    "password": "securepassword123"
}
```

#### Response
- `201 Created` on success
- `400 Bad Request` if username or password is missing, or username already exists

##### Success Response
```json
{
    "message": "User registered successfully",
    "user": {
        "_id": "507f191e810c19729de860ea",
        "username": "johndoe",
        "createdAt": "2023-06-24T12:00:00.000Z"
    }
}
```

### POST /login
Authenticate a user and get access and refresh tokens.

#### Request
```
POST /api/login
```

##### Body
```json
{
    "username": "johndoe",
    "password": "securepassword123"
}
```

#### Response
- `200 OK` on success
- `401 Unauthorized` if credentials are invalid

##### Success Response
```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /profile
Get the authenticated user's profile and their added books.

#### Request
```
GET /api/profile
```

#### Headers
```
Authorization: Bearer <access_token>
```

#### Response
- `200 OK` on success
- `401 Unauthorized` if no valid token provided

##### Success Response
```json
{
    "_id": "507f191e810c19729de860ea",
    "username": "johndoe",
    "createdAt": "2023-06-24T12:00:00.000Z",
    "books": [
        {
            "_id": "607f1f77bcf86cd799439011",
            "title": "The Great Gatsby",
            "author": "F. Scott Fitzgerald",
            "year": 1925,
            "addedBy": {
                "userId": "507f191e810c19729de860ea",
                "username": "johndoe"
            },
            "createdAt": "2023-06-24T12:00:00.000Z"
        }
    ]
}
```

### POST /token/refresh
Refresh an expired access token using a refresh token.

#### Request
```
POST /api/token/refresh
```

##### Body
```json
{
    "token": "<refresh_token>"
}
```

#### Response
- `200 OK` on success
- `401 Unauthorized` if refresh token is invalid or expired

##### Success Response
```json
{
    "accessToken": "new-access-token-here"
}
```

### POST /token/invalidate
Invalidate a refresh token (logout).

#### Request
```
POST /api/token/invalidate
```

##### Body
```json
{
    "token": "<refresh_token>"
}
```

#### Response
- `204 No Content` on success
- `404 Not Found` if token was not found

---

## Book Endpoints

### GET /books
Get all books in the bookstore.

#### Request
```
GET /api/books
```

#### Response
- `200 OK` on success

```json
[
    {
        "_id": "607f1f77bcf86cd799439011",
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "year": 1925,
        "addedBy": {
            "userId": "507f191e810c19729de860ea",
            "username": "johndoe"
        },
        "createdAt": "2023-06-24T12:00:00.000Z"
    },
    {
        "_id": "607f1f77bcf86cd799439012",
        "title": "To Kill a Mockingbird",
        "author": "Harper Lee",
        "year": 1960,
        "addedBy": {
            "userId": "507f191e810c19729de860eb",
            "username": "janedoe"
        },
        "createdAt": "2023-06-24T12:05:00.000Z"
    }
]
```

### POST /books
Add a new book to the bookstore. **Requires authentication**

#### Request
```
POST /api/books
```

#### Headers
```
Authorization: Bearer <access_token>
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
- `401 Unauthorized` if no valid token provided

##### Success Response
```json
{
    "message": "Book created successfully",
    "book": {
        "_id": "607f1f77bcf86cd799439013",
        "title": "Moby-Dick",
        "author": "Herman Melville",
        "year": 1851,
        "addedBy": {
            "userId": "507f191e810c19729de860ea",
            "username": "johndoe"
        },
        "createdAt": "2023-06-24T12:10:00.000Z"
    }
}
```

### PUT /books/:id
Update an existing book. **Requires authentication**

#### Request
```
PUT /api/books/:id
```

#### Headers
```
Authorization: Bearer <access_token>
```

##### Parameters
- `id` (required): The ID of the book to update

##### Body
```json
{
    "title": "Moby-Dick; or, The Whale",
    "author": "Herman Melville",
    "year": 1851
}
```

#### Validation
- `title`: Required, must be a non-empty string
- `author`: Required, must be a non-empty string
- `year`: Required, must be a positive integer

#### Response
- `200 OK` on success
- `400 Bad Request` if validation fails
- `401 Unauthorized` if no valid token provided
- `404 Not Found` if book doesn't exist

##### Success Response
```json
{
    "message": "Book updated",
    "book": {
        "_id": "607f1f77bcf86cd799439013",
        "title": "Moby-Dick; or, The Whale",
        "author": "Herman Melville",
        "year": 1851,
        "addedBy": {
            "userId": "507f191e810c19729de860ea",
            "username": "johndoe"
        },
        "createdAt": "2023-06-24T12:10:00.000Z"
    }
}
```

### DELETE /books/:id
Delete a book. **Requires authentication**

#### Request
```
DELETE /api/books/:id
```

#### Headers
```
Authorization: Bearer <access_token>
```

##### Parameters
- `id` (required): The ID of the book to delete

#### Response
- `200 OK` on success
- `401 Unauthorized` if no valid token provided
- `404 Not Found` if book doesn't exist

##### Success Response
```json
{
    "message": "Book deleted"
}
```

## Error Responses

All error responses include a `message` field describing the error.

### Examples

#### 400 Bad Request (Validation Error)
```json
{
    "message": "Title is required and should be a string"
}
```

#### 401 Unauthorized
```json
{
    "message": "Authentication required"
}
```

#### 404 Not Found
```json
{
    "message": "Book not found"
}
```

#### 500 Internal Server Error
```json
{
    "message": "An unexpected error occurred"
}
```

## Environment Variables

```env
PORT=3000
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
MONGO_URI=mongodb://localhost:27017
MONGO_DBNAME=bookstore-with-auth
```

## Running the Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with the required environment variables

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Start production server:
   ```bash
   npm start
   ```