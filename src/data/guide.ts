// Przewodnik SI Matki — „Pierwsze kroki” (etap 11 pętli MVP, decyzje właściciela 2026-11-02): lista zadań przez całą
// pętlę (rozwój → wielka fabryka → stacja → kolonia → megakonstrukt → transport → wyeksploatowanie → imperium gwiezdne),
// jedno bieżące zadanie naraz, mała nagroda za każde. Teksty i liczby ROBOCZE (lore: SI Matka — nazwa robocza
// z gry; bez nowych treści fabularnych). Warunki sprawdza `core/guide/guide.ts` na podstawie stanu gry.
import type { BuildingId, Resources } from '../core/types.ts';

/** Co musi być prawdą, żeby krok był wykonany (sprawdzane w core na migawce stanu gry). */
export type GuideGoal =
  | { kind: 'level'; building: BuildingId; level: number }
  | { kind: 'researched'; count: number }
  | { kind: 'unlocked'; feature: string }
  | { kind: 'seen'; what: 'system' }
  | { kind: 'complex'; family: string }
  | { kind: 'station' }
  | { kind: 'planets'; count: number }
  | { kind: 'konstrukt' }
  | { kind: 'transport' }
  | { kind: 'exploited'; count: number }
  | { kind: 'stellar' };

export interface GuideStep {
  id: string;
  /** Zadanie (krótko, w trybie rozkazującym). */
  title: string;
  /** Jak to zrobić (konkretne dotknięcia). */
  hint: string;
  goal: GuideGoal;
  /** Nagroda (robocza) — do magazynu aktywnej planety; antymateria — do wspólnego portfela. */
  reward: Resources & { antimatter?: number };
  status: 'robocza';
}

const R = (metal: number, crystal: number, antimatter = 0) => ({ metal, crystal, ...(antimatter ? { antimatter } : {}) });

export const GUIDE_STEPS: readonly GuideStep[] = [
  { id: 'metal-3', title: 'Rozbuduj Kopalnię metalu do poz. 3', hint: 'Produkcja → Kopalnia metalu → „Ulepsz”. Budowy możesz dopisać do kolejki.', goal: { kind: 'level', building: 'metalMine', level: 3 }, reward: R(150, 60), status: 'robocza' },
  { id: 'power-3', title: 'Rozbuduj Elektrownię do poz. 3', hint: 'Kopalnie zużywają energię — bez niej pracują wolniej (dotknij ENERGII na górze).', goal: { kind: 'level', building: 'powerPlant', level: 3 }, reward: R(150, 60), status: 'robocza' },
  { id: 'crystal-3', title: 'Rozbuduj Ekstraktor kryształów do poz. 3', hint: 'Produkcja → Ekstraktor kryształów → „Ulepsz”.', goal: { kind: 'level', building: 'crystalMine', level: 3 }, reward: R(150, 80), status: 'robocza' },
  { id: 'storage-4', title: 'Rozbuduj Magazyn do poz. 4', hint: 'Pełny magazyn zatrzymuje wydobycie — rozbudowuj go z kopalniami.', goal: { kind: 'level', building: 'storage', level: 4 }, reward: R(250, 120), status: 'robocza' },
  { id: 'system', title: 'Obejrzyj swój układ', hint: 'Ściśnij planetę dwoma palcami (albo „−”) — zobaczysz gwiazdę i sąsiednie planety. Dotknij swojej, by wrócić.', goal: { kind: 'seen', what: 'system' }, reward: R(200, 100), status: 'robocza' },
  { id: 'lab', title: 'Zbuduj Laboratorium i zbadaj pierwszą technologię', hint: 'Produkcja → Laboratorium → „Ulepsz”, potem „Badania” i dowolne dostępne badanie.', goal: { kind: 'researched', count: 1 }, reward: R(400, 300), status: 'robocza' },
  { id: 'metal-10', title: 'Rozbuduj Kopalnię metalu do poz. 10', hint: 'Twoja planeta to przede wszystkim metal — kopalnia jest sercem gospodarki.', goal: { kind: 'level', building: 'metalMine', level: 10 }, reward: R(1500, 600), status: 'robocza' },
  { id: 'factory-research', title: 'Zbadaj „Metalurgię przemysłową”', hint: 'Badania → Produktywność. Otwiera wielką fabrykę kopalni metalu.', goal: { kind: 'unlocked', feature: 'metal-factory' }, reward: R(1500, 1000), status: 'robocza' },
  { id: 'factory', title: 'Uruchom wielką fabrykę', hint: 'Dotknij Kopalni metalu na planecie → okno Kompleks → „Uruchom”. Kopalnia wydobywa więcej (+30%).', goal: { kind: 'complex', family: 'metal-factory' }, reward: R(3000, 1500), status: 'robocza' },
  { id: 'station-research', title: 'Zbadaj „Moduł orbitalny”', hint: 'Badania → Stacja i handel. Otwiera stację macierzystą — siedzibę SI Matki.', goal: { kind: 'unlocked', feature: 'home-station' }, reward: R(3000, 2000), status: 'robocza' },
  { id: 'station', title: 'Zbuduj stację macierzystą', hint: 'Imperium → karta „Stacja macierzysta” → „Zbuduj stację”. Na stacji powstanie stocznia.', goal: { kind: 'station' }, reward: R(5000, 3000, 5), status: 'robocza' },
  { id: 'colony', title: 'Załóż drugą kolonię', hint: 'W widoku układu dotknij wolnej planety → „Wyślij statek” (statek kolonizacyjny z floty, lot za antymaterię).', goal: { kind: 'planets', count: 2 }, reward: R(5000, 3000, 5), status: 'robocza' },
  { id: 'metal-20', title: 'Rozbuduj Kopalnię metalu do poz. 20', hint: 'Na poz. 20 kopalnia staje się kombinatem — wydobycie rośnie szybko.', goal: { kind: 'level', building: 'metalMine', level: 20 }, reward: R(20_000, 8000), status: 'robocza' },
  { id: 'mega-research', title: 'Zbadaj „Megastruktury”', hint: 'Badania → Produktywność (po „Głębokich szybach”). Bez tego nie powstanie megakonstrukt.', goal: { kind: 'unlocked', feature: 'megastructures' }, reward: R(30_000, 15_000, 5), status: 'robocza' },
  { id: 'metal-40', title: 'Kopalnia metalu poz. 40 — komplet osad', hint: 'Cztery osady kopalni metalu to warunek megakonstruktu. Rozbudowuj Elektrownię, by starczyło energii.', goal: { kind: 'level', building: 'metalMine', level: 40 }, reward: R(200_000, 80_000), status: 'robocza' },
  { id: 'konstrukt', title: 'Zbuduj megakonstrukt', hint: 'Okno Kompleks kopalni metalu → „Zbuduj megakonstrukt”. To główny cel planety — wydobywa przez około tydzień.', goal: { kind: 'konstrukt' }, reward: R(400_000, 100_000, 10), status: 'robocza' },
  { id: 'transport', title: 'Wyślij transport surowców', hint: 'Badania → Flota → „Transportowce”, potem Imperium → karta planety → „Wyślij surowce” (albo „Na stację”).', goal: { kind: 'transport' }, reward: R(100_000, 50_000, 5), status: 'robocza' },
  { id: 'exploited-1', title: 'Wyeksploatuj pierwszą planetę (80% złóż)', hint: 'Gdy złoża się kończą, przenieś wysiłek na kolonię: tam też stanie megakonstrukt.', goal: { kind: 'exploited', count: 1 }, reward: R(200_000, 100_000, 10), status: 'robocza' },
  { id: 'stellar', title: 'Imperium gwiezdne: trzy wyeksploatowane planety', hint: 'Trzy planety z 80% wydobytych złóż i gotowa stacja macierzysta zamykają pętlę.', goal: { kind: 'stellar' }, reward: R(0, 0, 20), status: 'robocza' },
];
