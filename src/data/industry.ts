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
    { name: 'Kopalnia', footprint: '1 pole', description: 'Poziomy 1–2 na polu: wejścia do kopalni na wzgórzach i w górach.', when: 'built' },
    { name: 'Zakład przetwórczy', footprint: '1 pole (3 poziomy)', description: 'Pełne pole (poz. 3, 6, 9…): hala, piece i kominy.', when: 'full-group' },
    { name: 'Wielka fabryka', footprint: '4 pola', description: '3 sąsiednie zakłady + hala główna, +30% metalu, ekran z trybami pracy.', when: 'complex' },
    { name: 'Megakompleks metalowy', footprint: 'wkrótce', description: 'Pełny cykl produkcji metalu.', when: 'soon' },
  ],
  powerPlant: [
    { name: 'Elektrownia', footprint: '1 pole', description: 'Poziomy 1–2 na polu: chłodnie na równinach.', when: 'built' },
    { name: 'Węzeł Tesli', footprint: '1 pole (3 poziomy)', description: 'Pełne pole (poz. 3, 6, 9…): wieża z pierścieniem i świecącą kulą.', when: 'full-group' },
    { name: 'Sieć Tesli', footprint: '4 pola', description: '3 sąsiednie węzły + wieża przesyłowa, wyładowania między wieżami, +30% energii.', when: 'complex' },
    { name: 'Energia gwiazdy', footprint: 'wkrótce', description: 'Przesył energii z orbity.', when: 'soon' },
  ],
};
