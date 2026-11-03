// Audyt (2026-11): z czego składa się dist/index.html — rozmiar kodu po zminifikowaniu wg pakietu i katalogu źródeł.
// Jednorazowy pomiar: `node scripts/audyt/bundle.ts`. Nie zmienia buildu gry.
import { build } from 'esbuild';

const result = await build({
  bundle: true,
  entryPoints: ['src/app/main.ts'],
  minify: true,
  write: false,
  metafile: true,
  format: 'iife',
  define: { __PWA__: 'true', __APP_VERSION__: '"audyt"' },
  logLevel: 'silent',
});
const out = Object.values(result.metafile.outputs)[0]!;
const groups = new Map<string, number>();
for (const [file, info] of Object.entries(out.inputs)) {
  const key = file.startsWith('node_modules/')
    ? file.split('/').slice(0, file.includes('three/examples') ? 4 : 2).join('/')
    : file.split('/').slice(0, 2).join('/');
  groups.set(key, (groups.get(key) ?? 0) + info.bytesInOutput);
}
const total = out.bytes;
console.log(`JS po minifikacji: ${(total / 1024).toFixed(0)} KB`);
for (const [k, v] of [...groups].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`${k.padEnd(40)} ${(v / 1024).toFixed(0).padStart(6)} KB  ${((100 * v) / total).toFixed(1)}%`);
const files = Object.entries(out.inputs).filter(([f]) => f.startsWith('src/')).sort((a, b) => b[1].bytesInOutput - a[1].bytesInOutput).slice(0, 10);
console.log('\nNajwiększe pliki gry:');
for (const [f, i] of files) console.log(`${f.padEnd(50)} ${(i.bytesInOutput / 1024).toFixed(0).padStart(5)} KB`);
