// Etapy rozwoju przemysłu na planecie (v0.38.1, nazwy robocze) — pasek „Rozwój” w karcie budowli.
// `when` mówi, kiedy etap jest osiągnięty; `soon` — zapowiedź kolejnych wersji (plan: docs/plan-przemysl.md).
import type { BuildingId } from '../core/types.ts';

export interface IndustryStage {
  name: string;
  /** Zajętość pól (opis). */
  footprint: string;
  description: string;
  when: 'built' | 'full-group' | 'complex' | 'mega' | 'star' | 'soon';
}

/**
 * Poziomy wizualne (v0.41, robocze): co 5 poziomów budynku konstrukcje pełnych pól i kompleksów dostają
 * kolejne moduły (platforma, hale, przewody, zbiorniki, złota rama). Gameplay bez zmian — tylko wygląd.
 */
export interface VisualTier {
  /** Od którego poziomu budynku. */
  from: number;
  name: string;
  description: string;
}

export const VISUAL_TIERS: readonly VisualTier[] = [
  { from: 1, name: 'Podstawa', description: 'Sama konstrukcja.' },
  { from: 6, name: 'Platforma', description: 'Szeroka stalowa platforma ze złotą krawędzią.' },
  { from: 11, name: 'Hale boczne', description: 'Dwie hale przy krawędzi platformy.' },
  { from: 16, name: 'Przewody i maszt', description: 'Przewody wokół platformy i maszt łączności.' },
  { from: 21, name: 'Zbiorniki', description: 'Złote zbiorniki i silosy.' },
  { from: 26, name: 'Złota rama', description: 'Łuki nośne nad konstrukcją — pełna rozbudowa (poz. 26–30+).' },
];

/** Etap wyglądu (1..6) dla poziomu budynku. */
export function visualTier(level: number): number {
  let tier = 1;
  VISUAL_TIERS.forEach((t, i) => {
    if (level >= t.from) tier = i + 1;
  });
  return tier;
}

export const INDUSTRY_STAGES: Partial<Record<BuildingId, readonly IndustryStage[]>> = {
  crystalMine: [
    { name: 'Wiertła', footprint: '1 pole', description: 'Poziomy 1–2 na polu: małe wiertła.', when: 'built' },
    { name: 'Wiertło z szybem', footprint: '1 pole (3 poziomy)', description: 'Pełne pole (poz. 3, 6, 9…): szyb w gruncie i obracająca się głowica.', when: 'full-group' },
    { name: 'Kompleks wiertniczy', footprint: '4 pola', description: '3 sąsiednie pełne pola + szyb główny, +30% wydobycia.', when: 'complex' },
    { name: 'Megakompleks kryształowy', footprint: '8 pól', description: '2 stykające się kompleksy wiertnicze, +60% wydobycia, głębokie wykopy.', when: 'mega' },
    { name: 'Transformacja terenu', footprint: 'wkrótce', description: 'Kryształowy krajobraz wokół kompleksów.', when: 'soon' },
  ],
  metalMine: [
    { name: 'Kopalnia', footprint: '1 pole', description: 'Poziomy 1–2 na polu: wejścia do kopalni na wzgórzach i w górach.', when: 'built' },
    { name: 'Zakład przetwórczy', footprint: '1 pole (3 poziomy)', description: 'Pełne pole (poz. 3, 6, 9…): hala, piece i kominy.', when: 'full-group' },
    { name: 'Wielka fabryka', footprint: '4 pola', description: '3 sąsiednie zakłady + hala główna, +30% metalu, ekran z trybami pracy.', when: 'complex' },
    { name: 'Megakompleks metalowy', footprint: '8 pól', description: '2 stykające się wielkie fabryki, +60% metalu, głębokie wykopy.', when: 'mega' },
  ],
  powerPlant: [
    { name: 'Elektrownia', footprint: '1 pole', description: 'Poziomy 1–2 na polu: chłodnie na równinach.', when: 'built' },
    { name: 'Węzeł Tesli', footprint: '1 pole (3 poziomy)', description: 'Pełne pole (poz. 3, 6, 9…): wieża z pierścieniem i świecącą kulą.', when: 'full-group' },
    { name: 'Sieć Tesli', footprint: '4 pola', description: '3 sąsiednie węzły + wieża przesyłowa, wyładowania między wieżami, +30% energii.', when: 'complex' },
    { name: 'Megasieć Tesli', footprint: '8 pól', description: '2 stykające się sieci Tesli, +60% energii.', when: 'mega' },
    { name: 'Energia gwiazdy', footprint: 'orbita', description: 'Kolektor na orbicie zasila wszystkie Twoje planety w układzie (Planeta → Kosmos).', when: 'star' },
  ],
};
