// Gesty na planecie: jeden palec = obrót, dwa palce = przybliżanie (szczypanie).
// Czysta logika bez Phasera — scena tylko przekazuje zdarzenia i wykonuje wynik.

export type GestureEvent =
  | { type: 'drag-start' }
  | { type: 'drag'; dx: number; dy: number }
  | { type: 'drag-end' }
  | { type: 'zoom'; zoom: number };

export class GestureTracker {
  zoom = 1;
  private readonly min: number;
  private readonly max: number;
  private readonly points = new Map<number, { x: number; y: number }>();
  private dragId: number | null = null;
  private pinch: { startDistance: number; startZoom: number } | null = null;

  constructor(min = 1, max = 3.5) {
    this.min = min;
    this.max = max;
  }

  /** Palec dotknął planety (poza panelami). */
  down(id: number, x: number, y: number): GestureEvent[] {
    if (this.points.size >= 2) return [];
    this.points.set(id, { x, y });
    if (this.points.size === 1) {
      this.dragId = id;
      return [{ type: 'drag-start' }];
    }
    // Drugi palec: obrót się kończy, zaczyna się szczypanie.
    const events: GestureEvent[] = this.dragId !== null ? [{ type: 'drag-end' }] : [];
    this.dragId = null;
    this.pinch = { startDistance: Math.max(1, this.distance()), startZoom: this.zoom };
    return events;
  }

  move(id: number, x: number, y: number): GestureEvent[] {
    const point = this.points.get(id);
    if (!point) return [];
    const dx = x - point.x;
    const dy = y - point.y;
    point.x = x;
    point.y = y;
    if (this.pinch && this.points.size >= 2) {
      const zoom = Math.min(this.max, Math.max(this.min, (this.pinch.startZoom * this.distance()) / this.pinch.startDistance));
      if (zoom === this.zoom) return [];
      this.zoom = zoom;
      return [{ type: 'zoom', zoom }];
    }
    return id === this.dragId ? [{ type: 'drag', dx, dy }] : [];
  }

  /** Palec podniesiony (albo wyszedł poza grę). */
  up(id: number): GestureEvent[] {
    if (!this.points.delete(id)) return [];
    if (this.points.size < 2) this.pinch = null;
    if (id === this.dragId) {
      this.dragId = null;
      return [{ type: 'drag-end' }];
    }
    // Po szczypaniu pozostały palec nic nie robi, dopóki go nie podniesiesz.
    return [];
  }

  /** Kółko myszy / gest na gładziku (komputer): w górę przybliża, w dół oddala. */
  wheel(deltaY: number): GestureEvent[] {
    const zoom = Math.min(this.max, Math.max(this.min, this.zoom * Math.exp(-deltaY * 0.0015)));
    if (zoom === this.zoom) return [];
    this.zoom = zoom;
    return [{ type: 'zoom', zoom }];
  }

  /** Wszystkie palce znikły (np. przełączenie aplikacji). */
  cancel(): GestureEvent[] {
    const wasDragging = this.dragId !== null;
    this.points.clear();
    this.dragId = null;
    this.pinch = null;
    return wasDragging ? [{ type: 'drag-end' }] : [];
  }

  private distance(): number {
    const [a, b] = [...this.points.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
}
