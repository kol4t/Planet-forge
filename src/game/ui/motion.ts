// Mikroanimacje interfejsu (od v0.29): krótkie, spokojne, wyłączane przez „Ogranicz ruch” w systemie.

/** „Ogranicz ruch” w ustawieniach systemu (iPad: Dostępność → Ruch). */
export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Licznik dochodzi płynnie do celu (wykładniczo, stała czasu `tauMs`); różnica poniżej pół jednostki
 * — od razu cel. Bez miniętego czasu albo bez poprzedniej wartości — też od razu cel.
 */
export function approach(shown: number | undefined, target: number, deltaMs: number, tauMs = 120): number {
  if (shown === undefined || !Number.isFinite(shown) || deltaMs <= 0) return target;
  const diff = target - shown;
  if (Math.abs(diff) < 0.5) return target;
  return shown + diff * (1 - Math.exp(-deltaMs / tauMs));
}

/** Czas wysuwania panelu (ms) i przesunięcie startowe (pt). */
export const PANEL_IN_MS = 180;
export const PANEL_IN_OFFSET = 18;
/** Błysk karty po rozpoczęciu budowy (ms). */
export const BUILD_FLASH_MS = 650;
