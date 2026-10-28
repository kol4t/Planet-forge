// Symulator pętli MVP (etap 1 planu w docs/status.md): „rozsądny gracz” gra zwykłymi akcjami GameController
// (te same, które wywołują przyciski) w przyspieszonym czasie — rozwija planetę, bada, kolonizuje, wozi surowce —
// aż na 3 planetach wydobędzie ≥ 80% złóż (warunek zamknięcia pętli, decyzja właściciela) albo minie limit dni.
// Nic w grze nie zmienia. Wynik: docs/balans-symulacja.md (tabela przebiegów i oś czasu).
// Uruchomienie: npm run simulate (albo node scripts/simulate.ts [dni=120] [plik=docs/balans-symulacja.md]);
// SIM_PROFILE=aktywny|okazjonalny i SIM_STRATEGY=petla|chciwy zawężają przebiegi.
import { writeFileSync } from 'node:fs';
import type { BuildingId, Resources } from '../src/core/types.ts';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const { GameController } = await import('../src/app/GameController.ts');
const { RESEARCH_NODES } = await import('../src/data/research.ts');
const { BALANCE } = await import('../src/data/balance.ts');
const { stageName } = await import('../src/core/economy/footprint.ts');
const { generateSystem } = await import('../src/core/galaxy/galaxy.ts');

const MAX_DAYS = Number(process.argv[2] ?? 120);
const OUT = process.argv[3] ?? 'docs/balans-symulacja.md';
const START = Date.UTC(2026, 0, 1, 8, 0, 0);
const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** Próg „planeta wyeksploatowana” (decyzja właściciela: 80% złóż metalu i kryształów). */
const EXPLOITED = 0.8;
const MINES: BuildingId[] = ['metalMine', 'crystalMine'];

/** Kiedy gracz zagląda do gry: co ile minut i w jakich godzinach doby. */
interface Profile {
  id: string;
  name: string;
  everyMinutes: number;
  /** Godziny doby (UTC, start 8:00), w których gra; poza nimi — nieobecność (limit 8 h produkcji nadal działa). */
  from: number;
  to: number;
}

const PROFILES: Profile[] = [
  { id: 'aktywny', name: 'Aktywny (co 15 min, 8:00–24:00)', everyMinutes: 15, from: 8, to: 24 },
  { id: 'okazjonalny', name: 'Okazjonalny (co 3 h, 8:00–23:00)', everyMinutes: 180, from: 8, to: 23 },
];

/** Kiedy zakładać kolejną kolonię. */
interface Strategy {
  id: string;
  name: string;
  colonizeWhen: (sim: Sim) => boolean;
}

const STRATEGIES: Strategy[] = [
  {
    id: 'petla',
    name: 'Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)',
    colonizeWhen: (sim) => sim.lastShare() >= 0.5,
  },
  { id: 'chciwy', name: 'Chciwy (kolonizuje, gdy tylko może)', colonizeWhen: () => true },
];

interface Event {
  at: number;
  text: string;
}

class Sim {
  readonly game: InstanceType<typeof GameController>;
  readonly events: Event[] = [];
  /** Powody, dla których ulepszenie się nie udało (licznik). */
  readonly blocked = new Map<string, number>();
  /** Czas (ms) bez trwającej budowy na każdej planecie, liczony między wizytami gracza. */
  idleMs: number[] = [];
  private idle: boolean[] = [];
  private streak: number[] = [];
  longestIdle: { ms: number; planet: string; at: number } = { ms: 0, planet: '', at: 0 };
  private lastCheck = START;
  private readonly seen = new Set<string>();
  exploitedAt: (number | null)[] = [];
  transports = 0;
  /** Ile razy lot nie wystartował z braku paliwa (antymaterii). */
  fuelBlocked = 0;
  private planetsSeen = 1;

  readonly profile: Profile;
  readonly strategy: Strategy;

  constructor(profile: Profile, strategy: Strategy) {
    this.profile = profile;
    this.strategy = strategy;
    store.clear();
    this.game = new GameController(START);
  }

  log(at: number, text: string): void {
    this.events.push({ at, text });
  }

  once(key: string, at: number, text: string): void {
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.log(at, text);
  }

  /** Udział wydobytych złóż (mniejszy z metalu i kryształów) każdej planety. */
  shares(now: number): number[] {
    return this.game.overview(now).map((p) => {
      const share = (id: keyof Resources) => (p.deposits.total[id] > 0 ? 1 - p.deposits.left[id] / p.deposits.total[id] : 1);
      return Math.min(share('metal'), share('crystal'));
    });
  }

  lastShare(): number {
    const s = this.shares(this.now);
    return s[s.length - 1] ?? 0;
  }

  now = START;

  /** Jedna wizyta gracza: każda planeta po kolei — badanie, budowa, transport; potem ewentualnie kolonia. */
  visit(now: number): void {
    this.now = now;
    const game = this.game;
    const count = game.planets().length;
    // Przestoje: planeta, która przy poprzedniej wizycie została bez budowy (nie było na nic surowców ani miejsca),
    // stała bezczynnie do tej wizyty (przybliżenie z dokładnością do odstępu między wizytami).
    const gap = now - this.lastCheck;
    this.idle.forEach((wasIdle, i) => {
      if (!wasIdle) {
        this.streak[i] = 0;
        return;
      }
      this.idleMs[i] = (this.idleMs[i] ?? 0) + gap;
      this.streak[i] = (this.streak[i] ?? 0) + gap;
      if (this.streak[i]! > this.longestIdle.ms) this.longestIdle = { ms: this.streak[i]!, planet: game.planets()[i]?.name ?? '', at: now };
    });
    this.lastCheck = now;
    for (let i = 0; i < count; i++) {
      game.switchPlanet(i, now);
      // Ekran gry nalicza czas w każdej klatce — tu przy każdej wizycie (switchPlanet na tę samą planetę nic nie robi).
      game.tick(now);
      this.research(now);
      this.build(now);
      const left = game.deposits;
      // Bezczynna = nic się nie buduje, a są jeszcze złoża (wyeksploatowana planeta bez budowy to nie przestój gracza).
      this.idle[i] = !game.economy.construction && (left.metal.left > 0 || left.crystal.left > 0);
    }
    this.transport(now);
    this.colonize(now);
    this.track(now);
  }

  private research(now: number): void {
    const game = this.game;
    if (game.research.current) return;
    let best: { id: string; price: number } | null = null;
    for (const node of RESEARCH_NODES) {
      if (game.researchStatus(node.id) !== 'available') continue;
      const cost = game.researchCost(node.id);
      if (!cost || cost.antimatter > 0) continue;
      const stock = game.economy.stock;
      if (cost.metal > stock.metal || cost.crystal > stock.crystal) continue;
      const price = cost.metal + cost.crystal;
      if (!best || price < best.price) best = { id: node.id, price };
    }
    if (best && game.startResearch(best.id, now).ok) {
      const name = RESEARCH_NODES.find((n) => n.id === best!.id)?.name ?? best.id;
      this.once(`r:${game.planet.seed}:${best.id}`, now, `${game.planet.displayName}: rozpoczęto badanie „${name}”`);
    }
  }

  /** Kolejność potrzeb: energia → magazyn → kopalnie (tańsza) → laboratorium (do połowy kopalń). */
  private wanted(): BuildingId[] {
    const game = this.game;
    const rates = game.rates;
    const levels = game.economy.levels;
    const out: BuildingId[] = [];
    if (rates.energyProduced < rates.energyUsed * 1.05 + 5) out.push('powerPlant');
    const capacity = game.capacity;
    const stock = game.economy.stock;
    const nextMine = MINES.map((id) => game.costOf(id)).reduce((a, c) => Math.max(a, c.metal, c.crystal), 0);
    if (nextMine > capacity * 0.9 || Math.max(stock.metal, stock.crystal) > capacity * 0.9) out.push('storage');
    const mines = [...MINES].sort((a, b) => {
      const ca = game.costOf(a);
      const cb = game.costOf(b);
      return ca.metal + ca.crystal - (cb.metal + cb.crystal);
    });
    const left = game.deposits;
    for (const id of mines) if (left[id === 'metalMine' ? 'metal' : 'crystal'].left > 0) out.push(id);
    const lab = levels.laboratory ?? 0;
    if (lab < Math.floor(Math.min(levels.metalMine ?? 0, levels.crystalMine ?? 0) / 2)) out.push('laboratory');
    out.push('powerPlant', 'storage');
    return [...new Set(out)];
  }

  private build(now: number): void {
    const game = this.game;
    const busy = !!game.economy.construction;
    if (busy && game.queue.length >= game.queueCapacity) return;
    for (const id of this.wanted()) {
      const result = busy ? game.enqueue(id, now) : game.upgrade(id, now);
      if (result.ok) {
        const c = game.economy.construction;
        const queued = game.queue.filter((q) => q.building === id).map((q) => q.level);
        const level = Math.max(c?.building === id ? c.targetLevel : 0, ...queued, (game.economy.levels[id] ?? 0) + 1);
        for (const stage of [6, 12, 20]) {
          if (level >= stage) this.once(`b:${game.planet.seed}:${id}:${stage}`, now, `${game.planet.displayName}: ${nameOf(id)} — etap „${stageName(id, stage)}” (poz. ${stage}) zlecony`);
        }
        return;
      }
      const reason = 'reason' in result ? String(result.reason) : 'inne';
      this.blocked.set(reason, (this.blocked.get(reason) ?? 0) + 1);
      // Brak surowców na najważniejszą potrzebę — gracz czeka (nie buduje czegoś mniej ważnego zamiast tego).
      if (reason === 'not-enough-resources') return;
    }
  }

  /**
   * Transportowce (gdy zbadane): wyeksploatowane planety (≥ 80%) i planety z pełnym magazynem (≥ 95%) wysyłają zapasy
   * na planetę z największym wolnym miejscem w magazynie — pełny magazyn zatrzymuje wydobycie.
   */
  private transport(now: number): void {
    const game = this.game;
    const shares = this.shares(now);
    if (shares.length < 2) return;
    const overview = game.overview(now);
    shares.forEach((share, i) => {
      const from = overview[i]!;
      const full = Math.max(from.stock.metal, from.stock.crystal) >= from.capacity * 0.95;
      if (share < EXPLOITED && !full) return;
      let best = -1;
      let room = 0;
      overview.forEach((p, j) => {
        if (j === i || shares[j]! >= EXPLOITED) return;
        const free = p.capacity - Math.max(p.stock.metal, p.stock.crystal);
        if (free > room) {
          room = free;
          best = j;
        }
      });
      if (best < 0) return;
      game.switchPlanet(i, now);
      const stock = game.economy.stock;
      const cap = Math.min(BALANCE.transport.capacity * (game.research.done.includes('fleet-2') ? 2 : 1), room);
      const metal = Math.min(Math.floor(stock.metal), Math.floor(cap / 2));
      const crystal = Math.min(Math.floor(stock.crystal), Math.floor(cap - metal));
      if (metal + crystal < 500) return;
      const result = game.sendResources(overview[best]!.address, { metal, crystal }, now);
      if (result.ok) {
        this.transports++;
        this.once(`t:${i}`, now, `${game.planet.displayName}: pierwszy transport nadwyżki na ${overview[best]!.name}`);
      } else {
        if (/paliwa/.test(result.message)) this.fuelBlocked++;
        this.once(`tf:${result.message.slice(0, 20)}`, now, `Transport niemożliwy: ${result.message}`);
      }
    });
  }

  /**
   * Kolonizacja wolnej planety własnego układu (od v0.53 statkiem: koszt, paliwo, lot ok. 2 min) — z planety
   * z największym zapasem; nowa kolonia liczy się po przylocie (`track`).
   */
  private colonize(now: number): void {
    const game = this.game;
    if (game.missionsView(now).length > 0 || !this.strategy.colonizeWhen(this)) return;
    const system = generateSystem(game.galaxy, game.homeSystem)!;
    const target = system.planets.find((p) => game.occupantAt(p) === 'free' && p.body === 'rocky');
    if (!target) return;
    const richest = game
      .overview(now)
      .map((p, i) => ({ i, have: Math.min(p.stock.metal, p.stock.crystal) }))
      .sort((x, y) => y.have - x.have)[0]!;
    game.switchPlanet(richest.i, now);
    const result = game.colonize(target.address, now);
    if (result.ok) this.log(now, `Statek kolonizacyjny wyrusza do ${target.name} (${game.balance.fuel.colonyShip.inSystem} antymaterii paliwa)`);
    else if (/paliwa/.test(result.message)) this.fuelBlocked++;
  }

  private track(now: number): void {
    const count = this.game.planets().length;
    if (count > this.planetsSeen) {
      for (let k = this.planetsSeen; k < count; k++) this.log(now, `Nowa kolonia: ${this.game.planets()[k]!.name} — planeta nr ${k + 1}`);
      this.planetsSeen = count;
    }
    const shares = this.shares(now);
    shares.forEach((share, i) => {
      const name = this.game.planets()[i]?.name ?? `planeta ${i + 1}`;
      for (const step of [0.25, 0.5, EXPLOITED, 1]) {
        if (share >= step) this.once(`d:${i}:${step}`, now, `${name}: wydobyto ${Math.round(step * 100)}% złóż`);
      }
      if (share >= EXPLOITED) this.exploitedAt[i] ??= now;
    });
  }

  exploitedCount(): number {
    return this.exploitedAt.filter((t) => t !== null && t !== undefined).length;
  }
}

const nameOf = (id: BuildingId) => BALANCE.buildings.find((b) => b.id === id)?.name ?? id;

/** Czas gry jako „dzień 3, 14:20” (dzień 1 = start). */
function when(at: number): string {
  const ms = at - START;
  const day = Math.floor(ms / DAY) + 1;
  const h = Math.floor((ms % DAY) / HOUR) + 8;
  const m = Math.floor((ms % HOUR) / 60_000);
  const hh = h >= 24 ? h - 24 : h;
  return `dzień ${day + (h >= 24 ? 1 : 0)}, ${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const hours = (ms: number) => `${(ms / HOUR).toFixed(1).replace('.', ',')} h`;
const days = (ms: number) => (ms / DAY).toFixed(1).replace('.', ',');

interface Run {
  sim: Sim;
  wallMs: number;
  endedAt: number;
}

function run(profile: Profile, strategy: Strategy): Run {
  const t0 = performance.now();
  const sim = new Sim(profile, strategy);
  const step = profile.everyMinutes * 60_000;
  let t = START;
  const end = START + MAX_DAYS * DAY;
  while (t < end) {
    // Godzina doby (start symulacji = 8:00).
    const h = ((t - START) / HOUR + 8) % 24;
    if (h >= profile.from && h < profile.to) sim.visit(t);
    if (sim.exploitedCount() >= 3) break;
    t += step;
  }
  if (sim.exploitedCount() >= 3) sim.log(t, 'PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż');
  else sim.log(t, `Koniec symulacji (limit ${MAX_DAYS} dni) — wyeksploatowane planety: ${sim.exploitedCount()} / 3`);
  return { sim, wallMs: performance.now() - t0, endedAt: t };
}

const runs: Run[] = [];
for (const profile of PROFILES.filter((p) => !process.env.SIM_PROFILE || p.id === process.env.SIM_PROFILE)) {
  for (const strategy of STRATEGIES.filter((x) => !process.env.SIM_STRATEGY || x.id === process.env.SIM_STRATEGY)) {
    const r = run(profile, strategy);
    runs.push(r);
    console.log(`${profile.id} / ${strategy.id}: ${r.sim.exploitedCount()} / 3 po ${days(r.endedAt - START)} d (${Math.round(r.wallMs)} ms)`);
  }
}

// ——— raport ———
const REASONS: Record<string, string> = {
  'not-enough-resources': 'brak surowców',
  'storage-too-small': 'za mały magazyn',
  'no-fields': 'brak pól',
  'max-level': 'maks. poziom',
  busy: 'trwa budowa',
  'queue-full': 'kolejka pełna',
};
const lines: string[] = [];
lines.push('# Symulacja pętli MVP (etap 1)');
lines.push('');
lines.push(`Wygenerowano skryptem \`npm run simulate\` (limit ${MAX_DAYS} dni czasu gry). **To symulacja „rozsądnego gracza”, nie prawdziwa rozgrywka** — wskazówka do strojenia, nie wyrok. Gra nie została zmieniona. **Wnioski:** \`docs/status.md\`, punkt 8.`);
lines.push('');
lines.push('**Gracz w symulacji:** przy każdej wizycie na każdej planecie zaczyna najtańsze dostępne badanie (bez antymaterii), buduje według potrzeb (energia → magazyn → tańsza kopalnia → laboratorium do połowy poziomu kopalń) z kolejką, planety wyeksploatowane albo z pełnym magazynem wysyłają nadwyżkę transportowcami tam, gdzie jest miejsce, kolonizuje wolne planety własnego układu statkiem (od v0.53: koszt, paliwo z antymaterii, lot ok. 2 min); każdy lot płaci paliwo. Nie używa „Ukończ teraz”, specjalizacji, kompleksów, asteroid ani komet. Warunek końca: 3 planety z ≥ 80% wydobytych złóż metalu **i** kryształów.');
lines.push('');
lines.push('| Profil gracza | Strategia kolonii | Wyeksploatowane planety | Czas | 1. planeta ≥ 80% | Planet założonych | Najdłuższy przestój planety | Transporty | Loty wstrzymane — brak paliwa | Antymateria na koniec | Najczęstsza blokada budowy |');
lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of runs) {
  const s = r.sim;
  const first = s.exploitedAt.filter((x): x is number => typeof x === 'number').sort((a, b) => a - b)[0];
  const top = [...s.blocked.entries()].sort((a, b) => b[1] - a[1])[0];
  lines.push(
    `| ${s.profile.name} | ${s.strategy.name} | ${s.exploitedCount()} / 3 | ${days(r.endedAt - START)} d | ${first ? days(first - START) + ' d' : '—'} | ${s.game.planets().length} | ${s.longestIdle.ms > 0 ? `${hours(s.longestIdle.ms)} (${s.longestIdle.planet})` : '—'} | ${s.transports} | ${s.fuelBlocked} | ${Math.floor(s.game.economy.antimatter)} | ${top ? `${REASONS[top[0]] ?? top[0]} (${top[1]}×)` : '—'} |`,
  );
}
lines.push('');
for (const r of runs) {
  const s = r.sim;
  lines.push(`## ${s.profile.name} · ${s.strategy.name}`);
  lines.push('');
  const planets = s.game.overview(r.endedAt);
  lines.push('| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |');
  lines.push('|---|---|---|---|---|---|');
  planets.forEach((p, i) => {
    s.game.switchPlanet(i, r.endedAt);
    const l = s.game.economy.levels;
    lines.push(
      `| ${p.name} | ${p.fields.used}/${p.fields.buildable} | ${fmt(p.deposits.left.metal)} / ${fmt(p.deposits.total.metal)} | ${fmt(p.deposits.left.crystal)} / ${fmt(p.deposits.total.crystal)} | ${l.metalMine ?? 0} / ${l.crystalMine ?? 0} / ${l.powerPlant ?? 0} / ${l.storage ?? 0} / ${l.laboratory ?? 0} | ${days(s.idleMs[i] ?? 0)} d |`,
    );
  });
  lines.push('');
  lines.push('<details><summary>Oś czasu</summary>');
  lines.push('');
  for (const e of s.events.filter((e) => !e.text.includes('rozpoczęto badanie'))) lines.push(`- ${when(e.at)} — ${e.text}`);
  lines.push('');
  lines.push('</details>');
  lines.push('');
}
writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`Zapisano ${OUT}`);

function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace('.', ',')} mln`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} tys.`;
  return String(Math.round(n));
}

