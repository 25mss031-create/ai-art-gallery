import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import 'dotenv/config';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Helper: generate token with expiry
async function generateToken(userId, table) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  await pool.query(`INSERT INTO ${table} (user_id, token, expires_at) VALUES ($1, $2, $3)`, [userId, token, expiresAt]);

  return token;
}

// Helper: validate token from table (single-use)
async function validateToken(token, table) {
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE token = $1 AND expires_at > now()`, [token]);
  const row = rows[0];
  if (row) {
    // Delete used token
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [row.id]);
  }
  return row;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check existing user
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [email, username, passwordHash]
    );
    const newUserId = result.rows[0].id;

    // Generate email verification token
    const verifyToken = await generateToken(newUserId, 'email_verification_tokens');
    console.log(`\n📧 Email verification link for ${email}: /verify-email/${verifyToken}\n`);

    // Return JWT
    const jwtToken = jwt.sign({ id: newUserId, email, username, is_admin: 0 }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      token: jwtToken,
      user: { id: newUserId, email, username, is_verified: 0, is_admin: 0 }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses magic link login. Please request a magic link.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, username: user.username, is_verified: user.is_verified, is_admin: user.is_admin }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/magic-link
router.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a magic link has been sent' });
    }

    const token = await generateToken(user.id, 'magic_link_tokens');
    const magicLink = `/auth/magic-link/${token}`;
    console.log(`\n🔗 Magic link for ${email}: ${magicLink}\n`);

    // Demo mode: no email service is configured, so return the link to the
    // client so the UI can show it and the user can complete the login.
    res.json({
      message: 'If the email exists, a magic link has been sent',
      magicLink
    });
  } catch (err) {
    console.error('Magic link error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/magic-link/:token
router.get('/magic-link/:token', async (req, res) => {
  try {
    const row = await validateToken(req.params.token, 'magic_link_tokens');
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired magic link' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [row.user_id]);
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful via magic link',
      token,
      user: { id: user.id, email: user.email, username: user.username, is_verified: user.is_verified, is_admin: user.is_admin }
    });
  } catch (err) {
    console.error('Magic link verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const row = await validateToken(req.params.token, 'email_verification_tokens');
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    await pool.query('UPDATE users SET is_verified = 1 WHERE id = $1', [row.user_id]);

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) {
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }

    const token = await generateToken(user.id, 'password_reset_tokens');
    console.log(`\n🔑 Password reset link for ${email}: /reset-password/${token}\n`);

    // Demo mode: no email service is configured, so return the token to the
    // client so the UI can show the "set new password" step right away.
    res.json({
      message: 'If the email exists, a password reset link has been sent',
      resetToken: token
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const row = await validateToken(token, 'password_reset_tokens');
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.user_id]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, username, is_verified, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    let user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Auto-grant admin status to shrovan and admin usernames if not already set
    if (!user.is_admin && (user.username.toLowerCase().includes('shrovan') || user.username.toLowerCase().includes('admin'))) {
      await pool.query('UPDATE users SET is_admin = 1 WHERE id = $1', [user.id]);
      user.is_admin = 1;
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
