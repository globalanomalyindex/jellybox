import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

await mkdir('release', { recursive: true });
const result = spawnSync('npm', ['pack', './packages/react', '--pack-destination', 'release', '--json'], { encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || 'Package creation failed');
const [{ filename }] = JSON.parse(result.stdout);
const hash = createHash('sha256').update(await readFile(`release/${filename}`)).digest('hex');
await writeFile('release/SHA256SUMS', `${hash}  ${filename}\n`);
console.log(`Created release/${filename} and release/SHA256SUMS`);
