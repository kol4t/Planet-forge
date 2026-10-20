// Licznik płynności: klatki na sekundę z ostatniej minuty (do diagnostyki).
// Przerwy dłuższe niż 1 s (karta schowana, aplikacja w tle) nie psują wyniku.

export interface FpsSummary {
  /** Średnia z ostatnich pełnych sekund. */
  average: number;
  /** Najsłabsza pełna sekunda (szarpnięcia). */
  worst: number;
  /** Ile sekund zmierzono (maks. 60). */
  seconds: number;
}

const WINDOW_SECONDS = 60;

export class FpsMeter {
  private readonly samples: number[] = [];
  private bucketStart = -1;
  private frames = 0;
  private last = -1;

  /** Wywołuj w każdej klatce (np. z requestAnimationFrame) z czasem w ms. */
  frame(time: number): void {
    if (this.last < 0 || time - this.last > 1000) {
      // Pierwsza klatka albo powrót z tła — zaczynamy nową sekundę bez zapisu.
      this.bucketStart = time;
      this.frames = 0;
    } else {
      this.frames++;
      const elapsed = time - this.bucketStart;
      if (elapsed >= 1000) {
        this.samples.push((this.frames * 1000) / elapsed);
        if (this.samples.length > WINDOW_SECONDS) this.samples.shift();
        this.bucketStart = time;
        this.frames = 0;
      }
    }
    this.last = time;
  }

  summary(): FpsSummary | null {
    if (this.samples.length === 0) return null;
    const average = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    return { average, worst: Math.min(...this.samples), seconds: this.samples.length };
  }

  /** Tekst do diagnostyki, np. „średnio 58 kl./s, najsłabsza sekunda 44 kl./s (60 s)”. */
  describe(): string {
    const s = this.summary();
    if (!s) return 'za mało danych (pograj chwilę)';
    return `średnio ${Math.round(s.average)} kl./s, najsłabsza sekunda ${Math.round(s.worst)} kl./s (pomiar ${s.seconds} s)`;
  }
}
