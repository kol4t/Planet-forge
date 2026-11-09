// Ekran stacji (plan `docs/plan-stacji.md`, etap 1): stan modułów stacji macierzystej w gniazdach — wspólne źródło
// dla wyglądu (2D i 3D), wyboru modułu dotykiem i panelu „Moduły”. Czysta logika, bez zmian w zapisie: moduły wynikają
// z istniejących pól stacji (`core`, `storage`, `shipyard`).
import { STATION_MODULES, STATION_SOCKETS, STATION_STAGE_READY, type StationModuleId } from '../../data/stationModules.ts';
import { stationLevelAt } from '../economy/asteroids.ts';
import type { AsteroidStation, HomeStation } from '../types.ts';

/** Stan modułu: działa / w budowie (pierwszy poziom albo ulepszenie) / puste gniazdo / „wkrótce” (kolejne etapy). */
export type StationModuleState = 'ready' | 'building' | 'empty' | 'soon';

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
}

export interface StationScreenModel {
  /** Rdzeń gotowy (stacja działa). */
  ready: boolean;
  modules: StationModuleView[];
}

function moduleState(part: AsteroidStation | undefined, at: number): Pick<StationModuleView, 'level' | 'state' | 'upgrading'> {
  const level = stationLevelAt(part, at);
  const upgrading = part && at < part.readyAt ? part.level : null;
  if (level <= 0) return { level: 0, state: upgrading ? 'building' : 'empty', upgrading };
  return { level, state: upgrading ? 'building' : 'ready', upgrading };
}

/** Model ekranu stacji w chwili `at` (null — stacji nie ma). */
export function stationScreen(station: HomeStation | null, at: number): StationScreenModel | null {
  if (!station) return null;
  const ready = at >= station.core.readyAt;
  const parts: Partial<Record<StationModuleId, AsteroidStation | undefined>> = { storage: station.storage, shipyard: station.shipyard, lab: station.lab };
  const modules = STATION_MODULES.map((def): StationModuleView => {
    if (def.id === 'core') {
      return { id: 'core', socket: null, level: ready ? station.core.level : 0, state: ready ? 'ready' : 'building', upgrading: ready ? null : station.core.level, stage: 1 };
    }
    if (def.stage > STATION_STAGE_READY) return { id: def.id, socket: def.socket, level: 0, state: 'soon', upgrading: null, stage: def.stage };
    return { id: def.id, socket: def.socket, stage: def.stage, ...moduleState(parts[def.id], at) };
  });
  return { ready, modules };
}

/** Kąt gniazda na pierścieniu (rad; gniazdo 0 po prawej, dalej przeciwnie do ruchu wskazówek zegara). */
export const socketAngle = (socket: number) => (socket / STATION_SOCKETS) * Math.PI * 2;

/** Klucz zmian wyglądu (renderer przebudowuje stację tylko, gdy się zmieni). */
export const stationScreenKey = (model: StationScreenModel | null) =>
  model ? `${model.ready}|${model.modules.map((m) => `${m.id}:${m.level}:${m.state}`).join(',')}` : '';
