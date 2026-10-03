require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// URL Schema
const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true,
    unique: true
  }
});

const Url = mongoose.model('Url', urlSchema);

// POST: Create short URL
app.post('/api/shorturl', async function (req, res) {
  const originalUrl = req.body.url;

  // Validate URL
  try {
    const url = new URL(originalUrl);

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      return res.json({ error: 'invalid url' });
    }

    if (!url.hostname || !url.hostname.includes('.')) {
      return res.json({ error: 'invalid url' });
    }

  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  try {
    // Check if URL already exists
    const existing = await Url.findOne({
      original_url: originalUrl
    });

    if (existing) {
      return res.json({
        original_url: existing.original_url,
        short_url: existing.short_url
      });
    }

    // Find highest short URL
    const lastUrl = await Url.findOne().sort({
      short_url: -1
    });

    const shortUrl = lastUrl
      ? lastUrl.short_url + 1
      : 1;

    const newUrl = new Url({
      original_url: originalUrl,
      short_url: shortUrl
    });

    const savedUrl = await newUrl.save();

    res.json({
      original_url: savedUrl.original_url,
      short_url: savedUrl.short_url
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'database error'
    });
  }
});

// GET: Redirect short URL
app.get('/api/shorturl/:short_url', async function (req, res) {
  const shortUrl = Number(req.params.short_url);

  // Make sure short_url is a valid number
  if (isNaN(shortUrl)) {
    return res.json({ error: 'No short URL found' });
  }

  try {
    const url = await Url.findOne({
      short_url: shortUrl
    });

    if (!url) {
      return res.json({
        error: 'No short URL found'
      });
    }

    res.redirect(url.original_url);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'database error'
    });
  }
});
// Start server
const listener = app.listen(
  process.env.PORT || 3000,
  function () {
    console.log(
      'Your app is listening on port ' +
      listener.address().port
    );
  }
);