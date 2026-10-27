import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { fieldGrid, type FieldGrid } from '../core/colony/fieldGrid.ts';
import type { Plots } from '../core/colony/plots.ts';
import type { Complex } from '../core/colony/complexes.ts';
import { groupFull, layoutFromPlots, plotsKey, RIG_BUILDINGS, visibleStructures, type ColonyLayout } from './colony.ts';
import { borderChains, borderStates, cellBorders, CHOICE, FIELD_COLORS, FIELD_LINE, HIGHLIGHT, outlineBorders, type BorderChain, type HighlightMode } from './fieldOverlay.ts';
import { DragRotator } from './input/dragRotator.ts';
import { levelsWithSite, pickCell, pickStructureHit, type StructureHit } from './pick.ts';
import { facingAngles, focusLift, STRUCTURE_COLORS, type BuildSite, type PlanetDisplay } from './PlanetDisplay.ts';
import { discLook, renderDisc, type DiscLook } from './discRenderer.ts';
import { ZoomSmoother } from './input/zoom.ts';
import type { RGB, SurfaceSampler } from './surface.ts';

// Widok 2D (domyślny od v0.7): ta sama planeta z tego samego seeda, rysowana piksel
// po pikselu do małego bufora i skalowana — pikselowy styl gry.

/** Rozdzielczość tarczy (piksele planety na średnicę) bez przybliżenia. */
const BUFFER = 180;
/** Przy przybliżeniu rozdzielczość rośnie maks. do BUFFER × 1,6 (koszt rysowania ~2,6×). */
const MAX_BUFFER_SCALE = 1.6;
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
  private readonly zoomer = new ZoomSmoother();
  private grid: FieldGrid | null = null;
  private plotsKey = '';
  private plots: Plots | null = null;
  /** Granice pól połączone w linie (dla danej siatki i zajętości). */
  private chains: BorderChain[] | null = null;
  private chainsKey = '';
  private chainsGrid: FieldGrid | null = null;
  private gridVisible = false;
  /** Obrys zajętości wybranej budowli: klucz pól i odcinki granic (v0.38.1). */
  private highlight: { key: string; borders: number[]; mode: HighlightMode } | null = null;
  /** Animacja łączenia (v0.38.2): chwila pojawienia się każdego szybu głównego (z wczytanej gry — dawno). */
  private readonly hubBirth = new Map<string, number>();
  private hubsSeeded = false;
  private spinHeld = false;
  private readonly reducedMotion = prefersReducedMotion();
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
    this.grid = fieldGrid(planet);
    this.highlight = null;
    this.hubBirth.clear();
    this.hubsSeeded = false;
    this.plotsKey = '';
    this.colony = layoutFromPlots(this.grid, {}, this.sampler, BUILDING_IDS);
    this.atmosphere = this.look.atmosphere;
    this.lastDrawn = { yaw: NaN, pitch: NaN };
  }

  setStructures(levels: BuildingLevels, site: BuildSite | null = null, plots?: Plots, complexes: readonly Complex[] = []): void {
    if (plots && this.grid && this.sampler) {
      const key = plotsKey(plots, BUILDING_IDS, complexes);
      if (key !== this.plotsKey) {
        this.plotsKey = key;
        this.colony = layoutFromPlots(this.grid, plots, this.sampler, BUILDING_IDS, complexes);
        for (const hub of this.colony.hubs) {
          const key = hub.dir.join(',');
          if (!this.hubBirth.has(key)) this.hubBirth.set(key, this.hubsSeeded && !this.reducedMotion ? performance.now() : -1e9);
        }
        if (Object.values(plots).some((l) => (l?.length ?? 0) > 0)) this.hubsSeeded = true;
      }
      this.plots = plots;
    }
    this.levels = { ...levels };
    this.site = site;
  }

  pickStructure(x: number, y: number): StructureHit | null {
    if (!this.colony || !this.levels) return null;
    const { yaw, pitch } = this.rotator;
    const view = { cx: this.focus.cx, cy: this.focus.cy, yaw, pitch, tilt: 0, projection: { kind: 'ortho' as const, r: this.focus.r * this.zoom } };
    return pickStructureHit(this.colony, levelsWithSite(this.levels, this.site), view, x, y);
  }

  showBuilding(id: BuildingId, index?: number): boolean {
    const slots = this.colony?.slots[id];
    if (!slots?.length) return false;
    const level = this.site?.building === id ? this.site.targetLevel : (this.levels?.[id] ?? 0);
    const count = Math.min(visibleStructures(level), slots.length);
    if (count === 0) return false;
    const slot = slots[Math.max(0, Math.min(index ?? count - 1, count - 1))]!;
    const { yaw, pitch } = facingAngles(slot.dir, 0, focusLift(this.zoomer.target));
    this.rotator.turnTo(yaw, pitch, performance.now());
    return true;
  }

  beginDrag(): void {
    this.spinHeld = false;
    this.rotator.start(performance.now());
  }

  drag(dx: number, dy: number): void {
    // Przy przybliżeniu ten sam ruch palca obraca planetę wolniej (teren „pod palcem”).
    this.rotator.move(dx / this.zoom, dy / this.zoom, performance.now());
  }

  private get zoom(): number {
    return this.zoomer.value;
  }

  zoomLevel(): number {
    return this.zoomer.target;
  }

  setZoom(zoom: number, instant = false): void {
    this.zoomer.set(zoom, instant || this.reducedMotion);
    this.resizeBuffer();
  }

  holdSpin(hold: boolean): void {
    this.spinHeld = hold;
  }

  resetView(): void {
    this.spinHeld = false;
    this.zoomer.set(1, this.reducedMotion);
    this.resizeBuffer();
    this.rotator.turnTo(this.rotator.yaw, 0, performance.now());
  }

  /** Rozdzielczość bufora rośnie z przybliżeniem (co 12 px — przy płynnym zoomie mniej przeliczeń). */
  private resizeBuffer(): void {
    const size = Math.round((BUFFER * Math.min(this.zoom, MAX_BUFFER_SCALE)) / 12) * 12;
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

  setGridVisible(visible: boolean): void {
    this.gridVisible = visible;
  }

  setHighlight(cells: readonly number[] | null, mode: HighlightMode = 'footprint'): void {
    const key = cells && cells.length > 0 ? `${mode}:${cells.join(',')}` : '';
    if (key === (this.highlight?.key ?? '')) return;
    this.highlight = key && this.grid ? { key, mode, borders: mode === 'choice' ? cellBorders(this.grid, cells!) : outlineBorders(this.grid, cells!) } : null;
  }

  pickCell(x: number, y: number, cells: readonly number[]): number | null {
    if (!this.grid) return null;
    const { yaw, pitch } = this.rotator;
    const r = this.focus.r * this.zoom;
    const view = { cx: this.focus.cx, cy: this.focus.cy, yaw, pitch, tilt: 0, projection: { kind: 'ortho' as const, r } };
    // Promień trafienia ~ wielkość pola na ekranie (pole ma promień kątowy ~0,1–0,2 rad).
    return pickCell(this.grid.cells.map((c) => c.center), cells, view, x, y, Math.max(30, r * 0.14));
  }

  /** Turkusowy kontur pól wybranej budowli z ciemną obwódką; lekko pulsuje (bez „Ogranicz ruch”). */
  private drawHighlight(): void {
    if (!this.highlight || !this.grid) return;
    const { cx, cy: centerY } = this.focus;
    const r = this.focus.r * this.zoom;
    const { yaw, pitch } = this.rotator;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const ctx = this.ctx;
    const project = ([px, py, pz]: readonly number[]): [number, number] | null => {
      const sx = px! * cy + pz! * sy;
      const hz = -px! * sy + pz! * cy;
      if (py! * sp + hz * cp < 0.02) return null;
      return [cx + sx * r, centerY - (py! * cp - hz * sp) * r];
    };
    ctx.beginPath();
    for (const i of this.highlight.borders) {
      const border = this.grid.borders[i]!;
      const a = project(border.from);
      const b = project(border.to);
      if (!a || !b) continue;
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.lineCap = 'round';
    ctx.globalAlpha = HIGHLIGHT.haloAlpha;
    ctx.strokeStyle = HIGHLIGHT.haloColor;
    ctx.lineWidth = HIGHLIGHT.halo;
    ctx.stroke();
    ctx.globalAlpha = this.reducedMotion ? 0.95 : 0.75 + 0.25 * Math.sin(performance.now() / 450);
    ctx.strokeStyle = this.highlight.mode === 'choice' ? CHOICE.color : HIGHLIGHT.color;
    ctx.lineWidth = this.highlight.mode === 'choice' ? CHOICE.width : HIGHLIGHT.width;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Granice pól (tylko strona zwrócona do widza): turkus — wolne, złoto — zajęte, błękit — lód. Woda i lawa bez pól. */
  private drawFieldGrid(): void {
    if (!this.gridVisible || !this.grid) return;
    const { cx, cy: centerY } = this.focus;
    const r = this.focus.r * this.zoom;
    const { yaw, pitch } = this.rotator;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const ctx = this.ctx;
    // Linie liczone raz na siatkę i zajętość pól (nie co klatkę).
    const chainsKey = this.plotsKey;
    if (!this.chains || this.chainsKey !== chainsKey || this.chainsGrid !== this.grid) {
      this.chains = borderChains(this.grid, borderStates(this.grid, this.plots));
      this.chainsKey = chainsKey;
      this.chainsGrid = this.grid;
    }
    const chains = this.chains;
    const project = ([px, py, pz]: readonly number[]): [number, number] | null => {
      const sx = px! * cy + pz! * sy;
      const hz = -px! * sy + pz! * cy;
      if (py! * sp + hz * cp < 0.02) return null;
      return [cx + sx * r, centerY - (py! * cp - hz * sp) * r];
    };
    // Rzut raz na klatkę; niewidoczne punkty (druga strona planety) przerywają linię.
    const projected = chains.map((chain) => chain.points.map(project));
    const path = (keep: (chain: BorderChain) => boolean) => {
      ctx.beginPath();
      projected.forEach((points, c) => {
        if (!keep(chains[c]!)) return;
        let pen = false;
        for (const p of points) {
          if (!p) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
          pen = true;
        }
      });
      ctx.stroke();
    };
    // Najpierw ciemna obwódka pod wszystkimi liniami, potem kolor (zajęte na końcu — na wierzchu).
    ctx.lineJoin = 'round';
    ctx.globalAlpha = FIELD_LINE.haloAlpha;
    ctx.strokeStyle = FIELD_LINE.haloColor;
    ctx.lineWidth = FIELD_LINE.halo;
    path(() => true);
    ctx.globalAlpha = FIELD_LINE.alpha;
    ctx.lineWidth = FIELD_LINE.width;
    for (const state of ['ice', 'free', 'taken'] as const) {
      ctx.strokeStyle = FIELD_COLORS[state];
      path((chain) => chain.state === state);
    }
    ctx.globalAlpha = 1;
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
    // Pełne pole wierteł kryształu (v0.38) to jedno wiertło z szybem zamiast trzech małych budowli.
    const level = (id: BuildingId) => this.levels![id] ?? 0;
    const rigged = (id: BuildingId, i: number) => RIG_BUILDINGS.includes(id) && groupFull(level(id), Math.floor(i / 3));
    for (const id of BUILDING_IDS) {
      const slots = this.colony.slots[id] ?? [];
      const count = Math.min(visibleStructures(this.levels[id] ?? 0), slots.length);
      ctx.fillStyle = STRUCTURE_COLORS[id].light;
      for (let i = 0; i < count; i++) {
        if (rigged(id, i)) continue;
        const p = toScreen(slots[i]!.dir);
        if (p.depth < 0.08) continue;
        ctx.globalAlpha = Math.min(1, p.depth * 2.5);
        ctx.fillRect(snapX(p.x - pixel / 2), snapY(p.y - pixel / 2), cell, cell);
      }
    }
    // Szyby w pikselach: ciemne wnętrze, obręcz, światło obiegające obręcz (praca wiertła).
    // „Ogranicz ruch” — szyby bez obiegającego światła i pulsowania.
    const now = this.reducedMotion ? 0 : performance.now();
    const pit = (px: number, py: number, n: number, colors: { body: string; light: string }, speed: number, alpha: number) => {
      const x0 = snapX(px - (n * pixel) / 2);
      const y0 = snapY(py - (n * pixel) / 2);
      ctx.globalAlpha = alpha;
      // Obręcz bez narożników — szyb jest okrągławy, nie kwadratowy.
      ctx.fillStyle = colors.body;
      ctx.fillRect(x0 + pixel, y0, (n - 2) * pixel, n * pixel);
      ctx.fillRect(x0, y0 + pixel, n * pixel, (n - 2) * pixel);
      ctx.fillStyle = '#071012';
      ctx.fillRect(x0 + pixel, y0 + pixel, (n - 2) * pixel, (n - 2) * pixel);
      // Obręcz: piksele po obwodzie; jeden (dwa przy kompleksie) świecą i obiegają szyb.
      const ring: [number, number][] = [];
      for (let k = 1; k < n - 1; k++) ring.push([k, 0]);
      for (let k = 1; k < n - 1; k++) ring.push([n - 1, k]);
      for (let k = n - 2; k > 0; k--) ring.push([k, n - 1]);
      for (let k = n - 2; k > 0; k--) ring.push([0, k]);
      const step = Math.floor((now / 1000) * speed * ring.length) % ring.length;
      ctx.fillStyle = colors.light;
      for (const offset of n > 3 ? [0, ring.length / 2] : [0]) {
        const [rx, ry] = ring[(step + offset) % ring.length]!;
        ctx.fillRect(x0 + rx * pixel, y0 + ry * pixel, pixel, pixel);
      }
      // Hale przy krawędzi i kryształy wyrastające obok szybu (v0.38.1).
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors.body;
      ctx.fillRect(x0 - 2 * pixel, y0 + pixel, 2 * pixel, 2 * pixel);
      ctx.fillRect(x0 + n * pixel, y0 + (n - 3) * pixel, 2 * pixel, 2 * pixel);
      ctx.fillStyle = '#6fe9ff';
      ctx.fillRect(x0 + (n - 2) * pixel, y0 - pixel, pixel, pixel);
      ctx.fillRect(x0 + pixel, y0 + n * pixel, pixel, pixel);
      ctx.fillStyle = colors.light;
      // Kryształ na dnie szybu pulsuje.
      ctx.globalAlpha = alpha * (0.45 + 0.55 * Math.abs(Math.sin(now / 600 + px)));
      const c = Math.floor(n / 2);
      ctx.fillRect(x0 + c * pixel, y0 + c * pixel, pixel, pixel);
    };
    // Postęp łączenia 0..1: szyb wyrasta w pierwszej połowie, rury biegną do wierteł w drugiej (2,4 s).
    const growth = (hub: { dir: readonly number[] }) => Math.min(1, (performance.now() - (this.hubBirth.get(hub.dir.join(',')) ?? -1e9)) / 2400);
    for (const hub of this.colony.hubs) {
      const h = toScreen(hub.dir);
      if (h.depth < 0.08) continue;
      const reach = Math.max(0, growth(hub) * 2 - 1);
      if (reach <= 0) continue;
      // Rury od szybu głównego do wierteł kompleksu: piksele co krok wzdłuż odcinka.
      ctx.fillStyle = STRUCTURE_COLORS[hub.building].body;
      ctx.globalAlpha = Math.min(1, h.depth * 2.5) * 0.9;
      for (const member of hub.members) {
        const m = toScreen(member);
        const steps = Math.max(1, Math.ceil(Math.hypot(m.x - h.x, m.y - h.y) / pixel));
        for (let k = 0; k <= steps * reach; k++) ctx.fillRect(snapX(h.x + ((m.x - h.x) * k) / steps), snapY(h.y + ((m.y - h.y) * k) / steps), pixel, pixel);
      }
    }
    for (const rig of this.colony.rigs) {
      if (!groupFull(level(rig.building), rig.group)) continue;
      const p = toScreen(rig.dir);
      if (p.depth < 0.08) continue;
      pit(p.x, p.y, 7, STRUCTURE_COLORS[rig.building], 0.9, Math.min(1, p.depth * 2.5));
    }
    for (const hub of this.colony.hubs) {
      const h = toScreen(hub.dir);
      if (h.depth < 0.08) continue;
      // Szyb główny rośnie od 3 do 9 pikseli (nieparzyście — środek zostaje na miejscu).
      const size = 3 + 2 * Math.round(3 * Math.min(1, growth(hub) * 2));
      pit(h.x, h.y, size, STRUCTURE_COLORS[hub.building], 0.6, Math.min(1, h.depth * 2.5));
    }
    ctx.globalAlpha = 1;
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
    // Przy przybliżeniu od 2× planeta przestaje sama się obracać (od 1× do 2× autoobrót słabnie);
    // pokazany budynek wstrzymuje autoobrót całkiem.
    this.rotator.spinFactor = this.spinHeld ? 0 : Math.min(1, Math.max(0, 2 - this.zoom));
    this.rotator.update(dt, time);
    if (this.zoomer.update(dt)) this.resizeBuffer();
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
    this.drawFieldGrid();
    this.drawHighlight();
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
