import { Router } from 'express';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Protect all admin endpoints with requireAdmin
router.use(requireAdmin);

// GET /api/admin/stats — System statistics for admin dashboard
router.get('/stats', (req, res) => {
  try {
    const { total_users } = db.prepare('SELECT COUNT(*) as total_users FROM users').get();
    const { total_admins } = db.prepare('SELECT COUNT(*) as total_admins FROM users WHERE is_admin = 1').get();
    const { total_images } = db.prepare('SELECT COUNT(*) as total_images FROM images').get();

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
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id, 
        u.email, 
        u.username, 
        u.is_verified, 
        u.is_admin, 
        u.created_at,
        COUNT(i.id) as image_count
      FROM users u
      LEFT JOIN images i ON u.id = i.user_id
      GROUP BY u.id
      ORDER BY u.id ASC
    `).all();

    res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch user list' });
  }
});

// PATCH /api/admin/users/:id/role — Toggle user admin status
router.patch('/users/:id/role', (req, res) => {
  try {
    const userId = req.params.id;
    const user = db.prepare('SELECT id, is_admin FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newAdminStatus = user.is_admin ? 0 : 1;
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newAdminStatus, userId);

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
router.delete('/users/:id', (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent self deletion
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: `User #${userId} deleted successfully` });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// DELETE /api/admin/images/:id — Delete any image as admin
router.delete('/images/:id', (req, res) => {
  try {
    const imageId = req.params.id;
    const image = db.prepare('SELECT id FROM images WHERE id = ?').get(imageId);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    db.prepare('DELETE FROM images WHERE id = ?').run(imageId);
    res.json({ message: `Image #${imageId} deleted by admin` });
  } catch (err) {
    console.error('Admin delete image error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
