import { mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

// Optional, separately licensed site identity. Public clones need no font or key.
// CI receives three compressed chunks; these are never committed or logged.
for (const file of ['.env', '.env.local']) {
  try { process.loadEnvFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const local = resolve(process.env.JELLYBOX_STORY_FONT || '.private/story.otf');
let font;
try { await access(local); font = await readFile(local); }
catch (error) { if (process.env.JELLYBOX_STORY_FONT || error.code !== 'ENOENT') throw error; }
const parts = [1, 2, 3].map(i => process.env[`STORY_FONT_PART_${i}`] || '');
if (!font && parts.some(Boolean)) {
  if (parts.some(part => !part)) throw new Error('All three story-font chunks are required.');
  font = gunzipSync(Buffer.from(parts.join(''), 'base64'), { maxOutputLength: 5 * 1024 * 1024 });
}
await mkdir('public/fonts', { recursive: true });
await rm('public/fonts/story.otf', { force: true });
let css = '/* Optional story font not configured; the system fallback is intentional. */\n';
if (font) {
  if (font.subarray(0, 4).toString() !== 'OTTO') throw new Error('Expected an OpenType/CFF story font.');
  await writeFile('public/fonts/story.otf', font);
  css = "@font-face{font-family:'Dessign Maison';src:url('./fonts/story.otf') format('opentype');font-style:normal;font-weight:400;font-display:swap}\n";
}
await writeFile('public/story-font.css', css);
console.log(font ? 'Licensed story font prepared for this site build.' : 'Building with the public system-font fallback.');
