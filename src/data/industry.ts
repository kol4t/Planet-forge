// Etapy rozwoju przemysłu na planecie (v0.38.1, od v0.45 z danych pól; nazwy robocze) — pasek „Rozwój” w karcie budowli.
// `when` mówi, kiedy etap jest osiągnięty; `soon` — zapowiedź kolejnych wersji (plan: docs/plan-przemysl.md).
import type { BuildingId } from '../core/types.ts';
import { FOOTPRINT, STAGE_NAMES } from './footprint.ts';

export interface IndustryStage {
  name: string;
  /** Zajętość pól (opis). */
  footprint: string;
  description: string;
  when: 'built' | 'full-group' | 'complex' | 'mega' | 'star' | 'soon';
}

const STAGE_TEXT: Record<BuildingId, readonly [string, string, string, string]> = {
  metalMine: [
    'Mała instalacja wydobywcza na wzgórzach.',
    'Hale przerobu, taśmociągi, pierwsze piece.',
    'Huta: gęsta zabudowa, kominy, żar pieców.',
    'Zintegrowany zakład przemysłowy z pełnym cyklem produkcji.',
  ],
  crystalMine: [
    'Pojedyncze wiertło na lodzie.',
    'Szyb wiertniczy z zabudową na krawędzi.',
    'Odkrywka: tarasowe ściany schodzą w głąb, na dnie świecą kryształy.',
    'Ogromna odkrywka z wieżą wiertniczą nad środkiem.',
  ],
  powerPlant: ['Chłodnie na równinie.', 'Węzeł z transformatorami.', 'Pola chłodni i wieże przesyłowe.', 'Megasieć zasilająca całą planetę.'],
  storage: ['Kilka kontenerów.', 'Hale magazynowe.', 'Terminal z suwnicami.', 'Megaskład.'],
  antimatterCollector: ['Pojedyncza pułapka.', 'Kolektor z pierścieniem.', 'Pole pułapek magnetycznych.', 'Megakolektor.'],
  laboratory: ['Pracownia.', 'Laboratorium z kopułą.', 'Instytut badawczy.', 'Kampus badawczy.'],
};

const WHEN = ['built', 'full-group', 'complex', 'mega'] as const;

/** Etapy budynku z danych pól (`FOOTPRINT`, `STAGE_NAMES`): nazwa, zajętość pól, opis. */
function stagesOf(id: BuildingId): IndustryStage[] {
  return FOOTPRINT[id].map((stage, i) => ({
    name: STAGE_NAMES[id][i]!,
    footprint: `${stage.fields[0]}–${stage.fields[1]} pól · od poz. ${stage.from}`,
    description: STAGE_TEXT[id][i]!,
    when: WHEN[i]!,
  }));
}

/**
 * Etapy rozwoju budynków (v0.45): jeden kompleks na budynek, rosnący z poziomem — etap = wygląd i zajętość pól.
 * `built` — etap 1, `full-group` — 2, `complex` — 3, `mega` — 4 (nazwy pól zostają dla zgodności).
 */
export const INDUSTRY_STAGES: Partial<Record<BuildingId, readonly IndustryStage[]>> = {
  metalMine: stagesOf('metalMine'),
  crystalMine: stagesOf('crystalMine'),
  powerPlant: [
    ...stagesOf('powerPlant'),
    { name: 'Energia gwiazdy', footprint: 'orbita', description: 'Kolektor na orbicie zasila wszystkie Twoje planety w układzie (Planeta → Kosmos).', when: 'star' },
  ],
  storage: stagesOf('storage'),
  antimatterCollector: stagesOf('antimatterCollector'),
  laboratory: stagesOf('laboratory'),
};
