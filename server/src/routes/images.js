import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { generateConstructivistArt, generateTitle } from '../generator.js';

const router = Router();

const IMAGE_COLUMNS = `
  images.id, images.user_id, images.title, images.prompt,
  images.image_url, images.style, images.is_public, images.created_at,
  users.username
`;

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
    const { url, buffer, mimeType } = await generateConstructivistArt(prompt, style);
    const artTitle = title || generateTitle(prompt);

    // Save to database (image bytes persist in Postgres, not on the disk)
    const result = await pool.query(
      `INSERT INTO images (user_id, title, prompt, image_url, image_data, mime_type, style)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.user.id, artTitle, prompt, url, buffer, mimeType, style]
    );

    const { rows } = await pool.query(
      `SELECT ${IMAGE_COLUMNS} FROM images JOIN users ON images.user_id = users.id WHERE images.id = $1`,
      [result.rows[0].id]
    );
    const image = rows[0];

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
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const style = req.query.style;

    let query = `
      SELECT ${IMAGE_COLUMNS}
      FROM images
      JOIN users ON images.user_id = users.id
      WHERE images.is_public = 1
    `;
    const params = [];
    let paramIndex = 1;

    if (style && style !== 'all') {
      query += ` AND images.style = $${paramIndex++}`;
      params.push(style);
    }

    query += ` ORDER BY images.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const { rows: images } = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM images WHERE is_public = 1';
    const countParams = [];
    if (style && style !== 'all') {
      countQuery += ` AND style = $${countParams.length + 1}`;
      countParams.push(style);
    }
    const { rows: [{ total }] } = await pool.query(countQuery, countParams);

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
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { rows: images } = await pool.query(
      `SELECT ${IMAGE_COLUMNS} FROM images JOIN users ON images.user_id = users.id
       WHERE images.user_id = $1 ORDER BY images.created_at DESC`,
      [req.user.id]
    );

    res.json({ images });
  } catch (err) {
    console.error('My images error:', err);
    res.status(500).json({ error: 'Failed to load your images' });
  }
});

// DELETE /api/images/:id — Delete user's image
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM images WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found or you do not have permission to delete it' });
    }

    await pool.query('DELETE FROM images WHERE id = $1', [req.params.id]);

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// PATCH /api/images/:id — Toggle public/private
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM images WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const image = rows[0];

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const newPublicState = image.is_public ? 0 : 1;
    await pool.query('UPDATE images SET is_public = $1 WHERE id = $2', [newPublicState, req.params.id]);

    res.json({ message: `Image is now ${newPublicState ? 'public' : 'private'}`, is_public: newPublicState });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

export default router;
