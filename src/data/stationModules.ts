// Moduły stacji macierzystej (plan `docs/plan-stacji.md`, etap 1 — decyzje właściciela 2026-11-09): rdzeń w środku,
// sześć gniazd na pierścieniu. Działają: magazyn orbitalny i stocznia; pozostałe gniazda czekają na moduły z kolejnych
// etapów („wkrótce”). Nazwy i opisy robocze (lore — `docs/lore/nazwy-w-grze.md`).

export type StationModuleId = 'core' | 'storage' | 'shipyard' | 'lab' | 'dock' | 'habitat' | 'listening';

export interface StationModuleDef {
  id: StationModuleId;
  name: string;
  /** Krótki opis na karcie modułu. */
  description: string;
  /** Gniazdo na pierścieniu (0–5, co 60°); rdzeń — `null` (środek stacji). */
  socket: number | null;
  /** Etap planu, w którym moduł wchodzi do gry (1 — już działa). */
  stage: number;
  status: 'robocza';
}

/** Liczba gniazd na pierścieniu stacji macierzystej (etap 1). */
export const STATION_SOCKETS = 6;

export const STATION_MODULES: readonly StationModuleDef[] = [
  { id: 'core', name: 'Rdzeń SI Matki', description: 'Serce stacji: SI Matka, zasilanie i łączność. Na nim stoją pozostałe moduły.', socket: null, stage: 1, status: 'robocza' },
  { id: 'storage', name: 'Magazyn orbitalny', description: 'Kontenery na metal i kryształy — węzeł transportu między planetami.', socket: 0, stage: 1, status: 'robocza' },
  { id: 'shipyard', name: 'Stocznia', description: 'Dok z rusztowaniem: buduje statki floty. Wyższy poziom — szybsza budowa.', socket: 1, stage: 1, status: 'robocza' },
  { id: 'lab', name: 'Laboratorium orbitalne', description: 'Badania dla całego imperium naraz.', socket: 2, stage: 2, status: 'robocza' },
  { id: 'dock', name: 'Dok handlowy', description: 'Kupcy, kursy wymiany i zamówienia.', socket: 3, stage: 3, status: 'robocza' },
  { id: 'habitat', name: 'Moduł mieszkalny', description: 'Miejsca dla załogi stacji.', socket: 4, stage: 5, status: 'robocza' },
  { id: 'listening', name: 'Nasłuch', description: 'Antena wyłapująca sygnały z głębi kosmosu.', socket: 5, stage: 6, status: 'robocza' },
];

export const stationModuleDef = (id: StationModuleId): StationModuleDef => STATION_MODULES.find((m) => m.id === id)!;
