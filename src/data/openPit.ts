// Wielka odkrywka ekstraktora kryształów (prompt właściciela, po v0.48): na etapach „Odkrywka” (poz. 12–19)
// i „Megaodkrywka” (poz. 20+) cały obszar zajętych pól to jedna tarasowa dziura, a ekstraktor wisi nad jej środkiem
// na linach-rurach. Tylko wygląd: poziomy, koszty i liczba pól bez zmian. Wartości robocze (`status: 'robocza'`).

export interface OpenPitLook {
  /** Liczba warstw (półek) od krawędzi do dna. */
  layers: number;
  /** Głębokość dna pod krawędzią (ułamek promienia planety). */
  depth: number;
  /** Udział płaskiej półki w szerokości warstwy (reszta — pochyłe zbocze do następnej warstwy). */
  shelf: number;
  /** Dno wokół szybu: promień = tyle × promień otworu odwiertu (nie więcej niż 45% odległości środka od krawędzi). */
  floor: number;
  /** Wysokość zawieszenia ekstraktora: tyle głębokości dziury pod krawędzią (0 — na poziomie krawędzi). */
  hang: number;
  /** Liny-rury od ekstraktora do kotew na krawędzi (rozłożone równo dookoła). */
  cables: number;
  /** Zwis liny w połowie długości (ułamek promienia planety). */
  sag: number;
  status: 'robocza';
}

/** Wygląd wg etapu kompleksu (2 — Odkrywka, 3 — Megaodkrywka). Wcześniejsze etapy — bez wielkiej odkrywki. */
export const OPEN_PIT: Readonly<Record<2 | 3, OpenPitLook>> = {
  2: { layers: 5, depth: 0.09, shelf: 0.35, floor: 1.9, hang: 0.3, cables: 4, sag: 0.006, status: 'robocza' },
  3: { layers: 7, depth: 0.12, shelf: 0.3, floor: 1.9, hang: 0.3, cables: 5, sag: 0.008, status: 'robocza' },
};

export const openPitLook = (stage: number): OpenPitLook | null => (stage >= 3 ? OPEN_PIT[3] : stage === 2 ? OPEN_PIT[2] : null);

/** Liny-rury: grubość (promień rury), wysokość słupka kotwy, kolor i błysk płynącego kryształu (robocze). */
export const PIT_CABLE = {
  radius: 0.0028,
  segments: 16,
  post: 0.014,
  postRadius: 0.004,
  color: '#7d8a88',
  postColor: '#c9a24a',
  flow: '#6fe9ff',
  /** Ile błysków naraz na linie i prędkość (długości liny na sekundę). */
  pulses: 2,
  speed: 0.35,
} as const;
