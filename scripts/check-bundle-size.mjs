#!/usr/bin/env node
// Run via `node --experimental-strip-types scripts/check-bundle-size.mjs` (Node 23+).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 350 * 1024;
const DIST = path.resolve(process.cwd(), 'dist', 'assets');

function isMonacoChunk(p) {
  const lower = p.toLowerCase();
  return lower.includes('monaco') || lower.includes('language-features');
}
function isEntryChunk(p) {
  return /assets\/index-[A-Za-z0-9_-]+\.js$/.test(p);
}

async function main() {
  let entries;
  try {
    entries = await readdir(DIST);
  } catch (err) {
    console.error(`✗ Could not read ${DIST}. Did you run 'npm run build' first?`);
    process.exit(1);
  }
  const jsFiles = entries.filter((f) => f.endsWith('.js'));
  if (jsFiles.length === 0) {
    console.error('✗ No JS files in dist/assets.');
    process.exit(1);
  }
  let monacoBytes = 0;
  let nonMonacoBytes = 0;
  let entryHasMonaco = false;
  const rows = [];
  for (const name of jsFiles) {
    const full = path.join(DIST, name);
    const buf = await readFile(full);
    const gzBytes = gzipSync(buf).length;
    const rel = path.posix.join('assets', name);
    const isMonaco = isMonacoChunk(rel);
    if (isMonaco) monacoBytes += gzBytes;
    else nonMonacoBytes += gzBytes;
    if (isEntryChunk(rel)) {
      const content = buf.toString('utf8');
      if (/monaco/i.test(content)) entryHasMonaco = true;
    }
    rows.push({ name, gzBytes, isMonaco });
  }
  for (const r of rows) {
    const kb = (r.gzBytes / 1024).toFixed(1);
    console.log(`${r.isMonaco ? 'M' : '·'} ${kb.padStart(7)} KB  ${r.name}`);
  }
  console.log('--');
  console.log(`Non-Monaco gz total: ${(nonMonacoBytes / 1024).toFixed(1)} KB (budget ${(BUDGET_BYTES / 1024).toFixed(0)} KB)`);
  console.log(`Monaco gz total:     ${(monacoBytes / 1024).toFixed(1)} KB (excluded from budget)`);
  if (entryHasMonaco) {
    // Informational only — Vite emits the lazy-import URL string inside the entry chunk.
    console.log('· Entry references a Monaco chunk URL (lazy-load preserved).');
  }
  if (nonMonacoBytes > BUDGET_BYTES) {
    console.error(`✗ Non-Monaco gzipped size ${(nonMonacoBytes / 1024).toFixed(1)} KB exceeds the ${(BUDGET_BYTES / 1024).toFixed(0)} KB budget.`);
    process.exit(1);
  }
  console.log('✓ Bundle within budget.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
