import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const packageRoot = resolve(root, 'packages/react');

export default defineConfig({
  publicDir: false,
  plugins: [react(), {
    name: 'jellybox-library-types',
    async closeBundle() {
      await mkdir(resolve(packageRoot, 'dist/renderer'), { recursive: true });
      await copyFile(resolve(packageRoot, 'src/index.d.ts'), resolve(packageRoot, 'dist/index.d.ts'));
      await copyFile(resolve(packageRoot, 'src/renderer/index.d.ts'), resolve(packageRoot, 'dist/renderer/index.d.ts'));
    },
  }],
  build: {
    outDir: resolve(packageRoot, 'dist'), emptyOutDir: true,
    lib: {
      entry: { index: resolve(packageRoot, 'src/index.js'), renderer: resolve(packageRoot, 'src/renderer/index.js') },
      formats: ['es'], fileName: (_format, entryName) => `${entryName}.js`, cssFileName: 'styles',
    },
    rollupOptions: {
      external: (id) => /^(react|react-dom|three)(\/|$)/.test(id),
    },
  },
});
