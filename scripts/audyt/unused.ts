// Audyt (2026-11): eksporty z src/, których nie używa żaden inny plik (src, tests, scripts) — kandydaci na martwy kod.
// Przybliżenie (szuka nazwy jako słowa); `node scripts/audyt/unused.ts`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const list = (d: string, out: string[] = []) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) list(p, out); else if (/\.ts$/.test(p)) out.push(p); } return out; };
const src = list('src');
const all = [...src, ...list('tests'), ...list('scripts')];
const text = new Map(all.map((f) => [f, readFileSync(f, 'utf8')]));
const unusedFiles: string[] = [];
let count = 0;
for (const f of src) {
  const names = [...text.get(f)!.matchAll(/^export\s+(?:async\s+)?(?:function|const|class|let|interface|type|enum)\s+(\w+)/gm)].map((m) => m[1]!);
  const dead = names.filter((n) => !all.some((g) => g !== f && new RegExp(`\\b${n}\\b`).test(text.get(g)!)) && (text.get(f)!.match(new RegExp(`\\b${n}\\b`, 'g'))?.length ?? 0) <= 1);
  if (dead.length) { console.log(`${f}: ${dead.join(', ')}`); count += dead.length; }
  const base = f.split('/').pop()!.replace('.ts', '');
  if (!f.endsWith('main.ts') && !all.some((g) => g !== f && text.get(g)!.includes(`/${base}.ts'`))) unusedFiles.push(f);
}
console.log(`\nNieużywane eksporty (także wewnątrz pliku): ${count}`);
console.log(`Pliki, których nikt nie importuje: ${unusedFiles.join(', ') || 'brak'}`);
