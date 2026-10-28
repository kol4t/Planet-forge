import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { fieldGrid, type FieldGrid } from '../core/colony/fieldGrid.ts';
import type { Plots } from '../core/colony/plots.ts';
import type { Complex } from '../core/colony/complexes.ts';
import { cellLookup, collectorOrbit, hash01, layoutFromPlots, plotsKey, type CellLookup, type ColonyLayout } from './colony.ts';
import { complexGround } from './complexLook.ts';
import { buildOpenPit, type OpenPit } from './openPit.ts';
import { borderChains, borderStates, cellBorders, CHOICE, FIELD_COLORS, FIELD_LINE, HIGHLIGHT, outlineBorders, type BorderChain, type HighlightMode } from './fieldOverlay.ts';
import { DragRotator } from './input/dragRotator.ts';
import { pickCell, pickComplex, type StructureHit } from './pick.ts';
import { facingAngles, focusLift, type BuildSite, type PlanetDisplay } from './PlanetDisplay.ts';
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
/** Wyrastanie kompleksu po wzroście (ms). */
const GROW_MS = 1400;

export class CanvasPlanetFallback implements PlanetDisplay {
  readonly kind = 'canvas2d' as const;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buffer = document.createElement('canvas');
  private readonly bctx: CanvasRenderingContext2D;
  private readonly rotator = new DragRotator(prefersReducedMotion() ? { idleSpin: 0 } : {});
  private sampler: SurfaceSampler | undefined;
  private colony: ColonyLayout | undefined;
  /** Wielka odkrywka ekstraktora (Odkrywka, Megaodkrywka) — koncentryczny rysunek dziury w tarczy. */
  private openPit: OpenPit | null = null;
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
  /** Wyrastanie kompleksów (v0.45): chwila ostatniego wzrostu obszaru albo zmiany etapu każdego budynku. */
  private readonly grownAt = new Map<BuildingId, number>();
  private seeded = false;
  /** Obrys wszystkich kompleksów (odcinki granic siatki) i mapa „punkt → pole” dla gruntu kompleksów. */
  private outlines: number[] = [];
  private lookup: CellLookup | null = null;
  private spinHeld = false;
  private readonly reducedMotion = prefersReducedMotion();
  private orbital = 0;
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
    this.grownAt.clear();
    this.seeded = false;
    this.plotsKey = '';
    this.outlines = [];
    this.lookup = cellLookup(this.grid);
    this.colony = layoutFromPlots(this.grid, {}, this.sampler, BUILDING_IDS);
    this.openPit = null;
    this.atmosphere = this.look.atmosphere;
    this.lastDrawn = { yaw: NaN, pitch: NaN };
  }

  setStructures(levels: BuildingLevels, site: BuildSite | null = null, plots?: Plots, complexes: readonly Complex[] = []): void {
    if (plots && this.grid && this.sampler) {
      const key = plotsKey(plots, BUILDING_IDS, levels, complexes);
      if (key !== this.plotsKey) {
        const before = new Map((this.colony?.complexes ?? []).map((c) => [c.building, `${c.cells.length}@${c.stage}`]));
        this.plotsKey = key;
        this.colony = layoutFromPlots(this.grid, plots, this.sampler, BUILDING_IDS, levels, complexes);
        this.outlines = this.colony.complexes.flatMap((c) => outlineBorders(this.grid!, c.cells));
        const crystal = this.colony.complexes.find((c) => c.building === 'crystalMine');
        this.openPit = crystal ? buildOpenPit(this.grid, this.colony, crystal, () => 1) : null;
        // Kompleks, który urósł albo zmienił etap, wyrasta od nowa (z wczytanej gry — od razu).
        for (const c of this.colony.complexes) {
          if (this.seeded && before.get(c.building) !== `${c.cells.length}@${c.stage}`) this.grownAt.set(c.building, performance.now());
        }
        this.seeded = true;
        // Grunt kompleksów jest w tarczy — trzeba ją narysować od nowa.
        this.lastDrawn = { yaw: NaN, pitch: NaN };
      }
      this.plots = plots;
    }
    this.levels = { ...levels };
    this.site = site;
  }

  pickStructure(x: number, y: number): StructureHit | null {
    if (!this.colony || !this.grid) return null;
    const { yaw, pitch } = this.rotator;
    const view = { cx: this.focus.cx, cy: this.focus.cy, yaw, pitch, tilt: 0, projection: { kind: 'ortho' as const, r: this.focus.r * this.zoom } };
    return pickComplex(this.colony, this.grid, view, x, y);
  }

  showBuilding(id: BuildingId): boolean {
    const c = this.colony?.complexes.find((x) => x.building === id);
    if (!c) return false;
    const dir = id === 'crystalMine' && this.openPit ? this.openPit.center : c.core;
    const { yaw, pitch } = facingAngles(dir, 0, focusLift(this.zoomer.target));
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

  /** Kolektor energii gwiazdy na orbicie (v0.44). */
  setOrbital(level: number): void {
    this.orbital = Math.max(0, Math.floor(level));
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
    const colony = this.colony;
    const lookup = this.lookup;
    const overlay =
      colony && lookup && colony.complexes.length > 0
        ? (x: number, y: number, z: number) => {
            const cell = lookup(x, y, z);
            const index = cell >= 0 ? colony.owner[cell]! : -1;
            if (index < 0) return null;
            const c = colony.complexes[index]!;
            // Farma wiatrowa stoi na naturalnym terenie.
            if (c.building === 'powerPlant' && c.stage === 0) return null;
            // Nowy kompleks wyrasta: grunt pojawia się punkt po punkcie.
            const grow = this.growth(c.building);
            if (grow < 1 && hash01(Math.floor(x * 400) * 7 + Math.floor(z * 400), 3) > grow) return null;
            return complexGround(c, [x, y, z], c.building === 'crystalMine' ? this.openPit : null);
          }
        : undefined;
    renderDisc(image.data, this.size, this.look, yaw, pitch, overlay);
    this.bctx.putImageData(image, 0, 0);
    this.lastDrawn = { yaw, pitch };
  }

  /**
   * Budowle jako kwadratowe „piksele” wyrównane do siatki pikseli planety (styl pixel-art).
   * Plac budowy: złota ramka, którą wypełnia postęp od dołu.
   */
  /**
   * Zabudowa kompleksów (v0.45) na wierzchu tarczy: jeden obiekt na budynek — główna konstrukcja w środku
   * obszaru (rośnie z etapem) i mniejsze w jego wnętrzu. Grunt kompleksu jest już w tarczy (`renderDisc`).
   * Subtelny turkusowy obrys całego obszaru. Bez pasków i rur między budowlami.
   */
  private drawStructures(): void {
    if (!this.colony || !this.levels || !this.grid) return;
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
    const toScreen = ([px, py, pz]: readonly number[]) => {
      // Planeta → ekran (obrót, potem pochylenie).
      const sx = px! * cy + pz! * sy;
      const hz = -px! * sy + pz! * cy;
      return { x: cx + sx * r, y: centerY - (py! * cp - hz * sp) * r, depth: py! * sp + hz * cp };
    };
    const now = this.reducedMotion ? 0 : performance.now();
    this.drawOutlines(toScreen);
    const px = (x0: number, y0: number, dx: number, dy: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x0 + dx * pixel, y0 + dy * pixel, w * pixel, h * pixel);
    };
    const blink = (phase: number, period = 600) => (now === 0 ? 1 : 0.45 + 0.55 * Math.abs(Math.sin(now / period + phase)));
    for (const c of this.colony.complexes) {
      const grow = this.growth(c.building);
      if (grow <= 0) continue;
      // Wielka odkrywka: ekstraktor nad środkiem dziury, nie w środku obszaru.
      const pit = c.building === 'crystalMine' ? this.openPit : null;
      const core = toScreen(pit?.center ?? c.core);
      // Zasięg obszaru w pikselach planety — zabudowa nie wychodzi poza obrys.
      const span = Math.max(2, Math.floor((c.radius * r) / pixel));
      const stage = c.stage + (c.mega ? 1 : 0);
      // Zabudowa pól obszaru (pole = jedna konstrukcja z konturem): gęściej z etapem, odkrywka — tylko na krawędzi.
      // Farma wiatrowa i generator fuzyjny — moduł na każdym polu.
      const every = stage >= 2 || (c.building === 'powerPlant' && stage <= 1) ? 1 : stage === 1 ? 2 : 0;
      for (const [k, spot] of c.spots.entries()) {
        if (k === 0 || every === 0 || k % every !== 0) continue;
        if (c.building === 'crystalMine' && (spot.t < 0.7 || pit)) continue;
        const p = toScreen(spot.dir);
        if (p.depth < 0.1) continue;
        const a = Math.min(1, p.depth * 2.5) * grow;
        const x0 = snapX(p.x);
        const y0 = snapY(p.y);
        const ph = spot.cell * 1.7;
        const parts: [number, number, number, number, string, number?][] = [];
        const part = (dx: number, dy: number, w: number, h: number, color: string, glow?: number) => parts.push([dx, dy, w, h, color, glow]);
        switch (c.building) {
          case 'metalMine':
            // Hala z kominem i żarem.
            part(-1, -5, 1, 3, '#3c4543');
            part(-1, -6, 1, 1, '#ff9a3c', ph);
            part(-2, -2, 5, 3, '#6f7b78');
            part(-2, -2, 5, 1, k % 3 === 0 ? '#8a9592' : '#c9a24a');
            part(0, 0, 1, 1, '#ffb15a', ph + 1);
            break;
          case 'crystalMine':
            // Wieża wiertnicza na krawędzi odkrywki.
            part(0, -4, 1, 4, '#6f7b78');
            part(-1, -4, 3, 1, '#d8b04a');
            part(0, -5, 1, 1, '#9ff3ff', ph);
            break;
          case 'powerPlant':
            if (stage === 0) {
              // Wiatrak: biały maszt, wirnik na zmianę „X” i „+” (obraca się), czerwone światło na gondoli.
              const turn = now === 0 || Math.floor(now / 260 + ph) % 2 === 0;
              part(0, -4, 1, 5, '#e8eeec');
              if (turn) {
                part(-1, -6, 1, 1, '#e8eeec');
                part(1, -6, 1, 1, '#e8eeec');
                part(-1, -4, 1, 1, '#e8eeec');
                part(1, -4, 1, 1, '#e8eeec');
              } else {
                part(-2, -5, 2, 1, '#e8eeec');
                part(1, -5, 2, 1, '#e8eeec');
                part(0, -7, 1, 2, '#e8eeec');
              }
              part(0, -5, 1, 1, '#ff6b5a', ph);
              break;
            }
            if (stage >= 3) {
              // Zbiornik-pułapka antymaterii: jasna kula na nogach z fioletowym pasem.
              part(-1, -4, 3, 1, '#d8dedc');
              part(-1, -3, 3, 1, '#c9b8ff', ph);
              part(-1, -2, 3, 1, '#d8dedc');
              part(-1, -1, 1, 1, '#6f7b78');
              part(1, -1, 1, 1, '#6f7b78');
              break;
            }
            if (stage === 1) {
              // Mały pierścień plazmy z jasnym skupiskiem krążącym po nim.
              const ring: [number, number][] = [[-1, -3], [0, -3], [1, -3], [2, -2], [1, -1], [0, -1], [-1, -1], [-2, -2]];
              const hot = now === 0 ? 0 : Math.floor(now / 140 + ph) % ring.length;
              ring.forEach(([x, y], i) => part(x, y, 1, 1, i === hot ? '#ffe3f5' : '#ff6fcf', i === hot ? undefined : ph));
              part(0, -2, 1, 1, '#6f7b78');
              break;
            }
            // Chłodnia z parą.
            part(-1, -2, 3, 3, '#8a9592');
            part(0, -3, 1, 1, '#8a9592');
            part(0, -4, 1, 1, '#e8f1ef', ph);
            break;
          case 'storage':
            part(-1, -1, 3, 2, '#c9a24a');
            break;
          case 'antimatterCollector':
            part(0, -2, 1, 2, '#6f7b78');
            part(0, -3, 1, 1, '#d4b8ff', ph);
            break;
          case 'laboratory':
            part(-1, -1, 3, 2, '#dfe7e6');
            part(0, -2, 1, 1, '#5ff2e0', ph);
            break;
        }
        ctx.globalAlpha = a * 0.85;
        for (const [dx, dy, w, h] of parts) px(x0, y0, dx - 1, dy - 1, w + 2, h + 2, '#071012');
        for (const [dx, dy, w, h, color, phase] of parts) {
          ctx.globalAlpha = a * (phase === undefined ? 1 : blink(phase, 420));
          px(x0, y0, dx, dy, w, h, color);
        }
      }
      if (core.depth < 0.1) continue;
      const alpha = Math.min(1, core.depth * 2.5) * grow;
      const x0 = snapX(core.x);
      const y0 = snapY(core.y);
      // Główna konstrukcja z ciemnym konturem (odcina się od zabudowy gruntu); wielkość z etapu.
      const rects: [number, number, number, number, string, number?][] = [];
      const box = (dx: number, dy: number, w: number, h: number, color: string, glowPhase?: number) => rects.push([dx, dy, w, h, color, glowPhase]);
      switch (c.building) {
        case 'metalMine': {
          // Huta: blok hal (stal, złote dachy pasami), kominy na całej szerokości, rząd okien pieców; rośnie z obszarem.
          const w = Math.min(Math.max(4, span), Math.max(4 + stage * 3, Math.round(span * 0.35)));
          const h = Math.max(3 + stage, Math.round(w * 0.4));
          const left = -Math.floor(w / 2);
          box(left, -h + 1, w, h, '#6f7b78');
          for (let r = 0; r < h - 2; r += 3) box(left, -h + 1 + r, w, 1, '#c9a24a');
          if (stage >= 2) box(left - 2, -1, 3, 2, '#8a9592');
          for (let k = 0, dx = left + 1; dx < left + w - 1; k++, dx += 3) {
            const ch = 3 + stage + (k % 3);
            box(dx, -h + 1 - ch, 1, ch, '#3c4543');
            box(dx, -h - ch, 1, 1, '#ff9a3c', k * 1.3);
          }
          for (let k = left + 1; k < left + w - 1; k += 2) box(k, -1, 1, 1, '#ffb15a', k * 0.7);
          break;
        }
        case 'crystalMine': {
          if (pit) {
            // Wiszący ekstraktor nad szybem: złoty pierścień lin, stalowa piasta, kryształ urobku, głowica w dół.
            const w = Math.max(3 + stage, Math.round(span * 0.08));
            const hub = Math.max(2, Math.round(w * 0.4));
            box(-w, -1, w * 2 + 1, 1, '#c9a24a');
            box(-hub, -hub - 1, hub * 2 + 1, hub + 1, '#6f7b78');
            box(-1, 1, 3, 1, '#3a4241');
            box(0, 2, 1, hub, '#3a4241');
            box(0, -hub - 4, 1, 3, '#9ff3ff', 0);
            box(-1, -hub - 2, 1, 1, '#6fe9ff', 1.3);
            break;
          }
          // Wieża wiertnicza nad środkiem odkrywki: kratownica, świecący rdzeń, złota głowica i ramiona.
          // Wieża rośnie z odkrywką (do ~0,4 promienia obszaru).
          const h = Math.max(5 + stage * 3, Math.round(span * 0.3));
          // Szersza kratownica przy większej odkrywce (nieparzysta szerokość — rdzeń w środku).
          const half = 1 + Math.floor(h / 14);
          box(-half, -h + 1, half * 2 + 1, h, '#4f5a58');
          box(0, -h + 2, 1, h - 2, '#1a2224');
          for (let k = 2; k < h - 1; k += 2) box(0, -h + 1 + k, 1, 1, '#6fe9ff', k * 0.4);
          for (let k = 4; k < h - 2; k += 6) box(-half - 1, -h + 1 + k, half * 2 + 3, 1, '#c9a24a');
          box(-half - 1, -h, half * 2 + 3, 1, '#c9a24a');
          box(0, -h - 1, 1, 1, '#9ff3ff', 0);
          break;
        }
        case 'powerPlant': {
          if (stage === 0) {
            // Farma wiatrowa: duży wiatrak z obracającym się wirnikiem i dyspozytornia u podstawy.
            const h = Math.max(7, Math.round(span * 0.22));
            const b = Math.max(3, Math.round(h * 0.45));
            const turn = now === 0 || Math.floor(now / 300) % 2 === 0;
            box(0, -h, 1, h + 1, '#e8eeec');
            box(2, -1, 3, 2, '#c9a24a');
            if (turn) {
              for (let k = 1; k <= b; k++) box(-k, -h - k, 1, 1, '#e8eeec'), box(k, -h - k, 1, 1, '#e8eeec'), box(0, -h + k, 1, 1, '#e8eeec');
            } else {
              for (let k = 1; k <= b; k++) box(-k, -h + Math.floor(k / 2), 1, 1, '#e8eeec'), box(k, -h + Math.floor(k / 2), 1, 1, '#e8eeec'), box(0, -h - k, 1, 1, '#e8eeec');
            }
            box(0, -h, 1, 1, '#ff6b5a', 0);
            break;
          }
          if (stage === 1) {
            // Generator fuzyjny: pierścień plazmy (elipsa) w cewkach, solenoid w środku, skupisko plazmy krąży.
            const rx = Math.max(4, Math.round(span * 0.12));
            const ry = Math.max(2, Math.round(rx * 0.5));
            const steps = rx * 6;
            const hot = now === 0 ? 0 : Math.floor(now / 90) % steps;
            for (let k = 0; k < steps; k++) {
              const a = (k / steps) * Math.PI * 2;
              const x = Math.round(Math.cos(a) * rx);
              const y = Math.round(Math.sin(a) * ry) - ry - 1;
              const coil = k % Math.max(2, Math.round(steps / 8)) === 0;
              box(x, y, 1, 1, coil ? '#c9a24a' : Math.abs(k - hot) < 2 ? '#ffe3f5' : '#ff6fcf', coil || Math.abs(k - hot) < 2 ? undefined : k * 0.2);
            }
            box(0, -ry - 3, 1, 3, '#6f7b78');
            box(-1, -ry - 4, 3, 1, '#c9a24a');
            break;
          }
          if (stage >= 3) {
            // Reaktor antymaterii: fioletowa kula na łukach, pierścienie pułapki (na zmianę poziomy i pionowy — obrót),
            // cztery zbiorniki paliwa z rurami do podstawy.
            const k = Math.max(2, Math.round(span * 0.02));
            const turn = now === 0 || Math.floor(now / 400) % 2 === 0;
            const cy = -6 * k;
            box(-k, cy - k, 2 * k + 1, 2 * k + 1, '#c9b8ff', 0);
            if (turn) box(-3 * k, cy, 6 * k + 1, 1, '#c9a24a');
            else box(0, cy - 3 * k, 1, 6 * k + 1, '#c9a24a');
            box(-2 * k, cy - 2 * k, 1, 1, '#c9a24a');
            box(2 * k, cy + 2 * k, 1, 1, '#c9a24a');
            box(-2 * k, -4 * k, 1, 4 * k, '#6f7b78');
            box(2 * k, -4 * k, 1, 4 * k, '#6f7b78');
            for (const dx of [-6 * k, 5 * k]) {
              box(dx, -2 * k, 2 * k, 2 * k, '#d8dedc');
              box(dx < 0 ? dx + 2 * k : -k, -1, Math.abs(dx) - k, 1, '#c9b8ff', 1);
            }
            box(-k, 0, 2 * k + 1, 1, '#c9a24a');
            break;
          }
          if (stage === 2) {
            // Elektrownia jądrowa: kopuła reaktora ze złotym pasem, dwie chłodnie z parą, niebieska poświata basenu.
            const k = Math.max(2, Math.round(span * 0.022));
            const tower = (x: number, h: number, phase: number) => {
              box(x, -h, 3 * k, h + 1, '#a7aea9');
              box(x + k, -h + k, k, h - 2 * k, '#c3c9c6');
              box(x, -h - 2 * k, 3 * k, 2 * k, '#eef3f2', phase);
              box(x + k, -h - 4 * k, 3 * k, 2 * k, '#eef3f2', phase + 1);
            };
            tower(-6 * k, 9 * k, 0);
            tower(-2 * k, 7 * k, 2);
            // Kopuła: coraz węższe rzędy.
            [5, 5, 4, 3].forEach((w, row) => box(2 * k + ((5 - w) * k) / 2, -(row + 1) * k, w * k, k, '#d8dedc'));
            box(2 * k, 0, 5 * k, 1, '#c9a24a');
            box(8 * k, -k, 2 * k, k, '#4fb6ff', 0.5);
            break;
          }
          // Wieża przesyłowa z jasną kulą (wyżej z etapem).
          const h = 4 + stage * 2;
          box(0, -h, 1, h + 1, '#6f7b78');
          box(-1, -h + 1, 3, 1, '#c9a24a');
          if (stage >= 1) box(-2, -h + 3, 5, 1, '#c9a24a');
          box(0, -h - 1, 1, 1, '#bff6ff', 0);
          break;
        }
        case 'storage': {
          // Suwnica nad składem.
          const w = Math.min(Math.max(4, span), 4 + stage * 2);
          box(-Math.floor(w / 2), -4, w, 1, '#c9a24a');
          box(-Math.floor(w / 2), -4, 1, 5, '#6f7b78');
          box(Math.ceil(w / 2) - 1, -4, 1, 5, '#6f7b78');
          break;
        }
        case 'antimatterCollector': {
          const w = Math.max(3, Math.min(span, 3 + stage * 2) | 1);
          box(-Math.floor(w / 2), 0, w, 1, '#8a6fd0');
          box(0, -Math.floor(w / 2), 1, w, '#8a6fd0');
          box(0, -Math.floor(w / 2) - 2, 1, 2, '#6f7b78');
          box(0, -Math.floor(w / 2) - 3, 1, 1, '#f0e2ff', 0);
          break;
        }
        case 'laboratory': {
          const w = Math.max(3, Math.min(span, 3 + stage * 2) | 1);
          box(-Math.floor(w / 2), -1, w, 2, '#dfe7e6');
          box(-Math.floor(w / 2) + 1, -2, Math.max(1, w - 2), 1, '#dfe7e6');
          box(0, -4, 1, 2, '#6f7b78');
          box(0, -5, 1, 1, '#5ff2e0', 0);
          break;
        }
      }
      // Kontur: każdy prostokąt powiększony o piksel, ciemny; potem kolory (światła migają).
      ctx.globalAlpha = alpha * 0.9;
      for (const [dx, dy, w, h] of rects) px(x0, y0, dx - 1, dy - 1, w + 2, h + 2, '#071012');
      for (const [dx, dy, w, h, color, phase] of rects) {
        ctx.globalAlpha = alpha * (phase === undefined ? 1 : blink(phase, 380));
        px(x0, y0, dx, dy, w, h, color);
      }
      // Dym z kominów huty: szare piksele unoszące się nad hutą.
      if (c.building === 'metalMine' && now > 0) {
        for (let k = 0; k < 2 + stage; k++) {
          const f = ((now / 1600 + k * 0.37) % 1 + 1) % 1;
          ctx.globalAlpha = alpha * 0.5 * (1 - f);
          px(x0, y0, -Math.floor(Math.min(Math.max(4, span), 4 + stage * 3) / 2) + 1 + (k % (1 + stage)) * 2, -9 - stage * 2 - Math.floor(f * 6), 1, 1, '#c8d0ce');
        }
      }
    }
    ctx.globalAlpha = 1;
    // Plac budowy: migające złote rusztowanie na najnowszym polu obszaru budowanego budynku.
    const site = this.site;
    const building = site && this.colony.complexes.find((c) => c.building === site.building);
    if (site && building) {
      const spot = building.spots.reduce((a, b) => (building.cells.indexOf(b.cell) > building.cells.indexOf(a.cell) ? b : a));
      const p = toScreen(spot.dir);
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

  /** Subtelny turkusowy obrys każdego kompleksu — wokół całego obszaru, nie pojedynczych pól. */
  private drawOutlines(toScreen: (p: readonly number[]) => { x: number; y: number; depth: number }): void {
    if (!this.grid || this.outlines.length === 0) return;
    const ctx = this.ctx;
    ctx.beginPath();
    for (const i of this.outlines) {
      const border = this.grid.borders[i]!;
      const a = toScreen(border.from);
      const b = toScreen(border.to);
      if (a.depth < 0.02 || b.depth < 0.02) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#041012';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = HIGHLIGHT.color;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Wyrastanie kompleksu po zmianie etapu albo wzroście obszaru (0..1; „Ogranicz ruch” — od razu). */
  private growth(id: BuildingId): number {
    const born = this.grownAt.get(id);
    if (born === undefined || this.reducedMotion) return 1;
    return Math.min(1, (performance.now() - born) / GROW_MS);
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
    const growing = [...this.grownAt.values()].some((t) => performance.now() - t < GROW_MS + 100);
    if (
      growing ||
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
    this.drawCollector(cx, cy, r);
  }

  /**
   * Kolektor energii gwiazdy (v0.44): pikselowy satelita na nachylonej orbicie — korpus ze stali,
   * złote lustra (dłuższe na wyższym poziomie), migające światło; za tarczą planety niewidoczny.
   */
  private drawCollector(cx: number, cy: number, r: number): void {
    if (this.orbital <= 0) return;
    const [x, y, z] = collectorOrbit(performance.now() / 1000, this.reducedMotion);
    const sx = cx + x * r;
    const sy = cy - y * r;
    if (z < 0 && Math.hypot(sx - cx, sy - cy) < r) return;
    const ctx = this.ctx;
    const p = Math.max(2, Math.round(r / 60));
    const wing = 2 + Math.ceil(this.orbital / 3);
    const x0 = Math.round(sx / p) * p;
    const y0 = Math.round(sy / p) * p;
    ctx.globalAlpha = z < 0 ? 0.7 : 1;
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(x0 - (wing + 1) * p, y0, wing * p, p);
    ctx.fillRect(x0 + 2 * p, y0, wing * p, p);
    ctx.fillStyle = '#6f7b78';
    ctx.fillRect(x0, y0 - p, 2 * p, 3 * p);
    ctx.fillStyle = '#bff6ff';
    ctx.globalAlpha *= this.reducedMotion || Math.floor(performance.now() / 600) % 2 ? 1 : 0.35;
    ctx.fillRect(x0, y0 - 2 * p, p, p);
    ctx.globalAlpha = 1;
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

