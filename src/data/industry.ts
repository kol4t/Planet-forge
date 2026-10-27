// Etapy rozwoju przemysłu na planecie (v0.38.1, nazwy robocze) — pasek „Rozwój” w karcie budowli.
// `when` mówi, kiedy etap jest osiągnięty; `soon` — zapowiedź kolejnych wersji (plan: docs/plan-przemysl.md).
import type { BuildingId } from '../core/types.ts';

export interface IndustryStage {
  name: string;
  /** Zajętość pól (opis). */
  footprint: string;
  description: string;
  when: 'built' | 'full-group' | 'complex' | 'soon';
}

export const INDUSTRY_STAGES: Partial<Record<BuildingId, readonly IndustryStage[]>> = {
  crystalMine: [
    { name: 'Wiertła', footprint: '1 pole', description: 'Poziomy 1–2 na polu: małe wiertła.', when: 'built' },
    { name: 'Wiertło z szybem', footprint: '1 pole (3 poziomy)', description: 'Pełne pole (poz. 3, 6, 9…): szyb w gruncie i obracająca się głowica.', when: 'full-group' },
    { name: 'Kompleks wiertniczy', footprint: '4 pola', description: '3 sąsiednie pełne pola + szyb główny, +30% wydobycia.', when: 'complex' },
    { name: 'Megakompleks kryształowy', footprint: 'wkrótce', description: 'Kilka kompleksów i wspólna infrastruktura.', when: 'soon' },
    { name: 'Transformacja terenu', footprint: 'wkrótce', description: 'Kryształowy krajobraz wokół kompleksów.', when: 'soon' },
  ],
  metalMine: [
    { name: 'Kopalnia', footprint: '1 pole (3 poziomy)', description: 'Wejścia do kopalni na wzgórzach i w górach.', when: 'built' },
    { name: 'Zakład przetwórczy', footprint: 'wkrótce', description: 'Pełne pola kopalń jako zakład (v0.39).', when: 'soon' },
    { name: 'Wielka fabryka', footprint: 'wkrótce', description: 'Kompleks z własnym ekranem i trybami pracy.', when: 'soon' },
    { name: 'Megakompleks metalowy', footprint: 'wkrótce', description: 'Pełny cykl produkcji metalu.', when: 'soon' },
  ],
  powerPlant: [
    { name: 'Elektrownia', footprint: '1 pole (3 poziomy)', description: 'Chłodnie na równinach.', when: 'built' },
    { name: 'Węzeł energetyczny', footprint: 'wkrótce', description: 'Słup Tesli z pełnych pól (v0.40).', when: 'soon' },
    { name: 'Sieć Tesli', footprint: 'wkrótce', description: 'Połączone węzły dla wielkich kompleksów.', when: 'soon' },
  ],
};
