import { readdir } from 'node:fs/promises';
import { report } from './harness.mjs';

const here = new URL('./', import.meta.url);
const files = (await readdir(here)).filter((f) => f.endsWith('.test.mjs')).sort();
for (const f of files) await import(new URL(f, here).href);

process.exit(report() ? 1 : 0);
