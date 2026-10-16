import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
if (!files.length) throw new Error('Stage the release files before checking the publishable source.');
const forbidden = files.filter(file => /(^|\/)(\.private|\.scratch|node_modules|work)(\/|$)|\.(otf|ttf|woff2?|tgz)$|^public\/fonts\//i.test(file));
if (forbidden.length) throw new Error(`Private/generated files are tracked: ${forbidden.join(', ')}`);
for (const file of files.filter(file => /\.(md|mjs|jsx?|json|css|html|ya?ml)$/.test(file))) {
  const text = await readFile(file, 'utf8');
  if (/\/Users\/[a-z0-9_-]+\//i.test(text)) throw new Error(`Machine-specific path in ${file}`);
}
if (await readFile('THIRD_PARTY_NOTICES.md', 'utf8') !== await readFile('public/THIRD_PARTY_NOTICES.md', 'utf8')) {
  throw new Error('Keep the deployed third-party notices in sync with the canonical root notices.');
}
console.log(`Release source checked: ${files.length} files; no font binaries, scratch trees or machine paths tracked.`);
