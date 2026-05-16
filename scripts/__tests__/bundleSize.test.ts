import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import { computeBundleReport, BUDGET_BYTES } from '../bundleSize';

function gz(content: string): { name: string; bytes: Buffer; gzBytes: number } {
  const buf = Buffer.from(content);
  const gzBuf = gzipSync(buf);
  return { name: 'placeholder', bytes: buf, gzBytes: gzBuf.length };
}

describe('computeBundleReport', () => {
  it('classifies monaco chunks separately and returns ok when under budget', () => {
    const { gzBytes: smallGz } = gz('x'.repeat(1024));
    const files = [
      { path: 'dist/assets/index-abc.js', content: 'main entry' },
      { path: 'dist/assets/monaco-editor-xyz.js', content: 'huge monaco code' },
    ];
    const report = computeBundleReport(files, BUDGET_BYTES);
    expect(report.ok).toBe(true);
    expect(report.monacoBytes).toBeGreaterThan(0);
    expect(report.nonMonacoBytes).toBeGreaterThan(0);
    expect(report.budget).toBe(BUDGET_BYTES);
    expect(smallGz).toBeGreaterThan(0);
  });

  it('fails when non-Monaco gzipped exceeds the budget', () => {
    // Use cryptographically random bytes so gzip can't compress them; this guarantees
    // the gzipped size is close to the input size.
    const incompressible = randomBytes(400 * 1024).toString('binary');
    const report = computeBundleReport(
      [{ path: 'dist/assets/index-abc.js', content: incompressible }],
      350 * 1024,
    );
    expect(report.ok).toBe(false);
    expect(report.nonMonacoBytes).toBeGreaterThan(350 * 1024);
  });

  it('flags monaco strings appearing in the entry chunk', () => {
    const report = computeBundleReport(
      [{ path: 'dist/assets/index-abc.js', content: 'monaco editor inline import oh no' }],
      BUDGET_BYTES,
    );
    expect(report.entryHasMonaco).toBe(true);
  });
});
