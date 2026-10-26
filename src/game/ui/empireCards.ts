// Treść ekranu „Imperium” (od v0.32): znaczki, paski i alerty kart planet z danych gry.
// Czyste funkcje — testowane bez Phasera; tylko to, co gra naprawdę liczy.
import type { PlanetOverview } from '../../app/GameController.ts';
import { formatAmount, formatSpan } from './theme.ts';

export type CardTone = 'teal' | 'gold' | 'danger';

export interface CardBadge {
  label: string;
  tone: CardTone;
}

export interface CardBar {
  label: string;
  /** Wypełnienie 0..1. */
  value: number;
  text: string;
  tone: CardTone;
}

/** Bogactwo złóż od tylu (120%) — znaczek „bogata w …”. */
export const RICH_FROM = 1.2;
/** Złoże poniżej tej części — ostrzeżenie. */
export const DEPOSIT_LOW = 0.1;
/** Magazyn zapełni się szybciej niż za tyle sekund — ostrzeżenie. */
export const STORAGE_SOON_S = 30 * 60;

export function planetBadges(p: PlanetOverview): CardBadge[] {
  const badges: CardBadge[] = [];
  if (p.active) badges.push({ label: 'Tu jesteś', tone: 'teal' });
  const rich = p.planet.gameplay.richness;
  if (rich.metal >= RICH_FROM) badges.push({ label: 'bogata w metal', tone: 'gold' });
  if (rich.crystal >= RICH_FROM) badges.push({ label: 'bogata w kryształy', tone: 'gold' });
  if (p.stock.metal >= p.capacity || p.stock.crystal >= p.capacity) badges.push({ label: 'magazyn pełny', tone: 'danger' });
  if (p.deposits.left.metal <= 0 || p.deposits.left.crystal <= 0) badges.push({ label: 'złoże wyczerpane', tone: 'danger' });
  return badges;
}

/** Sekundy do zapełnienia magazynu (pierwszy z dwóch surowców); 0 — pełny; Infinity — nie rośnie. */
export function storageFullIn(p: PlanetOverview): number {
  const one = (have: number, perMinute: number) =>
    have >= p.capacity ? 0 : perMinute <= 0 ? Infinity : ((p.capacity - have) / perMinute) * 60;
  return Math.min(one(p.stock.metal, p.rates.metal), one(p.stock.crystal, p.rates.crystal));
}

export function planetBars(p: PlanetOverview): CardBar[] {
  const fill = Math.min(1, Math.max(p.stock.metal, p.stock.crystal) / Math.max(1, p.capacity));
  const fullIn = storageFullIn(p);
  const total = p.deposits.total.metal + p.deposits.total.crystal;
  const leftAmount = p.deposits.left.metal + p.deposits.left.crystal;
  const left = leftAmount / Math.max(1, total);
  const free = Math.max(0, p.fields.buildable - p.fields.used);
  const fields = p.fields.used / Math.max(1, p.fields.buildable);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return [
    {
      label: 'Magazyn',
      value: fill,
      text: fullIn === 0 ? `${pct(fill)} · pełny` : Number.isFinite(fullIn) ? `${pct(fill)} · pełny za ${formatSpan(fullIn)}` : pct(fill),
      tone: fullIn === 0 ? 'danger' : 'gold',
    },
    { label: 'Złoża', value: left, text: `${formatAmount(leftAmount)} · ${pct(left)}`, tone: left <= DEPOSIT_LOW ? 'danger' : 'teal' },
    { label: 'Pola', value: Math.min(1, fields), text: `${p.fields.used}/${p.fields.buildable} · ${free} wolnych`, tone: free === 0 ? 'danger' : 'gold' },
  ];
}

/** Co pokazać po dotknięciu alertu. */
export type AlertTarget = { kind: 'planet'; index: number } | { kind: 'research'; index: number } | { kind: 'map' };

export interface EmpireAlert {
  /** 0 — pilne (czerwone), 1 — ostrzeżenie (złote), 2 — okazja (turkus). */
  level: 0 | 1 | 2;
  text: string;
  target: AlertTarget;
  /** Planeta, której dotyczy (do sortowania „Problemy”). */
  index: number | null;
}

/**
 * Sytuacja imperium: co wymaga uwagi, od najpilniejszego. Tylko stany, które gra liczy:
 * pełny lub zapełniający się magazyn, brak energii, wyczerpane lub kończące się złoże,
 * stojąca budowa, Laboratorium bez badania, wolne miejsce na planetę.
 */
export function empireAlerts(overview: readonly PlanetOverview[], freeSlots: number): EmpireAlert[] {
  const alerts: EmpireAlert[] = [];
  for (const p of overview) {
    const planet = { kind: 'planet', index: p.index } as const;
    const fullIn = storageFullIn(p);
    if (fullIn === 0) alerts.push({ level: 0, text: `Magazyn na ${p.name} jest pełny — wydobycie stoi.`, target: planet, index: p.index });
    else if (fullIn < STORAGE_SOON_S) alerts.push({ level: 1, text: `Magazyn na ${p.name} zapełni się za ${formatSpan(fullIn)}.`, target: planet, index: p.index });
    if (p.rates.efficiency < 1) {
      alerts.push({ level: 0, text: `Na ${p.name} brakuje energii — kopalnie pracują w ${Math.round(p.rates.efficiency * 100)}%.`, target: planet, index: p.index });
    }
    for (const [id, name] of [['metal', 'metalu'], ['crystal', 'kryształów']] as const) {
      const left = p.deposits.left[id];
      const share = left / Math.max(1, p.deposits.total[id]);
      if (left <= 0) alerts.push({ level: 0, text: `Złoże ${name} na ${p.name} wyczerpane — kopalnia stoi.`, target: planet, index: p.index });
      else if (share < DEPOSIT_LOW) alerts.push({ level: 1, text: `Złoże ${name} na ${p.name} kończy się (${Math.round(share * 100)}%).`, target: planet, index: p.index });
    }
    if (!p.construction && p.fields.used < p.fields.buildable) {
      alerts.push({ level: 2, text: `${p.name}: nic się nie buduje, ${p.fields.buildable - p.fields.used} wolnych pól.`, target: planet, index: p.index });
    }
    if (p.labLevel > 0 && !p.researching) {
      alerts.push({ level: 2, text: `Laboratorium na ${p.name} nic nie bada — wybierz projekt.`, target: { kind: 'research', index: p.index }, index: p.index });
    }
  }
  if (freeSlots > 0) alerts.push({ level: 2, text: `Wolne miejsce na planetę (${freeSlots}) — wybierz ją na mapie.`, target: { kind: 'map' }, index: null });
  // Najpierw pilne, potem aktywna planeta (gracz jest na miejscu), dalej kolejność planet.
  const active = overview.find((p) => p.active)?.index;
  return alerts
    .map((a, order) => ({ a, order }))
    .sort((x, y) => x.a.level - y.a.level || Number(y.a.index === active) - Number(x.a.index === active) || x.order - y.order)
    .map(({ a }) => a);
}

export type PlanetSort = 'default' | 'production' | 'problems' | 'free';

/** Kolejność kart planet. Stabilna: przy remisie — kolejność w imperium. */
export function sortPlanets(overview: readonly PlanetOverview[], sort: PlanetSort, alerts: readonly EmpireAlert[] = []): PlanetOverview[] {
  const key = (p: PlanetOverview): number => {
    if (sort === 'production') return -(p.rates.metal + p.rates.crystal);
    if (sort === 'problems') return alerts.filter((a) => a.index === p.index).reduce((s, a) => s - (3 - a.level) * 10, 0);
    if (sort === 'free') return -(p.fields.buildable - p.fields.used);
    return 0;
  };
  return [...overview].sort((a, b) => key(a) - key(b) || a.index - b.index);
}
