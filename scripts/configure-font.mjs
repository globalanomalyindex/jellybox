import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const [repo, file] = process.argv.slice(2);
if (!repo || !file) throw new Error('Usage: node scripts/configure-font.mjs owner/repo /path/to/licensed.otf');
const encoded = gzipSync(await readFile(file), { mtime: 0 }).toString('base64');
const size = Math.ceil(encoded.length / 3);
if (size > 45000) throw new Error('Compressed font exceeds the supported three-chunk limit.');
for (let i = 0; i < 3; i++) {
  const result = spawnSync('gh', ['secret', 'set', `STORY_FONT_PART_${i + 1}`, '--repo', repo], {
    input: encoded.slice(i * size, (i + 1) * size), stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not configure font chunk ${i + 1}.`);
}
console.log('Optional web font configured. It is excluded from source and package archives.');
