// Model nawigacji jednego ciągłego widoku (plan „widok układu”, etap B; nazwy poziomów robocze — O-301, O-002):
// Galaktyka → Układ → Obiekt → Powierzchnia. Jeden ciągły parametr przybliżenia `zoom` z progami poziomów i histerezą
// (bez migotania na granicy). Czyste funkcje, bez grafiki: przejścia, ograniczenia, „wstecz”, reset widoku.
// Zmiana aktywnej planety po dotknięciu własnej planety należy do GameController (nie do tego modułu).

export type ViewLevel = 'galaktyka' | 'uklad' | 'obiekt' | 'powierzchnia';

export const VIEW_LEVELS: readonly ViewLevel[] = ['galaktyka', 'uklad', 'obiekt', 'powierzchnia'];

export interface ViewState {
  level: ViewLevel;
  /** Układ w centrum widoku (numer 1..100). */
  system: number;
  /** Obiekt, na który patrzy kamera (adres planety `1:układ:orbita`); null — cały układ albo galaktyka. */
  object: string | null;
  /** Ciągłe przybliżenie (patrz `VIEW_RULES`). */
  zoom: number;
}

/**
 * Skala przybliżenia (robocza): 0–1 galaktyka, 1–2 układ, 2–3 obiekt, 3–4,5 powierzchnia. Wejście na poziom wymaga
 * przekroczenia progu o `hysteresis`, wyjście — cofnięcia o tyle samo (bez migotania na granicy).
 */
export const VIEW_RULES = {
  min: 0,
  max: 4.5,
  thresholds: [1, 2, 3] as const,
  hysteresis: 0.08,
  /** Przybliżenie po wejściu na poziom (lot kamery, „wstecz”, reset). */
  entry: { galaktyka: 0.5, uklad: 1.5, obiekt: 2.5, powierzchnia: 3.5 } as Record<ViewLevel, number>,
  /** Zakres przybliżenia planety w rendererze (dawne 0,8×–3,5×) odpowiadający zoomowi 2–4,5. */
  planetZoom: [0.8, 3.5] as const,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ADDRESS = /^(\d{1,3}):(\d{1,4}):(\d{1,2})$/;

/** Numer układu z adresu planety (null — błędny adres). */
export function systemOf(address: string): number | null {
  const m = ADDRESS.exec(address);
  return m ? Number(m[2]) : null;
}

/** Poziom dla przybliżenia — z histerezą względem poprzedniego poziomu. */
export function levelFor(zoom: number, previous: ViewLevel): ViewLevel {
  const { hysteresis: h } = VIEW_RULES;
  const t: readonly number[] = VIEW_RULES.thresholds;
  const prev = VIEW_LEVELS.indexOf(previous);
  // Bez histerezy: poziom „czysty” z progów.
  const raw = zoom < t[0] ? 0 : zoom < t[1] ? 1 : zoom < t[2] ? 2 : 3;
  if (raw === prev) return previous;
  // Zmiana tylko po przekroczeniu progu o histerezę w kierunku ruchu.
  if (raw > prev) {
    const edge = t[raw - 1]!;
    return zoom >= edge + h ? VIEW_LEVELS[raw]! : VIEW_LEVELS[Math.max(prev, raw - 1)]!;
  }
  const edge = t[raw]!;
  return zoom <= edge - h ? VIEW_LEVELS[raw]! : VIEW_LEVELS[Math.min(prev, raw + 1)]!;
}

/** Widok startowy: układ aktywnej planety, kamera przybliżona na nią (jak dotychczasowy ekran planety). */
export function startView(activeAddress: string): ViewState {
  return { level: 'obiekt', system: systemOf(activeAddress) ?? 1, object: activeAddress, zoom: VIEW_RULES.entry.obiekt };
}

/**
 * Zmiana przybliżenia (szczypanie, kółko): `delta` dodawane do zoomu. Bez wybranego obiektu nie da się zejść poniżej
 * poziomu układu (najpierw trzeba dotknąć obiektu) — zoom zatrzymuje się tuż przed progiem.
 */
export function zoomBy(state: ViewState, delta: number): ViewState {
  const { min, max, thresholds, hysteresis } = VIEW_RULES;
  let zoom = clamp(state.zoom + delta, min, max);
  if (!state.object) zoom = Math.min(zoom, thresholds[1] + hysteresis / 2);
  const level = levelFor(zoom, state.level);
  // Oddalenie do układu albo galaktyki odpina obiekt (kamera wraca na środek układu).
  const object = level === 'galaktyka' || level === 'uklad' ? null : state.object;
  return { ...state, zoom, level, object };
}

/** Dotknięcie obiektu w układzie: kamera leci na niego (poziom „obiekt”). */
export function focusObject(state: ViewState, address: string): ViewState {
  const system = systemOf(address);
  if (system === null) return state;
  const zoom = Math.max(state.zoom, VIEW_RULES.entry.obiekt);
  return { level: levelFor(zoom, 'obiekt'), system, object: address, zoom };
}

/** Wejście do układu (dotknięcie w galaktyce, ścieżka „Układ”). */
export function focusSystem(state: ViewState, system: number): ViewState {
  if (!Number.isInteger(system) || system < 1) return state;
  return { level: 'uklad', system, object: null, zoom: VIEW_RULES.entry.uklad };
}

/** „Wstecz”: powierzchnia → obiekt → układ → galaktyka (w galaktyce bez zmian). */
export function back(state: ViewState): ViewState {
  switch (state.level) {
    case 'powierzchnia':
      return { ...state, level: 'obiekt', zoom: VIEW_RULES.entry.obiekt };
    case 'obiekt':
      return { ...state, level: 'uklad', object: null, zoom: VIEW_RULES.entry.uklad };
    case 'uklad':
      return { ...state, level: 'galaktyka', object: null, zoom: VIEW_RULES.entry.galaktyka };
    default:
      return state;
  }
}

/** „Resetuj widok”: z powrotem na aktywnej planecie. */
export function resetView(activeAddress: string): ViewState {
  return startView(activeAddress);
}

/** Przybliżenie planety w rendererze (0,8×–3,5×) dla zoomu widoku na poziomach obiekt / powierzchnia. */
export function planetZoom(state: ViewState): number {
  const [lo, hi] = VIEW_RULES.planetZoom;
  const t = clamp((state.zoom - VIEW_RULES.thresholds[1]) / (VIEW_RULES.max - VIEW_RULES.thresholds[1]), 0, 1);
  return lo + (hi - lo) * t;
}

/** Ścieżka do nawigacji („Galaktyka › Układ › Planeta”) — elementy do wyświetlenia i dotknięcia. */
export function breadcrumb(state: ViewState): { level: ViewLevel; label: string }[] {
  const out: { level: ViewLevel; label: string }[] = [{ level: 'galaktyka', label: 'Galaktyka' }];
  if (state.level === 'galaktyka') return out;
  out.push({ level: 'uklad', label: 'Układ' });
  if (state.object) out.push({ level: 'obiekt', label: 'Obiekt' });
  return out;
}

/** Widok z zapisu (opcjonalne pole `view`) — błędny albo brak = null (start na aktywnej planecie). */
export function parseView(raw: unknown): ViewState | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (!VIEW_LEVELS.includes(v.level as ViewLevel)) return null;
  if (!Number.isInteger(v.system) || (v.system as number) < 1 || (v.system as number) > 9999) return null;
  if (typeof v.zoom !== 'number' || !Number.isFinite(v.zoom)) return null;
  const object = typeof v.object === 'string' && ADDRESS.test(v.object) ? v.object : null;
  const level = v.level as ViewLevel;
  // Poziom obiektu bez obiektu jest niespójny — wtedy widok układu.
  if ((level === 'obiekt' || level === 'powierzchnia') && !object) return { level: 'uklad', system: v.system as number, object: null, zoom: VIEW_RULES.entry.uklad };
  return { level, system: v.system as number, object, zoom: clamp(v.zoom, VIEW_RULES.min, VIEW_RULES.max) };
}
