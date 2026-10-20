// Bezpiecznik startu: zapisuje kolejne kroki uruchamiania w localStorage. Jeśli poprzednie
// uruchomienie nie dotrwało do stabilnej pracy (np. iPad zamknął aplikację z braku pamięci
// grafiki), następne startuje w trybie bezpiecznym (widok 2D), a ślad trafia do diagnostyki.

export type GraphicsMode = 'auto' | '2d';

export interface BootRun {
  startedAt: number;
  steps: string[];
}

interface BootRecord {
  /** Bieżące (albo ostatnie) uruchomienie. */
  run: BootRun | null;
  /** Czy `run` dotarło do stabilnej pracy. */
  ok: boolean;
  /** Ślad ostatniego nieudanego uruchomienia. */
  lastCrash: BootRun | null;
  /** Wybór gracza w ustawieniach. */
  graphics: GraphicsMode;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const BOOT_KEY = 'planet-forge.boot.v1';

export interface BootState {
  /** Start w widoku 2D (wybór gracza albo awaria poprzedniego uruchomienia). */
  safeMode: boolean;
  /** Poprzednie uruchomienie się nie powiodło. */
  crashedLastTime: boolean;
  graphics: GraphicsMode;
}

export class BootGuard {
  private record: BootRecord;
  private readonly storage: StorageLike | null;
  readonly crashedLastTime: boolean;

  constructor(storage: StorageLike | null, now: number) {
    this.storage = storage;
    const previous = this.read();
    const crashed = previous.run !== null && !previous.ok;
    this.record = {
      run: { startedAt: now, steps: ['start'] },
      ok: false,
      lastCrash: crashed ? previous.run : previous.lastCrash,
      graphics: previous.graphics,
    };
    this.crashedLastTime = crashed;
    this.write();
  }

  get state(): BootState {
    return {
      safeMode: this.record.graphics === '2d' || this.crashedLastTime,
      crashedLastTime: this.crashedLastTime,
      graphics: this.record.graphics,
    };
  }

  /** Kolejny krok startu (zapisywany od razu — przetrwa nagłe zamknięcie). */
  step(name: string): void {
    const run = this.record.run;
    if (!run || this.record.ok) return;
    run.steps.push(name);
    this.write();
  }

  /** Gra działa stabilnie — to uruchomienie nie jest awarią. */
  markStable(): void {
    if (this.record.ok) return;
    this.record.run?.steps.push('stabilnie');
    this.record.ok = true;
    this.write();
  }

  setGraphics(mode: GraphicsMode): void {
    this.record.graphics = mode;
    // Świadomy wybór „3D” po awarii: kolejny start bez trybu awaryjnego.
    this.record.ok = true;
    this.write();
  }

  /** Tekst diagnostyki do skopiowania (bez danych osobowych). */
  diagnostics(env: Record<string, string>): string {
    const fmt = (run: BootRun | null) =>
      run ? `${new Date(run.startedAt).toISOString()} → ${run.steps.join(' → ')}` : 'brak';
    return [
      'Planet Forge — diagnostyka',
      ...Object.entries(env).map(([k, v]) => `${k}: ${v}`),
      `grafika: ${this.record.graphics}${this.crashedLastTime ? ' (tryb bezpieczny po awarii)' : ''}`,
      `to uruchomienie: ${fmt(this.record.run)}`,
      `ostatnia awaria: ${fmt(this.record.lastCrash)}`,
    ].join('\n');
  }

  private read(): BootRecord {
    const empty: BootRecord = { run: null, ok: true, lastCrash: null, graphics: 'auto' };
    try {
      const raw = this.storage?.getItem(BOOT_KEY);
      if (!raw) return empty;
      const data = JSON.parse(raw) as Partial<BootRecord>;
      const isRun = (r: unknown): r is BootRun =>
        !!r && typeof (r as BootRun).startedAt === 'number' && Array.isArray((r as BootRun).steps);
      return {
        run: isRun(data.run) ? data.run : null,
        ok: data.ok !== false,
        lastCrash: isRun(data.lastCrash) ? data.lastCrash : null,
        graphics: data.graphics === '2d' ? '2d' : 'auto',
      };
    } catch {
      return empty;
    }
  }

  private write(): void {
    try {
      this.storage?.setItem(BOOT_KEY, JSON.stringify(this.record));
    } catch {
      // brak pamięci (tryb prywatny) — bezpiecznik po prostu nie działa
    }
  }
}
