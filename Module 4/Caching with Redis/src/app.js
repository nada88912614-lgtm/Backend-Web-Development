'use strict';

require('dotenv').config();

const express = require('express');
const db = require('./db');

// Import cache functions
const { cacheGet, cacheSet, cacheDel } = require('./cache');

const app = express();
app.use(express.json());

const FEED_KEY = 'feed:trending';
const FEED_TTL = 60;   // seconds

app.get('/health', (req, res) => res.json({ ok: true }));

// GET /feed — Cache-aside pattern
app.get('/feed', async (req, res) => {
  try {
    // 1. Check cache first
    const cachedPosts = await cacheGet(FEED_KEY);

    if (cachedPosts) {
      res.set('X-Cache', 'HIT');
      console.log('[feed] Cache HIT');
      return res.json(cachedPosts);
    }

    // 2. Cache MISS — get data from database
    const t0 = Date.now();
    const posts = await db.getTrendingPosts();

    console.log(`[feed] DB MISS ${Date.now() - t0}ms`);

    // 3. Store data in cache for 60 seconds
    await cacheSet(FEED_KEY, posts, FEED_TTL);

    // 4. Set response header
    res.set('X-Cache', 'MISS');

    return res.json(posts);

  } catch (err) {
    console.error('[feed] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts — Create post and invalidate cache
app.post('/posts', async (req, res) => {
  try {
    // Create a new post
    const post = await db.createPost(req.body);

    // Delete old cached feed
    await cacheDel(FEED_KEY);

    res.status(201).json(post);

  } catch (err) {
    console.error('[posts] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
}

module.exports = { app };