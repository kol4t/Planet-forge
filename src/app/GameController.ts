import {
  advance,
  buildSeconds,
  fitsInStorage,
  cancelConstruction,
  constructionProgress,
  createEconomy,
  finishConstructionNow,
  finishCost,
  storageCapacity,
  productionRates,
  secondsUntilAffordable,
  upgradeBuilding,
  upgradeCost,
  type CancelResult,
  type FinishResult,
  type Rates,
  type UpgradeResult,
} from '../core/economy/economy.ts';
import {
  applyResearch,
  completeResearch,
  EMPTY_RESEARCH,
  researchCost,
  researchProgress,
  researchSeconds,
  researchStatus,
  ringLimit,
  startResearch,
  type ResearchCost,
  type ResearchStatus,
} from '../core/research/research.ts';
import {
  formatAddress,
  generateGalaxy,
  generateSystem,
  isColonizable,
  parseAddress,
  planetAt,
  starterSystem,
  type Galaxy,
  type StarSystem,
  type SystemPlanet,
} from '../core/galaxy/galaxy.ts';
import { GENERATOR_VERSION, generatePlanet } from '../core/generation/generatePlanet.ts';
import { hasFreeSlot, JOURNAL_LIMIT, loadEmpire, writeEmpire, type EmpireSave, type SlotSave } from '../core/save/empire.ts';
import { exportSave, importSave } from '../core/save/transfer.ts';
import type { Balance, BuildingId, ColonyMission, EconomyState, JournalEntry, JournalKind, Planet, ResearchState, Resources } from '../core/types.ts';
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
}

/** Kto jest na planecie — z punktu widzenia gracza. */
export type MapOccupant = 'you' | 'bot' | 'alien' | 'free';

/** Galaktyka gracza (na razie jedna; w przyszłości jedna galaktyka = jeden serwer). */
const GALAXY_ID = 1;

/** Skrót planety do listy „Twoje planety”. */
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

/** Planeta w zestawieniu „Imperium” (stan policzony na teraz, także dla nieaktywnych). */
export interface PlanetOverview extends PlanetSummary {
  stock: Resources;
  capacity: number;
  rates: Rates;
  construction: { name: string; level: number; secondsLeft: number; progress: number } | null;
}

/** Statek kolonizacyjny w drodze (do mapy i zestawienia). */
export interface MissionView extends ColonyMission {
  targetName: string;
  fromName: string;
  secondsLeft: number;
  progress: number;
}

/**
 * Nieaktywne planety „doganiają” czas bez przyrostu pasywnego antymaterii —
 * ten liczy się raz, na aktywnej planecie (portfel jest wspólny).
 */
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
  /** Badania imperium (wspólne dla wszystkich planet). */
  research: ResearchState = EMPTY_RESEARCH;
  /** Kolonie założone przez statki podczas nieobecności (nazwy, do jednorazowego komunikatu). */
  arrivedWhileAway: string[] = [];
  /** Statki kolonizacyjne w drodze. */
  private missions: ColonyMission[] = [];
  /** Dziennik ekspedycji (najnowsze na końcu). */
  private journal: JournalEntry[] = [];
  private readonly colonyListeners = new Set<(name: string) => void>();
  private balanceCache: { done: readonly string[]; balance: Balance } | null = null;
  private slots: Slot[];
  private active = 0;
  private unlockedSlots: number = BALANCE.planetSlots.base;
  /** Miejsce startowe gracza w galaktyce (jego układ = układ startowy). */
  private home = '';
  private readonly listeners = new Set<() => void>();
  private readonly completeListeners = new Set<(done: CompletedBuild) => void>();
  private readonly planetListeners = new Set<() => void>();
  private readonly researchListeners = new Set<(id: string) => void>();

  constructor(now = Date.now()) {
    const saved = loadEmpire();
    const slots = saved ? restoreSlots(saved.slots) : [];
    if (saved && slots.length > 0) {
      this.slots = slots;
      this.unlockedSlots = saved.unlockedSlots;
      this.research = saved.research;
      this.home = saved.home ?? '';
      this.missions = saved.missions ?? [];
      this.journal = saved.journal ?? [];
      this.active = Math.min(saved.active, slots.length - 1);
      this.placeOnMap();
      const before = { ...this.slots[this.active]!.economy, antimatter: saved.antimatter };
      this.economy = before;
      this.researchedWhileAway = this.advanceActive(now);
      this.reportAway(before, now);
      this.arrivedWhileAway = this.processMissions(now);
      if (this.offlineGain) {
        const g = this.offlineGain;
        this.log('away', `Podczas nieobecności na ${this.planet.displayName}: +${Math.floor(g.metal)} metalu, +${Math.floor(g.crystal)} kryształów.`, now);
      }
    } else {
      this.slots = [
        { planet: generatePlanet(STARTER.definition, STARTER.seed), economy: createEconomy(now), address: '' },
      ];
      this.placeOnMap();
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

  /** Balans gry z efektami zbadanych badań (liczony ponownie tylko po nowym badaniu). */
  get balance(): Balance {
    if (this.balanceCache?.done !== this.research.done) {
      this.balanceCache = { done: this.research.done, balance: applyResearch(BALANCE, this.research.done) };
    }
    return this.balanceCache.balance;
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
    const done = finishedBuild(before, this.economy);
    if (done) this.logBuild(done, before.construction!.finishesAt);
    const arrived = this.processMissions(now);
    if (done || researched.length > 0 || arrived.length > 0) this.save();
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
      this.log('research', `Zbadano: ${findResearch(result.completed)?.name ?? result.completed}.`, c!.finishesAt);
    }
    this.economy = advance(this.economy, this.planet, now, this.balance);
    return completed;
  }

  /** Rozpoczyna ulepszenie (budowę). Ukończenie przychodzi przez `onBuildComplete`. */
  upgrade(id: BuildingId, now = Date.now()): UpgradeResult {
    this.tick(now);
    const result = upgradeBuilding(this.economy, id, now, this.balance);
    this.economy = result.state;
    if (result.ok) this.save();
    this.emit();
    return result;
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

  /** Odblokowane miejsca: z zapisu albo więcej, jeśli dają je badania. */
  private get openSlots(): number {
    return Math.max(this.unlockedSlots, this.balance.planetSlots.base);
  }

  get slotInfo(): { used: number; unlocked: number; max: number } {
    return { used: this.slots.length, unlocked: this.openSlots, max: BALANCE.planetSlots.max };
  }

  /**
   * Zestawienie „Imperium”: każda planeta ze stanem na teraz. Nieaktywne liczone „na niby”
   * (jak przy przejściu na nie) — zapis i stan gry się nie zmieniają.
   */
  overview(now = Date.now()): PlanetOverview[] {
    const balance = this.balance;
    return this.planets().map((summary) => {
      const slot = this.slots[summary.index]!;
      const economy = summary.active ? this.economy : advance(slot.economy, slot.planet, now, catchUpBalance(balance));
      const c = economy.construction;
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
      };
    });
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

  // ——— statki kolonizacyjne (inne układy) ———

  /** Czy badania odblokowały statek kolonizacyjny. */
  get colonyShipUnlocked(): boolean {
    return this.research.done.some((id) => findResearch(id)?.effects.some((e) => e.kind === 'unlock' && e.feature === 'colony-ship'));
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
      this.slots.push({ planet, economy: { ...createEconomy(mission.arrivesAt), antimatter: 0 }, address: mission.target });
      this.log('colony', `Statek dotarł — skolonizowano ${planet.displayName} (${mission.target}).`, mission.arrivesAt);
      arrived.push(planet.displayName);
    }
    return arrived;
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

  /** Najwyższe Laboratorium w imperium (badania są wspólne). */
  get labLevel(): number {
    return Math.max(0, ...this.slots.map((slot) => slot.economy.levels.laboratory ?? 0));
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
    const caughtUp = advance(before, target.planet, now, catchUpBalance(this.balance));
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
    this.slots.push({ planet, economy: { ...createEconomy(now), antimatter: 0 }, address });
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
    this.research = result.data.research;
    this.home = result.data.home ?? '';
    this.missions = result.data.missions ?? [];
    this.journal = result.data.journal ?? [];
    this.active = result.data.active;
    this.placeOnMap();
    this.economy = { ...this.economy, antimatter: result.data.antimatter };
    this.advanceActive(now);
    this.processMissions(now);
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
      research: this.research,
      home: this.home,
      missions: this.missions,
      journal: this.journal,
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
    });
  }
  return slots;
}

function finishedBuild(before: EconomyState, after: EconomyState): CompletedBuild | null {
  const c = before.construction;
  if (!c || after.construction) return null;
  return after.levels[c.building] === c.targetLevel ? { building: c.building, level: c.targetLevel } : null;
}

/** Planeta z galaktyki: typ z układu, seed = adres, nazwa od układu (np. „HD-412 c”). */
function galaxyPlanet(target: SystemPlanet): Planet {
  const definition = findDefinition(target.definitionId) ?? STARTER.definition;
  return { ...generatePlanet(definition, target.address), displayName: target.name };
}
