import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import 'dotenv/config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';

// Output resolution: 4K square
const OUTPUT_SIZE = 4096;

// Style prompt modifiers
const STYLE_PROMPTS = {
  constructivist: 'constructivist art style, red black gold geometric poster',
  suprematist: 'suprematist art style, Malevich abstract geometric shapes',
  propaganda: 'vintage propaganda poster style, bold red gold typography',
  industrial: 'industrial retro-futurism, steel machinery, constructivist blueprint',
};

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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

/**
 * Upscales any generated image to 4K (4096x4096) JPEG.
 * SVG inputs are rasterized natively at high density so vector
 * logos keep crisp edges at 4K.
 */
async function finalize4K(buffer, mimeType) {
  const isSvg = mimeType === 'image/svg+xml';
  let image = isSvg ? sharp(buffer, { density: 512 }) : sharp(buffer);

  const out = await image
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'fill', kernel: 'lanczos3' })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  return { buffer: out, mimeType: 'image/jpeg' };
}

async function fetchRemoteImage(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ConstructivistArtStudio/1.0' },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error(`Not an image (Content-Type: ${contentType})`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    const validHeaders = [
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      Buffer.from([0x52, 0x49, 0x46, 0x46]),
    ];
    if (buffer.length < 10 || !validHeaders.some(h => buffer.subarray(0, h.length).equals(h))) {
      throw new Error('Downloaded file is not a valid image');
    }

    return { buffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGeminiImage(prompt, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            imageConfig: { aspectRatio: '1:1' },
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }

    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!part) {
      throw new Error('Gemini returned no image');
    }

    const buffer = Buffer.from(part.inlineData.data, 'base64');
    if (buffer.length < 100) {
      throw new Error('Gemini image too small');
    }

    const contentType = part.inlineData.mimeType || 'image/png';
    return { buffer, contentType };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStableHordeImage(prompt, timeoutMs = 120000) {
  const HORDE_URL = 'https://aihorde.net/api/v2';
  const HEADERS = {
    'Client-Agent': 'constructivist-ai-art-studio:1.0:local',
    'apikey': '0000000000',
  };

  const body = {
    prompt,
    nsfw: false,
    censor_nsfw: true,
    trusted_workers: false,
    r2: true,
    models: ['Deliberate'],
    params: {
      width: 576,
      height: 576,
      steps: 25,
      cfg_scale: 7.5,
      sampler_name: 'k_euler',
    },
  };

  const start = Date.now();

  const submitRes = await fetch(`${HORDE_URL}/generate/async`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!submitRes.ok) {
    throw new Error(`Horde submit HTTP ${submitRes.status}`);
  }
  const { id } = await submitRes.json();
  if (!id) throw new Error('Horde submit returned no job id');

  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 10000));

    const statusRes = await fetch(`${HORDE_URL}/generate/status/${id}`, { headers: HEADERS });
    if (!statusRes.ok) {
      throw new Error(`Horde status HTTP ${statusRes.status}`);
    }
    const status = await statusRes.json();

    if (status.done && status.generations?.length) {
      const { img } = status.generations[0];
      if (!img) throw new Error('Horde returned no image data');

      if (img.startsWith('http')) {
        const imgRes = await fetch(img);
        if (!imgRes.ok) throw new Error(`Horde image fetch HTTP ${imgRes.status}`);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        if (buffer.length < 100) throw new Error('Horde image too small');
        const contentType = imgRes.headers.get('content-type') || 'image/webp';
        return { buffer, contentType };
      }

      const buffer = Buffer.from(img, 'base64');
      if (buffer.length < 100) throw new Error('Horde image too small');
      return { buffer, contentType: 'image/png' };
    }

    if (status.faulted) {
      throw new Error('Horde job faulted');
    }
  }

  throw new Error('Horde timeout');
}

// Instant Rich Constructivist SVG Generator (Guaranteed zero error)
function generateRichSvgPoster(prompt, style) {
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
  elems.push(`<text x="${cx}" y="${HEIGHT - 75}" font-family="'Oswald', 'Arial Black', sans-serif" font-size="28" font-weight="900" fill="${pal[2]}" text-anchor="middle" letter-spacing="3">${escapeXml(cleanPrompt)}</text>`);

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

  return svg;
}

// Main Generation Function — returns { url, buffer, mimeType } for DB storage
export async function generateConstructivistArt(prompt, style = 'constructivist') {
  const cleanPrompt = prompt.trim().slice(0, 100);
  const styleModifier = STYLE_PROMPTS[style] || STYLE_PROMPTS.constructivist;
  const fullPrompt = `${cleanPrompt}, ${styleModifier}`;
  const seed = Math.floor(Math.random() * 100000);

  console.log(`🎨 Generating AI Art: "${cleanPrompt}" [${style}]...`);

  if (GEMINI_API_KEY) {
    try {
      const raw = await fetchGeminiImage(fullPrompt);
      const fin = await finalize4K(raw.buffer, raw.contentType);
      const filename = `art_${uuidv4()}.jpg`;
      console.log(`✅ Gemini AI Generation Successful (4K): ${filename}`);
      return { url: `/images/${filename}`, buffer: fin.buffer, mimeType: fin.mimeType };
    } catch (err) {
      console.warn(`⚠️ Gemini failed (${err.message}). Falling back to pollinations...`);
    }
  }

  const primaryUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=800&height=800&seed=${seed}&nologo=true`;
  const timeouts = [15000, 25000];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await fetchRemoteImage(primaryUrl, timeouts[attempt]);
      const fin = await finalize4K(raw.buffer, raw.contentType);
      const filename = `art_${uuidv4()}.jpg`;
      console.log(`✅ Pollinations AI Generation Successful (4K): ${filename}`);
      return { url: `/images/${filename}`, buffer: fin.buffer, mimeType: fin.mimeType };
    } catch (err) {
      console.warn(`⚠️ Pollinations attempt ${attempt + 1}/2 failed (${err.message}). Trying Stable Horde...`);
    }
  }

  try {
    const hordeResult = await fetchStableHordeImage(fullPrompt);
    const fin = await finalize4K(hordeResult.buffer, hordeResult.contentType);
    const filename = `art_${uuidv4()}.jpg`;
    console.log(`✅ Stable Horde Generation Successful (4K): ${filename}`);
    return { url: `/images/${filename}`, buffer: fin.buffer, mimeType: fin.mimeType };
  } catch (err) {
    console.warn(`⚠️ Stable Horde failed (${err.message}). Falling back to vector engine...`);
  }

  const svg = generateRichSvgPoster(cleanPrompt, style);
  const fin = await finalize4K(Buffer.from(svg, 'utf8'), 'image/svg+xml');
  const filename = `art_${uuidv4()}.jpg`;
  console.log(`✅ Fallback Vector Art Generated (4K): ${filename}`);
  return { url: `/images/${filename}`, buffer: fin.buffer, mimeType: fin.mimeType };
}

export function generateTitle(prompt) {
  const words = prompt.split(' ').slice(0, 4);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
