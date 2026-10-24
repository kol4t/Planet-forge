// Obrót planety palcem z bezwładnością i powolnym autoobrotem. Bez DOM — testowalne.
// Pochylenie (pitch) nie ma ograniczenia: planetę można przekręcić przez biegun w każdą stronę.
// Wartość rośnie w sposób ciągły (bez skoku przy ±π), a autoobrót wraca do najbliższego „pionu”.

export interface RotatorOptions {
  radiansPerPixel: number;
  /** Ułamek prędkości pozostający po 1 s. */
  damping: number;
  idleSpin: number;
  idleResumeMs: number;
}

const DEFAULTS: RotatorOptions = {
  radiansPerPixel: 0.006,
  damping: 0.04,
  idleSpin: 0.06,
  idleResumeMs: 2500,
};

const MAX_FLING = 6;
const TWO_PI = Math.PI * 2;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Kąt równoważny `angle` (co do pełnego obrotu) najbliższy `reference`. */
const nearestTurn = (angle: number, reference: number) => angle + Math.round((reference - angle) / TWO_PI) * TWO_PI;

export class DragRotator {
  yaw = 0;
  pitch = 0;
  velYaw = 0;
  velPitch = 0;
  private dragging = false;
  private lastMoveAt = 0;
  private releasedAt = -Infinity;
  private target: { yaw: number; pitch: number } | null = null;
  private readonly opts: RotatorOptions;

  constructor(opts: Partial<RotatorOptions> = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  start(now: number): void {
    this.dragging = true;
    this.target = null;
    this.velYaw = 0;
    this.velPitch = 0;
    this.lastMoveAt = now;
  }

  move(dx: number, dy: number, now: number): void {
    if (!this.dragging) return;
    // Planeta „do góry nogami” (za biegunem): ruch w bok obraca ją w przeciwną stronę wokół osi,
    // więc odwracamy go — powierzchnia dalej przesuwa się tak, jak palec.
    const flip = Math.cos(this.pitch) < 0 ? -1 : 1;
    const dYaw = dx * this.opts.radiansPerPixel * flip;
    const dPitch = dy * this.opts.radiansPerPixel;
    this.yaw += dYaw;
    this.pitch += dPitch;
    const dt = Math.max(1, now - this.lastMoveAt) / 1000;
    this.velYaw = 0.7 * this.velYaw + 0.3 * (dYaw / dt);
    this.velPitch = 0.7 * this.velPitch + 0.3 * (dPitch / dt);
    this.lastMoveAt = now;
  }

  end(now: number): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.releasedAt = now;
    // Palec zatrzymany przed puszczeniem = brak rzutu.
    if (now - this.lastMoveAt > 120) {
      this.velYaw = 0;
      this.velPitch = 0;
    }
    this.velYaw = clamp(this.velYaw, -MAX_FLING, MAX_FLING);
    this.velPitch = clamp(this.velPitch, -MAX_FLING, MAX_FLING);
  }

  /** Płynny obrót do podanej orientacji (np. pokazanie nowego budynku). Dotyk przerywa. */
  turnTo(yaw: number, pitch: number, now: number): void {
    if (this.dragging) return;
    this.target = { yaw: nearestTurn(yaw, this.yaw), pitch: nearestTurn(pitch, this.pitch) };
    this.velYaw = 0;
    this.velPitch = 0;
    this.releasedAt = now;
  }

  update(dtSeconds: number, now: number): void {
    if (this.dragging) return;
    const dt = Math.min(dtSeconds, 0.1);
    if (this.target) {
      const k = 1 - Math.exp(-dt * 3.2);
      this.yaw += (this.target.yaw - this.yaw) * k;
      this.pitch += (this.target.pitch - this.pitch) * k;
      this.releasedAt = now;
      if (Math.abs(this.target.yaw - this.yaw) < 0.002 && Math.abs(this.target.pitch - this.pitch) < 0.002) {
        this.target = null;
      }
      return;
    }
    const decay = this.opts.damping ** dt;
    this.velYaw *= decay;
    this.velPitch *= decay;
    this.yaw += this.velYaw * dt;
    this.pitch += this.velPitch * dt;
    const idle = now - this.releasedAt - this.opts.idleResumeMs;
    if (idle > 0) {
      // Autoobrót wraca łagodnie (rozpędza się przez ok. 2 s), bez szarpnięcia po puszczeniu palca.
      const ramp = Math.min(1, idle / 2000);
      const ease = ramp * ramp * (3 - 2 * ramp);
      this.yaw += this.opts.idleSpin * ease * dt;
      // Powolny powrót do pionu (biegun u góry) — do najbliższego pełnego obrotu, bez cofania kręcenia.
      const upright = nearestTurn(0, this.pitch);
      this.pitch = upright + (this.pitch - upright) * 0.995 ** (dt * 60 * ease);
    }
  }
}
