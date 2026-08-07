export function imageDownloadName(title, url) {
  const base = String(title || 'art')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-') || 'art';
  const extMatch = url && url.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1] : 'jpg';
  return `${base}.${ext}`;
}

export async function downloadImage(url, title) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = imageDownloadName(title, url);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error('Download failed:', err);
  }
}
