// Ekran stacji w 2D (etap 1 planu stacji): stacja macierzysta pikselowo, z tych samych punktów co wygląd 3D
// (`stationScreenLayout.ts`). Każda część to garść „pikseli” (kwadratów wyrównanych do siatki) w przestrzeni stacji;
// po obrocie i rzucie rysowane od najdalszych (malarz) — tył pierścienia przyciemniony.
import { socketAngle, type StationModuleView, type StationScreenModel } from '../core/station/stationScreen.ts';
import { rotateStation, STATION_SCREEN as S, type Vec3 } from './stationScreenLayout.ts';

interface Dot {
  p: Vec3;
  /** Rozmiar w ułamkach promienia stacji. */
  size: number;
  color: string;
}

const DIM = 'rgba(4, 10, 12, 0.42)';

/** Punkty stacji w jej układzie (bez obrotu); przeliczane tylko przy zmianie modułów. */
export function stationDots(model: StationScreenModel): Dot[] {
  const dots: Dot[] = [];
  const add = (p: Vec3, size: number, color: string) => dots.push({ p, size, color });
  // Pierścień (w budowie — część łuku) z turkusowymi światłami co 30°.
  const arc = model.ready ? 1 : 0.6;
  const steps = 96;
  for (let i = 0; i < steps * arc; i++) {
    const a = (i / steps) * Math.PI * 2;
    const p: Vec3 = [Math.cos(a) * S.ring, 0, -Math.sin(a) * S.ring];
    add(p, S.tube * 2, i % 8 === 4 ? S.light : S.steel);
  }
  // Szprychy.
  for (let i = 0; i < 6; i++) {
    const a = socketAngle(i);
    for (let k = 1; k < 9; k++) {
      const d = S.hub + ((S.ring - S.hub) * k) / 9;
      add([Math.cos(a) * d, 0, -Math.sin(a) * d], 0.03, S.stone);
    }
  }
  // Maszt i skrzydła paneli (złote) na obu końcach.
  for (let k = -12; k <= 12; k++) add([0, (k / 12) * S.mast, 0], 0.035, S.steel);
  const wings = model.ready ? [1, -1] : [1];
  for (const top of [1, -1]) {
    for (const side of wings) {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) add([side * (0.08 + i * 0.075), top * S.mast * 0.92, (j - 1) * 0.06], 0.07, i % 2 ? S.gold : '#b8963f');
    }
  }
  // Rdzeń: graniastosłup z pasem światła.
  for (let h = -3; h <= 3; h++) {
    const y = (h / 3) * (S.hubHeight / 2);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add([Math.cos(a) * S.hub, y, -Math.sin(a) * S.hub], 0.07, h === 0 ? S.light : S.stone);
    }
  }
  for (const m of model.modules) if (m.socket !== null) moduleDots(m, add);
  return dots;
}

/** Punkty modułu w gnieździe: lokalnie x — na zewnątrz pierścienia, y — w górę, z — w bok. */
function moduleDots(m: StationModuleView, add: (p: Vec3, size: number, color: string) => void): void {
  const a = socketAngle(m.socket!);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const put = (x: number, y: number, z: number, size: number, color: string) =>
    add([ca * (S.moduleOut + x) + sa * z, y, -sa * (S.moduleOut + x) + ca * z], size, color);
  // Płyta gniazda.
  for (let i = -1; i <= 1; i++) for (let j = -2; j <= 2; j++) put(i * 0.035, -0.02, j * 0.035, 0.045, '#1d2726');
  const frame = (w: number, h: number, d: number, color: string) => {
    for (let i = 0; i <= 4; i++) {
      const t = i / 4 - 0.5;
      for (const [sy, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) put(t * w, (sy * h) / 2 + h / 2, (sz * d) / 2, 0.025, color);
      for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) put((sx * w) / 2, t * h + h / 2, (sz * d) / 2, 0.025, color);
    }
  };
  if (m.state === 'soon') return frame(0.16, 0.12, 0.18, 'rgba(95, 242, 224, 0.35)');
  if (m.level === 0 && m.state === 'building') return frame(0.16, 0.14, 0.18, S.gold);
  if (m.level === 0) return put(0, 0.04, 0, 0.05, S.light);
  if (m.id === 'storage') {
    const count = Math.min(8, 1 + Math.ceil(m.level * 0.7));
    for (let i = 0; i < count; i++) {
      const x = 0.02 + (i % 2) * 0.065;
      const z = -0.04 + (Math.floor(i / 2) % 2) * 0.08;
      const y = 0.04 + Math.floor(i / 4) * 0.05;
      put(x, y, z, 0.06, i % 3 === 0 ? '#a08c62' : S.container);
    }
  } else if (m.id === 'shipyard') {
    frame(0.2, 0.1, 0.12, S.gold);
    for (let k = 0; k < 5; k++) put(0.0 + k * 0.03, 0.05, 0, 0.045 - k * 0.006, '#d8dcd6');
  } else put(0, 0.05, 0, 0.1, S.stone);
  if (m.state === 'building') frame(0.2, 0.16, 0.2, S.gold);
}

/**
 * Rysuje stację na płótnie: środek (cx, cy), promień `r` px, obrót palcem. Kwadraty wyrównane do siatki pikseli
 * (`pixel` px); tył (oddalone punkty) przyciemniony.
 */
export function drawStationDots(
  ctx: CanvasRenderingContext2D,
  dots: readonly Dot[],
  yaw: number,
  pitch: number,
  cx: number,
  cy: number,
  r: number,
): void {
  const pixel = Math.max(2, Math.round(r / 90));
  const projected = dots.map((d) => {
    const q = rotateStation(d.p, yaw, pitch);
    return { x: cx + q[0] * r, y: cy - q[1] * r, z: q[2], size: d.size, color: d.color };
  });
  projected.sort((a, b) => a.z - b.z);
  for (const d of projected) {
    const s = Math.max(pixel, Math.round((d.size * r * (1 + d.z * 0.12)) / pixel) * pixel);
    const x = Math.round((d.x - s / 2) / pixel) * pixel;
    const y = Math.round((d.y - s / 2) / pixel) * pixel;
    ctx.fillStyle = d.color;
    ctx.fillRect(x, y, s, s);
    if (d.z < -0.15) {
      ctx.fillStyle = DIM;
      ctx.fillRect(x, y, s, s);
    }
  }
}
