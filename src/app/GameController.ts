import {
  advance,
  createEconomy,
  productionRates,
  secondsUntilAffordable,
  upgradeBuilding,
  upgradeCost,
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

/** Spina reguły (core), zapis i UI. UI zmienia stan WYŁĄCZNIE przez te metody. */
export class GameController {
  planet: Planet;
  economy: EconomyState;
  offlineGain: OfflineGain | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly planetListeners = new Set<() => void>();

  constructor(now = Date.now()) {
    const saved = loadSave();
    const definition = saved ? findDefinition(saved.planet.definitionId) : undefined;
    if (saved && definition && saved.planet.generatorVersion === GENERATOR_VERSION) {
      this.planet = generatePlanet(definition, saved.planet.seed);
      const before = saved.economy;
      this.economy = advance(before, this.planet, now);
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
    this.economy = advance(this.economy, this.planet, now);
    this.emit();
  }

  upgrade(id: BuildingId, now = Date.now()): UpgradeResult {
    this.economy = advance(this.economy, this.planet, now);
    const result = upgradeBuilding(this.economy, id);
    this.economy = result.state;
    if (result.ok) this.save();
    this.emit();
    return result;
  }

  /** Nowa planeta: typ wynika z seeda (losowanie ważone po definicjach). */
  startNewPlanet(seed = randomSeed(), now = Date.now()): void {
    this.planet = generatePlanet(pickDefinition(seed, PLANET_DEFINITIONS), seed);
    this.economy = createEconomy(now);
    this.offlineGain = null;
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

  onPlanetChange(listener: () => void): () => void {
    this.planetListeners.add(listener);
    return () => this.planetListeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** Losowy seed gracza, np. „PF-A2TQ-7QWR” (bez mylących znaków 0/O, 1/I). */
export function randomSeed(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const text = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `PF-${text.slice(0, 4)}-${text.slice(4)}`;
}
