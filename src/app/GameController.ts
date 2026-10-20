import {
  advance,
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
import { GENERATOR_VERSION, generatePlanet, pickDefinition } from '../core/generation/generatePlanet.ts';
import { hasFreeSlot, loadEmpire, writeEmpire, type EmpireSave, type SlotSave } from '../core/save/empire.ts';
import { exportSave, importSave } from '../core/save/transfer.ts';
import type { Balance, BuildingId, EconomyState, Planet, Resources } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { findDefinition, PLANET_DEFINITIONS, STARTER } from '../data/planets.ts';

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
}

/** Skrót planety do listy „Twoje planety”. */
export interface PlanetSummary {
  index: number;
  name: string;
  category: string;
  active: boolean;
  /** Suma poziomów budynków — prosta miara rozwoju. */
  totalLevels: number;
  /** Nazwa budynku w budowie (jeśli jest). */
  building: string | null;
}

export type ActionMessage = { ok: boolean; message: string };

/**
 * Nieaktywne planety „doganiają” czas bez przyrostu pasywnego antymaterii —
 * ten liczy się raz, na aktywnej planecie (portfel jest wspólny).
 */
const CATCH_UP_BALANCE: Balance = { ...BALANCE, antimatter: { ...BALANCE.antimatter, passivePerHour: 0 } };

/**
 * Spina reguły (core), zapis i UI. UI zmienia stan WYŁĄCZNIE przez te metody.
 * Imperium = kilka miejsc (planet); `planet`/`economy` to zawsze aktywne miejsce.
 * Antymateria aktywnej gospodarki = wspólny portfel; nieaktywne trzymają 0.
 */
export class GameController {
  offlineGain: OfflineGain | null = null;
  /** Budowa ukończona podczas nieobecności (do jednorazowego komunikatu). */
  completedWhileAway: CompletedBuild | null = null;
  private slots: Slot[];
  private active = 0;
  private unlockedSlots: number = BALANCE.planetSlots.base;
  private readonly listeners = new Set<() => void>();
  private readonly completeListeners = new Set<(done: CompletedBuild) => void>();
  private readonly planetListeners = new Set<() => void>();

  constructor(now = Date.now()) {
    const saved = loadEmpire();
    const slots = saved ? restoreSlots(saved.slots) : [];
    if (saved && slots.length > 0) {
      this.slots = slots;
      this.unlockedSlots = saved.unlockedSlots;
      this.active = Math.min(saved.active, slots.length - 1);
      const before = { ...this.slots[this.active]!.economy, antimatter: saved.antimatter };
      this.economy = advance(before, this.planet, now);
      this.reportAway(before, now);
    } else {
      this.slots = [
        { planet: generatePlanet(STARTER.definition, STARTER.seed), economy: createEconomy(now) },
      ];
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

    get rates(): Rates {
    return productionRates(this.economy, this.planet);
  }

  costOf(id: BuildingId): Resources {
    return upgradeCost(id, this.economy.levels[id]);
  }

  waitSecondsFor(id: BuildingId): number {
    return secondsUntilAffordable(this.economy, this.costOf(id), this.rates);
  }

  tick(now = Date.now()): void {
    const before = this.economy;
    this.economy = advance(before, this.planet, now);
    const done = finishedBuild(before, this.economy);
    if (done) {
      this.save();
      for (const listener of this.completeListeners) listener(done);
    }
    this.emit();
  }

  /** Rozpoczyna ulepszenie (budowę). Ukończenie przychodzi przez `onBuildComplete`. */
  upgrade(id: BuildingId, now = Date.now()): UpgradeResult {
    this.tick(now);
    const result = upgradeBuilding(this.economy, id, now);
    this.economy = result.state;
    if (result.ok) this.save();
    this.emit();
    return result;
  }

  cancelUpgrade(now = Date.now()): CancelResult {
    this.tick(now);
    const result = cancelConstruction(this.economy);
    this.economy = result.state;
    if (result.ok) this.save();
    this.emit();
    return result;
  }

  /** Natychmiastowe ukończenie (do poz. 5 za darmo, wyżej za antymaterię). Zgłasza `onBuildComplete`. */
  finishNow(now = Date.now()): FinishResult {
    this.tick(now);
    const before = this.economy;
    const result = finishConstructionNow(before, now);
    this.economy = result.state;
    if (result.ok) {
      this.save();
      const done = finishedBuild(before, this.economy);
      if (done) for (const listener of this.completeListeners) listener(done);
    }
    this.emit();
    return result;
  }

  /** Cena „Ukończ teraz” w antymaterii (0 = za darmo). */
  finishPrice(now = Date.now()): number {
    return finishCost(this.economy, now);
  }

  get capacity(): number {
    return storageCapacity(this.economy);
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
        name: slot.planet.displayName,
        category: slot.planet.category,
        active: index === this.active,
        totalLevels: Object.values(slot.economy.levels).reduce((sum, level) => sum + level, 0),
        building: c ? (BALANCE.buildings.find((b) => b.id === c.building)?.name ?? null) : null,
      };
    });
  }

  get slotInfo(): { used: number; unlocked: number; max: number } {
    return { used: this.slots.length, unlocked: this.unlockedSlots, max: BALANCE.planetSlots.max };
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
    const caughtUp = advance(before, target.planet, now, CATCH_UP_BALANCE);
    // Antymateria wyprodukowana przez kolektor tej planety trafia do wspólnego portfela.
    this.economy = { ...caughtUp, antimatter: wallet + caughtUp.antimatter };
    this.reportAway(before, now);
    this.save();
    for (const listener of this.planetListeners) listener();
    this.emit();
    return { ok: true, message: `Przeniesiono na: ${target.planet.displayName}.` };
  }

  /** Nowa planeta na wolnym miejscu (typ wynika z seeda). Obecna zostaje i dalej produkuje. */
  addPlanet(seed = randomSeed(), now = Date.now()): ActionMessage {
    if (!hasFreeSlot(this.slots.length, this.unlockedSlots)) {
      return {
        ok: false,
        message: `Wszystkie miejsca (${this.unlockedSlots}) są zajęte — usuń planetę, żeby odkryć nową.`,
      };
    }
    const planet = generatePlanet(pickDefinition(seed, PLANET_DEFINITIONS), seed);
    // Zapas startowy antymaterii dostaje tylko pierwsza planeta (portfel jest wspólny).
    this.slots.push({ planet, economy: { ...createEconomy(now), antimatter: 0 } });
    const result = this.switchPlanet(this.slots.length - 1, now);
    this.offlineGain = null;
    this.completedWhileAway = null;
    return result.ok ? { ok: true, message: `Nowa planeta: ${planet.displayName} (${planet.category}).` } : result;
  }

  /** Usunięcie planety (nie aktywnej). Postęp tej planety przepada. */
  removePlanet(index: number): ActionMessage {
    const slot = this.slots[index];
    if (!slot) return { ok: false, message: 'Nie ma takiej planety.' };
    if (index === this.active) return { ok: false, message: 'Nie można usunąć planety, na której jesteś — najpierw przejdź na inną.' };
    this.slots.splice(index, 1);
    if (index < this.active) this.active--;
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
    this.active = result.data.active;
    this.economy = advance({ ...this.economy, antimatter: result.data.antimatter }, this.planet, now);
    this.offlineGain = null;
    this.completedWhileAway = null;
    this.save();
    for (const listener of this.planetListeners) listener();
    this.emit();
    const count = slots.length === 1 ? '1 planeta' : `${slots.length} planet${slots.length < 5 ? 'y' : ''}`;
    return { ok: true, message: `Wczytano zapis: ${count}, aktywna ${this.planet.displayName}.` };
  }

  private empireData(): Omit<EmpireSave, 'saveVersion'> {
    return {
      active: this.active,
      unlockedSlots: this.unlockedSlots,
      antimatter: this.economy.antimatter,
      slots: this.slots.map((slot) => ({
        kind: 'planet',
        planet: {
          definitionId: slot.planet.definitionId,
          seed: slot.planet.seed,
          generatorVersion: slot.planet.generatorVersion,
        },
        economy: { ...slot.economy, antimatter: 0 },
      })),
    };
  }

  /** Komunikaty „podczas nieobecności” dla aktywnej planety. */
  private reportAway(before: EconomyState, now: number): void {
    this.completedWhileAway = finishedBuild(before, this.economy);
    this.offlineGain = null;
    const seconds = Math.min((now - before.lastUpdate) / 1000, BALANCE.maxOfflineSeconds);
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
    slots.push({ planet: generatePlanet(definition, slot.planet.seed), economy: slot.economy });
  }
  return slots;
}

function finishedBuild(before: EconomyState, after: EconomyState): CompletedBuild | null {
  const c = before.construction;
  if (!c || after.construction) return null;
  return after.levels[c.building] === c.targetLevel ? { building: c.building, level: c.targetLevel } : null;
}

/** Losowy seed gracza, np. „PF-A2TQ-7QWR” (bez mylących znaków 0/O, 1/I). */
export function randomSeed(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const text = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `PF-${text.slice(0, 4)}-${text.slice(4)}`;
}
