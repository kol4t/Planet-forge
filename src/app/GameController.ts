import { buildableCount, cachedFieldGrid, FIELD_GRID_VERSION, fieldGrid, type BuildRules, type FieldGrid } from '../core/colony/fieldGrid.ts';
import { choiceCells, hasRoomFor, LEVELS_PER_FIELD, reconcilePlots, siteFactors, suits, TERRAIN_NAMES, usedLandFields, type Plots } from '../core/colony/plots.ts';
import { complexBonus, mergeCandidate, reservedCells, validComplexes, type Complex } from '../core/colony/complexes.ts';
import { COMPLEX_FAMILIES, findFamily } from '../data/complexes.ts';
import { INDUSTRY_STAGES } from '../data/industry.ts';
import {
  advance,
  buildSeconds,
  depositsLeft,
  depositTotal,
  fitsInStorage,
  cancelConstruction,
  constructionProgress,
  buildingSettings,
  createEconomy,
  demolishBuilding,
  enqueueBuilding,
  finishConstructionNow,
  finishCost,
  storageCapacity,
  productionRates,
  removeQueued,
  secondsUntilAffordable,
  setBuildingSettings,
  upgradeBuilding,
  upgradeCost,
  type CancelResult,
  type FinishResult,
  type QueueResult,
  type Rates,
  type UpgradeResult,
} from '../core/economy/economy.ts';
import { geologyOf, type Geology } from '../core/economy/geology.ts';
import { simulateAwayAi } from '../core/ai/offline.ts';
import { DEFAULT_AI_LEVELS, suggest, type AiAction, type AiLevel, type AiRuleId, type AiSuggestion } from '../core/ai/advisor.ts';
import {
  applyResearch,
  describeEffectList,
  completeResearch,
  EMPTY_RESEARCH,
  researchCost,
  researchPreview,
  researchProgress,
  researchSeconds,
  researchStatus,
  ringLimit,
  startResearch,
  type ResearchCost,
  type ResearchPreview,
  type ResearchStatus,
} from '../core/research/research.ts';
import {
  formatAddress,
  generateGalaxy,
  findStar,
  generateSystem,
  isColonizable,
  parseAddress,
  planetAt,
  starterSystem,
  type Galaxy,
  type StarSystem,
  type SystemPlanet,
} from '../core/galaxy/galaxy.ts';
import {
  activeSpecializationEffects,
  affinity,
  affinityLabel,
  chooseSpecialization,
  isSpecializationActive,
  specializationEffects,
} from '../core/economy/specialization.ts';
import { findSpecialization, SPECIALIZATION_RULES, SPECIALIZATIONS } from '../data/specializations.ts';
import { RARE_OBJECTS, ZONE_LABELS } from '../data/galaxy.ts';
import { checkShipment, transportSeconds } from '../core/economy/transport.ts';
import { launchComet } from '../core/economy/comets.ts';
import { stationCost, stationLevelAt, stationOutput, upgradeStation, withStation } from '../core/economy/asteroids.ts';
import { distanceFrom, expeditionStats, planExpedition, resolveExpedition, type ExpeditionPlan, type ExpeditionStats } from '../core/galaxy/expeditions.ts';
import type { KnownSystem } from '../core/galaxy/galaxyIndex.ts';
import { DISCOVERY, discoveryOf, ensureKnown, initialDiscoveries, isRare, knownCount, raiseDiscovery, rareBonuses, type Discoveries, type DiscoveryLevel } from '../core/galaxy/discovery.ts';
import { GENERATOR_VERSION, generatePlanet } from '../core/generation/generatePlanet.ts';
import { hasFreeSlot, JOURNAL_LIMIT, loadEmpire, writeEmpire, type EmpireSave, type SlotSave } from '../core/save/empire.ts';
import { exportSave, importSave } from '../core/save/transfer.ts';
import type { AsteroidStation, Balance, BuildingId, CometHaul, BuildingLevels, BuildingSettings, ColonyMission, EconomyState, Expedition, Shipment, JournalEntry, ResearchEffect, JournalKind, Planet, PlanetSpecialization, SpecializationId, SpecializationSite, UnlockFeature, ResearchState, ResourceId, Resources } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { findDefinition, STARTER } from '../data/planets.ts';
import { findResearch } from '../data/research.ts';

export interface OfflineGain {
  metal: number;
  crystal: number;
  seconds: number;
}

export interface CompletedBuild {
  building: BuildingId;
  level: number;
}

/** Jedno miejsce imperium (na razie planeta). */
interface Slot {
  planet: Planet;
  economy: EconomyState;
  /** Adres w galaktyce, np. „1:42:7” (pusty tylko na chwilę — przed rozmieszczeniem na mapie). */
  address: string;
  /** Badania tej planety (od v0.15 każda planeta bada sama). */
  research: ResearchState;
  /** Pola zajęte przez budowle (od v0.26; uzupełniane automatycznie z poziomów). */
  plots: Plots;
  /** Pola z ostatniego przeliczenia siatki (lista planet bez liczenia siatek nieaktywnych planet). */
  fields?: { used: number; buildable: number };
  /** Specjalizacja kolonii (od v0.32.3; brak = bez specjalizacji). */
  specialization?: PlanetSpecialization;
  /** Stacja wydobywcza na pasie asteroid układu (od v0.37). */
  asteroid?: AsteroidStation;
  /** Kompleksy przemysłowe na polach planety (od v0.38). */
  complexes?: Complex[];
  /** Pole wybrane przez gracza dla następnej grupy budynku (v0.38.2, do chwili przydziału — bez zapisu). */
  preferred?: Partial<Record<BuildingId, number>>;
}

/** Karta budowli obok przybliżonej planety (v0.38.1): parametry i etapy rozwoju. */
export interface BuildingCard {
  name: string;
  level: number;
  /** Nazwa osiągniętego etapu („Wiertło z szybem”). */
  stage: string | null;
  description: string;
  /** Co budowla daje teraz (np. „+161 kryształów/min”) i ile energii zużywa. */
  output: string | null;
  energy: string | null;
  /** Pola zajęte przez tę budowlę (z polami kompleksów) i zajętość planety. */
  fields: number;
  planetFields: { used: number; buildable: number };
  stages: { name: string; footprint: string; description: string; state: 'done' | 'current' | 'next' | 'locked' | 'soon' }[];
  /** Co trzeba zrobić, żeby osiągnąć następny etap (albo null). */
  next: string | null;
  /** Wybór pola dla następnego poziomu (v0.38.2): ile pól dedykowanego terenu jest wolnych; null — nie teraz. */
  placement: { level: number; cells: number; terrain: string | null } | null;
}

/** Kompleks budynku na aktywnej planecie (okno „Kompleks”, v0.38). */
export interface ComplexView {
  name: string;
  hubName: string;
  unlocked: boolean;
  /** Ile kompleksów już stoi i ile poziomów obejmują. */
  count: number;
  levelsIn: number;
  bonus: number;
  groups: number;
  extraFields: number;
  cost: Resources;
  /** Możliwe połączenie albo powód, dlaczego go nie ma. */
  candidate: { cells: number[]; hubs: number[]; gainPerMinute: number } | null;
  reason: string | null;
  fields: { used: number; buildable: number };
}

/** Stacja na pasie asteroid aktywnej planety (panel „Planeta”, v0.37). */
export interface AsteroidView {
  unlocked: boolean;
  hasBelt: boolean;
  /** Inna Twoja planeta ze stacją na tym pasie (albo null). */
  takenBy: string | null;
  /** Poziom działający teraz i poziom docelowy (rozbudowa w toku, gdy różne). */
  level: number;
  target: number;
  secondsLeft: number;
  maxLevel: number;
  /** Urobek na minutę teraz i po kolejnym poziomie. */
  output: Resources;
  nextOutput: Resources;
  nextCost: Resources;
  nextSeconds: number;
}

/** Specjalizacja planety do panelu: obecna, położenie i możliwe wybory z dopasowaniem. */
export interface SpecializationView {
  current: { id: SpecializationId; name: string; active: boolean; secondsLeft: number } | null;
  /** Zmiana odblokowana badaniem z Planetologii. */
  canChange: boolean;
  changeSeconds: number;
  /** „Żółta gwiazda · strefa umiarkowana” (pusty, gdy planeta nie ma adresu). */
  siteText: string;
  options: { id: SpecializationId; name: string; description: string; affinity: number; label: string; effects: string }[];
}

/** Kto jest na planecie — z punktu widzenia gracza. */
export type MapOccupant = 'you' | 'bot' | 'alien' | 'free';

/** Galaktyka gracza (na razie jedna; w przyszłości jedna galaktyka = jeden serwer). */
const GALAXY_ID = 1;

/** Skrót planety do listy „Twoje planety”. */
export interface BuildingInfo {
  level: number;
  settings: BuildingSettings;
  /** Ile potrzebnej energii budynek dostaje 0..1 (zależy od pierwszeństwa przy niedoborze). */
  energyEfficiency: number;
  /** Dopasowanie do terenu 0..1 (grupy na niepasującym terenie pracują słabiej). */
  siteFactor: number;
  /** Zajęte pola (grupy do 3 poziomów) i ile z nich stoi na pasującym terenie / na lodzie. */
  groups: number;
  suitedGroups: number;
  onIce: number;
  /** Złoża planety dla tego, co budynek wydobywa (1 = 100%); null — budynek nic nie wydobywa. */
  richness: number | null;
  /** Zasób złoża (tylko kopalnie metalu i kryształów). */
  deposit: DepositInfo | null;
}

/** Naturalne złoże planety (od v0.27): ile było, ile zostało, tempo i czas do wyczerpania. */
export interface DepositInfo {
  total: number;
  left: number;
  /** Ile kopalnie wydobywają teraz ze złoża (na minutę). */
  perMinute: number;
  /** Sekundy do wyczerpania przy obecnym wydobyciu; null — nie ubywa (kopalnia stoi, pełny magazyn, złoże puste). */
  secondsLeft: number | null;
}

export interface FieldsInfo {
  /** Wszystkie pola siatki (z wodą, lodem i lawą między polami lądu). */
  total: number;
  /** Pola lądu — na nich wolno budować; ich liczba wynika z seeda planety (30–200). */
  buildable: number;
  /** Zajęte pola lądu (każde mieści grupę do 3 poziomów jednego budynku; kryształy na lodzie się nie liczą). */
  used: number;
}

export interface PlanetSummary {
  index: number;
  /** Planeta (np. do miniatury). */
  planet: Planet;
  name: string;
  category: string;
  active: boolean;
  /** Adres w galaktyce (np. „1:42:7”). */
  address: string;
  /** Suma poziomów budynków — prosta miara rozwoju. */
  totalLevels: number;
  /** Nazwa budynku w budowie (jeśli jest). */
  building: string | null;
}

export type ActionMessage = { ok: boolean; message: string };

/** Ekspedycja w drodze (do mapy i „Imperium”). */
export interface ExpeditionView {
  target: number;
  name: string;
  progress: number;
  secondsLeft: number;
}

/** Raport z powrotu ekspedycji. */
export interface ExpeditionReport {
  target: number;
  success: boolean;
  text: string;
}

/** Pozycja kolejki budowy: budynek i poziom, który osiągnie. */
export interface QueuedBuild {
  building: BuildingId;
  name: string;
  level: number;
  /** Koszt pobierany przy starcie. */
  cost: Resources;
}

/** Planeta w zestawieniu „Imperium” (stan policzony na teraz, także dla nieaktywnych). */
export interface PlanetOverview extends PlanetSummary {
  stock: Resources;
  capacity: number;
  rates: Rates;
  construction: { name: string; level: number; secondsLeft: number; progress: number } | null;
  /** Kolejka budowy (od v0.32.2). */
  queue: QueuedBuild[];
  /** Specjalizacja kolonii (od v0.32.3); `pending` — zmiana jeszcze trwa. */
  specialization: { name: string; pending: boolean } | null;
  /** Pola lądu: zajęte / do zabudowy. */
  fields: { used: number; buildable: number };
  /** Złoża planety: ile zostało i ile było (od v0.32 — do kart „Imperium”). */
  deposits: { left: Resources; total: Resources };
  /** Antymateria z Kolektora tej planety (na godzinę, bez przyrostu pasywnego). */
  collectorPerHour: number;
  /** Laboratorium planety i czy coś teraz bada (do alertów „Imperium”, od v0.32.1). */
  labLevel: number;
  researching: boolean;
  /** Poziom stacji na pasie asteroid (0 = brak; od v0.37). */
  asteroidLevel: number;
}

/** Suma imperium do kafelków „Imperium” (produkcja na godzinę, pola, antymateria). */
export interface EmpireTotals {
  metalPerHour: number;
  crystalPerHour: number;
  fieldsUsed: number;
  fieldsBuildable: number;
  antimatter: number;
  antimatterPerHour: number;
  /** Energia całego imperium: wytwarzana i zużywana. */
  energyProduced: number;
  energyUsed: number;
}

/** Statek kolonizacyjny w drodze (do mapy i zestawienia). */
export interface MissionView extends ColonyMission {
  targetName: string;
  fromName: string;
  secondsLeft: number;
  progress: number;
}

/** Transportowiec w drodze (do „Imperium”). */
export interface ShipmentView extends Shipment {
  fromName: string;
  toName: string;
  secondsLeft: number;
  progress: number;
}

/** Zasady transportu z najlepszych badań w imperium (v0.36). */
export interface TransportView {
  unlocked: boolean;
  capacity: number;
  maxActive: number;
  active: number;
}

/**
 * Nieaktywne planety „doganiają” czas bez przyrostu pasywnego antymaterii —
 * ten liczy się raz, na aktywnej planecie (portfel jest wspólny).
 */
const SPECIALIZATION_CHANGE_SECONDS = SPECIALIZATION_RULES.changeSeconds;

const catchUpBalance = (balance: Balance): Balance => ({ ...balance, antimatter: { ...balance.antimatter, passivePerHour: 0 } });

/**
 * Spina reguły (core), zapis i UI. UI zmienia stan WYŁĄCZNIE przez te metody.
 * Imperium = kilka miejsc (planet); `planet`/`economy` to zawsze aktywne miejsce.
 * Antymateria aktywnej gospodarki = wspólny portfel; nieaktywne trzymają 0.
 */
export class GameController {
  offlineGain: OfflineGain | null = null;
  /** Budowa ukończona podczas nieobecności (do jednorazowego komunikatu). */
  completedWhileAway: CompletedBuild | null = null;
  /** Badania ukończone podczas nieobecności (do jednorazowego komunikatu). */
  researchedWhileAway: string[] = [];

  /** Kolonie założone przez statki podczas nieobecności (nazwy, do jednorazowego komunikatu). */
  arrivedWhileAway: string[] = [];
  /** Statki kolonizacyjne w drodze. */
  private missions: ColonyMission[] = [];
  /** Dziennik ekspedycji (najnowsze na końcu). */
  private journal: JournalEntry[] = [];
  private readonly colonyListeners = new Set<(name: string) => void>();
  /** Samodzielność SI Matki dla każdej reguły. */
  private aiLevels: Record<AiRuleId, AiLevel> = { ...DEFAULT_AI_LEVELS };
  /** Odrzucone propozycje: reguła → do kiedy SI o nią nie pyta (tylko w tej sesji). */
  private readonly aiSnooze = new Map<AiRuleId, number>();
  private readonly aiListeners = new Set<(text: string) => void>();
  /** Balans z efektami badań — osobno dla każdej listy zbadanych (planety). */
  /** Wiedza o galaktyce (v0.34.2): poziom odkrycia każdego układu — osobno od danych galaktyki. */
  private discoveries: Discoveries = {};
  private rareCache: { known: Discoveries; effects: ResearchEffect[]; key: string } | null = null;
  /** Ekspedycje w drodze (v0.34.3). */
  private expeditions: Expedition[] = [];
  /** Transportowce w drodze (v0.36). */
  private shipments: Shipment[] = [];
  /** Holowniki po komety (v0.37.1) — najwyżej jeden na planetę. */
  private comets: CometHaul[] = [];
  private readonly shipmentListeners = new Set<(text: string) => void>();
  /** Dostawy rozliczone podczas nieobecności (do jednorazowego komunikatu). */
  shipmentsWhileAway: string[] = [];
  private readonly expeditionListeners = new Set<(report: ExpeditionReport) => void>();
  /** Raporty ekspedycji rozliczonych podczas nieobecności (do pokazania po starcie). */
  expeditionsWhileAway: ExpeditionReport[] = [];
  private readonly balanceCache = new WeakMap<Slot, { done: readonly string[]; spec: string; balance: Balance }>();
  private readonly siteCache = new Map<string, SpecializationSite | null>();
  private slots: Slot[];
  private active = 0;
  private unlockedSlots: number = BALANCE.planetSlots.base;
  /** Miejsce startowe gracza w galaktyce (jego układ = układ startowy). */
  private home = '';
  private readonly listeners = new Set<() => void>();
  private readonly completeListeners = new Set<(done: CompletedBuild) => void>();
  private readonly planetListeners = new Set<() => void>();
  private readonly researchListeners = new Set<(id: string) => void>();
  private readonly demolishListeners = new Set<(id: BuildingId) => void>();

  constructor(now = Date.now()) {
    const saved = loadEmpire();
    const slots = saved ? restoreSlots(saved.slots) : [];
    if (saved && slots.length > 0) {
      this.slots = slots;
      this.unlockedSlots = saved.unlockedSlots;
      this.home = saved.home ?? '';
      this.missions = saved.missions ?? [];
      this.expeditions = saved.expeditions ?? [];
      this.shipments = saved.shipments ?? [];
      this.comets = saved.comets ?? [];
      this.journal = saved.journal ?? [];
      this.aiLevels = saved.ai ?? { ...DEFAULT_AI_LEVELS };
      this.active = Math.min(saved.active, slots.length - 1);
      migrateResearch(this.slots, saved.slots, saved.research, this.active);
      this.placeOnMap();
      this.restoreDiscoveries(saved.discoveries);
      const before = { ...this.slots[this.active]!.economy, antimatter: saved.antimatter };
      this.economy = before;
      this.runAwayAi(this.slots[this.active]!, now, this.balance);
      this.researchedWhileAway = this.advanceActive(now);
      this.reportAway(before, now);
      this.arrivedWhileAway = this.processMissions(now);
      this.expeditionsWhileAway = this.processExpeditions(now);
      this.shipmentsWhileAway = [...this.processShipments(now), ...this.processComets(now)];
      if (this.offlineGain) {
        const g = this.offlineGain;
        this.log('away', `Podczas nieobecności na ${this.planet.displayName}: +${Math.floor(g.metal)} metalu, +${Math.floor(g.crystal)} kryształów.`, now);
      }
    } else {
      this.slots = [
        { planet: generatePlanet(STARTER.definition, STARTER.seed), economy: createEconomy(now), address: '', research: EMPTY_RESEARCH, plots: {} },
      ];
      this.placeOnMap();
      this.restoreDiscoveries(undefined);
      this.log('empire', `Początek ekspedycji: ${this.planet.displayName} (${this.address}).`, now);
    }
  }

  get planet(): Planet {
    return this.slots[this.active]!.planet;
  }

  get economy(): EconomyState {
    return this.slots[this.active]!.economy;
  }

  set economy(value: EconomyState) {
    this.slots[this.active]!.economy = value;
  }

  /** Badania aktywnej planety. */
  get research(): ResearchState {
    return this.slots[this.active]!.research;
  }

  set research(value: ResearchState) {
    this.slots[this.active]!.research = value;
  }

  /** Balans aktywnej planety z efektami jej badań (liczony ponownie tylko po nowym badaniu). */
  get balance(): Balance {
    return this.balanceFor(this.slots[this.active]!);
  }

  /**
   * Balans planety z efektami jej badań i specjalizacji działającej w chwili `at`
   * (domyślnie: ostatnie naliczenie planety). Liczony ponownie tylko po zmianie.
   */
  private balanceFor(slot: Slot, at = slot.economy.lastUpdate): Balance {
    const own = activeSpecializationEffects(slot.specialization, this.siteOf(slot.address), at);
    // Premie z danych naukowych rzadkich obiektów (v0.34.4) — dla każdej planety imperium.
    const rare = this.rareEffects();
    const effects = [...own, ...rare.effects];
    // Stacja na pasie asteroid (v0.37): urobek doliczony do przyrostu podstawowego planety.
    const station = stationLevelAt(slot.asteroid, at);
    const spec = `${own.length > 0 ? slot.specialization!.id : ''}|${rare.key}|a${station}`;
    const hit = this.balanceCache.get(slot);
    if (hit && hit.done === slot.research.done && hit.spec === spec) return hit.balance;
    const balance = withStation(applyResearch(BALANCE, slot.research.done, effects), station);
    this.balanceCache.set(slot, { done: slot.research.done, spec, balance });
    return balance;
  }

  /** Położenie planety (gwiazda układu i strefa orbity) — od niego zależy dopasowanie specjalizacji. */
  private siteOf(address: string): SpecializationSite | null {
    if (this.siteCache.has(address)) return this.siteCache.get(address)!;
    const where = parseAddress(address);
    const galaxy = where ? this.galaxy : null;
    const body = galaxy && where ? planetAt(galaxy, where) : null;
    const star = galaxy && where ? galaxy.systems[where.system - 1]?.star : undefined;
    const site = body && star ? { star, zone: body.zone } : null;
    this.siteCache.set(address, site);
    return site;
  }

  /**
   * Naliczenie planety do `now` z podziałem w chwili końca zmiany specjalizacji i rozbudowy stacji
   * na pasie asteroid (do tej chwili po staremu, potem z nowym balansem).
   */
  private advanceSlot(slot: Slot, economy: EconomyState, now: number, adjust: (b: Balance) => Balance = (b) => b): EconomyState {
    let e = economy;
    const splits = [slot.specialization?.readyAt, slot.asteroid?.readyAt]
      .filter((t): t is number => t !== undefined && t > e.lastUpdate && t <= now)
      .sort((a, b) => a - b);
    for (const ready of splits) {
      if (ready > e.lastUpdate) e = advance(e, slot.planet, ready, adjust(this.balanceFor(slot, e.lastUpdate)));
    }
    return advance(e, slot.planet, now, adjust(this.balanceFor(slot, e.lastUpdate)));
  }

  // ——— stacja na pasie asteroid (v0.37) ———

  /** Czy układ planety ma pas asteroid. */
  private hasBelt(address: string): boolean {
    const where = parseAddress(address);
    return !!where && !!generateSystem(this.galaxy, where.system)?.belt;
  }

  /** Inna planeta gracza ze stacją na pasie tego samego układu (nazwa albo null). */
  private beltTakenBy(slot: Slot): string | null {
    const system = parseAddress(slot.address)?.system;
    const other = this.slots.find((s) => s !== slot && s.asteroid && parseAddress(s.address)?.system === system);
    return other ? other.planet.displayName : null;
  }

  /** Pas asteroid układu na mapie: stacja (czyja, poziom) i Twoja planeta w tym układzie. */
  beltInfo(system: number): { station: { planet: string; level: number } | null; own: { index: number; name: string; active: boolean } | null } {
    const index = this.slots.findIndex((s) => parseAddress(s.address)?.system === system);
    const withStation = this.slots.find((s) => s.asteroid && parseAddress(s.address)?.system === system);
    return {
      station: withStation ? { planet: withStation.planet.displayName, level: withStation.asteroid!.level } : null,
      own: index >= 0 ? { index, name: this.slots[index]!.planet.displayName, active: index === this.active } : null,
    };
  }

  asteroidView(now = Date.now()): AsteroidView {
    const slot = this.slots[this.active]!;
    const balance = applyResearch(BALANCE, slot.research.done);
    const station = slot.asteroid;
    const level = stationLevelAt(station, now);
    const next = (station?.level ?? 0) + 1;
    return {
      unlocked: this.unlocked('asteroid-mining'),
      hasBelt: this.hasBelt(slot.address),
      takenBy: this.beltTakenBy(slot),
      level,
      target: station?.level ?? 0,
      secondsLeft: station ? Math.max(0, (station.readyAt - now) / 1000) : 0,
      maxLevel: balance.asteroid.maxLevel,
      output: stationOutput(level, balance),
      nextOutput: stationOutput(next, balance),
      nextCost: stationCost(next, balance),
      nextSeconds: balance.asteroid.secondsPerLevel * next,
    };
  }

  /** Budowa albo rozbudowa stacji na pasie asteroid (koszt płaci aktywna planeta). */
  upgradeAsteroidStation(now = Date.now()): ActionMessage {
    this.tick(now);
    const slot = this.slots[this.active]!;
    const balance = this.balance;
    const result = upgradeStation(
      slot.asteroid,
      { hasBelt: this.hasBelt(slot.address), unlocked: this.unlocked('asteroid-mining'), takenBy: this.beltTakenBy(slot), stock: this.economy.stock, now },
      balance,
    );
    if (!result.ok) return result;
    if (!fitsInStorage(this.economy, result.cost, balance)) {
      return { ok: false, message: `Za mały magazyn (${this.capacity}). Najpierw rozbuduj Magazyn.` };
    }
    const stock = this.economy.stock;
    this.economy = { ...this.economy, stock: { metal: stock.metal - result.cost.metal, crystal: stock.crystal - result.cost.crystal } };
    slot.asteroid = result.station;
    const what = result.station.level === 1 ? 'budowa stacji na pasie asteroid' : `rozbudowa stacji na pasie asteroid do poz. ${result.station.level}`;
    this.log('build', `${this.planet.displayName}: ${what}.`, now);
    this.save();
    this.emit();
    const minutes = Math.ceil(result.seconds / 60);
    return { ok: true, message: `${what[0]!.toUpperCase()}${what.slice(1)} — gotowe za ${minutes} min.` };
  }

  // ——— specjalizacje kolonii ———

  /** Specjalizacja planety (domyślnie aktywnej) do panelu „Planeta”. */
  specialization(index = this.active, now = Date.now()): SpecializationView {
    const slot = this.slots[index]!;
    const site = this.siteOf(slot.address);
    const spec = slot.specialization;
    const def = spec ? findSpecialization(spec.id) : undefined;
    return {
      current:
        spec && def
          ? { id: spec.id, name: def.name, active: isSpecializationActive(spec, now), secondsLeft: Math.max(0, (spec.readyAt - now) / 1000) }
          : null,
      canChange: this.unlocked('specialization-change'),
      changeSeconds: SPECIALIZATION_CHANGE_SECONDS,
      siteText: site ? `${findStar(site.star).label} · strefa ${ZONE_LABELS[site.zone]}` : '',
      options: SPECIALIZATIONS.map((d) => {
        const f = affinity(d, site);
        return { id: d.id, name: d.name, description: d.description, affinity: f, label: affinityLabel(f), effects: describeEffectList(specializationEffects(d, site)) };
      }),
    };
  }

  /** Najlepiej dopasowana specjalizacja dla miejsca w galaktyce (podpowiedź na mapie). */
  bestSpecializationAt(address: string): { name: string; label: string } | null {
    const site = this.siteOf(address);
    if (!site) return null;
    const best = SPECIALIZATIONS.map((d) => ({ d, f: affinity(d, site) })).sort((a, b) => b.f - a.f)[0]!;
    return { name: best.d.name, label: affinityLabel(best.f) };
  }

  /** Wybór (pierwszy — od razu) albo zmiana specjalizacji aktywnej planety (po badaniu, trwa 1 h). */
  chooseSpecialization(id: SpecializationId, now = Date.now()): ActionMessage {
    this.tick(now);
    const slot = this.slots[this.active]!;
    const result = chooseSpecialization(slot.specialization, id, now, this.unlocked('specialization-change'));
    if (!result.ok) return { ok: false, message: result.message };
    slot.specialization = result.spec;
    this.log('empire', `${this.planet.displayName}: ${result.message}`, now);
    this.save();
    this.emit();
    return { ok: true, message: result.message };
  }

  /** Zmiana produktywności / pierwszeństwa budynku (panel „Zarządzanie”). */
  setBuildingSettings(id: BuildingId, change: Partial<BuildingSettings>, now = Date.now()): void {
    this.tick(now);
    this.economy = setBuildingSettings(this.economy, id, change);
    this.save();
    this.emit();
  }

  /** Stan budynku do panelu „Zarządzanie”: ustawienia, wydajność, teren grup i złoża planety. */
  buildingInfo(id: BuildingId): BuildingInfo {
    const slot = this.slots[this.active]!;
    const grid = fieldGrid(slot.planet);
    const plots = syncPlots(slot, this.buildRules);
    const cells = (plots[id] ?? []).map((c) => grid.cells[c]!);
    const rates = this.rates;
    const def = this.balance.buildings.find((b) => b.id === id)!;
    const produces = def.produces;
    return {
      level: this.economy.levels[id] ?? 0,
      settings: buildingSettings(this.economy, id),
      energyEfficiency: rates.efficiencyBy[id] ?? 1,
      siteFactor: this.economy.siteFactor?.[id] ?? 1,
      groups: cells.length,
      suitedGroups: cells.filter((c) => suits(id, c)).length,
      onIce: cells.filter((c) => c.kind === 'ice').length,
      richness: produces === 'metal' || produces === 'crystal' || produces === 'energy' ? slot.planet.gameplay.richness[produces] : null,
      deposit: produces === 'metal' || produces === 'crystal' ? this.deposits[produces] : null,
    };
  }

  /** Złoża aktywnej planety: zasób, tempo wydobycia i czas do wyczerpania. */
  get deposits(): Record<ResourceId, DepositInfo> {
    const total = depositTotal(this.planet, this.balance);
    const left = depositsLeft(this.economy, this.planet, this.balance);
    const rates = this.rates;
    const cap = storageCapacity(this.economy, this.balance);
    const info = (id: ResourceId): DepositInfo => {
      const perMinute = rates.fromDeposits[id];
      const flowing = left[id] > 0 && perMinute > 0 && this.economy.stock[id] < cap;
      return { total: total[id], left: left[id], perMinute, secondsLeft: flowing ? (left[id] / perMinute) * 60 : null };
    };
    return { metal: info('metal'), crystal: info('crystal') };
  }

  get rates(): Rates {
    return productionRates(this.economy, this.planet, this.balance);
  }

  costOf(id: BuildingId): Resources {
    return upgradeCost(id, this.economy.levels[id], this.balance);
  }

  waitSecondsFor(id: BuildingId): number {
    return secondsUntilAffordable(this.economy, this.costOf(id), this.rates, this.balance);
  }

  /** Czas budowy poziomu `targetLevel` (z efektami badań). */
  buildSecondsFor(targetLevel: number): number {
    return buildSeconds(targetLevel, this.balance);
  }

  tick(now = Date.now()): void {
    const before = this.economy;
    const researched = this.advanceActive(now);
    this.completeInactiveResearch(now);
    const done = finishedBuild(before, this.economy);
    if (done) this.logBuild(done, before.construction!.finishesAt);
    const arrived = this.processMissions(now);
    const returned = this.processExpeditions(now);
    // Dostawy: transportowce i holowniki z kometami (wspólny komunikat).
    const delivered = [...this.processShipments(now), ...this.processComets(now)];
    const aiDone = this.runAutoAi(now);
    if (done || researched.length > 0 || arrived.length > 0 || returned.length > 0 || delivered.length > 0 || aiDone) this.save();
    for (const text of delivered) for (const listener of this.shipmentListeners) listener(text);
    for (const report of returned) for (const listener of this.expeditionListeners) listener(report);
    if (aiDone) for (const listener of this.aiListeners) listener(aiDone);
    if (done) for (const listener of this.completeListeners) listener(done);
    for (const id of researched) for (const listener of this.researchListeners) listener(id);
    for (const name of arrived) for (const listener of this.colonyListeners) listener(name);
    this.emit();
  }

  /**
   * Naliczenie aktywnej planety do `now`. Badanie ukończone po drodze działa od chwili ukończenia:
   * produkcja do tej chwili po staremu, potem z nowymi efektami. Zwraca ukończone badania.
   */
  private advanceActive(now: number): string[] {
    const completed: string[] = [];
    const c = this.research.current;
    // Przy nieobecności dłuższej niż limit dzielenie czasu nie ma znaczenia (liczy się limit).
    if (c && c.finishesAt <= now && now - this.economy.lastUpdate <= this.balance.maxOfflineSeconds * 1000) {
      this.economy = advance(this.economy, this.planet, Math.max(this.economy.lastUpdate, c.finishesAt), this.balance);
    }
    const result = completeResearch(this.research, now);
    if (result.completed) {
      this.research = result.research;
      completed.push(result.completed);
      this.log('research', `${this.planet.displayName}: zbadano ${findResearch(result.completed)?.name ?? result.completed}.`, c!.finishesAt);
    }
    const slot = this.slots[this.active]!;
    const ready = slot.specialization?.readyAt;
    const wasPending = ready !== undefined && ready > this.economy.lastUpdate && ready <= now;
    const station = slot.asteroid;
    const stationDone = !!station && station.readyAt > this.economy.lastUpdate && station.readyAt <= now;
    this.economy = this.advanceSlot(slot, this.economy, now);
    if (wasPending) {
      const name = findSpecialization(slot.specialization!.id)?.name ?? '';
      this.log('empire', `${this.planet.displayName}: specjalizacja ${name} działa.`, ready);
    }
    if (stationDone) this.log('build', `${this.planet.displayName}: stacja na pasie asteroid — poziom ${station!.level} gotowy.`, station!.readyAt);
    return completed;
  }

  /** Rozpoczyna ulepszenie (budowę). Ukończenie przychodzi przez `onBuildComplete`. */
  upgrade(id: BuildingId, now = Date.now()): UpgradeResult {
    this.tick(now);
    const result = upgradeBuilding(this.economy, id, now, this.balance, { hasRoom: this.roomCheck(this.slots[this.active]!) });
    this.economy = result.state;
    if (result.ok) this.save();
    this.emit();
    return result;
  }

  /** Dopisanie ulepszenia do kolejki budowy (koszt pobierany dopiero przy starcie). */
  enqueue(id: BuildingId, now = Date.now()): QueueResult {
    this.tick(now);
    const result = enqueueBuilding(this.economy, id, this.balance, { hasRoom: this.roomCheck(this.slots[this.active]!) });
    this.economy = result.state;
    if (result.ok) this.save();
    this.emit();
    return result;
  }

  /** Usunięcie pozycji z kolejki (nic nie było pobrane). */
  dequeue(index: number, now = Date.now()): void {
    this.tick(now);
    this.economy = removeQueued(this.economy, index);
    this.save();
    this.emit();
  }

  /** Kolejka budowy aktywnej planety: budynek i poziom, który osiągnie. */
  get queue(): QueuedBuild[] {
    return queueOf(this.economy, this.balance);
  }

  /** Miejsca w kolejce budowy aktywnej planety (z badań SI). */
  get queueCapacity(): number {
    return this.balance.buildQueue;
  }

  /**
   * Zburzenie jednego poziomu budynku aktywnej planety (v0.35): zwalnia pole, gdy grupa budowli się kurczy.
   * Laboratorium nie w trakcie badania (badanie potrzebuje jego poziomu).
   */
  demolish(id: BuildingId, now = Date.now()): ActionMessage {
    this.tick(now);
    if (id === 'laboratory' && this.research.current) {
      return { ok: false, message: 'Laboratorium: najpierw poczekaj na koniec badania.' };
    }
    const result = demolishBuilding(this.economy, id, this.balance);
    if (!result.ok) return { ok: false, message: result.message };
    this.economy = result.state;
    syncPlots(this.slots[this.active]!, this.buildRules);
    this.log('build', `${this.planet.displayName}: ${result.message}`, now);
    this.save();
    for (const listener of this.demolishListeners) listener(id);
    this.emit();
    return { ok: true, message: result.message };
  }

  /** Po zburzeniu — do odświeżenia budowli na planecie. */
  onDemolish(listener: (id: BuildingId) => void): () => void {
    this.demolishListeners.add(listener);
    return () => this.demolishListeners.delete(listener);
  }

  cancelUpgrade(now = Date.now()): CancelResult {
    this.tick(now);
    const result = cancelConstruction(this.economy, this.balance);
    this.economy = result.state;
    if (result.ok) this.save();
    this.emit();
    return result;
  }

  /** Natychmiastowe ukończenie (do poz. 5 za darmo, wyżej za antymaterię). Zgłasza `onBuildComplete`. */
  finishNow(now = Date.now()): FinishResult {
    this.tick(now);
    const before = this.economy;
    const result = finishConstructionNow(before, now, this.balance);
    this.economy = result.state;
    if (result.ok) {
      const done = finishedBuild(before, this.economy);
      if (done) this.logBuild(done, now);
      this.save();
      if (done) for (const listener of this.completeListeners) listener(done);
    }
    this.emit();
    return result;
  }

  /** Cena „Ukończ teraz” w antymaterii (0 = za darmo). */
  finishPrice(now = Date.now()): number {
    return finishCost(this.economy, now, this.balance);
  }

  get capacity(): number {
    return storageCapacity(this.economy, this.balance);
  }

  /** Postęp budowy 0..1. */
  buildProgress(now = Date.now()): number {
    return constructionProgress(this.economy, now);
  }

  /** Sekundy do końca budowy (0, gdy nic się nie buduje). */
  buildSecondsLeft(now = Date.now()): number {
    const c = this.economy.construction;
    return c ? Math.max(0, (c.finishesAt - now) / 1000) : 0;
  }

  // ——— imperium: wiele planet ———

  /** Lista planet do okna „Twoje planety”. */
  planets(): PlanetSummary[] {
    return this.slots.map((slot, index) => {
      const c = slot.economy.construction;
      return {
        index,
        planet: slot.planet,
        name: slot.planet.displayName,
        category: slot.planet.category,
        address: slot.address,
        active: index === this.active,
        totalLevels: Object.values(slot.economy.levels).reduce((sum, level) => sum + level, 0),
        building: c ? (BALANCE.buildings.find((b) => b.id === c.building)?.name ?? null) : null,
      };
    });
  }

  /** Odblokowane miejsca: z zapisu albo więcej, jeśli daje je badanie na którejkolwiek planecie. */
  private get openSlots(): number {
    return Math.max(this.unlockedSlots, ...this.slots.map((slot) => this.balanceFor(slot).planetSlots.base));
  }

  get slotInfo(): { used: number; unlocked: number; max: number } {
    return { used: this.slots.length, unlocked: this.openSlots, max: BALANCE.planetSlots.max };
  }

  /**
   * Zestawienie „Imperium”: każda planeta ze stanem na teraz. Nieaktywne liczone „na niby”
   * (jak przy przejściu na nie) — zapis i stan gry się nie zmieniają.
   */
  overview(now = Date.now()): PlanetOverview[] {
    return this.planets().map((summary) => {
      const slot = this.slots[summary.index]!;
      const economy = summary.active ? this.economy : this.advanceSlot(slot, slot.economy, now, catchUpBalance);
      const balance = this.balanceFor(slot, economy.lastUpdate);
      const c = economy.construction;
      const spec = slot.specialization;
      return {
        ...summary,
        stock: economy.stock,
        capacity: storageCapacity(economy, balance),
        rates: productionRates(economy, slot.planet, balance),
        construction: c
          ? {
              name: BALANCE.buildings.find((b) => b.id === c.building)?.name ?? '',
              level: c.targetLevel,
              secondsLeft: Math.max(0, (c.finishesAt - now) / 1000),
              progress: constructionProgress(economy, now),
            }
          : null,
        queue: queueOf(economy, balance),
        specialization: spec
          ? { name: findSpecialization(spec.id)?.name ?? '', pending: !isSpecializationActive(spec, now) }
          : null,
        fields: fieldsOf(slot, summary.active, this.buildRules),
        deposits: { left: depositsLeft(economy, slot.planet, balance), total: depositTotal(slot.planet, balance) },
        collectorPerHour: productionRates(economy, slot.planet, balance).antimatterPerHour - balance.antimatter.passivePerHour,
        labLevel: economy.levels.laboratory ?? 0,
        researching: (summary.active ? this.research : slot.research).current !== null,
        asteroidLevel: slot.asteroid?.level ?? 0,
      };
    });
  }

  /** Suma imperium: przyrost pasywny antymaterii liczy się raz (na aktywnej planecie), kolektory — wszystkie. */
  empireTotals(overview: PlanetOverview[] = this.overview()): EmpireTotals {
    const sum = (pick: (p: PlanetOverview) => number) => overview.reduce((total, p) => total + pick(p), 0);
    return {
      metalPerHour: sum((p) => p.rates.metal) * 60,
      crystalPerHour: sum((p) => p.rates.crystal) * 60,
      fieldsUsed: sum((p) => p.fields.used),
      fieldsBuildable: sum((p) => p.fields.buildable),
      antimatter: this.economy.antimatter,
      antimatterPerHour: this.balance.antimatter.passivePerHour + sum((p) => p.collectorPerHour),
      energyProduced: sum((p) => p.rates.energyProduced),
      energyUsed: sum((p) => p.rates.energyUsed),
    };
  }

  // ——— dziennik ekspedycji ———

  /** Wpisy dziennika, najnowsze pierwsze. */
  journalEntries(): JournalEntry[] {
    return [...this.journal].reverse();
  }

  private log(kind: JournalKind, text: string, at: number): void {
    this.journal.push({ at, kind, text });
    // Wpisy z nadrabiania czasu mogą przyjść „z przeszłości” — trzymamy kolejność chronologiczną.
    this.journal.sort((a, b) => a.at - b.at);
    if (this.journal.length > JOURNAL_LIMIT) this.journal.splice(0, this.journal.length - JOURNAL_LIMIT);
  }

  private logBuild(done: CompletedBuild, at: number): void {
    const name = BALANCE.buildings.find((b) => b.id === done.building)?.name ?? 'Budynek';
    this.log('build', `${this.planet.displayName}: ${name} — poziom ${done.level} gotowy.`, at);
  }

  /** Czy funkcję gry odblokowało badanie na którejkolwiek planecie (funkcje działają na całe imperium). */
  private unlocked(feature: UnlockFeature): boolean {
    return this.slots.some((slot) =>
      slot.research.done.some((id) => findResearch(id)?.effects.some((e) => e.kind === 'unlock' && e.feature === feature)),
    );
  }

  /** Badania nieaktywnych planet kończą się w swoim czasie (efekty działają od następnego naliczenia). */
  private completeInactiveResearch(now: number): void {
    this.slots.forEach((slot, index) => {
      if (index === this.active) return;
      const c = slot.research.current;
      const result = completeResearch(slot.research, now);
      if (!c || !result.completed) return;
      slot.research = result.research;
      this.log('research', `${slot.planet.displayName}: zbadano ${findResearch(c.id)?.name ?? c.id}.`, c.finishesAt);
      for (const listener of this.researchListeners) listener(c.id);
    });
  }

  // ——— SI Matka ———

  /** SI Matka działa (badanie „SI Matka”). */
  get aiUnlocked(): boolean {
    return this.unlocked('ai-mother');
  }

  /** SI może działać sama (badanie „SI wykonawcze”). */
  get aiAutoUnlocked(): boolean {
    return this.unlocked('ai-executors');
  }

  aiLevel(rule: AiRuleId): AiLevel {
    return this.aiLevels[rule];
  }

  setAiLevel(rule: AiRuleId, level: AiLevel): ActionMessage {
    if (level === 'auto' && !this.aiAutoUnlocked) {
      return { ok: false, message: 'Samodzielne działanie SI wymaga badania „SI wykonawcze”.' };
    }
    this.aiLevels = { ...this.aiLevels, [rule]: level };
    this.aiSnooze.delete(rule);
    this.save();
    this.emit();
    return { ok: true, message: 'Zapisano ustawienie SI.' };
  }

  private aiSuggestions(): AiSuggestion[] {
    return suggest({
      economy: this.economy,
      planet: this.planet,
      balance: this.balance,
      research: this.research,
      labLevel: this.labLevel,
      hasRoom: this.roomCheck(this.slots[this.active]!),
    });
  }

  /** Bieżąca propozycja SI do pokazania graczowi (bez reguł „działa samo” i odrzuconych na chwilę). */
  aiSuggestion(now = Date.now()): (AiSuggestion & { level: AiLevel }) | null {
    if (!this.aiUnlocked) return null;
    for (const s of this.aiSuggestions()) {
      const level = this.effectiveAiLevel(s.rule);
      if (level === 'auto' || (this.aiSnooze.get(s.rule) ?? 0) > now) continue;
      return { ...s, level };
    }
    return null;
  }

  /** Zgoda gracza na propozycję (sprawdzaną ponownie — mogła się zdezaktualizować). */
  aiAccept(key: string, now = Date.now()): ActionMessage {
    this.tick(now);
    const s = this.aiSuggestions().find((x) => x.key === key);
    if (!s) return { ok: false, message: 'Ta propozycja jest już nieaktualna.' };
    const result = this.applyAiAction(s.action, now);
    if (result.ok) this.log('ai', `SI Matka (za Twoją zgodą): ${result.message}`, now);
    this.save();
    this.emit();
    return result;
  }

  /** „Nie” — SI nie pyta o tę regułę przez 10 minut. */
  aiDecline(rule: AiRuleId, now = Date.now()): void {
    this.aiSnooze.set(rule, now + 10 * 60_000);
    this.emit();
  }

  /** „Zawsze tak rób” — reguła przechodzi na „działa samo” i propozycja wykonuje się od razu. */
  aiAlways(key: string, now = Date.now()): ActionMessage {
    const s = this.aiSuggestions().find((x) => x.key === key);
    if (!s) return { ok: false, message: 'Ta propozycja jest już nieaktualna.' };
    const set = this.setAiLevel(s.rule, 'auto');
    return set.ok ? this.aiAccept(key, now) : set;
  }

  /** Reguła „działa samo” bez odblokowania wykonawców liczy się jak „pyta”. */
  private effectiveAiLevel(rule: AiRuleId): AiLevel {
    const level = this.aiLevels[rule];
    return level === 'auto' && !this.aiAutoUnlocked ? 'ask' : level;
  }

  /** SI buduje przy zamkniętej grze (badanie „Autonomia”). */
  get aiOfflineUnlocked(): boolean {
    return this.unlocked('ai-offline');
  }

  /**
   * Nieobecność planety z SI („Autonomia”): SI zaczyna budowy według reguł „działa samo”,
   * każda o 50% dłuższa. Po symulacji czas jest już naliczony do `now`.
   */
  private runAwayAi(slot: Slot, now: number, balance: Balance): void {
    if (!this.aiUnlocked || !this.aiAutoUnlocked || !this.aiOfflineUnlocked) return;
    if (now - slot.economy.lastUpdate < 60_000) return;
    const before = slot.economy;
    const result = simulateAwayAi(
      { economy: before, planet: slot.planet, balance, research: slot.research, levels: this.aiLevels, hasRoom: this.roomCheck(slot) },
      now,
    );
    slot.economy = result.economy;
    for (const s of result.started) {
      const name = BALANCE.buildings.find((b) => b.id === s.building)?.name ?? s.building;
      this.log('ai', `SI Matka (podczas nieobecności) na ${slot.planet.displayName}: ${name} — budowa poz. ${s.level}.`, s.at);
    }
  }

  /** SI wykonawcze: jedno samodzielne działanie na odświeżenie. Zwraca opis albo null. */
  private runAutoAi(now: number): string | null {
    if (!this.aiUnlocked || !this.aiAutoUnlocked) return null;
    const s = this.aiSuggestions().find((x) => this.effectiveAiLevel(x.rule) === 'auto');
    if (!s) return null;
    const result = this.applyAiAction(s.action, now);
    if (!result.ok) return null;
    const text = `SI Matka: ${result.message}`;
    this.log('ai', text, now);
    return text;
  }

  /** Wykonanie działania SI zwykłymi regułami gry (bez ponownego `tick`). */
  private applyAiAction(action: AiAction, now: number): ActionMessage {
    if (action.kind === 'build') {
      const result = upgradeBuilding(this.economy, action.building, now, this.balance, { hasRoom: this.roomCheck(this.slots[this.active]!) });
      this.economy = result.state;
      return result;
    }
    const result = startResearch(this.research, this.economy, action.id, this.labLevel, this.planet.seed, now, this.balance);
    if (!result.ok) return result;
    this.research = result.research;
    this.economy = result.economy;
    return result;
  }

  onAiAction(listener: (text: string) => void): () => void {
    this.aiListeners.add(listener);
    return () => this.aiListeners.delete(listener);
  }

  // ——— statki kolonizacyjne (inne układy) ———

  /** Czy badania odblokowały statek kolonizacyjny. */
  get colonyShipUnlocked(): boolean {
    return this.unlocked('colony-ship');
  }

  /** Czas lotu (s) z aktywnej planety do układu `system`. */
  flightSeconds(system: number): number {
    const from = this.galaxy.systems[(parseAddress(this.address)?.system ?? 1) - 1]!;
    const to = this.galaxy.systems[system - 1];
    if (!to) return 0;
    const ship = this.balance.colonyShip;
    return Math.round(ship.baseSeconds + Math.hypot(to.x - from.x, to.y - from.y) * ship.secondsPerUnit);
  }

  get colonyShipCost(): Resources {
    return this.balance.colonyShip.cost;
  }

  /** Statki w drodze (z nazwami i postępem lotu). */
  missionsView(now = Date.now()): MissionView[] {
    return this.missions.map((m) => {
      const target = parseAddress(m.target);
      const total = m.arrivesAt - m.departedAt;
      return {
        ...m,
        targetName: (target && planetAt(this.galaxy, target)?.name) || m.target,
        fromName: this.slots.find((s) => s.address === m.from)?.planet.displayName ?? m.from,
        secondsLeft: Math.max(0, (m.arrivesAt - now) / 1000),
        progress: total <= 0 ? 1 : Math.min(1, Math.max(0, (now - m.departedAt) / total)),
      };
    });
  }

  missionTo(address: string): ColonyMission | null {
    return this.missions.find((m) => m.target === address) ?? null;
  }

  /** Budowa i wysłanie statku kolonizacyjnego do wolnej planety innego układu (koszt płaci aktywna planeta). */
  sendColonyShip(address: string, now = Date.now()): ActionMessage {
    this.tick(now);
    const where = parseAddress(address);
    const target = where ? planetAt(this.galaxy, where) : null;
    if (!where || !target) return { ok: false, message: 'Nie ma takiej planety.' };
    if (where.system === this.homeSystem) return { ok: false, message: 'Planety Twojego układu kolonizujesz od razu — bez statku.' };
    if (!this.colonyShipUnlocked) {
      return { ok: false, message: 'Najpierw zbadaj „Napęd międzygwiezdny” (Badania → Eksploracja).' };
    }
    if (this.discoveryLevel(where.system) < DISCOVERY.explored) {
      return { ok: false, message: 'Ten układ nie jest zbadany — najpierw trzeba go poznać (ekspedycje — wkrótce).' };
    }
    if (this.missionTo(address)) return { ok: false, message: 'Statek już leci do tej planety.' };
    const blocked = this.colonizeBlocker(target);
    if (blocked) return { ok: false, message: blocked };
    const cost = this.colonyShipCost;
    if (!fitsInStorage(this.economy, cost, this.balance)) {
      return { ok: false, message: `Za mały magazyn (${this.capacity}). Najpierw rozbuduj Magazyn.` };
    }
    const stock = this.economy.stock;
    if (stock.metal < cost.metal || stock.crystal < cost.crystal) {
      const missing: string[] = [];
      if (stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - stock.metal)} metalu`);
      if (stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - stock.crystal)} kryształów`);
      return { ok: false, message: `Statek kolonizacyjny — brakuje: ${missing.join(', ')}.` };
    }
    const seconds = this.flightSeconds(where.system);
    this.economy = { ...this.economy, stock: { metal: stock.metal - cost.metal, crystal: stock.crystal - cost.crystal } };
    this.missions.push({ target: address, from: this.address, departedAt: now, arrivesAt: now + seconds * 1000, cost: { ...cost } });
    this.log('ship', `Statek kolonizacyjny wyruszył z ${this.planet.displayName} do ${target.name}.`, now);
    this.save();
    this.emit();
    return { ok: true, message: `Statek kolonizacyjny leci do ${target.name}.` };
  }

  /** Zawrócenie statku: pełny zwrot kosztu planecie, z której wyruszył. */
  cancelMission(address: string, now = Date.now()): ActionMessage {
    this.tick(now);
    const mission = this.missionTo(address);
    if (!mission) return { ok: false, message: 'Żaden statek nie leci do tej planety.' };
    const name = this.missionsView(now).find((m) => m.target === address)?.targetName ?? address;
    this.missions = this.missions.filter((m) => m !== mission);
    const payer = this.slots.find((s) => s.address === mission.from) ?? this.slots[this.active]!;
    payer.economy = {
      ...payer.economy,
      stock: { metal: payer.economy.stock.metal + mission.cost.metal, crystal: payer.economy.stock.crystal + mission.cost.crystal },
    };
    this.log('ship', `Statek do ${name} zawrócił — koszt zwrócony.`, now);
    this.save();
    this.emit();
    return { ok: true, message: `Statek zawrócił. Zwrócono ${mission.cost.metal} metalu i ${mission.cost.crystal} kryształów.` };
  }

  onColonyArrived(listener: (name: string) => void): () => void {
    this.colonyListeners.add(listener);
    return () => this.colonyListeners.delete(listener);
  }

  /** Przyloty statków do `now`: każdy zakłada kolonię (nieaktywną — gracz przechodzi na nią sam). */
  private processMissions(now: number): string[] {
    const arrived: string[] = [];
    for (const mission of [...this.missions].sort((a, b) => a.arrivesAt - b.arrivesAt)) {
      if (mission.arrivesAt > now) continue;
      this.missions = this.missions.filter((m) => m !== mission);
      const where = parseAddress(mission.target);
      const target = where ? planetAt(this.galaxy, where) : null;
      if (!target || this.slotAt(mission.target) >= 0) continue;
      const planet = galaxyPlanet(target);
      this.slots.push({ planet, economy: { ...createEconomy(mission.arrivesAt), antimatter: 0 }, address: mission.target, research: EMPTY_RESEARCH, plots: {} });
      this.log('colony', `Statek dotarł — skolonizowano ${planet.displayName} (${mission.target}).`, mission.arrivesAt);
      arrived.push(planet.displayName);
    }
    return arrived;
  }

  // ——— transportowce (v0.36) ———

  /** Ładowność i czas lotu z najlepszych badań w imperium (badania są przy planetach). */
  private transportBalance(): Balance {
    const balance = this.balance;
    const all = this.slots.map((slot) => this.balanceFor(slot).transport);
    return {
      ...balance,
      transport: {
        ...balance.transport,
        capacity: Math.max(...all.map((t) => t.capacity)),
        baseSeconds: Math.min(...all.map((t) => t.baseSeconds)),
        secondsPerUnit: Math.min(...all.map((t) => t.secondsPerUnit)),
      },
    };
  }

  transportView(): TransportView {
    const t = this.transportBalance().transport;
    return { unlocked: this.unlocked('transport'), capacity: t.capacity, maxActive: t.maxActive, active: this.shipments.length };
  }

  /** Odległość na mapie galaktyki między planetami (ten sam układ = 0). */
  private distanceBetween(a: string, b: string): number {
    const from = this.galaxy.systems[(parseAddress(a)?.system ?? 1) - 1];
    const to = this.galaxy.systems[(parseAddress(b)?.system ?? 1) - 1];
    return from && to ? Math.hypot(to.x - from.x, to.y - from.y) : 0;
  }

  /** Czas lotu transportowca (s) z aktywnej planety do planety `to`. */
  transportSecondsTo(to: string): number {
    return transportSeconds(this.distanceBetween(this.address, to), this.transportBalance());
  }

  private slotName(address: string): string {
    return this.slots.find((s) => s.address === address)?.planet.displayName ?? address;
  }

  /** Wysłanie metalu i kryształów z aktywnej planety do innej planety gracza (ładunek schodzi od razu). */
  sendResources(to: string, cargo: Resources, now = Date.now()): ActionMessage {
    this.tick(now);
    if (!this.unlocked('transport')) return { ok: false, message: 'Najpierw zbadaj „Transportowce” (Badania → Flota).' };
    if (this.slotAt(to) < 0) return { ok: false, message: 'Transportowce latają tylko między Twoimi planetami.' };
    const balance = this.transportBalance();
    const check = checkShipment(cargo, this.economy.stock, this.shipments.length, balance, to === this.address);
    if (!check.ok) return check;
    const load = check.cargo;
    const seconds = transportSeconds(this.distanceBetween(this.address, to), balance);
    this.economy = { ...this.economy, stock: { metal: this.economy.stock.metal - load.metal, crystal: this.economy.stock.crystal - load.crystal } };
    this.shipments.push({ from: this.address, to, departedAt: now, arrivesAt: now + seconds * 1000, cargo: load });
    const toName = this.slotName(to);
    this.log('ship', `Transportowiec wyruszył z ${this.planet.displayName} do ${toName}: ${load.metal} metalu, ${load.crystal} kryształów.`, now);
    this.save();
    this.emit();
    return { ok: true, message: `Transportowiec leci do ${toName} — dotrze za ${seconds >= 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds} s`}.` };
  }

  /** Transportowce w drodze (z nazwami i postępem lotu). */
  shipmentsView(now = Date.now()): ShipmentView[] {
    return this.shipments.map((s) => {
      const total = s.arrivesAt - s.departedAt;
      return {
        ...s,
        fromName: this.slotName(s.from),
        toName: this.slotName(s.to),
        secondsLeft: Math.max(0, (s.arrivesAt - now) / 1000),
        progress: total <= 0 ? 1 : Math.min(1, Math.max(0, (now - s.departedAt) / total)),
      };
    });
  }

  onShipmentArrived(listener: (text: string) => void): () => void {
    this.shipmentListeners.add(listener);
    return () => this.shipmentListeners.delete(listener);
  }

  /**
   * Przyloty transportowców do `now`: ładunek trafia do magazynu odbiorcy (nieaktywna planeta najpierw
   * nadrabia czas do chwili przylotu). Gdy odbiorcy już nie ma — wraca do nadawcy; gdy i jego — przepada.
   */
  private processShipments(now: number): string[] {
    const texts: string[] = [];
    for (const shipment of [...this.shipments].sort((a, b) => a.arrivesAt - b.arrivesAt)) {
      if (shipment.arrivesAt > now) continue;
      this.shipments = this.shipments.filter((s) => s !== shipment);
      let index = this.slotAt(shipment.to);
      const returned = index < 0;
      if (returned) index = this.slotAt(shipment.from);
      const { metal, crystal } = shipment.cargo;
      if (index < 0) {
        this.log('ship', `Transportowiec nie miał dokąd wrócić — ładunek przepadł (${metal} metalu, ${crystal} kryształów).`, shipment.arrivesAt);
        continue;
      }
      const slot = this.slots[index]!;
      this.deliver(index, shipment.cargo, shipment.arrivesAt);
      const text = returned
        ? `Transportowiec wrócił na ${slot.planet.displayName} — odbiorcy już nie ma. Ładunek rozładowany.`
        : `Transportowiec dotarł na ${slot.planet.displayName}: +${metal} metalu, +${crystal} kryształów.`;
      this.log('ship', text, shipment.arrivesAt);
      texts.push(text);
    }
    return texts;
  }

  /** Ładunek do magazynu planety: nieaktywna najpierw nadrabia czas do chwili przylotu. */
  private deliver(index: number, cargo: Resources, at: number): void {
    const slot = this.slots[index]!;
    const economy =
      index === this.active || slot.economy.lastUpdate >= at ? slot.economy : this.advanceSlot(slot, slot.economy, at, catchUpBalance);
    slot.economy = { ...economy, stock: { metal: economy.stock.metal + cargo.metal, crystal: economy.stock.crystal + cargo.crystal } };
  }

  // ——— przechwyt komet (v0.37.1) ———

  /** Holownik aktywnej planety: odblokowanie, lot w toku, koszt i czas, możliwy ładunek. */
  cometView(now = Date.now()): {
    unlocked: boolean;
    flying: { secondsLeft: number; cargo: Resources } | null;
    cost: Resources;
    seconds: number;
    cargoMin: Resources;
    cargoMax: Resources;
  } {
    const c = this.balance.comet;
    const haul = this.comets.find((h) => h.planet === this.address);
    return {
      unlocked: this.unlocked('comet-capture'),
      flying: haul ? { secondsLeft: Math.max(0, (haul.returnsAt - now) / 1000), cargo: haul.cargo } : null,
      cost: c.cost,
      seconds: c.seconds,
      cargoMin: c.cargoMin,
      cargoMax: c.cargoMax,
    };
  }

  /** Holowniki w drodze (do „Imperium”). */
  cometsView(now = Date.now()): { planetName: string; secondsLeft: number }[] {
    return this.comets.map((h) => ({ planetName: this.slotName(h.planet), secondsLeft: Math.max(0, (h.returnsAt - now) / 1000) }));
  }

  /** Wysłanie holownika z aktywnej planety (koszt od razu, ładunek po powrocie). */
  launchComet(now = Date.now()): ActionMessage {
    this.tick(now);
    const result = launchComet(
      this.address,
      { unlocked: this.unlocked('comet-capture'), busy: this.comets.some((h) => h.planet === this.address), stock: this.economy.stock, now },
      this.balance,
    );
    if (!result.ok) return result;
    const cost = this.balance.comet.cost;
    const stock = this.economy.stock;
    this.economy = { ...this.economy, stock: { metal: stock.metal - cost.metal, crystal: stock.crystal - cost.crystal } };
    this.comets.push(result.haul);
    this.log('ship', `${this.planet.displayName}: holownik wyruszył po kometę.`, now);
    this.save();
    this.emit();
    return { ok: true, message: `Holownik leci po kometę — wróci za ${Math.ceil(this.balance.comet.seconds / 60)} min.` };
  }

  /** Powroty holowników do `now`: ładunek do magazynu planety (usunięta planeta — ładunek przepada). */
  private processComets(now: number): string[] {
    const texts: string[] = [];
    for (const haul of [...this.comets].sort((a, b) => a.returnsAt - b.returnsAt)) {
      if (haul.returnsAt > now) continue;
      this.comets = this.comets.filter((h) => h !== haul);
      const index = this.slotAt(haul.planet);
      if (index < 0) continue;
      this.deliver(index, haul.cargo, haul.returnsAt);
      const text = `Kometa przyholowana na ${this.slots[index]!.planet.displayName}: +${haul.cargo.metal} metalu, +${haul.cargo.crystal} kryształów.`;
      this.log('ship', text, haul.returnsAt);
      texts.push(text);
    }
    return texts;
  }

  /** Powód, dla którego nie da się zająć planety (albo null). Wspólne dla kolonizacji i statków. */
  private colonizeBlocker(target: SystemPlanet): string | null {
    const occupant = this.occupantAt(target);
    if (occupant === 'you') return `${target.name} już należy do Ciebie.`;
    if (occupant === 'bot') return 'Tu jest miejsce startowe innego gracza.';
    if (target.body === 'gas-giant') return 'Gazowego olbrzyma nie da się skolonizować — stacje wydobycia gazu będą wkrótce.';
    if (occupant === 'alien') return 'Na tej planecie żyje forma obca — jej przejęcie będzie możliwe wkrótce.';
    if (!hasFreeSlot(this.slots.length + this.missions.length, this.openSlots)) {
      return `Wszystkie miejsca (${this.openSlots}) są zajęte${this.missions.length ? ' (licząc statki w drodze)' : ''} — usuń planetę, żeby skolonizować nową.`;
    }
    return null;
  }

  // ——— badania ———

  /** Laboratorium aktywnej planety (każda planeta bada sama). */
  get labLevel(): number {
    return this.economy.levels.laboratory ?? 0;
  }

  /** Najdalszy pierścień galaktyki dostępny z obecnym Laboratorium. */
  get researchRing(): number {
    return ringLimit(this.labLevel);
  }

  researchStatus(id: string): ResearchStatus | null {
    const node = findResearch(id);
    return node ? researchStatus(node, this.research, this.labLevel) : null;
  }

  researchCost(id: string): ResearchCost | null {
    const node = findResearch(id);
    return node ? researchCost(node, this.research.done.length) : null;
  }

  researchSeconds(id: string): number {
    const node = findResearch(id);
    return node ? researchSeconds(node, this.labLevel, this.balance) : 0;
  }

  /** Efekt badania w liczbach „przed → po” na aktywnej planecie. */
  researchPreview(id: string): ResearchPreview[] {
    const node = findResearch(id);
    return node ? researchPreview(node, this.economy, this.planet, this.research.done) : [];
  }

  researchProgress(now = Date.now()): number {
    return researchProgress(this.research, now);
  }

  researchSecondsLeft(now = Date.now()): number {
    const c = this.research.current;
    return c ? Math.max(0, (c.finishesAt - now) / 1000) : 0;
  }

  /** Rozpoczęcie badania — koszt płaci aktywna planeta, antymateria ze wspólnego portfela. */
  startResearch(id: string, now = Date.now()): ActionMessage {
    this.tick(now);
    const result = startResearch(this.research, this.economy, id, this.labLevel, this.planet.seed, now, this.balance);
    if (!result.ok) return result;
    this.research = result.research;
    this.economy = result.economy;
    this.save();
    this.emit();
    return result;
  }

  /** Anulowanie badania: pełny zwrot (surowce do planety, która płaciła, antymateria do portfela). */
  cancelResearch(now = Date.now()): ActionMessage {
    this.tick(now);
    const c = this.research.current;
    if (!c) return { ok: false, message: 'Nic się teraz nie bada.' };
    const payer = this.slots.find((slot) => slot.planet.seed === c.paidBy) ?? this.slots[this.active]!;
    payer.economy = {
      ...payer.economy,
      stock: { metal: payer.economy.stock.metal + c.cost.metal, crystal: payer.economy.stock.crystal + c.cost.crystal },
    };
    this.economy = { ...this.economy, antimatter: this.economy.antimatter + c.antimatter };
    this.research = { ...this.research, current: null };
    this.save();
    this.emit();
    const where = payer === this.slots[this.active] ? '' : ` (na planetę ${payer.planet.displayName})`;
    return {
      ok: true,
      message: `${findResearch(c.id)?.name ?? 'Badanie'}: anulowano, zwrócono ${c.cost.metal} metalu i ${c.cost.crystal} kryształów${where}.`,
    };
  }

  onResearchComplete(listener: (id: string) => void): () => void {
    this.researchListeners.add(listener);
    return () => this.researchListeners.delete(listener);
  }

  /** Przejście na inną planetę: ta nadrabia czas (jak po nieobecności, maks. 8 h). */
  switchPlanet(index: number, now = Date.now()): ActionMessage {
    const target = this.slots[index];
    if (!target) return { ok: false, message: 'Nie ma takiej planety.' };
    if (index === this.active) return { ok: true, message: `${target.planet.displayName} — już tu jesteś.` };
    this.tick(now);
    const wallet = this.economy.antimatter;
    this.economy = { ...this.economy, antimatter: 0 };
    this.active = index;
    const before = { ...target.economy, antimatter: 0 };
    // SI może dalej budować podczas nieobecności (po badaniu „Autonomia”), wolniej o 50%.
    target.economy = before;
    this.runAwayAi(target, now, catchUpBalance(this.balanceFor(target)));
    const caughtUp = this.advanceSlot(target, target.economy, now, catchUpBalance);
    // Antymateria wyprodukowana przez kolektor tej planety trafia do wspólnego portfela.
    this.economy = { ...caughtUp, antimatter: wallet + caughtUp.antimatter };
    this.reportAway(before, now);
    if (this.completedWhileAway) this.logBuild(this.completedWhileAway, before.construction?.finishesAt ?? now);
    this.save();
    for (const listener of this.planetListeners) listener();
    this.emit();
    return { ok: true, message: `Przeniesiono na: ${target.planet.displayName}.` };
  }

  // ——— mapa galaktyki ———

  get galaxy(): Galaxy {
    return generateGalaxy(GALAXY_ID);
  }

  /** Adres aktywnej planety. */
  get address(): string {
    return this.slots[this.active]!.address;
  }

  // ——— wiedza o galaktyce (v0.34.2) ———

  /** Układy, w których gracz jest: startowy, z jego planetami i celami statków (zawsze zbadane). */
  private ownSystems(): number[] {
    const systems = [this.home, ...this.slots.map((s) => s.address), ...this.missions.map((m) => m.target)]
      .map((a) => parseAddress(a)?.system)
      .filter((i): i is number => i !== undefined);
    return [...new Set(systems)];
  }

  /** Wiedza z zapisu (uzupełniona o własne układy) albo — dla starszych zapisów i nowej gry — na start. */
  private restoreDiscoveries(saved: Discoveries | undefined): void {
    const own = this.ownSystems();
    this.discoveries = saved ? ensureKnown(saved, own) : initialDiscoveries(this.galaxy, own);
  }

  /** Poziom wiedzy o układzie (0 nieznany … 4 zbadany). */
  discoveryLevel(index: number): DiscoveryLevel {
    return discoveryOf(this.discoveries, index);
  }

  /** Zapis odkrycia (ekspedycje, v0.34.3): wiedza tylko rośnie i trafia do zapisu. */
  markDiscovered(index: number, level: DiscoveryLevel): void {
    const next = raiseDiscovery(this.discoveries, index, level);
    if (next === this.discoveries) return;
    this.discoveries = next;
    this.save();
    this.emit();
  }

  // ——— ekspedycje (v0.34.3) ———

  /** Możliwości ekspedycji z badań (odblokowanie — dowolna planeta, parametry — najlepsza). */
  get expeditionStats(): ExpeditionStats {
    return expeditionStats(this.slots.map((slot) => slot.research.done));
  }

  /** Plan wyprawy do układu (zasięg, czas, koszt, szansa albo powód, czemu się nie da). */
  expeditionPlan(index: number): ExpeditionPlan {
    return planExpedition(this.galaxy, this.discoveries, this.ownSystems(), this.expeditions, index, this.expeditionStats);
  }

  /** Wysłanie ekspedycji (koszt płaci aktywna planeta). Wynik — po powrocie (też przy zamkniętej grze). */
  sendExpedition(index: number, now = Date.now()): ActionMessage {
    this.tick(now);
    const plan = this.expeditionPlan(index);
    if (!plan.ok) return { ok: false, message: plan.reason ?? 'Nie można wysłać ekspedycji.' };
    const cost = plan.cost;
    if (!fitsInStorage(this.economy, cost, this.balance)) {
      return { ok: false, message: `Za mały magazyn (${this.capacity}). Najpierw rozbuduj Magazyn.` };
    }
    const stock = this.economy.stock;
    if (stock.metal < cost.metal || stock.crystal < cost.crystal) {
      const missing: string[] = [];
      if (stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - stock.metal)} metalu`);
      if (stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - stock.crystal)} kryształów`);
      return { ok: false, message: `Ekspedycja — brakuje: ${missing.join(', ')}.` };
    }
    this.economy = { ...this.economy, stock: { metal: stock.metal - cost.metal, crystal: stock.crystal - cost.crystal } };
    this.expeditions.push({
      target: index,
      from: this.address,
      departedAt: now,
      returnsAt: now + plan.seconds * 1000,
      cost: { ...cost },
      chance: plan.chance,
      quality: plan.quality,
      scan: plan.scan,
      ...(plan.extreme ? { extreme: true } : {}),
    });
    const name = this.knownName(index);
    this.log('expedition', `Ekspedycja wyruszyła z ${this.planet.displayName}: ${name} (szansa ${Math.round(plan.chance * 100)}%).`, now);
    this.save();
    this.emit();
    return { ok: true, message: `Ekspedycja wyruszyła: ${name}. Powrót za ${Math.round(plan.seconds / 60)} min.` };
  }

  /** Ekspedycje w drodze: cel (tak, jak go znamy), postęp i czas do powrotu. */
  expeditionsView(now = Date.now()): ExpeditionView[] {
    return this.expeditions.map((e) => ({
      target: e.target,
      name: this.knownName(e.target),
      progress: Math.min(1, Math.max(0, (now - e.departedAt) / Math.max(1, e.returnsAt - e.departedAt))),
      secondsLeft: Math.max(0, (e.returnsAt - now) / 1000),
    }));
  }

  onExpeditionReturn(listener: (report: ExpeditionReport) => void): () => void {
    this.expeditionListeners.add(listener);
    return () => this.expeditionListeners.delete(listener);
  }

  /** Układy gracza (startowy, z planetami, cele statków) — do rysowania zasięgu ekspedycji. */
  ownSystemIndexes(): number[] {
    return this.ownSystems();
  }

  /** Z którego własnego układu (najbliższego) leci ekspedycja do celu — do rysowania trasy. */
  expeditionOrigin(target: number): number | null {
    const e = this.expeditions.find((x) => x.target === target);
    return e ? (parseAddress(e.from)?.system ?? null) : null;
  }

  /** Nazwa układu taka, jaką gracz zna (sygnał — bez nazwy). */
  private knownName(index: number): string {
    return this.discoveryLevel(index) >= DISCOVERY.detected ? (this.galaxy.systems[index - 1]?.name ?? `układ 1:${index}`) : 'nieznany sygnał';
  }

  /**
   * Rozliczenie wypraw, które już wróciły (w kolejności powrotów): wiedza rośnie, wpis w dzienniku,
   * wyprawa znika z listy — każda rozliczana dokładnie raz, także po nieobecności.
   */
  private processExpeditions(now: number): ExpeditionReport[] {
    const reports: ExpeditionReport[] = [];
    for (const expedition of [...this.expeditions].sort((a, b) => a.returnsAt - b.returnsAt)) {
      if (expedition.returnsAt > now) continue;
      this.expeditions = this.expeditions.filter((e) => e !== expedition);
      const before = this.knownName(expedition.target);
      const outcome = resolveExpedition(this.galaxy, this.discoveries, expedition);
      this.discoveries = outcome.known;
      const system = this.galaxy.systems[expedition.target - 1]!;
      let text: string;
      if (!outcome.success) {
        text = `Ekspedycja (${before}) wróciła bez wyników — sygnał się urwał. Szansa była ${Math.round(expedition.chance * 100)}%.`;
      } else if (outcome.unreadable && outcome.after < DISCOVERY.recognized) {
        text = `Ekspedycja (${before}): niezwykły obiekt — ${system.name}. Jego sygnału nie umiemy odczytać; potrzebna „Astrofizyka ekstremalna”.`;
      } else {
        const rare = RARE_OBJECTS.find((r) => r.star === system.star);
        const science =
          rare && outcome.after >= DISCOVERY.explored && outcome.before < DISCOVERY.explored
            ? ` Rzadki obiekt! Dane naukowe: ${describeEffectList(rare.effects)} dla imperium.`
            : '';
        const what =
          outcome.after >= DISCOVERY.explored
            ? `${system.name} zbadany — ${findStar(system.star).label.toLowerCase()}, planet: ${system.planetCount}. Widok układu i kolonizacja dostępne.`
            : outcome.after >= DISCOVERY.recognized
              ? `${system.name} rozpoznany — ${findStar(system.star).label.toLowerCase()}, planet: ${system.planetCount}.`
              : `${system.name} wykryty.`;
        const extra = outcome.revealed.length > 0 ? ` Nowe sygnały w pobliżu: ${outcome.revealed.length}.` : '';
        text = `Ekspedycja (${before}): ${what}${science}${extra}`;
      }
      this.log('expedition', text, expedition.returnsAt);
      reports.push({ target: expedition.target, success: outcome.success, text });
    }
    return reports;
  }

  /** Czy układ jest rzadkim obiektem — tylko gdy gracz już to wie (wykryty lub dalej). */
  knownRare(index: number): boolean {
    return this.discoveryLevel(index) >= DISCOVERY.detected && isRare(this.galaxy, index);
  }

  /** Premie z zbadanych rzadkich obiektów (do panelu mapy). */
  get rareBonuses(): { label: string; count: number; max: number; text: string }[] {
    return rareBonuses(this.galaxy, this.discoveries).map((b) => ({
      label: b.def.label,
      count: b.count,
      max: b.def.maxCount,
      text: describeEffectList(b.def.effects),
    }));
  }

  /** Efekty premii rzadkich obiektów i klucz do pamięci balansu (liczone raz na zmianę wiedzy). */
  private rareEffects(): { effects: ResearchEffect[]; key: string } {
    if (this.rareCache?.known === this.discoveries) return this.rareCache;
    const bonuses = rareBonuses(this.galaxy, this.discoveries);
    this.rareCache = { known: this.discoveries, effects: bonuses.flatMap((b) => b.effects), key: bonuses.map((b) => b.count).join(',') };
    return this.rareCache;
  }

  /** Spis układów, o których gracz coś wie (do wyszukiwarki i filtrów mapy, v0.34.5). */
  knownSystemsList(): KnownSystem[] {
    const own = new Set(this.ownSystems());
    const stats = this.expeditionStats;
    return this.galaxy.systems
      .filter((s) => this.discoveryLevel(s.index) > DISCOVERY.unknown)
      .map((s) => ({
        index: s.index,
        name: this.knownName(s.index) === 'nieznany sygnał' ? 'Nieznany sygnał' : s.name,
        level: this.discoveryLevel(s.index),
        rare: this.knownRare(s.index),
        distance: Math.round(distanceFrom(this.galaxy, [...own], s.index)),
        reachable: stats.unlocked && this.expeditionPlan(s.index).ok,
        own: own.has(s.index),
      }));
  }

  /** Ile układów gracz zna (co najmniej wykrytych). */
  get knownSystems(): number {
    return knownCount(this.discoveries);
  }

  /** Numer układu startowego gracza. */
  get homeSystem(): number {
    return parseAddress(this.home)?.system ?? 1;
  }

  system(index: number): StarSystem | null {
    return generateSystem(this.galaxy, index);
  }

  /** Indeks planety gracza pod adresem (albo −1). */
  slotAt(address: string): number {
    return this.slots.findIndex((slot) => slot.address === address);
  }

  /** Planeta gracza pod adresem (do miniatur na mapie). */
  planetAtSlot(index: number): Planet | null {
    return this.slots[index]?.planet ?? null;
  }

  /**
   * Geologia planety z mapy: pola i złoże całkowite; własna planeta także z tym, co zostało
   * (nieaktywna — policzona na teraz, jak w „Imperium”; zapis się nie zmienia).
   */
  geologyAt(planet: Planet, address: string, now = Date.now()): Geology {
    const index = this.slotAt(address);
    const slot = this.slots[index];
    if (!slot) return geologyOf(planet, null, this.balance);
    const economy = index === this.active ? this.economy : this.advanceSlot(slot, slot.economy, now, catchUpBalance);
    return geologyOf(slot.planet, economy, this.balanceFor(slot));
  }

  /** Kto jest na planecie: Ty, bot (inny gracz), forma obca albo nikt. */
  occupantAt(planet: SystemPlanet): MapOccupant {
    if (this.slotAt(planet.address) >= 0) return 'you';
    // Własne miejsce startowe po usunięciu planety jest znów wolne.
    if (planet.occupant === 'home') return planet.address === this.home ? 'free' : 'bot';
    return planet.occupant;
  }

  /**
   * Kolonizacja wolnej planety we własnym układzie (inne układy: po badaniu i ze statkiem — wkrótce).
   * Obecne planety zostają i dalej produkują.
   */
  colonize(address: string, now = Date.now()): ActionMessage {
    const where = parseAddress(address);
    const target = where ? planetAt(this.galaxy, where) : null;
    if (!where || !target) return { ok: false, message: 'Nie ma takiej planety.' };
    if (where.system !== this.homeSystem) {
      const blocked = this.occupantAt(target) === 'free' && target.body === 'rocky' ? null : this.colonizeBlocker(target);
      if (blocked) return { ok: false, message: blocked };
      return {
        ok: false,
        message: this.colonyShipUnlocked
          ? 'Do innego układu trzeba wysłać statek kolonizacyjny — „Wyślij statek”.'
          : 'Kolonizacja innych układów wymaga badania „Napęd międzygwiezdny” (Eksploracja) i statku kolonizacyjnego.',
      };
    }
    const blocked = this.colonizeBlocker(target);
    if (blocked) return { ok: false, message: blocked };
    const planet = galaxyPlanet(target);
    // Zapas startowy antymaterii dostaje tylko pierwsza planeta (portfel jest wspólny).
    this.slots.push({ planet, economy: { ...createEconomy(now), antimatter: 0 }, address, research: EMPTY_RESEARCH, plots: {} });
    this.log('colony', `Skolonizowano: ${planet.displayName} (${address}).`, now);
    const result = this.switchPlanet(this.slots.length - 1, now);
    this.offlineGain = null;
    this.completedWhileAway = null;
    return result.ok ? { ok: true, message: `Skolonizowano: ${planet.displayName} (${planet.category}).` } : result;
  }

  /**
   * Każda planeta gracza ma adres. Zapisy sprzed v0.11: pierwsza planeta trafia na miejsce startowe
   * gracza, pozostałe — na wolne planety układu startowego (wygląd i postęp się nie zmieniają).
   */
  private placeOnMap(): void {
    const galaxy = this.galaxy;
    if (!parseAddress(this.home)) {
      this.home = starterSystem(galaxy, BALANCE.planetSlots.base).home.address;
    }
    const seen = new Set<string>();
    for (const slot of this.slots) {
      if (seen.has(slot.address) || !parseAddress(slot.address)) slot.address = '';
      if (slot.address) seen.add(slot.address);
    }
    const system = generateSystem(galaxy, this.homeSystem)!;
    const open = [this.home, ...system.planets.filter(isColonizable).map((p) => p.address)];
    for (const slot of this.slots) {
      if (slot.address) continue;
      // Brak miejsca w układzie (nie powinno się zdarzyć) — kolejne układy po kolei.
      slot.address = open.find((a) => !seen.has(a)) ?? this.spareAddress(seen);
      seen.add(slot.address);
    }
  }

  private spareAddress(taken: Set<string>): string {
    for (const summary of this.galaxy.systems) {
      const free = generateSystem(this.galaxy, summary.index)!.planets.find((p) => isColonizable(p) && !taken.has(p.address));
      if (free) return free.address;
    }
    return formatAddress({ galaxy: GALAXY_ID, system: 1, position: 1 });
  }

  /** Usunięcie planety (nie aktywnej). Postęp tej planety przepada. */
  removePlanet(index: number): ActionMessage {
    const slot = this.slots[index];
    if (!slot) return { ok: false, message: 'Nie ma takiej planety.' };
    if (index === this.active) return { ok: false, message: 'Nie można usunąć planety, na której jesteś — najpierw przejdź na inną.' };
    this.slots.splice(index, 1);
    if (index < this.active) this.active--;
    this.log('empire', `Opuszczono planetę ${slot.planet.displayName} (${slot.address}).`, Date.now());
    this.save();
    this.emit();
    return { ok: true, message: `Usunięto planetę ${slot.planet.displayName}.` };
  }

  save(): boolean {
    return writeEmpire(this.empireData());
  }

  /** Zapis całego imperium jako tekst „PF2:…” do skopiowania. */
  exportSave(now = Date.now()): string {
    this.tick(now);
    return exportSave(this.empireData());
  }

  /**
   * Wczytanie zapisu z tekstu: zastępuje wszystkie planety i postęp.
   * Czas od eksportu nalicza się jak nieobecność (maks. 8 h).
   */
  importSave(text: string, now = Date.now()): ActionMessage {
    const result = importSave(text, (id) => findDefinition(id) !== undefined, GENERATOR_VERSION);
    if (!result.ok) return result;
    const slots = restoreSlots(result.data.slots);
    this.slots = slots;
    this.unlockedSlots = result.data.unlockedSlots;
    this.home = result.data.home ?? '';
    this.missions = result.data.missions ?? [];
    this.expeditions = result.data.expeditions ?? [];
    this.shipments = result.data.shipments ?? [];
    this.comets = result.data.comets ?? [];
    this.journal = result.data.journal ?? [];
    this.aiLevels = result.data.ai ?? { ...DEFAULT_AI_LEVELS };
    this.active = result.data.active;
    migrateResearch(this.slots, result.data.slots, result.data.research, this.active);
    this.placeOnMap();
    this.restoreDiscoveries(result.data.discoveries);
    this.economy = { ...this.economy, antimatter: result.data.antimatter };
    this.advanceActive(now);
    this.processMissions(now);
    this.processExpeditions(now);
    this.processShipments(now);
    this.processComets(now);
    this.offlineGain = null;
    this.completedWhileAway = null;
    this.log('empire', 'Wczytano zapis gry.', now);
    this.save();
    for (const listener of this.planetListeners) listener();
    this.emit();
    const count = slots.length === 1 ? '1 planeta' : `${slots.length} planet${slots.length < 5 ? 'y' : ''}`;
    return { ok: true, message: `Wczytano zapis: ${count}, aktywna ${this.planet.displayName}.` };
  }

  private empireData(): Omit<EmpireSave, 'saveVersion'> {
    return {
      active: this.active,
      // Miejsca z badań też trafiają do zapisu (walidacja: planet ≤ odblokowanych miejsc).
      unlockedSlots: this.openSlots,
      // Badania są teraz przy planetach; pole imperium zostaje puste (zgodność formatu).
      research: EMPTY_RESEARCH,
      home: this.home,
      missions: this.missions,
      discoveries: this.discoveries,
      expeditions: this.expeditions,
      shipments: this.shipments,
      comets: this.comets,
      journal: this.journal,
      ai: this.aiLevels,
      antimatter: this.economy.antimatter,
      slots: this.slots.map((slot) => ({
        kind: 'planet',
        planet: {
          definitionId: slot.planet.definitionId,
          seed: slot.planet.seed,
          generatorVersion: slot.planet.generatorVersion,
          address: slot.address,
        },
        economy: { ...slot.economy, antimatter: 0 },
        research: slot.research,
        // Bez przeliczania siatek wszystkich planet przy każdym zapisie — aktywna jest dopasowywana na bieżąco.
        plots: slot.plots,
        plotsGrid: FIELD_GRID_VERSION,
        ...(slot.complexes?.length ? { complexes: slot.complexes } : {}),
        ...(slot.fields ? { fields: slot.fields } : {}),
        ...(slot.specialization ? { specialization: slot.specialization } : {}),
        ...(slot.asteroid ? { asteroidStation: slot.asteroid } : {}),
      })),
    };
  }

  /** Komunikaty „podczas nieobecności” dla aktywnej planety. */
  private reportAway(before: EconomyState, now: number): void {
    this.completedWhileAway = finishedBuild(before, this.economy);
    this.offlineGain = null;
    const seconds = Math.min((now - before.lastUpdate) / 1000, this.balance.maxOfflineSeconds);
    if (seconds > 60) {
      this.offlineGain = {
        metal: this.economy.stock.metal - before.stock.metal,
        crystal: this.economy.stock.crystal - before.stock.crystal,
        seconds,
      };
    }
  }

  /**
   * Pola aktywnej planety: wszystkie, lądowe (do zabudowy) i zajęte. Każdy poziom budynku zajmuje
   * jedno pole lądu (od v0.26).
   */
  get fields(): FieldsInfo {
    const slot = this.slots[this.active]!;
    return { total: fieldGrid(slot.planet).cells.length, ...fieldsOf(slot, true, this.buildRules) };
  }

  /** Siatka pól i zajęte pola aktywnej planety (z budową w toku) — do rysowania kolonii. */
  colony(): { grid: FieldGrid; plots: Plots; complexes: Complex[] } {
    const slot = this.slots[this.active]!;
    const plots = syncPlots(slot, this.buildRules);
    return { grid: fieldGrid(slot.planet), plots, complexes: slot.complexes ?? [] };
  }

  // ——— wybór pola przez gracza (v0.38.2) ———

  /**
   * Czy następny poziom budynku otworzy nowe pole i gdzie gracz może je postawić: wolne pola dedykowanego
   * terenu (kryształy — lód, metal — wzgórza i góry, elektrownia — równiny). Tylko gdy nic się teraz nie buduje.
   */
  placement(id: BuildingId): { needed: boolean; cells: number[]; terrain: string | null; level: number } {
    const slot = this.slots[this.active]!;
    const level = this.economy.levels[id] ?? 0;
    const needed = !this.economy.construction && level % LEVELS_PER_FIELD === 0 && level < this.balance.maxLevel;
    const plots = syncPlots(slot, this.buildRules);
    const cells = needed ? choiceCells(fieldGrid(slot.planet), plots, id, this.buildRules, reservedCells(slot.complexes ?? [])) : [];
    return { needed, cells, terrain: TERRAIN_NAMES[id] ?? null, level: level + 1 };
  }

  /** Ulepszenie z polem wybranym przez gracza (musi być na liście `placement`). */
  upgradeAt(id: BuildingId, cell: number, now = Date.now()): UpgradeResult {
    const choice = this.placement(id);
    if (!choice.needed || !choice.cells.includes(cell)) {
      return { ok: false, state: this.economy, reason: 'busy', message: 'Tego pola nie można wybrać — tylko wolne pola dedykowanego terenu.' } as UpgradeResult;
    }
    const slot = this.slots[this.active]!;
    slot.preferred = { ...slot.preferred, [id]: cell };
    const result = this.upgrade(id, now);
    if (result.ok) syncPlots(slot, this.buildRules);
    else delete slot.preferred[id];
    return result;
  }

  // ——— karta budowli i zajętość pól (v0.38.1) ———

  /** Pola zajęte przez budynek na aktywnej planecie: jego grupy i pola wspólnych konstrukcji kompleksów. */
  footprint(id: BuildingId): number[] {
    const slot = this.slots[this.active]!;
    const plots = syncPlots(slot, this.buildRules);
    return [...(plots[id] ?? []), ...(slot.complexes ?? []).filter((c) => c.building === id).flatMap((c) => c.hubs)];
  }

  /** Parametry budowli (różnica produkcji z budynkiem i bez niego — jeden tor liczenia z gospodarką) i etapy rozwoju. */
  buildingCard(id: BuildingId): BuildingCard {
    const def = this.balance.buildings.find((b) => b.id === id)!;
    const level = this.economy.levels[id] ?? 0;
    const now = this.rates;
    const without = productionRates({ ...this.economy, levels: { ...this.economy.levels, [id]: 0 } }, this.planet, this.balance);
    const per = (v: number) => Math.round(v * 10) / 10;
    let output: string | null = null;
    if (def.produces === 'metal') output = `+${per(now.metal - without.metal)} metalu/min`;
    else if (def.produces === 'crystal') output = `+${per(now.crystal - without.crystal)} kryształów/min`;
    else if (def.produces === 'energy') output = `+${Math.round(now.energyProduced - without.energyProduced)} energii`;
    else if (def.produces === 'antimatter') output = `+${per(now.antimatterPerHour - without.antimatterPerHour)} antymaterii/h`;
    const use = now.energyUsed - without.energyUsed;
    const complexes = (this.slots[this.active]!.complexes ?? []).filter((c) => c.building === id).length;
    const reached = (when: string) =>
      when === 'built' ? level >= 1 : when === 'full-group' ? level >= 3 : when === 'complex' ? complexes > 0 : false;
    const list = INDUSTRY_STAGES[id] ?? [];
    const lastReached = list.map((st) => reached(st.when)).lastIndexOf(true);
    const nextIndex = list.findIndex((st, i) => i > lastReached && st.when !== 'soon');
    const stages = list.map((st, i) => ({
      name: st.name,
      footprint: st.footprint,
      description: st.description,
      state: (i === lastReached ? 'current' : reached(st.when) ? 'done' : st.when === 'soon' ? 'soon' : i === nextIndex ? 'next' : 'locked') as BuildingCard['stages'][number]['state'],
    }));
    let next: string | null = null;
    const nextStage = list[nextIndex];
    if (nextStage?.when === 'built') next = 'Ulepsz do poz. 1.';
    else if (nextStage?.when === 'full-group') next = `Ulepsz do poz. 3 — pole zapełni się trzema poziomami.`;
    else if (nextStage?.when === 'complex') {
      const view = this.complexView(id);
      next = !view?.unlocked ? 'Zbadaj „Wspólne szyby” (Produktywność).' : view.candidate ? 'Gotowe do połączenia: Zarządzanie → Kompleks wiertniczy.' : (view.reason ?? null);
    }
    return {
      name: def.name,
      level,
      stage: lastReached >= 0 ? list[lastReached]!.name : null,
      description: def.description,
      output: level > 0 ? output : null,
      energy: level > 0 && use > 0.05 ? `−${Math.round(use)} energii` : null,
      fields: this.footprint(id).length,
      planetFields: this.fields,
      stages,
      next,
      placement: (() => {
        const p = this.placement(id);
        return p.needed && INDUSTRY_STAGES[id] ? { level: p.level, cells: p.cells.length, terrain: p.terrain } : null;
      })(),
    };
  }

  // ——— kompleksy przemysłowe (v0.38) ———

  /** Stan kompleksów budynku na aktywnej planecie i następne możliwe połączenie (z podglądem zysku). */
  complexView(id: BuildingId): ComplexView | null {
    const family = findFamily(id);
    if (!family) return null;
    const slot = this.slots[this.active]!;
    const grid = fieldGrid(slot.planet);
    const plots = syncPlots(slot, this.buildRules);
    const mine = (slot.complexes ?? []).filter((c) => c.family === family.id);
    const unlocked = this.unlocked(family.unlock);
    const found = mergeCandidate(grid, plots, this.economy.levels, slot.complexes ?? [], family, this.buildRules);
    let candidate: ComplexView['candidate'] = null;
    if (found.ok) {
      // Podgląd: wydobycie z dodatkowym kompleksem (te same reguły co po połączeniu).
      const next = [...(slot.complexes ?? []), { family: family.id, building: id, cells: found.cells, hubs: found.hubs }];
      const factors = siteFactors(grid, plots, this.economy.levels, complexCellBonus(next));
      const after = productionRates({ ...this.economy, siteFactor: factors }, this.planet, this.balance);
      const resource = family.building === 'metalMine' ? 'metal' : 'crystal';
      candidate = { cells: found.cells, hubs: found.hubs, gainPerMinute: after[resource] - this.rates[resource] };
    }
    return {
      name: family.name,
      hubName: family.hubName,
      unlocked,
      count: mine.length,
      levelsIn: mine.length * family.groups * 3,
      bonus: family.bonus,
      groups: family.groups,
      extraFields: family.extraFields,
      cost: family.cost,
      candidate,
      reason: found.ok ? null : found.reason,
      fields: fieldsOf(slot, true, this.buildRules),
    };
  }

  /** Połączenie pełnych grup w kompleks (decyzja gracza): warunki → koszt → kompleks od razu. */
  mergeComplex(id: BuildingId, now = Date.now()): ActionMessage {
    this.tick(now);
    const family = findFamily(id);
    if (!family) return { ok: false, message: 'Ten budynek nie tworzy kompleksów.' };
    if (!this.unlocked(family.unlock)) return { ok: false, message: 'Najpierw zbadaj „Wspólne szyby” (Badania → Produktywność).' };
    const view = this.complexView(id)!;
    if (!view.candidate) return { ok: false, message: view.reason ?? 'Brak pól do połączenia.' };
    const cost = family.cost;
    if (!fitsInStorage(this.economy, cost, this.balance)) return { ok: false, message: `Za mały magazyn (${this.capacity}). Najpierw rozbuduj Magazyn.` };
    const stock = this.economy.stock;
    if (stock.metal < cost.metal || stock.crystal < cost.crystal) {
      const missing: string[] = [];
      if (stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - stock.metal)} metalu`);
      if (stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - stock.crystal)} kryształów`);
      return { ok: false, message: `${family.name} — brakuje: ${missing.join(', ')}.` };
    }
    const slot = this.slots[this.active]!;
    this.economy = { ...this.economy, stock: { metal: stock.metal - cost.metal, crystal: stock.crystal - cost.crystal } };
    slot.complexes = [...(slot.complexes ?? []), { family: family.id, building: id, cells: view.candidate.cells, hubs: view.candidate.hubs }];
    syncPlots(slot, this.buildRules);
    this.log('build', `${this.planet.displayName}: ${family.name.toLowerCase()} — połączono ${family.groups} pola.`, now);
    this.save();
    this.emit();
    return { ok: true, message: `${family.name} gotowy: +${family.bonus}% wydobycia z ${family.groups * 3} poziomów, ${family.hubName} zajmuje ${family.extraFields} pole.` };
  }

  /** Rozłączenie ostatniego kompleksu budynku (bez zwrotu kosztu; pole wspólnej konstrukcji się zwalnia). */
  splitComplex(id: BuildingId, now = Date.now()): ActionMessage {
    this.tick(now);
    const slot = this.slots[this.active]!;
    const list = slot.complexes ?? [];
    const index = list.map((c) => c.building).lastIndexOf(id);
    if (index < 0) return { ok: false, message: 'Nie ma kompleksu do rozłączenia.' };
    const name = COMPLEX_FAMILIES.find((f) => f.id === list[index]!.family)?.name ?? 'Kompleks';
    const rest = list.filter((_, i) => i !== index);
    slot.complexes = rest.length > 0 ? rest : undefined;
    syncPlots(slot, this.buildRules);
    this.log('build', `${this.planet.displayName}: ${name.toLowerCase()} rozłączony.`, now);
    this.save();
    this.emit();
    return { ok: true, message: `${name} rozłączony — pola znów pracują osobno.` };
  }

  /** Czy następny poziom budynku zmieści się na polach planety (grupy po 3 poziomy; siatka liczona raz na planetę). */
  private roomCheck(slot: Slot): (id: BuildingId, levels: BuildingLevels) => boolean {
    const rules = this.buildRules;
    return (id, levels) => hasRoomFor(fieldGrid(slot.planet), slot.plots, levels, id, BUILDING_ORDER, rules, reservedCells(slot.complexes ?? []));
  }

  /** Gdzie wolno budować (v0.35): „Budowa na lodzie” — wszystkie budynki także na polach lodu (całe imperium). */
  private get buildRules(): BuildRules {
    return { ice: this.unlocked('build-ice') };
  }

  onBuildComplete(listener: (done: CompletedBuild) => void): () => void {
    this.completeListeners.add(listener);
    return () => this.completeListeners.delete(listener);
  }

  onPlanetChange(listener: () => void): () => void {
    this.planetListeners.add(listener);
    return () => this.planetListeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Przydział pól dopasowany do poziomów (budowa w toku już zajmuje swoje pole); wynik zostaje w miejscu. */
/** Pola lądu planety; aktywna — z bieżącym przydziałem (budowa w toku), inne — z zapisanego. */
/**
 * Pola planety: aktywna (albo z gotową siatką) — liczone na bieżąco i zapamiętywane; nieaktywna — z pamięci,
 * bo siatka to kilkaset ms liczenia na planetę (przy starcie z kilkoma planetami gra by się zacinała).
 * Nieaktywna planeta i tak nie zmienia pól, dopóki nie stanie się aktywna.
 */
function fieldsOf(slot: Slot, active: boolean, rules: BuildRules): { used: number; buildable: number } {
  const grid = active ? fieldGrid(slot.planet) : cachedFieldGrid(slot.planet);
  if (!grid && slot.fields) return slot.fields;
  const ready = grid ?? fieldGrid(slot.planet);
  const plots = active ? syncPlots(slot, rules) : slot.plots;
  slot.fields = { used: usedLandFields(ready, plots, rules, reservedCells(slot.complexes ?? [])), buildable: buildableCount(ready, rules) };
  return slot.fields;
}

function syncPlots(slot: Slot, rules: BuildRules): Plots {
  const c = slot.economy.construction;
  const levels = c ? { ...slot.economy.levels, [c.building]: Math.max(slot.economy.levels[c.building] ?? 0, c.targetLevel) } : slot.economy.levels;
  const grid = fieldGrid(slot.planet);
  slot.plots = reconcilePlots(grid, slot.plots, levels, BUILDING_ORDER, rules, reservedCells(slot.complexes ?? []), slot.preferred);
  // Wybrane pole użyte — wybór dotyczy tylko jednej grupy.
  if (slot.preferred) {
    for (const [id, cell] of Object.entries(slot.preferred) as [BuildingId, number][]) {
      if ((slot.plots[id] ?? []).includes(cell)) delete slot.preferred[id];
    }
  }
  // Kompleks rozpada się, gdy któraś jego grupa przestanie być pełna (np. zburzenie poziomu) — v0.38.
  if (slot.complexes?.length) {
    const valid = validComplexes(slot.complexes, slot.plots, slot.economy.levels);
    slot.complexes = valid.length > 0 ? valid : undefined;
  }
  // Dopasowanie do terenu (poziomy w grupach na niepasującym terenie produkują słabiej) i premia kompleksów.
  const factors = siteFactors(grid, slot.plots, slot.economy.levels, complexCellBonus(slot.complexes ?? []));
  if (JSON.stringify(factors) !== JSON.stringify(slot.economy.siteFactor ?? {})) slot.economy = { ...slot.economy, siteFactor: factors };
  return slot.plots;
}

const BUILDING_ORDER: readonly BuildingId[] = BALANCE.buildings.map((b) => b.id);

/** Premia kompleksów dla poziomów na polu (procent z danych rodziny). */
function complexCellBonus(complexes: readonly Complex[]): (id: BuildingId, cell: number) => number {
  const bonusOf = (family: string) => COMPLEX_FAMILIES.find((f) => f.id === family)?.bonus ?? 0;
  return (id, cell) => complexBonus(complexes, id, cell, bonusOf);
}

/** Miejsca z zapisu → planety (nieznane typy i inne wersje generatora są pomijane). */
function restoreSlots(saved: readonly SlotSave[]): Slot[] {
  const slots: Slot[] = [];
  for (const slot of saved) {
    const definition = findDefinition(slot.planet.definitionId);
    if (!definition || slot.planet.generatorVersion !== GENERATOR_VERSION) continue;
    const planet = generatePlanet(definition, slot.planet.seed);
    // Planeta z galaktyki (seed = adres) nosi nazwę od swojego układu.
    const where = slot.planet.address === slot.planet.seed ? parseAddress(slot.planet.address) : null;
    const fromGalaxy = where ? planetAt(generateGalaxy(where.galaxy), where) : null;
    slots.push({
      planet: fromGalaxy ? { ...planet, displayName: fromGalaxy.name } : planet,
      economy: slot.economy,
      address: slot.planet.address ?? '',
      research: slot.research ?? EMPTY_RESEARCH,
      // Przydział z innej wersji siatki wskazywałby inne pola — budowle dostają pola od nowa.
      plots: slot.plotsGrid === FIELD_GRID_VERSION ? (slot.plots ?? {}) : {},
      ...(slot.plotsGrid === FIELD_GRID_VERSION && slot.fields ? { fields: slot.fields } : {}),
      // Kompleksy wskazują numery pól — ważne tylko z tą samą wersją siatki (jak przydział pól).
      ...(slot.plotsGrid === FIELD_GRID_VERSION && slot.complexes?.length ? { complexes: slot.complexes } : {}),
      ...(slot.specialization ? { specialization: slot.specialization } : {}),
      ...(slot.asteroidStation ? { asteroid: slot.asteroidStation } : {}),
    });
  }
  return slots;
}

/**
 * Zapisy sprzed v0.15 (badania wspólne dla imperium): zbadane trafiają na wszystkie planety,
 * a trwające badanie — na planetę, która za nie zapłaciła (albo aktywną).
 */
function migrateResearch(slots: Slot[], saved: readonly SlotSave[], empire: ResearchState, active: number): void {
  if (saved.some((s) => s.research)) return;
  const payer = slots.findIndex((s) => s.planet.seed === empire.current?.paidBy);
  slots.forEach((slot, index) => {
    slot.research = { done: [...empire.done], current: index === (payer >= 0 ? payer : active) ? empire.current : null };
  });
}

/** Kolejka budowy z poziomami docelowymi (po trwającej budowie i wcześniejszych pozycjach). */
function queueOf(economy: EconomyState, balance: Balance): QueuedBuild[] {
  const levels = { ...economy.levels };
  if (economy.construction) levels[economy.construction.building] = economy.construction.targetLevel;
  return (economy.queue ?? []).map((id) => {
    levels[id] = (levels[id] ?? 0) + 1;
    const name = balance.buildings.find((b) => b.id === id)?.name ?? id;
    return { building: id, name, level: levels[id], cost: upgradeCost(id, levels[id] - 1, balance) };
  });
}

function finishedBuild(before: EconomyState, after: EconomyState): CompletedBuild | null {
  const c = before.construction;
  if (!c) return null;
  // Ta sama budowa wciąż trwa (po ukończeniu może już trwać następna — z kolejki).
  const a = after.construction;
  if (a && a.building === c.building && a.startedAt === c.startedAt) return null;
  return (after.levels[c.building] ?? 0) >= c.targetLevel ? { building: c.building, level: c.targetLevel } : null;
}

/** Planeta z galaktyki: typ z układu, seed = adres, nazwa od układu (np. „HD-412 c”). */
function galaxyPlanet(target: SystemPlanet): Planet {
  const definition = findDefinition(target.definitionId) ?? STARTER.definition;
  return { ...generatePlanet(definition, target.address), displayName: target.name };
}
