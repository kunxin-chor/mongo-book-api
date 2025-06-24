const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');

let app;
let server;
let connection;
let db;
let mongoServer;

beforeAll(async () => {
  // Set up test environment variables
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_ACCESS_EXPIRY = '15m';
  process.env.JWT_REFRESH_EXPIRY = '7d';
  process.env.PORT = 3001;
  
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  connection = await MongoClient.connect(uri, { useUnifiedTopology: true });
  db = connection.db('bookstore');
  
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
  // Clean up test data
  await db.collection('users').deleteMany({});
  await db.collection('refreshTokens').deleteMany({});
});

describe('Authentication API', () => {
  const testUser = {
    username: 'testuser',
    password: 'testpass123'
  };

  describe('POST /api/register', () => {
    test('should register a new user', async () => {
      const res = await request(app)
        .post('/api/register')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe('User registered successfully');

      // Verify user was created in database
      const user = await db.collection('users').findOne({ username: testUser.username });
      expect(user).not.toBeNull();
      expect(user.username).toBe(testUser.username);
    });

    test('should not register with existing username', async () => {
      // First registration
      await request(app).post('/api/register').send(testUser);
      
      // Second registration with same username
      const res = await request(app)
        .post('/api/register')
        .send(testUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Username already exists');
    });

    test('should require username and password', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Username and password are required');
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/api/register')
        .send(testUser);
    });

    test('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send(testUser);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });

    test('should not login with invalid password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/token/invalidate', () => {
    let refreshToken;

    beforeEach(async () => {
      // Register and login to get tokens
      await request(app).post('/api/register').send(testUser);
      const loginRes = await request(app).post('/api/login').send(testUser);
      refreshToken = loginRes.body.refreshToken;
    });

    test('should invalidate a refresh token', async () => {
      const res = await request(app)
        .post('/api/token/invalidate')
        .send({ token: refreshToken });

      expect(res.statusCode).toBe(204);

      // Verify token was removed from database
      const tokenInDb = await db.collection('refreshTokens').findOne({ token: refreshToken });
      expect(tokenInDb).toBeNull();
    });

    test('should return 404 for non-existent token', async () => {
      const res = await request(app)
        .post('/api/token/invalidate')
        .send({ token: 'non-existent-token' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/profile', () => {
    let accessToken;

    beforeEach(async () => {
      // Register and login to get access token
      await request(app).post('/api/register').send(testUser);
      const loginRes = await request(app).post('/api/login').send(testUser);
      accessToken = loginRes.body.accessToken;
    });

    test('should return user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.username).toBe(testUser.username);
      expect(res.body.password).toBeUndefined(); // Should not return password
    });

    test('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/profile');

      expect(res.statusCode).toBe(401);
    });
  });
});
