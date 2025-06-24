const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-256-bit-secret';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

let db;

// Middleware to verify access token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.use(cors());
app.use(express.json());

// Connect to MongoDB
async function connectDB() {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true
    });
    db = client.db("bookstore");
    console.log('Connected to MongoDB');

  } catch (err) {
    console.error(err);
  }
}

async function main() {
  connectDB();

  // Auth Routes
  app.post('/api/register', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      // Check if user exists
      const existingUser = await db.collection('users').findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = {
        username,
        password: hashedPassword,
        createdAt: new Date()
      };

      await db.collection('users').insertOne(newUser);

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error registering user' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find user
      const user = await db.collection('users').findOne({ username });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id, username: user.username },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );

      // Store refresh token in database
      await db.collection('refreshTokens').insertOne({
        token: refreshToken,
        userId: user._id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });

      res.json({ accessToken, refreshToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error logging in' });
    }
  });

  app.post('/api/token/invalidate', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: 'Token is required' });

      // Delete the refresh token from database
      const result = await db.collection('refreshTokens').deleteOne({ token });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Token not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error invalidating token' });
    }
  });

  app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(req.user.userId) },
        { projection: { password: 0 } } // Exclude password from response
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching profile' });
    }
  });

  // Book Routes
  app.get('/api/books', async (req, res) => {
    try {
      const books = await db.collection('books').find().toArray();
      res.json(books);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  app.post('/api/books', async (req, res) => {
    try {
      const { title, author, year } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'Title is required and should be a string' });
      }

      if (!author || typeof author !== 'string') {
        return res.status(400).json({ message: 'Author is required and should be a string' });
      }

      if (!year || typeof year !== 'number' || year <= 0 || !Number.isInteger(year)) {
        return res.status(400).json({ message: 'Year is required and should be a positive integer' });
      }

      const newBook = { title, author, year };
      const result = await db.collection('books').insertOne(newBook);

      res.status(201).json({ message: 'Book created successfully', book: newBook });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  app.put('/api/books/:id', async (req, res) => {
    try {
      const { title, author, year } = req.body;
      const id = req.params.id;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: 'Title is required and should be a string' });
      }

      if (!author || typeof author !== 'string') {
        return res.status(400).json({ message: 'Author is required and should be a string' });
      }

      if (!year || typeof year !== 'number' || year <= 0 || !Number.isInteger(year)) {
        return res.status(400).json({ message: 'Year is required and should be a positive integer' });
      }

      const book = { title, author, year };
      const result = await db.collection('books').updateOne({ _id: new ObjectId(id) }, { $set: book });

      res.status(200).json({ message: 'Book updated', book });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  app.delete('/api/books/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await db.collection('books').deleteOne({ _id: new ObjectId(id) });
      res.json({ message: "Book deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
}

main();

const server = app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

// Export both app and server for testing
module.exports = { app, server };