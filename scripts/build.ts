// Build gry do dist/:
//   index.html             — gra (cały kod JS wklejony w HTML, jak dotąd)
//   manifest.webmanifest   — opis aplikacji dla „Do ekranu początkowego”
//   sw.js                  — service worker (offline + aktualizacje)
//   icons/*.png            — ikony renderowane z planety startowej
// Wszystkie ścieżki są względne, więc gra działa także w podfolderze (np. GitHub Pages).
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build, type BuildOptions } from 'esbuild';
import { renderIcon } from './icons.ts';
import { encodePng } from './png.ts';

export const ICONS = [
  { file: 'icons/apple-touch-icon.png', size: 180 },
  { file: 'icons/icon-192.png', size: 192 },
  { file: 'icons/icon-512.png', size: 512 },
] as const;

/** Kolory z theme (index.html / src/game/ui/theme.ts). */
const THEME_COLOR = '#060b0d';
const BACKGROUND_COLOR = '#05090b';

async function appVersion(): Promise<string> {
  return (JSON.parse(await readFile('package.json', 'utf8')) as { version: string }).version;
}

const common: BuildOptions = {
  bundle: true,
  format: 'iife',
  target: ['safari15'],
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
};

/** Kod gry (JS). `pwa: false` — bez service workera (podgląd `npm run dev`). */
export async function bundleApp(options: { minify: boolean; pwa: boolean }): Promise<string> {
  const result = await build({
    ...common,
    entryPoints: ['src/app/main.ts'],
    minify: options.minify,
    sourcemap: options.minify ? false : 'inline',
    define: { __PWA__: String(options.pwa), __APP_VERSION__: JSON.stringify(await appVersion()) },
  });
  return result.outputFiles![0]!.text;
}

export async function renderHtml(js: string): Promise<string> {
  const template = await readFile('index.html', 'utf8');
  // </script> wewnątrz kodu zamknąłby znacznik — zabezpieczenie.
  const safe = js.replace(/<\/script/gi, '<\\/script');
  return template.replace('<!--APP_SCRIPT-->', () => `<script>${safe}</script>`);
}

export function manifest(): string {
  return JSON.stringify(
    {
      id: './',
      name: 'Planet Forge',
      short_name: 'Planet Forge',
      description: 'Strategia sci-fi z jedną planetą 3D.',
      lang: 'pl',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'any',
      theme_color: THEME_COLOR,
      background_color: BACKGROUND_COLOR,
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  );
}

export interface BuildResult {
  /** Skrót zawartości buildu — nazwa pamięci podręcznej service workera. */
  version: string;
  files: string[];
}

export async function buildAll(outDir = 'dist'): Promise<BuildResult> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'icons'), { recursive: true });

  const assets = new Map<string, Uint8Array | string>();
  assets.set('index.html', await renderHtml(await bundleApp({ minify: true, pwa: true })));
  assets.set('manifest.webmanifest', manifest());
  for (const icon of ICONS) assets.set(icon.file, encodePng(icon.size, icon.size, renderIcon(icon.size)));

  // Wersja = skrót wszystkich plików → każda zmiana gry to nowa pamięć podręczna i komunikat o aktualizacji.
  const hash = createHash('sha256');
  for (const [name, content] of [...assets].sort(([a], [b]) => a.localeCompare(b))) hash.update(name).update(content);
  const version = hash.digest('hex').slice(0, 12);

  const precache = ['./', ...[...assets.keys()].map((name) => `./${name}`)];
  const sw = await build({
    ...common,
    entryPoints: ['src/app/serviceWorker.ts'],
    minify: true,
    define: { __BUILD_VERSION__: JSON.stringify(version), __PRECACHE__: JSON.stringify(precache) },
  });
  assets.set('sw.js', sw.outputFiles![0]!.text);

  for (const [name, content] of assets) await writeFile(join(outDir, name), content);
  return { version, files: [...assets.keys()].sort() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { version, files } = await buildAll();
  console.log(`dist/ (wersja ${version}):`);
  for (const file of files) console.log(`  ${file}`);
}
