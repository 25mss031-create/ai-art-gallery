import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_BY_EXT = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/**
 * Seeds the database with demo accounts and the starter gallery
 * on first run (when the images table is empty). The live site starts
 * with content instead of an empty page.
 */
export async function seedIfEmpty() {
  try {
    // Ensure default admin account exists
    const admin = await pool.query("SELECT id FROM users WHERE username = 'admin' OR is_admin = 1 LIMIT 1");
    if (admin.rows.length === 0) {
      const adminHash = await bcrypt.hash('Admin123!', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, username, is_verified, is_admin) VALUES ($1, $2, $3, 1, 1)',
        ['admin@constructivist.art', adminHash, 'admin']
      );
      console.log('🛡️ Default Admin account created (Username: admin, Password: Admin123!)');
    }

    // Ensure all accounts with shrovan or admin in username get is_admin = 1
    await pool.query(
      "UPDATE users SET is_admin = 1 WHERE LOWER(username) LIKE '%shrovan%' OR LOWER(username) LIKE '%admin%'"
    );

    const { rows: [{ c }] } = await pool.query('SELECT COUNT(*) as c FROM images');
    if (c > 0) return;

    const seedPath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(seedPath)) return;

    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    const userIdByName = {};
    for (const u of seed.users) {
      const hash = await bcrypt.hash(u.password, 10);
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, username, is_verified, is_admin)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (username) DO UPDATE SET is_admin = EXCLUDED.is_admin
         RETURNING id`,
        [u.email, hash, u.username, u.is_admin ? 1 : 0]
      );
      userIdByName[u.username] = result.rows[0].id;
    }

    const imagesDir = path.join(__dirname, '..', 'public', 'images');
    let inserted = 0;

    for (const img of seed.images) {
      let userId = userIdByName[img.username];
      if (!userId && (img.username === 'shrovan' || img.username === 'shrovan dhanki s')) {
        userId = userIdByName['shrovan dhanki s'] || userIdByName['shrovan'];
      }
      if (!userId) continue;

      const filename = img.image_url.replace(/^\/images\//, '');
      const filepath = path.join(imagesDir, filename);
      let imageData = null;
      if (fs.existsSync(filepath)) {
        imageData = fs.readFileSync(filepath);
      }

      const mimeType = MIME_BY_EXT[path.extname(filename)] || 'image/svg+xml';

      await pool.query(
        `INSERT INTO images (user_id, title, prompt, image_url, image_data, mime_type, style, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, img.title, img.prompt, img.image_url, imageData, mimeType, img.style, img.is_public]
      );
      inserted++;
    }

    console.log(`✅ Seeded demo gallery (${seed.users.length} users, ${inserted} images)`);
  } catch (err) {
    console.error('Seed error:', err);
  }
}
