const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');

let app;
let server;
let connection;
let db;
let mongoServer;
let accessToken;


beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  connection = await MongoClient.connect(uri, { useUnifiedTopology: true });
  db = connection.db('bookstore-with-auth');

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

  test('POST /api/books should create a new book with user info if there is a token', async () => {
    const newBook = { title: 'Test Book', author: 'Test Author', year: 2024 };
    const testUser = {
      username: 'testuser',
      password: 'testpass123'
    };

    // Register user
    const response = await request(app).post('/api/register').send(testUser);
    expect(response.statusCode).toBe(201);
    
    // Get the user directly from the database to ensure we have the _id
    const user = await db.collection('users').findOne({ username: testUser.username });
    expect(user).not.toBeNull();
    expect(user._id).toBeDefined();

    // Login to get token
    const loginRes = await request(app).post('/api/login').send(testUser);
    accessToken = loginRes.body.accessToken;
    
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(newBook);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Book created successfully');
    expect(res.body.book.title).toBe('Test Book');
    
    // Verify response includes user info
    expect(res.body.book.addedBy).toBeDefined();
    expect(res.body.book.addedBy.userId).toBe(user._id.toString());
    expect(res.body.book.addedBy.username).toBe(testUser.username);
    expect(res.body.book.createdAt).toBeDefined();

    // Verify database record
    const bookInDb = await db.collection('books').findOne({ title: 'Test Book' });
    expect(bookInDb).not.toBeNull();
    expect(bookInDb.addedBy).toBeDefined();
    expect(bookInDb.addedBy.userId.toString()).toBe(user._id.toString());
    expect(bookInDb.addedBy.username).toBe(testUser.username);
    expect(bookInDb.createdAt).toBeInstanceOf(Date);
  });

  test('POST /api//books should fail without a token', async () => {
    const newBook = { title: 'Test Book', author: 'Test Author', year: 2024 };
    const res = await request(app).post('/api/books').send(newBook);
    expect(res.statusCode).toBe(401);
 
  });

  test('POST /api/books should fail with invalid input', async () => {
    const testUser = {
      username: 'testuser',
      password: 'testpass123'
    }

    await request(app).post('/api/register').send(testUser);
    const loginRes = await request(app).post('/api/login').send(testUser);
    accessToken = loginRes.body.accessToken;

    const res = await request(app).post('/api/books').set('Authorization', `Bearer ${accessToken}`).send({ title: 123 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Title is required and should be a string');
  });

  test('PUT /api/books/:id should update an existing book when authenticated', async () => {
    // First create a book
    const book = { title: 'Old Title', author: 'Old Author', year: 2022 };
    const { insertedId } = await db.collection('books').insertOne(book);

    // Register and login
    const testUser = { username: 'testuser', password: 'testpass123' };
    await request(app).post('/api/register').send(testUser);
    const loginRes = await request(app).post('/api/login').send(testUser);
    accessToken = loginRes.body.accessToken;

    const updatedBook = { title: 'New Title', author: 'New Author', year: 2025 };
    const res = await request(app)
      .put(`/api/books/${insertedId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updatedBook);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Book updated');

    const bookInDb = await db.collection('books').findOne({ _id: insertedId });
    expect(bookInDb.title).toBe('New Title');
  });

  test('PUT /api/books/:id should return 401 when not authenticated', async () => {
    const book = { title: 'Test Book', author: 'Test Author', year: 2022 };
    const { insertedId } = await db.collection('books').insertOne(book);
    
    const updatedBook = { title: 'New Title', author: 'New Author', year: 2025 };
    const res = await request(app)
      .put(`/api/books/${insertedId}`)
      .send(updatedBook);
      
    expect(res.statusCode).toBe(401);
  });

  test('DELETE /api/books/:id should delete a book when authenticated', async () => {
    // First create a book
    const book = { title: 'To Delete', author: 'Someone', year: 2021 };
    const { insertedId } = await db.collection('books').insertOne(book);

    // Register and login
    const testUser = { username: 'testuser', password: 'testpass123' };
    await request(app).post('/api/register').send(testUser);
    const loginRes = await request(app).post('/api/login').send(testUser);
    accessToken = loginRes.body.accessToken;

    const res = await request(app)
      .delete(`/api/books/${insertedId}`)
      .set('Authorization', `Bearer ${accessToken}`);
      
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Book deleted');

    const bookInDb = await db.collection('books').findOne({ _id: insertedId });
    expect(bookInDb).toBeNull();
  });

  test('DELETE /api/books/:id should return 401 when not authenticated', async () => {
    const book = { title: 'To Delete', author: 'Someone', year: 2021 };
    const { insertedId } = await db.collection('books').insertOne(book);
    
    const res = await request(app).delete(`/api/books/${insertedId}`);
    expect(res.statusCode).toBe(401);
  });

});
