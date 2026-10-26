// Mapa galaktyki (v0.34.1): kamera „Mój układ” i strzałka do układu poza widokiem — czysta matematyka.

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Punkt na krawędzi prostokąta (od jego środka w stronę celu) i kierunek do celu (rad),
 * albo null, gdy cel jest wewnątrz — wtedy strzałka nie jest potrzebna.
 */
export function edgePointer(box: Box, target: { x: number; y: number }): { x: number; y: number; angle: number } | null {
  if (target.x >= box.left && target.x <= box.right && target.y >= box.top && target.y <= box.bottom) return null;
  const mx = (box.left + box.right) / 2;
  const my = (box.top + box.bottom) / 2;
  const dx = target.x - mx;
  const dy = target.y - my;
  const kx = dx !== 0 ? (box.right - mx) / Math.abs(dx) : Infinity;
  const ky = dy !== 0 ? (box.bottom - my) / Math.abs(dy) : Infinity;
  const k = Math.min(kx, ky);
  return { x: mx + dx * k, y: my + dy * k, angle: Math.atan2(dy, dx) };
}

/** Przesunięcie mapy, które stawia punkt (jednostki mapy) w środku widoku przy danej skali. */
export function centerOn(point: { x: number; y: number }, scale: number): { x: number; y: number } {
  return { x: -point.x * scale, y: -point.y * scale };
}
