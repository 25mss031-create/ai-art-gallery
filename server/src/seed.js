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
    const { c } = db.prepare('SELECT COUNT(*) as c FROM images').get();
    if (c > 0) return;

    const seedPath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(seedPath)) return;

    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    const insertUser = db.prepare(
      'INSERT INTO users (email, password_hash, username, is_verified) VALUES (?, ?, ?, 1)'
    );
    const insertImage = db.prepare(
      'INSERT INTO images (user_id, title, prompt, image_url, style, is_public) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const userIdByName = {};
    for (const u of seed.users) {
      const hash = bcrypt.hashSync(u.password, 10);
      const result = insertUser.run(u.email, hash, u.username);
      userIdByName[u.username] = result.lastInsertRowid;
    }

    for (const img of seed.images) {
      const userId = userIdByName[img.username];
      if (!userId) continue;
      insertImage.run(userId, img.title, img.prompt, img.image_url, img.style, img.is_public);
    }

    console.log(`✅ Seeded demo gallery (${seed.users.length} users, ${seed.images.length} images)`);
  } catch (err) {
    console.error('Seed error:', err);
  }
}
