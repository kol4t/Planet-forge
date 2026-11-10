// Ekran stacji (plan `docs/plan-stacji.md`, etap 1): stan modułów stacji macierzystej w gniazdach — wspólne źródło
// dla wyglądu (2D i 3D), wyboru modułu dotykiem i panelu „Moduły”. Czysta logika, bez zmian w zapisie: moduły wynikają
// z istniejących pól stacji (`core`, `storage`, `shipyard`).
import { STATION_MODULES, STATION_SOCKETS, STATION_STAGE_READY, type StationModuleId } from '../../data/stationModules.ts';
import { stationLevelAt } from '../economy/asteroids.ts';
import type { AsteroidStation, HomeStation } from '../types.ts';

/**
 * Stan modułu: działa / w budowie (pierwszy poziom albo ulepszenie) / puste gniazdo / „wkrótce” (kolejne etapy) /
 * „zablokowany” (pierścień 2 albo 3 — czeka na rozbudowę rdzenia; krok 2d-1).
 */
export type StationModuleState = 'ready' | 'building' | 'empty' | 'soon' | 'locked';

export interface StationModuleView {
  id: StationModuleId;
  socket: number | null;
  /** Działający poziom (0 — jeszcze nie ma). */
  level: number;
  state: StationModuleState;
  /** Ulepszenie w toku: poziom docelowy (null — nic się nie buduje). */
  upgrading: number | null;
  /** Etap planu, w którym moduł wchodzi do gry. */
  stage: number;
  /** Pierścień gniazd (1–3). */
  ring: 1 | 2 | 3;
}

export interface StationScreenModel {
  /** Rdzeń gotowy (stacja działa). */
  ready: boolean;
  /** Działający poziom rdzenia (liczba pierścieni gniazd). */
  coreLevel: number;
  modules: StationModuleView[];
}

function moduleState(part: AsteroidStation | undefined, at: number): Pick<StationModuleView, 'level' | 'state' | 'upgrading'> {
  const level = stationLevelAt(part, at);
  const upgrading = part && at < part.readyAt ? part.level : null;
  if (level <= 0) return { level: 0, state: upgrading ? 'building' : 'empty', upgrading };
  return { level, state: upgrading ? 'building' : 'ready', upgrading };
}

/** Działający poziom rdzenia: 0 — w budowie, 1 — stacja działa, 2–3 — po rozbudowie (krok 2d-1). */
export function stationCoreLevel(station: HomeStation | null, at: number): number {
  if (!station || at < station.core.readyAt) return 0;
  return Math.max(1, stationLevelAt(station.coreUpgrade, at));
}

/** Model ekranu stacji w chwili `at` (null — stacji nie ma). */
export function stationScreen(station: HomeStation | null, at: number): StationScreenModel | null {
  if (!station) return null;
  const ready = at >= station.core.readyAt;
  const parts: Partial<Record<StationModuleId, AsteroidStation | undefined>> = {
    storage: station.storage,
    shipyard: station.shipyard,
    lab: station.lab,
    storage2: station.storage2,
    shipyard2: station.shipyard2,
    lab2: station.lab2,
    storage3: station.storage3,
    shipyard3: station.shipyard3,
    lab3: station.lab3,
    dock: station.dock,
    habitat: station.habitat,
  };
  // Rdzeń: pierwszy poziom = budowa stacji; wyższe (krok 2d-1) — rozbudowa (poprzedni poziom działa w jej trakcie).
  const coreLevel = stationCoreLevel(station, at);
  const modules = STATION_MODULES.map((def): StationModuleView => {
    const ring = def.ring ?? 1;
    if (def.id === 'core') {
      const up = station.coreUpgrade;
      const upgrading = !ready ? 1 : up && at < up.readyAt ? up.level : null;
      return { id: 'core', socket: null, level: coreLevel, state: upgrading ? 'building' : 'ready', upgrading, stage: 1, ring: 1 };
    }
    if (def.stage > STATION_STAGE_READY) return { id: def.id, socket: def.socket, level: 0, state: 'soon', upgrading: null, stage: def.stage, ring };
    if (ring > coreLevel) return { id: def.id, socket: def.socket, level: 0, state: 'locked', upgrading: null, stage: def.stage, ring };
    return { id: def.id, socket: def.socket, stage: def.stage, ring, ...moduleState(parts[def.id], at) };
  });
  return { ready, coreLevel, modules };
}

/**
 * Kąt gniazda (rad; 0 — po prawej, dalej przeciwnie do ruchu wskazówek zegara). Pierścień 1: gniazda 0–5 co 60°;
 * pierścień 2: gniazda 6–8 co 120° od 30°; pierścień 3: gniazda 9–11 co 120° od 90° (krok 2d-1).
 */
export function socketAngle(socket: number): number {
  if (socket < STATION_SOCKETS) return (socket / STATION_SOCKETS) * Math.PI * 2;
  if (socket < STATION_SOCKETS + 3) return Math.PI / 6 + ((socket - STATION_SOCKETS) * Math.PI * 2) / 3;
  return Math.PI / 2 + ((socket - STATION_SOCKETS - 3) * Math.PI * 2) / 3;
}

/** Pierścień gniazda (1–3). */
export const socketRing = (socket: number): 1 | 2 | 3 => (socket < STATION_SOCKETS ? 1 : socket < STATION_SOCKETS + 3 ? 2 : 3);

/** Klucz zmian wyglądu (renderer przebudowuje stację tylko, gdy się zmieni). */
export const stationScreenKey = (model: StationScreenModel | null) =>
  model ? `${model.ready}|${model.coreLevel}|${model.modules.map((m) => `${m.id}:${m.level}:${m.state}`).join(',')}` : '';
