// Płynne przybliżanie: gest ustawia cel, widok dochodzi do niego łagodnie (bez skoków przy przyciskach
// i kółku myszy). Bez DOM — testowalne.

export const MIN_ZOOM = 0.8;
export const MAX_ZOOM = 3.5;

/** Po tylu sekundach zostaje ~5% drogi do celu. */
const SETTLE_SECONDS = 0.25;

export class ZoomSmoother {
  value = 1;
  target = 1;

  /** Cel przybliżenia (w zakresie 0,8–3,5). `instant` — bez animacji (np. „Ogranicz ruch”). */
  set(zoom: number, instant = false): void {
    this.target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    if (instant) this.value = this.target;
  }

  /** Krok animacji; zwraca true, gdy wartość się zmieniła. */
  update(dtSeconds: number): boolean {
    if (this.value === this.target) return false;
    const k = 1 - Math.exp((-3 * Math.min(dtSeconds, 0.1)) / SETTLE_SECONDS);
    this.value += (this.target - this.value) * k;
    if (Math.abs(this.target - this.value) < 0.002) this.value = this.target;
    return true;
  }
}
