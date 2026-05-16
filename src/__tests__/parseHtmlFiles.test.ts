import { describe, it, expect } from 'vitest';
import { parseHtmlFiles, defaultFileId, fileById } from '../lib/parseHtmlFiles';

describe('parseHtmlFiles', () => {
  it('returns just an empty index.html for blank input', () => {
    const files = parseHtmlFiles('');
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      id: 'pages/index',
      name: 'index.html',
      kind: 'page',
      section: 'pages',
      content: '',
      editable: true,
    });
  });

  it('uses <title> to name the page (slugified)', () => {
    const html = `<html><head><title>My Cool Page!</title></head><body></body></html>`;
    const files = parseHtmlFiles(html);
    expect(files[0].name).toBe('my-cool-page.html');
    expect(files[0].editable).toBe(true);
  });

  it('extracts <style> blocks into a styles.css virtual file', () => {
    const html = `<html><head><style>body{color:red}</style><style>.x{padding:1px}</style></head><body></body></html>`;
    const files = parseHtmlFiles(html);
    const styles = files.find((f) => f.section === 'styles');
    expect(styles).toBeTruthy();
    expect(styles?.name).toBe('styles.css');
    expect(styles?.language).toBe('css');
    expect(styles?.content).toContain('body{color:red}');
    expect(styles?.content).toContain('.x{padding:1px}');
    expect(styles?.editable).toBe(false);
  });

  it('extracts inline <script> bodies, skipping CDN/external ones', () => {
    const html = `<html><body>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/lib.js"></script>
      <script>console.log('inline');</script>
      <script>function go(){return 1}</script>
    </body></html>`;
    const files = parseHtmlFiles(html);
    const scripts = files.find((f) => f.section === 'scripts');
    expect(scripts).toBeTruthy();
    expect(scripts?.language).toBe('javascript');
    expect(scripts?.content).toContain("console.log('inline');");
    expect(scripts?.content).toContain('function go()');
    expect(scripts?.content).not.toContain('tailwindcss');
    expect(scripts?.content).not.toContain('unpkg');
  });

  it('emits one component per top-level semantic tag in <body>', () => {
    const html = `<html><body>
      <header id="masthead"><h1>Hi</h1></header>
      <main class="container mx-auto">main here</main>
      <footer class="page-footer">bye</footer>
    </body></html>`;
    const files = parseHtmlFiles(html);
    const components = files.filter((f) => f.section === 'components');
    expect(components).toHaveLength(3);
    // id wins for naming
    expect(components[0].name).toBe('Masthead.html');
    // class fallback (filtered, picks first usable token)
    expect(components[1].name).toBe('Container.html');
    // class fallback
    expect(components[2].name).toBe('PageFooter.html');
    // All read-only
    components.forEach((c) => expect(c.editable).toBe(false));
  });

  it('deduplicates duplicate component names', () => {
    const html = `<body>
      <section id="hero">A</section>
      <section id="hero">B</section>
      <section id="hero">C</section>
    </body>`;
    const files = parseHtmlFiles(html);
    const components = files.filter((f) => f.section === 'components');
    expect(components.map((c) => c.name)).toEqual(['Hero.html', 'Hero2.html', 'Hero3.html']);
  });

  it('falls back to TagName-index when no id/class', () => {
    const html = `<body>
      <section>A</section>
      <section>B</section>
    </body>`;
    const files = parseHtmlFiles(html);
    const components = files.filter((f) => f.section === 'components');
    expect(components.map((c) => c.name)).toEqual(['Section-1.html', 'Section-2.html']);
  });

  it('does not emit a styles or scripts entry when there are none', () => {
    const html = `<html><body><p>Just text</p></body></html>`;
    const files = parseHtmlFiles(html);
    expect(files.find((f) => f.section === 'styles')).toBeUndefined();
    expect(files.find((f) => f.section === 'scripts')).toBeUndefined();
  });

  it('only considers <body> contents for components, not <head>', () => {
    const html = `<html><head><section id="head-only">x</section></head><body><section id="from-body">y</section></body></html>`;
    const files = parseHtmlFiles(html);
    const components = files.filter((f) => f.section === 'components');
    expect(components).toHaveLength(1);
    expect(components[0].name).toBe('FromBody.html');
  });
});

describe('parseHtmlFiles helpers', () => {
  it('defaultFileId returns first file id', () => {
    const files = parseHtmlFiles('<html><body><section id="x">y</section></body></html>');
    expect(defaultFileId(files)).toBe('pages/index');
  });

  it('fileById finds the right entry', () => {
    const files = parseHtmlFiles('<html><body><section id="hero">y</section></body></html>');
    expect(fileById(files, 'components/Hero.html')?.name).toBe('Hero.html');
    expect(fileById(files, 'missing')).toBeUndefined();
  });
});
