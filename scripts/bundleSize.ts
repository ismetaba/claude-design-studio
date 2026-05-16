import { gzipSync } from 'node:zlib';

export const BUDGET_BYTES = 350 * 1024;

export interface BundleFile {
  path: string;
  content: string;
}

export interface BundleReport {
  ok: boolean;
  monacoBytes: number;
  nonMonacoBytes: number;
  entryHasMonaco: boolean;
  budget: number;
  files: Array<{ path: string; gzBytes: number; isMonaco: boolean }>;
}

function isMonacoChunk(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.includes('monaco') || lower.includes('language-features');
}

function isEntryChunk(path: string): boolean {
  // Vite emits the main entry as dist/assets/index-<hash>.js.
  return /assets\/index-[A-Za-z0-9_-]+\.js$/.test(path);
}

/** Pure function: classify, gzip-measure, and report on a set of bundle files. */
export function computeBundleReport(files: BundleFile[], budget = BUDGET_BYTES): BundleReport {
  let monacoBytes = 0;
  let nonMonacoBytes = 0;
  let entryHasMonaco = false;
  const report: BundleReport['files'] = [];
  for (const file of files) {
    const isMonaco = isMonacoChunk(file.path);
    const gzBytes = gzipSync(Buffer.from(file.content)).length;
    if (isMonaco) monacoBytes += gzBytes;
    else nonMonacoBytes += gzBytes;
    if (isEntryChunk(file.path) && /monaco/i.test(file.content)) {
      entryHasMonaco = true;
    }
    report.push({ path: file.path, gzBytes, isMonaco });
  }
  return {
    // Non-Monaco gz size is the hard budget. Monaco references in the entry
    // chunk (e.g. lazy-import URLs) are informational and tracked separately.
    ok: nonMonacoBytes <= budget,
    monacoBytes,
    nonMonacoBytes,
    entryHasMonaco,
    budget,
    files: report,
  };
}
