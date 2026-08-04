import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Helper: generate token with expiry
function generateToken(userId, table) {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  db.prepare(`INSERT INTO ${table} (user_id, token, expires_at) VALUES (?, ?, ?)`).run(userId, token, expiresAt);

  return token;
}

// Helper: validate token from table
function validateToken(token, table) {
  const row = db.prepare(`SELECT * FROM ${table} WHERE token = ? AND expires_at > datetime('now')`).get(token);
  if (row) {
    // Delete used token
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(row.id);
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
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)').run(email, username, passwordHash);

    // Generate email verification token
    const verifyToken = generateToken(result.lastInsertRowid, 'email_verification_tokens');
    console.log(`\n📧 Email verification link for ${email}: /verify-email/${verifyToken}\n`);

    // Return JWT
    const jwtToken = jwt.sign({ id: result.lastInsertRowid, email, username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully',
      token: jwtToken,
      user: { id: result.lastInsertRowid, email, username, is_verified: 0 }
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

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, username: user.username, is_verified: user.is_verified }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/magic-link
router.post('/magic-link', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a magic link has been sent' });
    }

    const token = generateToken(user.id, 'magic_link_tokens');
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
router.get('/magic-link/:token', (req, res) => {
  try {
    const row = validateToken(req.params.token, 'magic_link_tokens');
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired magic link' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful via magic link',
      token,
      user: { id: user.id, email: user.email, username: user.username, is_verified: user.is_verified }
    });
  } catch (err) {
    console.error('Magic link verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', (req, res) => {
  try {
    const row = validateToken(req.params.token, 'email_verification_tokens');
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(row.user_id);

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Email verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }

    const token = generateToken(user.id, 'password_reset_tokens');
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

    const row = validateToken(token, 'password_reset_tokens');
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, row.user_id);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, username, is_verified, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
