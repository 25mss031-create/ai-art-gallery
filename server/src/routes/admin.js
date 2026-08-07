import { Router } from 'express';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Protect all admin endpoints with requireAdmin
router.use(requireAdmin);

// GET /api/admin/stats — System statistics for admin dashboard
router.get('/stats', async (req, res) => {
  try {
    const { rows: [{ total_users }] } = await pool.query('SELECT COUNT(*)::int as total_users FROM users');
    const { rows: [{ total_admins }] } = await pool.query('SELECT COUNT(*)::int as total_admins FROM users WHERE is_admin = 1');
    const { rows: [{ total_images }] } = await pool.query('SELECT COUNT(*)::int as total_images FROM images');

    res.json({
      stats: {
        total_users,
        total_admins,
        total_images,
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// GET /api/admin/users — List all user accounts with IDs and image counts
router.get('/users', async (req, res) => {
  try {
    const { rows: users } = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.username,
        u.is_verified,
        u.is_admin,
        u.created_at,
        COUNT(i.id)::int as image_count
      FROM users u
      LEFT JOIN images i ON u.id = i.user_id
      GROUP BY u.id
      ORDER BY u.id ASC
    `);

    res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch user list' });
  }
});

// PATCH /api/admin/users/:id/role — Toggle user admin status
router.patch('/users/:id/role', async (req, res) => {
  try {
    const userId = req.params.id;
    const { rows } = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newAdminStatus = user.is_admin ? 0 : 1;
    await pool.query('UPDATE users SET is_admin = $1 WHERE id = $2', [newAdminStatus, userId]);

    res.json({
      message: `User #${userId} admin status updated to ${newAdminStatus ? 'Admin' : 'User'}`,
      is_admin: newAdminStatus
    });
  } catch (err) {
    console.error('Admin role update error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// DELETE /api/admin/users/:id — Delete user account
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent self deletion
    if (parseInt(userId) === parseInt(req.user.id)) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: `User #${userId} deleted successfully` });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// DELETE /api/admin/images/:id — Delete any image as admin
router.delete('/images/:id', async (req, res) => {
  try {
    const imageId = req.params.id;
    const { rows } = await pool.query('SELECT id FROM images WHERE id = $1', [imageId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await pool.query('DELETE FROM images WHERE id = $1', [imageId]);
    res.json({ message: `Image #${imageId} deleted by admin` });
  } catch (err) {
    console.error('Admin delete image error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
