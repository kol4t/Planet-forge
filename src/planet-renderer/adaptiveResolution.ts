// Automatyczna rozdzielczość widoku 3D: gdy klatki się wydłużają (słabsza karta graficzna, duży
// monitor), renderer liczy mniej pikseli; gdy jest zapas — wraca do pełnej ostrości. Bez DOM — testowalne.

/** Okno pomiaru (klatki). */
const WINDOW = 45;
/** Średnia klatka dłuższa niż tyle ms (< ~45 kl./s) → mniej pikseli. */
const SLOW_MS = 22;
/** Średnia klatka krótsza niż tyle ms przez kilka okien z rzędu → więcej pikseli. */
const FAST_MS = 15;
const FAST_WINDOWS = 4;
export const MIN_RENDER_SCALE = 0.6;

export class AdaptiveResolution {
  /** Mnożnik gęstości pikseli 0,6–1. */
  scale = 1;
  private sum = 0;
  private frames = 0;
  private fastStreak = 0;

  /**
   * Czas klatki w ms; zwraca true, gdy skala się zmieniła (renderer ustawia nowy rozmiar bufora).
   * Pojedyncze długie przerwy (karta w tle, przeliczenie planety) są pomijane.
   */
  sample(frameMs: number): boolean {
    if (!(frameMs > 0) || frameMs > 200) return false;
    this.sum += frameMs;
    this.frames++;
    if (this.frames < WINDOW) return false;
    const average = this.sum / this.frames;
    this.sum = 0;
    this.frames = 0;
    if (average > SLOW_MS && this.scale > MIN_RENDER_SCALE) {
      this.scale = Math.max(MIN_RENDER_SCALE, Math.round(this.scale * 0.85 * 100) / 100);
      this.fastStreak = 0;
      return true;
    }
    if (average < FAST_MS && this.scale < 1) {
      if (++this.fastStreak >= FAST_WINDOWS) {
        this.scale = Math.min(1, Math.round(this.scale * 1.1 * 100) / 100);
        this.fastStreak = 0;
        return true;
      }
      return false;
    }
    this.fastStreak = 0;
    return false;
  }
}
