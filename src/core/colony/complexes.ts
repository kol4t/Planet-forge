// Ulepszenia kompleksów przemysłowych (v0.38–v0.43, od v0.45 jako ulepszenie CAŁEGO budynku).
// Od v0.45 budynek sam rośnie w jeden kompleks (spójny obszar pól, etapy z poziomu — `core/economy/footprint.ts`),
// a decyzja gracza (badanie + koszt) uruchamia na nim premię kompleksu (np. „Wielka fabryka”: +30%, tryby pracy),
// a potem megakompleks (+60%, znaleziska). Bez osobnych pól, szybów ani rur. Czysta logika.
import type { ComplexFamily } from '../../data/complexes.ts';
import { stageOf } from '../economy/footprint.ts';
import type { BuildingId, BuildingLevels } from '../types.ts';

export interface Complex {
  /** Rodzina (`COMPLEX_FAMILIES`). */
  family: string;
  building: BuildingId;
  /** Tryb pracy (v0.39, rodziny z trybami; brak = domyślny). */
  mode?: string;
  /** Megakompleks uruchomiony (v0.43). */
  mega?: boolean;
}

/** Etap budynku (0..3), od którego można uruchomić kompleks, i megakompleks (robocze). */
export const COMPLEX_STAGE = 2;
export const MEGA_STAGE = 3;

export type ComplexCheck = { ok: true } | { ok: false; reason: string };

/** Czy budynek może dostać kompleks (etap „wielka fabryka” i brak kompleksu). */
export function complexCandidate(complexes: readonly Complex[], levels: BuildingLevels, family: ComplexFamily, stageNames: readonly string[], fromLevel: number): ComplexCheck {
  if (complexes.some((c) => c.building === family.building)) return { ok: false, reason: `${family.name} już działa.` };
  if (stageOf(family.building, levels[family.building] ?? 0) < COMPLEX_STAGE) {
    return { ok: false, reason: `Najpierw rozbuduj budynek do etapu „${stageNames[COMPLEX_STAGE]}” (poz. ${fromLevel}).` };
  }
  return { ok: true };
}

/** Czy kompleks budynku może stać się megakompleksem (etap najwyższy, kompleks działa). */
export function megaCandidate(complexes: readonly Complex[], levels: BuildingLevels, family: ComplexFamily, stageNames: readonly string[], fromLevel: number): ComplexCheck {
  const c = complexes.find((x) => x.building === family.building);
  if (!c) return { ok: false, reason: `Najpierw uruchom ${family.name.toLowerCase()}.` };
  if (c.mega) return { ok: false, reason: `${family.megaName} już działa.` };
  if (stageOf(family.building, levels[family.building] ?? 0) < MEGA_STAGE) {
    return { ok: false, reason: `Najpierw rozbuduj budynek do etapu „${stageNames[MEGA_STAGE]}” (poz. ${fromLevel}).` };
  }
  return { ok: true };
}

/** Kompleksy, które nadal są ważne: budynek stoi (poziom ≥ 1), jeden kompleks na budynek. Kolejność zachowana. */
export function validComplexes(complexes: readonly Complex[], levels: BuildingLevels): Complex[] {
  const seen = new Set<BuildingId>();
  return complexes.filter((c) => {
    if (seen.has(c.building) || (levels[c.building] ?? 0) < 1) return false;
    seen.add(c.building);
    return true;
  });
}

/**
 * Odczyt z zapisu. Migracja (v0.45): zapis sprzed v0.45 miał kilka kompleksów na budynek z polami (`cells`, `hubs`)
 * i numerem megakompleksu — każdy budynek z kompleksem dostaje jeden kompleks (tryb pierwszego), megakompleks,
 * jeśli którykolwiek jego kompleks był w megakompleksie. Postęp gracza zostaje.
 */
export function parseComplexes(raw: unknown, families: readonly ComplexFamily[]): Complex[] {
  if (!Array.isArray(raw)) return [];
  const out: Complex[] = [];
  for (const c of raw as any[]) {
    const family = families.find((f) => f.id === c?.family);
    if (!family) continue;
    const mega = c.mega === true || (Number.isInteger(c.mega) && c.mega >= 0);
    const existing = out.find((x) => x.building === family.building);
    if (existing) {
      if (mega) existing.mega = true;
      continue;
    }
    const mode = typeof c.mode === 'string' && family.modes?.some((m) => m.id === c.mode) ? { mode: c.mode as string } : {};
    out.push({ family: family.id, building: family.building, ...mode, ...(mega ? { mega: true } : {}) });
  }
  return out;
}
