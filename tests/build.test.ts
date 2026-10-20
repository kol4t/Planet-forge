import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { buildAll, ICONS, type BuildResult } from '../scripts/build.ts';
import { pngSize } from '../scripts/png.ts';

// Jeden build do katalogu tymczasowego, sprawdzany przez wszystkie testy poniżej.
let dir = '';
let result: BuildResult;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'planet-forge-build-'));
  result = await buildAll(dir);
});
after(() => rm(dir, { recursive: true, force: true }));

test('build tworzy grę, manifest, service worker i ikony', () => {
  assert.deepEqual(result.files, [
    'icons/apple-touch-icon.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'index.html',
    'manifest.webmanifest',
    'sw.js',
  ]);
  assert.match(result.version, /^[0-9a-f]{12}$/);
});

test('manifest: nazwa, tryb pełnoekranowy, kolory i ikony 192/512', async () => {
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'Planet Forge');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/);
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable'));
});

test('ikony to PNG o właściwych rozmiarach (180, 192, 512)', async () => {
  for (const icon of ICONS) {
    const size = pngSize(await readFile(join(dir, icon.file)));
    assert.deepEqual(size, { width: icon.size, height: icon.size }, icon.file);
  }
});

test('index.html: manifest, ikona iOS, tryb pełnoekranowy, safe-area', async () => {
  const html = await readFile(join(dir, 'index.html'), 'utf8');
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png"/);
  assert.match(html, /apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /env\(safe-area-inset-top\)/);
  assert.ok(!html.includes('<!--APP_SCRIPT-->'), 'kod gry wklejony');
});

test('service worker: wersja buildu i lista plików offline', async () => {
  const sw = await readFile(join(dir, 'sw.js'), 'utf8');
  assert.ok(sw.includes(result.version));
  for (const file of ['./', './index.html', './manifest.webmanifest', ...ICONS.map((i) => `./${i.file}`)]) {
    assert.ok(sw.includes(JSON.stringify(file)), `brak ${file}`);
  }
  assert.ok(sw.includes('SKIP_WAITING'));
});
