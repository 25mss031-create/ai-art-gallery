import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import pool, { initDb } from './db.js';
import { seedIfEmpty } from './seed.js';

import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Serve generated images from the database (persists across redeploys)
app.get('/images/:filename', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT image_data, mime_type FROM images WHERE image_url = $1 LIMIT 1',
      [`/images/${req.params.filename}`]
    );
    if (rows.length === 0 || !rows[0].image_data) {
      return res.status(404).send('Not found');
    }
    res.type(rows[0].mime_type || 'image/svg+xml');
    res.send(rows[0].image_data);
  } catch (err) {
    console.error('Image serve error:', err);
    res.status(500).send('Error');
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the built React client in production (single-service deployment)
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/images')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Initialize the database and start the server
async function start() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Add it to server/.env or the Render env vars.');
    process.exit(1);
  }

  try {
    await initDb();
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🔴 CONSTRUCTIVIST AI ART STUDIO SERVER 🔴  ║
║                                              ║
║   Running on http://localhost:${PORT}          ║
╚══════════════════════════════════════════════╝
  `);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

start();
