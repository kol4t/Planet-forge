import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { layoutColony, visibleStructures, type ColonyLayout } from './colony.ts';
import { DragRotator } from './input/dragRotator.ts';
import { facingAngles, STRUCTURE_COLORS, type BuildSite, type PlanetDisplay } from './PlanetDisplay.ts';
import { createSurfaceSampler, hexToRgb, type RGB, type SurfaceSampler } from './surface.ts';

// Awaryjny widok 2D (gdy brak WebGL): ta sama planeta z tego samego seeda,
// rysowana piksel po pikselu do małego bufora i skalowana.

const BUFFER = 180;
const BUILDING_IDS: readonly BuildingId[] = BALANCE.buildings.map((b) => b.id);
const LIGHT = normalize([-0.6, 0.45, 0.65]);

export class CanvasPlanetFallback implements PlanetDisplay {
  readonly kind = 'canvas2d' as const;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buffer = document.createElement('canvas');
  private readonly bctx: CanvasRenderingContext2D;
  private readonly rotator = new DragRotator();
  private sampler: SurfaceSampler | undefined;
  private colony: ColonyLayout | undefined;
  private levels: BuildingLevels | undefined;
  private site: BuildSite | null = null;
  private sea = 0.5;
  private atmosphere: RGB = [0.5, 0.8, 0.8];
  private w = 1;
  private h = 1;
  private focus = { cx: 0, cy: 0, r: 100 };
  private raf = 0;
  private last = performance.now();
  private lastDrawn = { yaw: NaN, pitch: NaN };
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.buffer.width = this.buffer.height = BUFFER;
    this.bctx = this.buffer.getContext('2d')!;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  setPlanet(planet: Planet): void {
    this.sampler = createSurfaceSampler(planet);
    this.colony = layoutColony(planet, this.sampler, BUILDING_IDS);
    this.sea = planet.visual.seaLevel;
    this.atmosphere = hexToRgb(planet.visual.atmosphereColor);
    this.lastDrawn = { yaw: NaN, pitch: NaN };
  }

  setStructures(levels: BuildingLevels, site: BuildSite | null = null): void {
    this.levels = { ...levels };
    this.site = site;
  }

  showBuilding(id: BuildingId): void {
    const slots = this.colony?.slots[id];
    if (!slots?.length) return;
    const level = this.site?.building === id ? this.site.targetLevel : (this.levels?.[id] ?? 1);
    const index = Math.max(0, Math.min(visibleStructures(level), slots.length) - 1);
    const { yaw, pitch } = facingAngles(slots[index]!.dir, 0);
    this.rotator.turnTo(yaw, pitch, performance.now());
  }

  beginDrag(): void {
    this.rotator.start(performance.now());
  }

  drag(dx: number, dy: number): void {
    this.rotator.move(dx, dy, performance.now());
  }

  endDrag(): void {
    this.rotator.end(performance.now());
  }

  setFocus(cx: number, cy: number, r: number): void {
    this.focus = { cx, cy, r };
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = width;
    this.h = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private renderDisc(): void {
    if (!this.sampler) return;
    const image = this.bctx.createImageData(BUFFER, BUFFER);
    const { yaw, pitch } = this.rotator;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    for (let row = 0; row < BUFFER; row++) {
      for (let col = 0; col < BUFFER; col++) {
        const sx = (col / (BUFFER - 1)) * 2 - 1;
        const syy = -((row / (BUFFER - 1)) * 2 - 1);
        const d2 = sx * sx + syy * syy;
        if (d2 > 1) continue;
        const sz = Math.sqrt(1 - d2);
        // Ekran → współrzędne planety (odwrotność pochylenia i obrotu).
        const py = syy * cp + sz * sp;
        const hz = -syy * sp + sz * cp;
        const px = sx * cy - hz * sy;
        const pz = sx * sy + hz * cy;
        const height = this.sampler.height(px, py, pz);
        const color = this.sampler.color(height, py);
        const light = Math.max(0, sx * LIGHT[0] + syy * LIGHT[1] + sz * LIGHT[2]);
        const shade = 0.18 + 0.95 * light + (height < this.sea ? 0.25 * light ** 24 : 0);
        const haze = (1 - sz) ** 3 * 0.45 * (0.3 + 0.7 * light);
        const i = (row * BUFFER + col) * 4;
        image.data[i] = 255 * Math.min(1, color[0] * shade + this.atmosphere[0] * haze);
        image.data[i + 1] = 255 * Math.min(1, color[1] * shade + this.atmosphere[1] * haze);
        image.data[i + 2] = 255 * Math.min(1, color[2] * shade + this.atmosphere[2] * haze);
        image.data[i + 3] = 255;
      }
    }
    this.bctx.putImageData(image, 0, 0);
    this.lastDrawn = { yaw, pitch };
  }

  /**
   * Budowle jako kwadratowe „piksele” wyrównane do siatki pikseli planety (styl pixel-art).
   * Plac budowy: złota ramka, którą wypełnia postęp od dołu.
   */
  private drawStructures(): void {
    if (!this.colony || !this.levels) return;
    const { cx, cy: centerY, r } = this.focus;
    const { yaw, pitch } = this.rotator;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const ctx = this.ctx;
    // Rozmiar jednego piksela planety na ekranie i przyciąganie do jego siatki.
    const pixel = (2 * r) / BUFFER;
    const left = cx - r;
    const top = centerY - r;
    const snapX = (x: number) => left + Math.floor((x - left) / pixel) * pixel;
    const snapY = (y: number) => top + Math.floor((y - top) / pixel) * pixel;
    const cell = pixel * 2; // budowla = 2 × 2 piksele planety
    const toScreen = ([px, py, pz]: readonly [number, number, number]) => {
      // Planeta → ekran (obrót, potem pochylenie).
      const sx = px * cy + pz * sy;
      const hz = -px * sy + pz * cy;
      return { x: cx + sx * r, y: centerY - (py * cp - hz * sp) * r, depth: py * sp + hz * cp };
    };
    for (const id of BUILDING_IDS) {
      const slots = this.colony.slots[id] ?? [];
      const count = Math.min(visibleStructures(this.levels[id] ?? 0), slots.length);
      ctx.fillStyle = STRUCTURE_COLORS[id].light;
      for (let i = 0; i < count; i++) {
        const p = toScreen(slots[i]!.dir);
        if (p.depth < 0.08) continue;
        ctx.globalAlpha = Math.min(1, p.depth * 2.5);
        ctx.fillRect(snapX(p.x - pixel / 2), snapY(p.y - pixel / 2), cell, cell);
      }
    }
    const site = this.site;
    const siteSlots = site && this.colony.slots[site.building];
    if (site && siteSlots?.length) {
      const index = Math.max(0, Math.min(visibleStructures(site.targetLevel), siteSlots.length) - 1);
      const p = toScreen(siteSlots[index]!.dir);
      if (p.depth >= 0.08) {
        const size = pixel * 4;
        const x = snapX(p.x - size / 2);
        const y = snapY(p.y - size / 2);
        const filled = Math.round(Math.max(0.05, site.progress) * 4) * pixel;
        ctx.globalAlpha = 0.65 + 0.35 * Math.sin(performance.now() / 250);
        ctx.strokeStyle = '#e6c77a';
        ctx.lineWidth = Math.max(1, pixel * 0.5);
        ctx.strokeRect(x, y, size, size);
        ctx.fillStyle = '#e6c77a';
        ctx.fillRect(x, y + size - filled, size, filled);
      }
    }
    ctx.globalAlpha = 1;
  }

  private loop(time: number): void {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = (time - this.last) / 1000;
    this.last = time;
    this.rotator.update(dt, time);
    if (
      Number.isNaN(this.lastDrawn.yaw) ||
      Math.abs(this.rotator.yaw - this.lastDrawn.yaw) > 0.01 ||
      Math.abs(this.rotator.pitch - this.lastDrawn.pitch) > 0.01
    ) {
      this.renderDisc();
    }
    const { cx, cy, r } = this.focus;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    // Miękka poświata zanikająca do zera (bez wyraźnego pierścienia).
    const [ar, ag, ab] = this.atmosphere.map((c) => Math.round(c * 255));
    const glow = ctx.createRadialGradient(cx, cy, r * 0.98, cx, cy, r * 1.1);
    glow.addColorStop(0, `rgba(${ar},${ag},${ab},0.28)`);
    glow.addColorStop(0.4, `rgba(${ar},${ag},${ab},0.1)`);
    glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buffer, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    this.drawStructures();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
  }
}

function normalize(v: RGB): RGB {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}
