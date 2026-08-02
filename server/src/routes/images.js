import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { generateConstructivistArt, generateTitle } from '../generator.js';

const router = Router();

// POST /api/images/generate — Generate new constructivist art
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { prompt, style = 'constructivist', title } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'A prompt is required to generate art' });
    }

    if (prompt.length > 500) {
      return res.status(400).json({ error: 'Prompt must be 500 characters or less' });
    }

    const validStyles = ['constructivist', 'suprematist', 'propaganda', 'industrial'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({ error: `Invalid style. Choose from: ${validStyles.join(', ')}` });
    }

    // Generate the AI art
    const imageUrl = await generateConstructivistArt(prompt, style);
    const artTitle = title || generateTitle(prompt);

    // Save to database
    const result = db.prepare(
      'INSERT INTO images (user_id, title, prompt, image_url, style) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, artTitle, prompt, imageUrl, style);

    const image = db.prepare('SELECT * FROM images WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Art generated successfully',
      image: {
        ...image,
        username: req.user.username
      }
    });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Failed to generate art' });
  }
});

// GET /api/images — Public gallery
router.get('/', optionalAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const style = req.query.style;

    let query = `
      SELECT images.*, users.username 
      FROM images 
      JOIN users ON images.user_id = users.id 
      WHERE images.is_public = 1
    `;
    const params = [];

    if (style && style !== 'all') {
      query += ' AND images.style = ?';
      params.push(style);
    }

    query += ' ORDER BY images.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const images = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM images WHERE is_public = 1';
    const countParams = [];
    if (style && style !== 'all') {
      countQuery += ' AND style = ?';
      countParams.push(style);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Gallery error:', err);
    res.status(500).json({ error: 'Failed to load gallery' });
  }
});

// GET /api/images/my — Current user's images
router.get('/my', authenticateToken, (req, res) => {
  try {
    const images = db.prepare(
      'SELECT images.*, users.username FROM images JOIN users ON images.user_id = users.id WHERE images.user_id = ? ORDER BY images.created_at DESC'
    ).all(req.user.id);

    res.json({ images });
  } catch (err) {
    console.error('My images error:', err);
    res.status(500).json({ error: 'Failed to load your images' });
  }
});

// DELETE /api/images/:id — Delete user's image
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const image = db.prepare('SELECT * FROM images WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!image) {
      return res.status(404).json({ error: 'Image not found or you do not have permission to delete it' });
    }

    db.prepare('DELETE FROM images WHERE id = ?').run(req.params.id);

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// PATCH /api/images/:id — Toggle public/private
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const image = db.prepare('SELECT * FROM images WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const newPublicState = image.is_public ? 0 : 1;
    db.prepare('UPDATE images SET is_public = ? WHERE id = ?').run(newPublicState, req.params.id);

    res.json({ message: `Image is now ${newPublicState ? 'public' : 'private'}`, is_public: newPublicState });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

export default router;
