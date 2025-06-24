const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');

let app;
let server;
let connection;
let db;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  connection = await MongoClient.connect(uri, { useUnifiedTopology: true });
  db = connection.db('bookstore');

  // Set test environment variables
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_ACCESS_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';
  process.env.PORT = 3000;
  process.env.MONGO_URI = uri;
  
  // Initialize app and server
  const appModule = require('../index');
  app = appModule.app;
  server = appModule.server;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
  await connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await db.collection('books').deleteMany({});
});

describe('Books API', () => {

  test('GET /api/books should return empty array initially', async () => {
    const res = await request(app).get('/api/books');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST /api/books should create a new book', async () => {
    const newBook = { title: 'Test Book', author: 'Test Author', year: 2024 };
    const res = await request(app).post('/api/books').send(newBook);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Book created successfully');
    expect(res.body.book.title).toBe('Test Book');

    const bookInDb = await db.collection('books').findOne({ title: 'Test Book' });
    expect(bookInDb).not.toBeNull();
  });

  test('POST /api/books should fail with invalid input', async () => {
    const res = await request(app).post('/api/books').send({ title: 123 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Title is required and should be a string');
  });

  test('PUT /api/books/:id should update an existing book', async () => {
    const book = { title: 'Old Title', author: 'Old Author', year: 2022 };
    const { insertedId } = await db.collection('books').insertOne(book);

    const updatedBook = { title: 'New Title', author: 'New Author', year: 2025 };
    const res = await request(app).put(`/api/books/${insertedId}`).send(updatedBook);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Book updated');

    const bookInDb = await db.collection('books').findOne({ _id: insertedId });
    expect(bookInDb.title).toBe('New Title');
  });

  test('DELETE /api/books/:id should delete a book', async () => {
    const { insertedId } = await db.collection('books').insertOne({ title: 'To Delete', author: 'Someone', year: 2021 });

    const res = await request(app).delete(`/api/books/${insertedId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Book deleted');

    const bookInDb = await db.collection('books').findOne({ _id: insertedId });
    expect(bookInDb).toBeNull();
  });

});
