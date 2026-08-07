import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seeds the database with demo accounts and the starter gallery
 * on first run (when the images table is empty). The live site starts
 * with content instead of an empty page.
 */
export function seedIfEmpty() {
  try {
    // Ensure default admin account exists
    const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'admin' OR is_admin = 1").get();
    if (!existingAdmin) {
      const adminHash = bcrypt.hashSync('Admin123!', 10);
      db.prepare(
        'INSERT INTO users (email, password_hash, username, is_verified, is_admin) VALUES (?, ?, ?, 1, 1)'
      ).run('admin@constructivist.art', adminHash, 'admin');
      console.log('🛡️ Default Admin account created (Username: admin, Password: Admin123!)');
    }

    // Ensure all accounts with shrovan or admin in username get is_admin = 1
    db.prepare("UPDATE users SET is_admin = 1 WHERE LOWER(username) LIKE '%shrovan%' OR LOWER(username) LIKE '%admin%'").run();

    const { c } = db.prepare('SELECT COUNT(*) as c FROM images').get();
    if (c > 0) {
      // Re-link images to shrovan dhanki s if shrovan exists
      const targetUser = db.prepare("SELECT id FROM users WHERE username = 'shrovan dhanki s' OR username = 'shrovan'").get();
      if (targetUser) {
        db.prepare("UPDATE images SET user_id = ? WHERE user_id NOT IN (SELECT id FROM users)").run(targetUser.id);
      }
      return;
    }

    const seedPath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(seedPath)) return;

    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    const insertUser = db.prepare(
      'INSERT INTO users (email, password_hash, username, is_verified, is_admin) VALUES (?, ?, ?, 1, ?)'
    );
    const insertImage = db.prepare(
      'INSERT INTO images (user_id, title, prompt, image_url, style, is_public) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const userIdByName = {};
    for (const u of seed.users) {
      const hash = bcrypt.hashSync(u.password, 10);
      const isAdminVal = u.is_admin ? 1 : 0;
      const result = insertUser.run(u.email, hash, u.username, isAdminVal);
      userIdByName[u.username] = result.lastInsertRowid;
    }

    for (const img of seed.images) {
      let userId = userIdByName[img.username];
      if (!userId && (img.username === 'shrovan' || img.username === 'shrovan dhanki s')) {
        userId = userIdByName['shrovan dhanki s'] || userIdByName['shrovan'];
      }
      if (!userId) continue;
      insertImage.run(userId, img.title, img.prompt, img.image_url, img.style, img.is_public);
    }

    console.log(`✅ Seeded demo gallery (${seed.users.length} users, ${seed.images.length} images)`);
  } catch (err) {
    console.error('Seed error:', err);
  }
}
