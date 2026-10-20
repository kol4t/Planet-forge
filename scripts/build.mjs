// Buduje grę do JEDNEGO pliku dist/index.html (skrypt wklejony w HTML).
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

export const buildOptions = {
  entryPoints: ['src/app/main.ts'],
  bundle: true,
  format: 'iife',
  target: ['safari15'],
  minify: true,
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
};

export async function renderHtml(js) {
  const template = await readFile('index.html', 'utf8');
  // </script> wewnątrz kodu zamknąłby znacznik — zabezpieczenie.
  const safe = js.replace(/<\/script/gi, '<\\/script');
  return template.replace('<!--APP_SCRIPT-->', () => `<script>${safe}</script>`);
}

export async function buildOnce(options = {}) {
  const result = await build({ ...buildOptions, ...options });
  const html = await renderHtml(result.outputFiles[0].text);
  await mkdir('dist', { recursive: true });
  await writeFile('dist/index.html', html);
  return html.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const size = await buildOnce();
  console.log(`dist/index.html — ${(size / 1024).toFixed(0)} KB`);
}
