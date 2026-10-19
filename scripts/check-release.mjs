import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
if (!files.length) throw new Error('Stage the release files before checking the publishable source.');
const forbidden = files.filter(file => /(^|\/)(\.private|\.scratch|\.impeccable|\.openai|node_modules|work)(\/|$)|(^|\/)AGENTS\.md$|^docs\/agents\/|\.(otf|ttf|woff2?|tgz)$|^public\/fonts\//i.test(file));
if (forbidden.length) throw new Error(`Private/generated files are tracked: ${forbidden.join(', ')}`);
for (const file of files) {
  const text = await readFile(file, 'utf8');
  if (/\/Users\/[a-z0-9_-]+\//i.test(text)) throw new Error(`Machine-specific path in ${file}`);
  if (file.endsWith('.md')) {
    const prose = text.replace(/```[\s\S]*?```/g, '');
    for (const [, destination] of prose.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const link = destination.replace(/^<|>$/g, '').split('#')[0];
      if (!link || /^[a-z][a-z0-9+.-]*:/i.test(link)) continue;
      const target = relative(process.cwd(), resolve(dirname(file), decodeURIComponent(link))).split(sep).join('/');
      if (!files.includes(target)) throw new Error(`Untracked or missing documentation link in ${file}: ${destination}`);
    }
  }
}
if (await readFile('THIRD_PARTY_NOTICES.md', 'utf8') !== await readFile('public/THIRD_PARTY_NOTICES.md', 'utf8')) {
  throw new Error('Keep the deployed third-party notices in sync with the canonical root notices.');
}
console.log(`Release source checked: ${files.length} files; private/tool/generated files excluded and local documentation links resolve.`);
