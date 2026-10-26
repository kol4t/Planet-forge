// Ekspedycje (v0.34.3): wyprawy, które podnoszą wiedzę o galaktyce. Parametry (zasięg, czas, koszt,
// szansa, jakość danych) wynikają z odległości i badań Eksploracji; wynik losowany deterministycznie
// z celu i chwili wysłania — ponowne otwarcie gry nie zmienia ani nie powtarza wyniku.
import { findResearch } from '../../data/research.ts';
import { EXPEDITION_RULES } from '../../data/galaxy.ts';
import { createRng } from '../random/rng.ts';
import type { Expedition, ExpeditionRules, ExpeditionStat, Resources } from '../types.ts';
import { DISCOVERY, discoveryOf, isRare, raiseDiscovery, type Discoveries, type DiscoveryLevel } from './discovery.ts';
import type { Galaxy } from './galaxy.ts';

/** Możliwości ekspedycji z badań (najlepsza planeta imperium dla każdego parametru). */
export interface ExpeditionStats {
  unlocked: boolean;
  /** „Astrofizyka ekstremalna”: odczyt rzadkich obiektów ponad „wykryty”. */
  extreme: boolean;
  /** Dodatki do zasięgu (jedn.), jakości (poziomy), szansy (punkty procentowe), szybkości (%), sygnałów (jedn.). */
  range: number;
  quality: number;
  success: number;
  speed: number;
  scan: number;
}

const ZERO: Omit<ExpeditionStats, 'unlocked' | 'extreme'> = { range: 0, quality: 0, success: 0, speed: 0, scan: 0 };

/** Możliwości z badań wszystkich planet: odblokowanie — wystarczy jedna, parametry — najlepsza. */
export function expeditionStats(researchLists: readonly (readonly string[])[]): ExpeditionStats {
  const best = { ...ZERO };
  let unlocked = false;
  let extreme = false;
  for (const done of researchLists) {
    const sum = { ...ZERO };
    for (const id of new Set(done)) {
      for (const e of findResearch(id)?.effects ?? []) {
        if (e.kind === 'unlock' && e.feature === 'expeditions') unlocked = true;
        if (e.kind === 'unlock' && e.feature === 'extreme-astrophysics') extreme = true;
        if (e.kind === 'expedition') sum[e.stat] += e.add;
      }
    }
    for (const stat of Object.keys(best) as ExpeditionStat[]) best[stat] = Math.max(best[stat], sum[stat]);
  }
  return { unlocked, extreme, ...best };
}

/** Odległość celu od najbliższego układu gracza (jednostki mapy). */
export function distanceFrom(galaxy: Galaxy, own: readonly number[], target: number): number {
  const t = galaxy.systems[target - 1];
  if (!t) return Infinity;
  return Math.min(...own.map((i) => galaxy.systems[i - 1]).filter((s) => s !== undefined).map((s) => Math.hypot(s.x - t.x, s.y - t.y)));
}

export interface ExpeditionPlan {
  /** Czy można wysłać (bez sprawdzania surowców — to robi kontroler). */
  ok: boolean;
  /** Powód po polsku, gdy nie można. */
  reason: string | null;
  distance: number;
  range: number;
  seconds: number;
  cost: Resources;
  chance: number;
  quality: number;
  scan: number;
  extreme: boolean;
}

/** Plan wyprawy do układu: zasięg, czas, koszt, szansa i powód, jeśli się nie da. */
export function planExpedition(
  galaxy: Galaxy,
  known: Discoveries,
  own: readonly number[],
  active: readonly Expedition[],
  target: number,
  stats: ExpeditionStats,
  rules: ExpeditionRules = EXPEDITION_RULES,
): ExpeditionPlan {
  const distance = distanceFrom(galaxy, own, target);
  const range = rules.baseRange + stats.range;
  const [min, max] = rules.successRange;
  const chance = Math.min(max, Math.max(min, rules.baseSuccess + stats.success / 100 - Math.max(0, distance - rules.easyDistance) * rules.successPerUnit));
  const seconds = Math.round((rules.baseSeconds + distance * rules.secondsPerUnit) * Math.max(0.25, 1 - stats.speed / 100));
  const cost = {
    metal: Math.round(rules.cost.metal + distance * rules.costPerUnit.metal),
    crystal: Math.round(rules.cost.crystal + distance * rules.costPerUnit.crystal),
  };
  const plan = { distance, range, seconds, cost, chance, quality: rules.baseQuality + stats.quality, scan: rules.scanRadius + stats.scan, extreme: stats.extreme };
  const fail = (reason: string): ExpeditionPlan => ({ ok: false, reason, ...plan });
  if (!stats.unlocked) return fail('Najpierw zbadaj „Sondy zwiadowcze” (Badania → Eksploracja).');
  if (discoveryOf(known, target) >= DISCOVERY.explored) return fail('Ten układ jest już zbadany.');
  if (discoveryOf(known, target) === DISCOVERY.unknown) return fail('O tym miejscu nic nie wiadomo — najpierw musi pojawić się sygnał.');
  if (active.some((e) => e.target === target)) return fail('Ekspedycja już leci w to miejsce.');
  if (isRare(galaxy, target) && !stats.extreme && discoveryOf(known, target) >= DISCOVERY.detected) {
    return fail('Niezwykły obiekt — nie umiemy odczytać jego sygnału. Potrzebna „Astrofizyka ekstremalna” (Eksploracja).');
  }
  if (active.length >= rules.maxActive) return fail(`Naraz najwyżej ${rules.maxActive} ekspedycje — poczekaj na powrót.`);
  if (distance > range) return fail(`Poza zasięgiem (${Math.round(distance)} z ${Math.round(range)} jedn.) — zasięg zwiększają badania sond.`);
  return { ok: true, reason: null, ...plan };
}

export interface ExpeditionOutcome {
  success: boolean;
  known: Discoveries;
  /** Poziom wiedzy o celu przed i po. */
  before: DiscoveryLevel;
  after: DiscoveryLevel;
  /** Nowe sygnały (i — przy wysokiej jakości — wykryte układy) wokół celu. */
  revealed: number[];
  /** Rzadki obiekt, którego bez „Astrofizyki ekstremalnej” nie dało się odczytać ponad „wykryty”. */
  unreadable: boolean;
}

/**
 * Wynik wyprawy (deterministyczny z celu i chwili wysłania). Udana: wiedza o celu rośnie o 1 + jakość
 * poziomów (do „zbadany”), a nieznane układy w promieniu sygnałów stają się sygnałami (jakość ≥ 2:
 * wykrytymi). Nieudana: nic (koszt przepada).
 */
export function resolveExpedition(galaxy: Galaxy, known: Discoveries, expedition: Expedition): ExpeditionOutcome {
  const rng = createRng(`ekspedycja|${expedition.target}|${expedition.departedAt}`);
  const before = discoveryOf(known, expedition.target);
  const success = rng.next() < expedition.chance;
  if (!success) return { success, known, before, after: before, revealed: [], unreadable: false };
  const full = Math.min(DISCOVERY.explored, before + 1 + expedition.quality) as DiscoveryLevel;
  // Rzadki obiekt bez „Astrofizyki ekstremalnej”: tylko położenie i nazwa (niezwykły sygnał).
  const unreadable = isRare(galaxy, expedition.target) && !expedition.extreme;
  const after = unreadable ? (Math.max(before, Math.min(full, DISCOVERY.detected)) as DiscoveryLevel) : full;
  let next = raiseDiscovery(known, expedition.target, after);
  const t = galaxy.systems[expedition.target - 1]!;
  const revealed: number[] = [];
  const around = expedition.quality >= 2 ? DISCOVERY.detected : DISCOVERY.signal;
  for (const s of galaxy.systems) {
    if (s.index === expedition.target || Math.hypot(s.x - t.x, s.y - t.y) > expedition.scan) continue;
    if (discoveryOf(next, s.index) >= around) continue;
    // Rzadkie obiekty wokół celu — tylko jako sygnał (szczegóły wymagają osobnej wyprawy).
    if (isRare(galaxy, s.index) && around > DISCOVERY.signal && !expedition.extreme) {
      if (discoveryOf(next, s.index) < DISCOVERY.signal) {
        next = raiseDiscovery(next, s.index, DISCOVERY.signal);
        revealed.push(s.index);
      }
      continue;
    }
    next = raiseDiscovery(next, s.index, around);
    revealed.push(s.index);
  }
  return { success, known: next, before, after, revealed, unreadable };
}

/** Odczyt z zapisu (błędne wpisy pomijane). */
export function parseExpeditions(raw: unknown): Expedition[] {
  if (!Array.isArray(raw)) return [];
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  return raw.flatMap((e: any): Expedition[] =>
    e &&
    Number.isInteger(e.target) &&
    e.target >= 1 &&
    typeof e.from === 'string' &&
    num(e.departedAt) &&
    num(e.returnsAt) &&
    e.returnsAt >= e.departedAt &&
    num(e.cost?.metal) &&
    num(e.cost?.crystal) &&
    num(e.chance) &&
    e.chance >= 0 &&
    e.chance <= 1 &&
    Number.isInteger(e.quality) &&
    e.quality >= 0 &&
    num(e.scan) &&
    e.scan >= 0
      ? [
          {
            target: e.target,
            from: e.from,
            departedAt: e.departedAt,
            returnsAt: e.returnsAt,
            cost: { metal: e.cost.metal, crystal: e.cost.crystal },
            chance: e.chance,
            quality: e.quality,
            scan: e.scan,
            ...(e.extreme === true ? { extreme: true } : {}),
          },
        ]
      : [],
  );
}
