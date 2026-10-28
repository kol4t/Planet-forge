// Odwiert planetarny (v0.48, prompt właściciela „Głębokie odwierty planetarne i odsłonięte jądro”): wygląd 3D ekstraktora
// kryształów — krater przechodzący w pionową studnię, coraz głębszą z poziomem, na etapie 8 odsłania jądro planety.
// Tylko wygląd: poziomy, koszty i czasy budynku bez zmian. Wartości robocze (`status: 'robocza'`).

/** Poziom budynku, od którego zaczyna się etap odwiertu 1…8 (robocze). */
export const DRILL_STAGE_LEVELS = [1, 3, 6, 9, 12, 16, 22, 30] as const;

/** Kolory warstw wnętrza (od powierzchni w głąb) i jądra dla typu planety. */
export interface DrillLook {
  /** Skorupa zewnętrzna, głębsza skorupa, płaszcz, strefa gorąca (ściany studni). */
  crust: string;
  deepCrust: string;
  mantle: string;
  hot: string;
  /** Jądro i blask (pęknięcia, rozgrzane dno, poświata na ścianach). */
  core: string;
  glow: string;
  status: 'robocza';
}

const ROCKY: DrillLook = { crust: '#8a8178', deepCrust: '#5e5650', mantle: '#6b3f2e', hot: '#8a3a1c', core: '#ffb347', glow: '#ff8a3d', status: 'robocza' };

/** Wygląd odwiertu wg typu planety (`definitionId`); brak wpisu — skalisty. Nowy typ = nowy wpis. */
export const DRILL_LOOKS: Readonly<Record<string, DrillLook>> = {
  'kepler-186f': ROCKY,
  arid: { crust: '#a3876a', deepCrust: '#74604d', mantle: '#7a4630', hot: '#9b4420', core: '#ffc060', glow: '#ff9a40', status: 'robocza' },
  ice: { crust: '#b9cfd8', deepCrust: '#7f9caa', mantle: '#3f5f78', hot: '#3a7ea8', core: '#d8f6ff', glow: '#7fe8ff', status: 'robocza' },
  ocean: { crust: '#6f7f80', deepCrust: '#4d5a5c', mantle: '#4a3b46', hot: '#7a3a3a', core: '#ffd27a', glow: '#ffa24a', status: 'robocza' },
  volcanic: { crust: '#3b3533', deepCrust: '#2a2422', mantle: '#4a1d14', hot: '#a8260f', core: '#ff5a1f', glow: '#ff3d10', status: 'robocza' },
  barren: { crust: '#8f8c86', deepCrust: '#6a6660', mantle: '#5a5248', hot: '#8a6a2a', core: '#fff0b0', glow: '#ffd36a', status: 'robocza' },
};

export const drillLook = (definitionId: string): DrillLook => DRILL_LOOKS[definitionId] ?? ROCKY;
