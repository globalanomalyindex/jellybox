import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = JSON.parse(await readFile('package.json', 'utf8'));
const pkg = JSON.parse(await readFile('packages/react/package.json', 'utf8'));
const archive = resolve(`release/jellybox-react-${pkg.version}.tgz`);
await access(archive);
const files = spawnSync('tar', ['-tf', archive], { encoding: 'utf8' });
if (files.status !== 0) throw new Error(files.stderr);
if (/\.(otf|ttf|woff2?)$|\/brand\/|\.private|\.scratch/m.test(files.stdout)) throw new Error('Private/site assets in the component archive');
for (const entry of ['package/dist/index.js', 'package/dist/styles.css', 'package/dist/index.d.ts', 'package/dist/renderer.js', 'package/dist/renderer/index.d.ts', 'package/LICENSE', 'package/THIRD_PARTY_NOTICES.md']) {
  if (!files.stdout.split('\n').includes(entry)) throw new Error(`Missing package entry: ${entry}`);
}
const consumer = await mkdtemp(join(tmpdir(), 'jellybox-consumer-'));
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: consumer, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${cmd} failed`);
};
try {
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: {
    '@jellybox/react': `file:${archive}`, react: root.dependencies.react, 'react-dom': root.dependencies['react-dom'],
  } }));
  run('npm', ['install', '--ignore-scripts', '--no-package-lock', '--no-audit', '--no-fund']);
  await writeFile(join(consumer, 'smoke.mjs'), `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { JellyButton, JellySlider } from '@jellybox/react';
    const require = createRequire(import.meta.url);
    assert.throws(() => require.resolve('three'));
    const button = renderToStaticMarkup(React.createElement(JellyButton, null, 'Save'));
    assert.match(button, /type="button"/); assert.match(button, /Save/);
    const slider = renderToStaticMarkup(React.createElement(JellySlider, { label: 'Density', defaultValue: 50 }));
    assert.match(slider, /type="range"/); assert.match(slider, /Density/);
    require.resolve('@jellybox/react/styles.css');
  `);
  run('node', ['smoke.mjs']);
  run('npm', ['install', '--ignore-scripts', '--no-package-lock', '--no-audit', '--no-fund', 'three@0.186.1']);
  run('node', ['--input-type=module', '-e', "const x = await import('@jellybox/react/renderer'); if (typeof x.JellyScene !== 'function' || typeof x.createOptics !== 'function') throw Error('Missing renderer entry');"]);
  console.log('Packed consumer passed: native SSR/CSS without Three; optional renderer resolves with its peer.');
} finally { await rm(consumer, { recursive: true, force: true }); }
