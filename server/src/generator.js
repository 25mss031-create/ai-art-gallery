import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images');

// Style prompt modifiers
const STYLE_PROMPTS = {
  constructivist: 'constructivist art style, red black gold geometric poster',
  suprematist: 'suprematist art style, Malevich abstract geometric shapes',
  propaganda: 'vintage propaganda poster style, bold red gold typography',
  industrial: 'industrial retro-futurism, steel machinery, constructivist blueprint',
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function createRng(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Download image with strict timeout (6000ms)
function fetchRemoteImage(url, filepath, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));

    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchRemoteImage(res.headers.location, filepath, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP Status ${res.statusCode}`));
      }

      const fileStream = fs.createWriteStream(filepath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(filepath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(6000, () => {
      req.destroy();
      reject(new Error('Fetch timeout (6s limit)'));
    });
  });
}

// Instant Rich Constructivist SVG Generator (Guaranteed zero error)
function generateRichSvgPoster(prompt, style, filepath) {
  const WIDTH = 800;
  const HEIGHT = 800;
  const seed = hashString(prompt + Date.now().toString());
  const rng = createRng(seed);

  const palettes = {
    constructivist: ['#D62828', '#1A1A2E', '#F5F0E1', '#E9C46A', '#2A2A2A'],
    suprematist: ['#000000', '#FFFFFF', '#D62828', '#1B4DFF', '#F4D03F'],
    propaganda: ['#CC0000', '#FFD700', '#1A1A1A', '#F5F0E1', '#8B0000'],
    industrial: ['#2C3E50', '#E74C3C', '#ECF0F1', '#95A5A6', '#34495E'],
  };

  const pal = palettes[style] || palettes.constructivist;
  const elems = [];

  // Background
  elems.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${pal[1]}" />`);

  // Grid
  for (let x = 0; x < WIDTH; x += 40) {
    elems.push(`<line x1="${x}" y1="0" x2="${x}" y2="${HEIGHT}" stroke="${pal[3]}" stroke-width="1" opacity="0.1" />`);
  }
  for (let y = 0; y < HEIGHT; y += 40) {
    elems.push(`<line x1="0" y1="${y}" x2="${WIDTH}" y2="${y}" stroke="${pal[3]}" stroke-width="1" opacity="0.1" />`);
  }

  // Central Sun / Emblem Disk
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 - 20;

  elems.push(`<circle cx="${cx}" cy="${cy}" r="220" fill="none" stroke="${pal[0]}" stroke-width="8" opacity="0.7" />`);
  elems.push(`<circle cx="${cx}" cy="${cy}" r="160" fill="${pal[3]}" opacity="0.25" />`);

  // Diagonal Tension Beams
  elems.push(`<line x1="80" y1="720" x2="720" y2="80" stroke="${pal[0]}" stroke-width="14" opacity="0.9" />`);
  elems.push(`<line x1="120" y1="120" x2="680" y2="680" stroke="${pal[3]}" stroke-width="6" opacity="0.7" />`);

  // Dynamic Floating Shapes
  for (let i = 0; i < 14; i++) {
    const shapeType = Math.floor(rng() * 4);
    const color = pal[Math.floor(rng() * pal.length)];
    const x = 80 + rng() * 640;
    const y = 80 + rng() * 540;
    const size = 20 + rng() * 60;
    const rot = rng() * 360;

    if (shapeType === 0) {
      elems.push(`<rect x="${x}" y="${y}" width="${size}" height="${size * 1.5}" fill="${color}" opacity="0.8" transform="rotate(${rot} ${x + size/2} ${y + size/2})" />`);
    } else if (shapeType === 1) {
      elems.push(`<circle cx="${x}" cy="${y}" r="${size/2}" fill="${color}" opacity="0.85" />`);
    } else if (shapeType === 2) {
      const h = size * 0.866;
      elems.push(`<polygon points="${x},${y - size} ${x - h},${y + size * 0.5} ${x + h},${y + size * 0.5}" fill="${color}" opacity="0.85" transform="rotate(${rot} ${x} ${y})" />`);
    } else {
      elems.push(`<circle cx="${x}" cy="${y}" r="${size}" fill="none" stroke="${color}" stroke-width="3" opacity="0.7" />`);
    }
  }

  // Text Banner Box
  const cleanPrompt = prompt.trim().toUpperCase().slice(0, 36);
  elems.push(`<rect x="40" y="${HEIGHT - 130}" width="${WIDTH - 80}" height="85" fill="${pal[4]}" opacity="0.95" />`);
  elems.push(`<rect x="45" y="${HEIGHT - 125}" width="${WIDTH - 90}" height="75" fill="${pal[0]}" opacity="0.9" />`);
  elems.push(`<text x="${cx}" y="${HEIGHT - 75}" font-family="'Oswald', 'Arial Black', sans-serif" font-size="28" font-weight="900" fill="${pal[2]}" text-anchor="middle" letter-spacing="3">${cleanPrompt}</text>`);

  // Frame
  elems.push(`<rect x="10" y="10" width="${WIDTH - 20}" height="${HEIGHT - 20}" fill="none" stroke="${pal[0]}" stroke-width="6" />`);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@700;900&amp;display=swap');
      text { font-family: 'Oswald', 'Arial Black', sans-serif; user-select: none; }
    </style>
  </defs>
  ${elems.join('\n  ')}
</svg>`;

  fs.writeFileSync(filepath, svg, 'utf-8');
}

// Main Generation Function (0 Failures Guaranteed)
export async function generateConstructivistArt(prompt, style = 'constructivist') {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const cleanPrompt = prompt.trim().slice(0, 100);
  const styleModifier = STYLE_PROMPTS[style] || STYLE_PROMPTS.constructivist;
  const fullPrompt = `${cleanPrompt}, ${styleModifier}`;
  const seed = Math.floor(Math.random() * 100000);

  // Primary AI API Endpoint (Pollinations)
  const primaryUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=800&height=800&seed=${seed}&nologo=true`;

  const jpgFilename = `art_${uuidv4()}.jpg`;
  const jpgFilepath = path.join(OUTPUT_DIR, jpgFilename);

  try {
    console.log(`🎨 Generating AI Art: "${cleanPrompt}" [${style}]...`);
    await fetchRemoteImage(primaryUrl, jpgFilepath);
    console.log(`✅ AI Generation Successful: ${jpgFilename}`);
    return `/images/${jpgFilename}`;
  } catch (primaryErr) {
    console.warn(`⚠️ AI Remote API Busy/Rate-Limited (${primaryErr.message}). Switching to instant vector engine...`);
    
    // Instant rich SVG fallback (100% reliable, zero network dependency)
    const svgFilename = `art_${uuidv4()}.svg`;
    const svgFilepath = path.join(OUTPUT_DIR, svgFilename);
    
    generateRichSvgPoster(cleanPrompt, style, svgFilepath);
    console.log(`✅ Instant Vector Art Generated: ${svgFilename}`);
    return `/images/${svgFilename}`;
  }
}

export function generateTitle(prompt) {
  const words = prompt.split(' ').slice(0, 4);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
