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
import { clearSave, loadSave, writeSave } from '../core/save/save.ts';
import type { BuildingId, EconomyState, Planet, Resources } from '../core/types.ts';
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

/** Spina reguły (core), zapis i UI. UI zmienia stan WYŁĄCZNIE przez te metody. */
export class GameController {
  planet: Planet;
  economy: EconomyState;
  offlineGain: OfflineGain | null = null;
  /** Budowa ukończona podczas nieobecności (do jednorazowego komunikatu). */
  completedWhileAway: CompletedBuild | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly completeListeners = new Set<(done: CompletedBuild) => void>();
  private readonly planetListeners = new Set<() => void>();

  constructor(now = Date.now()) {
    const saved = loadSave();
    const definition = saved ? findDefinition(saved.planet.definitionId) : undefined;
    if (saved && definition && saved.planet.generatorVersion === GENERATOR_VERSION) {
      this.planet = generatePlanet(definition, saved.planet.seed);
      const before = saved.economy;
      this.economy = advance(before, this.planet, now);
      this.completedWhileAway = finishedBuild(before, this.economy);
      const seconds = Math.min((now - before.lastUpdate) / 1000, BALANCE.maxOfflineSeconds);
      if (seconds > 60) {
        this.offlineGain = {
          metal: this.economy.stock.metal - before.stock.metal,
          crystal: this.economy.stock.crystal - before.stock.crystal,
          seconds,
        };
      }
    } else {
      this.planet = generatePlanet(STARTER.definition, STARTER.seed);
      this.economy = createEconomy(now);
    }
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

  /** Nowa planeta: typ wynika z seeda (losowanie ważone po definicjach). */
  startNewPlanet(seed = randomSeed(), now = Date.now()): void {
    this.planet = generatePlanet(pickDefinition(seed, PLANET_DEFINITIONS), seed);
    this.economy = createEconomy(now);
    this.offlineGain = null;
    this.completedWhileAway = null;
    clearSave();
    this.save();
    for (const listener of this.planetListeners) listener();
    this.emit();
  }

  save(): boolean {
    return writeSave({
      planet: {
        definitionId: this.planet.definitionId,
        seed: this.planet.seed,
        generatorVersion: this.planet.generatorVersion,
      },
      economy: this.economy,
    });
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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
