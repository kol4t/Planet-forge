import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { layoutColony, visibleStructures, type ColonyLayout } from './colony.ts';
import { DragRotator } from './input/dragRotator.ts';
import { levelsWithSite, pickStructure } from './pick.ts';
import { facingAngles, STRUCTURE_COLORS, type BuildSite, type PlanetDisplay } from './PlanetDisplay.ts';
import { discLook, renderDisc, type DiscLook } from './discRenderer.ts';
import type { RGB, SurfaceSampler } from './surface.ts';

// Widok 2D (domyślny od v0.7): ta sama planeta z tego samego seeda, rysowana piksel
// po pikselu do małego bufora i skalowana — pikselowy styl gry.

/** Rozdzielczość tarczy (piksele planety na średnicę) bez przybliżenia. */
const BUFFER = 180;
/** Przy przybliżeniu rozdzielczość rośnie maks. do BUFFER × 1,6 (koszt rysowania ~2,6×). */
const MAX_BUFFER_SCALE = 1.6;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3.5;
const BUILDING_IDS: readonly BuildingId[] = BALANCE.buildings.map((b) => b.id);

export class CanvasPlanetFallback implements PlanetDisplay {
  readonly kind = 'canvas2d' as const;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buffer = document.createElement('canvas');
  private readonly bctx: CanvasRenderingContext2D;
  private readonly rotator = new DragRotator(prefersReducedMotion() ? { idleSpin: 0 } : {});
  private sampler: SurfaceSampler | undefined;
  private colony: ColonyLayout | undefined;
  private levels: BuildingLevels | undefined;
  private site: BuildSite | null = null;
  private look: DiscLook | undefined;
  private atmosphere: RGB = [0.5, 0.8, 0.8];
  private w = 1;
  private h = 1;
  private focus = { cx: 0, cy: 0, r: 100 };
  private raf = 0;
  private last = performance.now();
  private lastDrawn = { yaw: NaN, pitch: NaN };
  private disposed = false;
  private zoom = 1;
  /** Bieżąca rozdzielczość bufora (rośnie z przybliżeniem). */
  private size = BUFFER;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.buffer.width = this.buffer.height = BUFFER;
    this.bctx = this.buffer.getContext('2d')!;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  setPlanet(planet: Planet): void {
    this.look = discLook(planet);
    this.sampler = this.look.sampler;
    this.colony = layoutColony(planet, this.sampler, BUILDING_IDS);
    this.atmosphere = this.look.atmosphere;
    this.lastDrawn = { yaw: NaN, pitch: NaN };
  }

  setStructures(levels: BuildingLevels, site: BuildSite | null = null): void {
    this.levels = { ...levels };
    this.site = site;
  }

  pickStructure(x: number, y: number): BuildingId | null {
    if (!this.colony || !this.levels) return null;
    const { yaw, pitch } = this.rotator;
    const view = { cx: this.focus.cx, cy: this.focus.cy, yaw, pitch, tilt: 0, projection: { kind: 'ortho' as const, r: this.focus.r * this.zoom } };
    return pickStructure(this.colony, levelsWithSite(this.levels, this.site), view, x, y);
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
    // Przy przybliżeniu ten sam ruch palca obraca planetę wolniej (teren „pod palcem”).
    this.rotator.move(dx / this.zoom, dy / this.zoom, performance.now());
  }

  setZoom(zoom: number): void {
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const size = Math.round(BUFFER * Math.min(this.zoom, MAX_BUFFER_SCALE));
    if (size !== this.size) {
      this.size = size;
      this.buffer.width = this.buffer.height = size;
      this.lastDrawn = { yaw: NaN, pitch: NaN };
    }
  }

  orientation(): { yaw: number; pitch: number } {
    return { yaw: this.rotator.yaw, pitch: this.rotator.pitch };
  }

  setOrientation(yaw: number, pitch: number): void {
    this.rotator.setOrientation(yaw, pitch, performance.now());
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
    if (!this.look) return;
    const image = this.bctx.createImageData(this.size, this.size);
    const { yaw, pitch } = this.rotator;
    renderDisc(image.data, this.size, this.look, yaw, pitch);
    this.bctx.putImageData(image, 0, 0);
    this.lastDrawn = { yaw, pitch };
  }

  /**
   * Budowle jako kwadratowe „piksele” wyrównane do siatki pikseli planety (styl pixel-art).
   * Plac budowy: złota ramka, którą wypełnia postęp od dołu.
   */
  private drawStructures(): void {
    if (!this.colony || !this.levels) return;
    const { cx, cy: centerY } = this.focus;
    const r = this.focus.r * this.zoom;
    const { yaw, pitch } = this.rotator;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const ctx = this.ctx;
    // Rozmiar jednego piksela planety na ekranie i przyciąganie do jego siatki.
    const pixel = (2 * r) / this.size;
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
    const { cx, cy } = this.focus;
    const r = this.focus.r * this.zoom;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    // Cienka poświata atmosfery, przesunięta ku stronie dziennej (światło z lewej-góry).
    const [ar, ag, ab] = this.atmosphere.map((c) => Math.round(c * 255));
    const gx = cx - r * 0.035;
    const gy = cy - r * 0.025;
    const glow = ctx.createRadialGradient(gx, gy, r * 0.97, gx, gy, r * 1.07);
    glow.addColorStop(0, `rgba(${ar},${ag},${ab},0.32)`);
    glow.addColorStop(0.35, `rgba(${ar},${ag},${ab},0.12)`);
    glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(gx, gy, r * 1.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    // Bez przybliżenia lekko wygładzone (dotychczasowy wygląd); przybliżone — ostre piksele.
    ctx.imageSmoothingEnabled = this.zoom < 1.25;
    ctx.drawImage(this.buffer, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    this.drawStructures();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
  }
}

/** „Ogranicz ruch” w ustawieniach systemu: planeta nie obraca się sama. */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
