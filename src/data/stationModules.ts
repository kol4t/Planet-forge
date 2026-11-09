// Moduły stacji macierzystej (plan `docs/plan-stacji.md`, etap 1 — decyzje właściciela 2026-11-09): rdzeń w środku,
// sześć gniazd na pierścieniu. Działają: magazyn orbitalny i stocznia; pozostałe gniazda czekają na moduły z kolejnych
// etapów („wkrótce”). Nazwy i opisy robocze (lore — `docs/lore/nazwy-w-grze.md`).

export type StationModuleId = 'core' | 'storage' | 'shipyard' | 'lab' | 'dock' | 'habitat' | 'listening' | 'megaDock' | CopyModuleId;

/** Drugie i trzecie egzemplarze modułów w pierścieniach 2 i 3 (krok 2d-1, decyzja właściciela 2026-11-09). */
export type CopyModuleId = 'storage2' | 'shipyard2' | 'lab2' | 'storage3' | 'shipyard3' | 'lab3';

export interface StationModuleDef {
  id: StationModuleId;
  name: string;
  /** Krótki opis na karcie modułu. */
  description: string;
  /** Gniazdo na pierścieniu (0–5, co 60°); rdzeń — `null` (środek stacji); `AXIS_SOCKET` — na osi pod rdzeniem. */
  socket: number | null;
  /** Etap planu, w którym moduł wchodzi do gry (1 — już działa). */
  stage: number;
  /** Pierścień gniazd (1 — od początku; 2 i 3 — po rozbudowie rdzenia do tego poziomu). */
  ring?: 1 | 2 | 3;
  /** Egzemplarz którego modułu (drugi magazyn, druga stocznia, drugie laboratorium…). */
  copyOf?: 'storage' | 'shipyard' | 'lab';
  status: 'robocza';
}

/** Rdzeń stacji (krok 2d-1): poziomy 2 i 3 po badaniach „Rdzeń drugiej / trzeciej generacji”; płaci magazyn stacji. */
export const STATION_CORE = {
  maxLevel: 3,
  research: { 2: 'st-core-2', 3: 'st-core-3' } as Record<number, string>,
  cost: { 2: { metal: 150_000, crystal: 200_000 }, 3: { metal: 600_000, crystal: 800_000 } } as Record<number, { metal: number; crystal: number }>,
  seconds: { 2: 7200, 3: 21600 } as Record<number, number>,
  status: 'robocza' as const,
};

/** Miejsce na osi stacji pod rdzeniem (dok megakonstruktów — decyzja właściciela 2026-11-09). */
export const AXIS_SOCKET = -1;

/** Etap planu stacji, do którego moduły już działają (wyższe — „wkrótce”). */
export const STATION_STAGE_READY = 3;

/** Liczba gniazd na pierścieniu stacji macierzystej (etap 1). */
export const STATION_SOCKETS = 6;

export const STATION_MODULES: readonly StationModuleDef[] = [
  { id: 'core', name: 'Rdzeń SI Matki', description: 'Serce stacji: SI Matka, zasilanie i łączność. Na nim stoją pozostałe moduły.', socket: null, stage: 1, status: 'robocza' },
  { id: 'storage', name: 'Magazyn orbitalny', description: 'Kontenery na metal i kryształy — węzeł transportu między planetami.', socket: 0, stage: 1, status: 'robocza' },
  { id: 'shipyard', name: 'Stocznia', description: 'Dok z rusztowaniem: buduje statki floty. Wyższy poziom — szybsza budowa.', socket: 1, stage: 1, status: 'robocza' },
  { id: 'lab', name: 'Laboratorium orbitalne', description: 'Badania dla całego imperium naraz.', socket: 2, stage: 2, status: 'robocza' },
  { id: 'dock', name: 'Dok handlowy', description: 'Rynek za kredyty (sprzedaż i kupno surowców), kupcy co 6 h z ofertami i zamówieniami; wyższy poziom — lepszy kurs.', socket: 3, stage: 3, status: 'robocza' },
  { id: 'habitat', name: 'Moduł mieszkalny', description: 'Miejsca dla załogi stacji.', socket: 4, stage: 5, status: 'robocza' },
  { id: 'listening', name: 'Nasłuch', description: 'Antena wyłapująca sygnały z głębi kosmosu.', socket: 5, stage: 6, status: 'robocza' },
  // Decyzja właściciela 2026-11-09: osobny moduł dla megakonstruktów — ostatni etap wątku stacji.
  { id: 'storage2', name: 'Magazyn orbitalny II', description: 'Drugi magazyn — więcej miejsca na surowce na stacji.', socket: 6, stage: 2, ring: 2, copyOf: 'storage', status: 'robocza' },
  { id: 'shipyard2', name: 'Stocznia II', description: 'Druga stocznia — dwa statki budują się naraz.', socket: 7, stage: 2, ring: 2, copyOf: 'shipyard', status: 'robocza' },
  { id: 'lab2', name: 'Laboratorium orbitalne II', description: 'Drugie laboratorium — dwa badania stacji naraz.', socket: 8, stage: 2, ring: 2, copyOf: 'lab', status: 'robocza' },
  { id: 'storage3', name: 'Magazyn orbitalny III', description: 'Trzeci magazyn — jeszcze więcej miejsca na stacji.', socket: 9, stage: 2, ring: 3, copyOf: 'storage', status: 'robocza' },
  { id: 'shipyard3', name: 'Stocznia III', description: 'Trzecia stocznia — trzy statki naraz.', socket: 10, stage: 2, ring: 3, copyOf: 'shipyard', status: 'robocza' },
  { id: 'lab3', name: 'Laboratorium orbitalne III', description: 'Trzecie laboratorium — trzy badania stacji naraz.', socket: 11, stage: 2, ring: 3, copyOf: 'lab', status: 'robocza' },
  { id: 'megaDock', name: 'Dok megakonstruktów', description: 'Trzy miejsca cumowania: megakonstrukt metalu, kryształów i jedno na przyszłość.', socket: AXIS_SOCKET, stage: 7, status: 'robocza' },
];

export const stationModuleDef = (id: StationModuleId): StationModuleDef => STATION_MODULES.find((m) => m.id === id)!;
