// Teksty geologii planety na mapie (czyste — testowane bez Phasera).
import type { Geology, GeologyDiff } from '../../core/economy/geology.ts';
import { formatAmount } from './theme.ts';

const signed = (v: number, unit = '') => (v === 0 ? `±0${unit}` : `${v > 0 ? '+' : '−'}${Math.abs(v)}${unit}`);
const percent = (ratio: number) => signed(Math.round(ratio * 100), '%');

/**
 * „Pola: 120 · Złoże: metal 2,9 mln · kryształy 1,1 mln” (własna planeta: „zostało … z …”)
 * i opcjonalnie „Względem Kepler-186 f: metal +16% · kryształy −8% · pola +20”.
 */
export function geologyLines(g: Geology, compare: { name: string; diff: GeologyDiff } | null = null): string[] {
  const res = (id: 'metal' | 'crystal') =>
    g.left ? `${formatAmount(g.left[id])} z ${formatAmount(g.total[id])}` : formatAmount(g.total[id]);
  const lines = [`Pola: ${g.fields} · ${g.left ? 'Zostało' : 'Złoże'}: metal ${res('metal')} · kryształy ${res('crystal')}`];
  if (compare) {
    const d = compare.diff;
    lines.push(`Względem ${compare.name}: metal ${percent(d.metal)} · kryształy ${percent(d.crystal)} · pola ${signed(d.fields)}`);
  }
  return lines;
}
