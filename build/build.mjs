// Build for static hosting: copy src/ to dist/.
//
// There is no bundler on purpose. The app is plain ES modules, so the "build"
// is a copy, and what runs in production is exactly what runs locally.

import { cp, rm, mkdir, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const src = join(root, 'src');
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(src, dist, { recursive: true });

async function measure(dir) {
  let bytes = 0;
  let files = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await measure(p);
      bytes += sub.bytes;
      files += sub.files;
    } else {
      bytes += (await stat(p)).size;
      files += 1;
    }
  }
  return { bytes, files };
}

const { bytes, files } = await measure(dist);
console.log(`built dist/: ${files} files, ${(bytes / 1024).toFixed(0)} KB`);
