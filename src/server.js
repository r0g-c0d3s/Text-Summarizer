const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Initialize the app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost/flashcards', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Models
const Flashcard = mongoose.model('Flashcard', {
  summary: String,
  createdAt: { type: Date, default: Date.now },
});

const Summary = mongoose.model('Summary', {
  text: String,
  createdAt: { type: Date, default: Date.now },
});

// Routes
app.post('/summaries', async (req, res) => {
  try {
    const { text } = req.body;
    const summary = new Summary({ text });
    await summary.save();
    res.status(201).json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Error saving summary' });
  }
});

app.get('/summaries', async (req, res) => {
  try {
    const summaries = await Summary.find();
    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summaries' });
  }
});

app.post('/flashcards', async (req, res) => {
  try {
    const { summary } = req.body;
    const flashcard = new Flashcard({ summary });
    await flashcard.save();
    res.status(201).json(flashcard);
  } catch (err) {
    res.status(500).json({ message: 'Error saving flashcard' });
  }
});

app.get('/flashcards', async (req, res) => {
  try {
    const flashcards = await Flashcard.find();
    res.json(flashcards);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching flashcards' });
  }
});

app.delete('/flashcards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Flashcard.findByIdAndDelete(id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: 'Error deleting flashcard' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
