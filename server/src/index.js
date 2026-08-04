import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Import db to ensure tables are created
import './db.js';
import { seedIfEmpty } from './seed.js';

import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Seed the demo gallery on first run (empty database)
seedIfEmpty();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Serve generated images as static files
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);

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

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🔴 CONSTRUCTIVIST AI ART STUDIO SERVER 🔴  ║
║                                              ║
║   Running on http://localhost:${PORT}          ║
║                                              ║
╚══════════════════════════════════════════════╝
  `);
});
