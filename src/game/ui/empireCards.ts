// Treść kart planet na ekranie „Imperium” (od v0.32): znaczki i paski z danych gry.
// Czyste funkcje — testowane bez Phasera; tylko to, co gra naprawdę liczy.
import type { PlanetOverview } from '../../app/GameController.ts';

export type CardTone = 'teal' | 'gold' | 'danger';

export interface CardBadge {
  label: string;
  tone: CardTone;
}

export interface CardBar {
  label: string;
  /** Wypełnienie 0..1. */
  value: number;
  text: string;
  tone: CardTone;
}

/** Bogactwo złóż od tylu (120%) — znaczek „bogata w …”. */
export const RICH_FROM = 1.2;

export function planetBadges(p: PlanetOverview): CardBadge[] {
  const badges: CardBadge[] = [];
  if (p.active) badges.push({ label: 'Tu jesteś', tone: 'teal' });
  const rich = p.planet.gameplay.richness;
  if (rich.metal >= RICH_FROM) badges.push({ label: 'bogata w metal', tone: 'gold' });
  if (rich.crystal >= RICH_FROM) badges.push({ label: 'bogata w kryształy', tone: 'gold' });
  if (p.stock.metal >= p.capacity || p.stock.crystal >= p.capacity) badges.push({ label: 'magazyn pełny', tone: 'danger' });
  if (p.deposits.left.metal <= 0 || p.deposits.left.crystal <= 0) badges.push({ label: 'złoże wyczerpane', tone: 'danger' });
  return badges;
}

export function planetBars(p: PlanetOverview): CardBar[] {
  const fill = Math.max(p.stock.metal, p.stock.crystal) / Math.max(1, p.capacity);
  const total = p.deposits.total.metal + p.deposits.total.crystal;
  const left = (p.deposits.left.metal + p.deposits.left.crystal) / Math.max(1, total);
  const fields = p.fields.used / Math.max(1, p.fields.buildable);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return [
    { label: 'Magazyn', value: Math.min(1, fill), text: pct(Math.min(1, fill)), tone: fill >= 1 ? 'danger' : 'gold' },
    { label: 'Złoża', value: left, text: pct(left), tone: left <= 0.1 ? 'danger' : 'teal' },
    { label: 'Pola', value: Math.min(1, fields), text: `${p.fields.used}/${p.fields.buildable}`, tone: fields >= 1 ? 'danger' : 'gold' },
  ];
}
