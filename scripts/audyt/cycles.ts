// Audyt (2026-11): cykliczne zależności między plikami src/ (importy względne). `node scripts/audyt/cycles.ts`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(resolve(p)); } };
walk('src');
const graph = new Map<string, string[]>();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const deps = [...src.matchAll(/^import\s+(?!type\b)[^'"]*from\s+'(\.[^']+)'/gm)].map((m) => resolve(dirname(f), m[1]!));
  graph.set(f, deps.filter((d) => graph.has(d) || files.includes(d)));
}
const cycles = new Set<string>();
const stack: string[] = [];
const state = new Map<string, number>();
const visit = (n: string) => {
  state.set(n, 1); stack.push(n);
  for (const d of graph.get(n) ?? []) {
    if (state.get(d) === 1) cycles.add(stack.slice(stack.indexOf(d)).map((p) => p.split('/src/')[1]).join(' → '));
    else if (!state.get(d)) visit(d);
  }
  stack.pop(); state.set(n, 2);
};
for (const f of files) if (!state.get(f)) visit(f);
console.log(`Pliki: ${files.length}, cykle (importy wartości): ${cycles.size}`);
for (const c of cycles) console.log(' - ' + c);
