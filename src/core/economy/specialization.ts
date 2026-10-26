import { findSpecialization, SPECIALIZATION_RULES, SPECIALIZATIONS } from '../../data/specializations.ts';
import type {
  PlanetSpecialization,
  ResearchEffect,
  SpecializationDef,
  SpecializationId,
  SpecializationRules,
  SpecializationSite,
} from '../types.ts';

/** Mnożnik dopasowania specjalizacji do położenia planety (gwiazda × strefa orbity, w granicach z reguł). */
export function affinity(def: SpecializationDef, site: SpecializationSite | null, rules: SpecializationRules = SPECIALIZATION_RULES): number {
  if (!site) return 1;
  const raw = (def.affinity.star[site.star] ?? 1) * (def.affinity.zone[site.zone] ?? 1);
  const [min, max] = rules.affinityRange;
  return Math.round(Math.min(max, Math.max(min, raw)) * 100) / 100;
}

/** Słowna ocena dopasowania („świetne”, „dobre”, „zwykłe”, „słabe”). */
export function affinityLabel(factor: number): string {
  if (factor >= 1.3) return 'świetne';
  if (factor >= 1.1) return 'dobre';
  if (factor >= 0.95) return 'zwykłe';
  return 'słabe';
}

/** Efekty specjalizacji na tej planecie: procenty × dopasowanie (zaokrąglone do całych). */
export function specializationEffects(def: SpecializationDef, site: SpecializationSite | null, rules: SpecializationRules = SPECIALIZATION_RULES): ResearchEffect[] {
  const f = affinity(def, site, rules);
  return def.effects.map((e) => ('percent' in e ? { ...e, percent: Math.round(e.percent * f) } : e));
}

/** Czy specjalizacja już działa (zmiana trwa do `readyAt`). */
export function isSpecializationActive(spec: PlanetSpecialization | undefined, at: number): boolean {
  return !!spec && at >= spec.readyAt;
}

/** Efekty działające w chwili `at` (w trakcie zmiany — żadne). */
export function activeSpecializationEffects(spec: PlanetSpecialization | undefined, site: SpecializationSite | null, at: number): ResearchEffect[] {
  if (!spec || !isSpecializationActive(spec, at)) return [];
  const def = findSpecialization(spec.id);
  return def ? specializationEffects(def, site) : [];
}

export type SpecializationResult =
  | { ok: true; spec: PlanetSpecialization; message: string }
  | { ok: false; message: string };

/**
 * Wybór specjalizacji: pierwszy — od razu i za darmo; zmiana — tylko po badaniu z Planetologii
 * i trwa `changeSeconds` (w tym czasie planeta nie ma premii).
 */
export function chooseSpecialization(
  current: PlanetSpecialization | undefined,
  id: SpecializationId,
  now: number,
  canChange: boolean,
  rules: SpecializationRules = SPECIALIZATION_RULES,
): SpecializationResult {
  const def = findSpecialization(id);
  if (!def) return { ok: false, message: 'Nieznana specjalizacja.' };
  if (!current) return { ok: true, spec: { id, readyAt: now }, message: `Specjalizacja: ${def.name} — działa od teraz.` };
  if (current.id === id) return { ok: false, message: `Planeta ma już specjalizację ${def.name}.` };
  if (!canChange) {
    return { ok: false, message: 'Zmiana specjalizacji wymaga badania „Przebudowa kolonii” (Planetologia).' };
  }
  const hours = rules.changeSeconds / 3600;
  return {
    ok: true,
    spec: { id, readyAt: now + rules.changeSeconds * 1000 },
    message: `Zmiana na ${def.name} — potrwa ${hours === 1 ? '1 godzinę' : `${hours} h`}. Do tego czasu planeta nie ma premii.`,
  };
}

/** Odczyt z zapisu (błędna = brak specjalizacji). */
export function parseSpecialization(raw: any): PlanetSpecialization | undefined {
  if (!raw || typeof raw.id !== 'string' || !SPECIALIZATIONS.some((s) => s.id === raw.id)) return undefined;
  if (typeof raw.readyAt !== 'number' || !Number.isFinite(raw.readyAt)) return undefined;
  return { id: raw.id as SpecializationId, readyAt: raw.readyAt };
}
