const express = require('express');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

const app = express();
const port = 3000;

let db;

app.use(cors());
app.use(express.json());

async function connectDB() {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI, { useUnifiedTopology: true });
    db = client.db("bookstore");
   
  } catch (err) {
    console.error(err);
  }
}

connectDB();

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

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
module.exports = app;