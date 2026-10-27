import * as THREE from 'three';
import { createNoise3D, fbm } from '../core/random/noise.ts';
import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { createAtmosphere } from './atmosphere.ts';
import { fieldGrid, type FieldGrid } from '../core/colony/fieldGrid.ts';
import type { Plots } from '../core/colony/plots.ts';
import type { Complex } from '../core/colony/complexes.ts';
import type { Pad } from './colonyMeshes.ts';
import { cellLookup, collectorOrbit, hash01, layoutFromPlots, plotsKey, type ColonyComplex, type ColonyLayout, type Vec3 } from './colony.ts';
import { pitDepthMax, pitShare, pitSink3d } from './complexLook.ts';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { borderStates, cellBorders, CHOICE, FIELD_COLORS, FIELD_LINE, HIGHLIGHT, outlineBorders, type HighlightMode } from './fieldOverlay.ts';
import { ColonyMeshes } from './colonyMeshes.ts';
import { DragRotator } from './input/dragRotator.ts';
import { ZoomSmoother } from './input/zoom.ts';
import { AdaptiveResolution } from './adaptiveResolution.ts';
import { pickCell, pickComplex, type StructureHit } from './pick.ts';
import { facingAngles, focusLift, type BuildSite, type PlanetDisplay } from './PlanetDisplay.ts';
import { buildLowPolyLand, facetNormals, shapedRadius } from './lowPoly.ts';
import { createLavaVeins, createSurfaceSampler, lavaColors, type SurfaceSampler } from './surface.ts';

/**
 * Szczegółowość siatki lądu (IcosahedronGeometry detail): 20 × (n+1)² faset.
 * 40 → ~34 tys. faset (low-poly, ale z czytelną rzeźbą). Pilnuj na iPadzie!
 */
export const SURFACE_DETAIL = 40;
const FOV = 32;
const LIGHT_POSITION = new THREE.Vector3(-4, 2.5, 3.5);
/**
 * Światło wypełniające (v0.47): słabe, chłodne, z naprzeciwka gwiazdy — nocna strona zachowuje kształt
 * terenu i sylwetkę bez rozjaśniania całej planety. Bez cieni, bez nowych tekstur ani rysowań.
 */
const FILL_POSITION = new THREE.Vector3(4, -1.2, -2.5);
const FILL_INTENSITY = 0.32;
/** Chmury znikają przy przybliżeniu (v0.47): pełne do 1,4×, niewidoczne od 2,2× — nie zasłaniają kolonii. */
const CLOUDS_FADE = [1.4, 2.2] as const;
const BUILDING_IDS: readonly BuildingId[] = BALANCE.buildings.map((b) => b.id);
/**
 * Limit pikseli bufora planety (szer. × wys. × ratio²). Pełny ekran iPada w Retinie to ~3,9 mln —
 * razem z wygładzaniem krawędzi za dużo pamięci grafiki dla starszych iPadów.
 */
const PIXEL_BUDGET = 2_400_000;

/** Gęstość pikseli renderowania mieszcząca się w budżecie (maks. 2). */
export function renderPixelRatio(width: number, height: number, devicePixelRatio: number): number {
  const wanted = Math.min(devicePixelRatio || 1, 2);
  const fit = Math.sqrt(PIXEL_BUDGET / Math.max(1, width * height));
  return Math.max(1, Math.min(wanted, fit));
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export class PlanetView implements PlanetDisplay {
  readonly kind = 'webgl' as const;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  /** Nachylenie osi + pochylenie palcem. */
  private readonly tiltGroup = new THREE.Group();
  /** Obrót planety wokół osi. */
  private readonly spinGroup = new THREE.Group();
  private readonly rotator = new DragRotator(prefersReducedMotion() ? { idleSpin: 0 } : {});
  private readonly colony = new ColonyMeshes(prefersReducedMotion());
  private planetObjects: THREE.Object3D[] = [];
  private readonly sun = new THREE.DirectionalLight(0xffeedc, 2.4);
  private readonly ambient = new THREE.HemisphereLight(0x4f7383, 0x07080a, 0.12);
  private readonly fill = new THREE.DirectionalLight(0x6f9fc0, FILL_INTENSITY);
  /** Przezroczystość chmur danej planety (z jej wyglądu) — mnożona przez wygaszanie przy przybliżeniu. */
  private cloudOpacity = 1;
  private clouds: THREE.Object3D | undefined;
  /** Wycięcie tafli oceanu nad wyrobiskiem kryształów: kierunek środka i cos promienia kątowego (2 — brak wycięcia). */
  private readonly oceanCut = { value: new THREE.Vector4(0, 1, 0, 2) };
  private lava: THREE.Mesh | undefined;
  private time = 0;
  /** Kompleksy kolonii — do wyboru budowli dotknięciem. */
  private layout: ColonyLayout | undefined;
  private axialTilt = 0;
  private width = 1;
  private height = 1;
  private focus = { cx: 0.5, cy: 0.5, r: 200 };
  private readonly zoomer = new ZoomSmoother();
  private grid: FieldGrid | null = null;
  private shaped: SurfaceSampler | null = null;
  private plotsKey = '';
  /** Siatka pól: ciemna obwódka + kolorowe linie (grube linie — zwykłe mają w WebGL zawsze 1 piksel). */
  private fieldLines: THREE.Group | null = null;
  private fieldColors: LineSegmentsGeometry | null = null;
  private readonly lineMaterials: LineMaterial[] = [];
  private gridVisible = false;
  private readonly still = prefersReducedMotion();
  private orbital: THREE.Group | null = null;
  private orbitalLevel = 0;
  /** Ląd i jego pierwotne pozycje i kolory — grunt kompleksów i odkrywki malowane od nowa przy zmianie kolonii (v0.45). */
  private land: { mesh: THREE.Mesh; positions: Float32Array; colors: Float32Array } | null = null;
  /** Subtelny obrys wszystkich kompleksów (linie nad terenem). */
  private outlines: { object: THREE.Group; materials: LineMaterial[] } | null = null;
  /** Obrys zajętości wybranej budowli (v0.38.1): linie nad terenem, przebudowywane przy zmianie pól. */
  private highlight: { key: string; object: THREE.Group; material: LineMaterial } | null = null;
  /** Punkt granicy podniesiony nad teren (ten sam co dla siatki pól). */
  private liftPoint: ((p: readonly [number, number, number]) => number[]) | null = null;
  private spinHeld = false;
  private readonly resolution = new AdaptiveResolution();
  private readonly reducedMotion = prefersReducedMotion();
  private frame = 0;
  private lastTime = performance.now();
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, onContextLost?: () => void) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // Na ekranach Retina wygładzanie jest prawie niewidoczne, a kosztuje dużo pamięci grafiki.
      // Na komputerze (zwykła gęstość pikseli) płótno ma rozmiar całego okna — przy dużym monitorze
      // wygładzanie (MSAA) było główną przyczyną spadków płynności, więc tylko dla małych okien.
      antialias: (window.devicePixelRatio || 1) < 2 && window.innerWidth * window.innerHeight < 1_300_000,
      alpha: true,
      powerPreference: 'default',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Łagodne mapowanie tonów: jasny lód i śnieg nie wypalają się do czystej bieli.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x000000, 0);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      onContextLost?.();
    });

    this.scene.add(this.tiltGroup);
    this.tiltGroup.add(this.spinGroup);
    this.spinGroup.add(this.colony.object);

    // Światło gwiazdy z boku uwydatnia fasety; słabe światło otoczenia — noc ciemna, ale z detalem.
    this.sun.position.copy(LIGHT_POSITION);
    this.scene.add(this.sun);
    this.scene.add(this.ambient);
    this.fill.position.copy(FILL_POSITION);
    this.scene.add(this.fill);

    this.loop = this.loop.bind(this);
    this.frame = requestAnimationFrame(this.loop);
  }

  setPlanet(planet: Planet): void {
    for (const object of this.planetObjects) {
      object.parent?.remove(object);
      disposeObject(object);
    }
    const sampler = createSurfaceSampler(planet);
    this.planetObjects = buildPlanetObjects(planet, sampler);
    this.sun.intensity = planet.visual.style.sunIntensity;
    this.ambient.intensity = planet.visual.style.ambient;
    this.clouds = this.planetObjects.find((o) => o.name === 'clouds');
    this.cloudOpacity = this.clouds ? ((this.clouds as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity : 1;
    this.lava = this.planetObjects.find((o): o is THREE.Mesh => o.name === 'lava' && o instanceof THREE.Mesh);
    const ocean = this.planetObjects.find((o): o is THREE.Mesh => o.name === 'ocean' && o instanceof THREE.Mesh);
    this.oceanCut.value.set(0, 1, 0, 2);
    if (ocean) cutOcean(ocean.material as THREE.MeshStandardMaterial, this.oceanCut);
    for (const object of this.planetObjects) {
      // Atmosfera nie musi się obracać z planetą (jest symetryczna).
      if (object.name === 'atmosphere' || object.name === 'haze') this.tiltGroup.add(object);
      else this.spinGroup.add(object);
    }
    this.axialTilt = THREE.MathUtils.degToRad(planet.visual.axialTiltDeg);
    this.tiltGroup.rotation.z = this.axialTilt;
    // Budowle stoją na powierzchni 3D (tarasy i wyższe góry), nie na gładkiej wersji z 2D.
    this.shaped = { ...sampler, radius: (h) => shapedRadius(planet, h) };
    this.grid = fieldGrid(planet);
    const landMesh = this.planetObjects.find((o): o is THREE.Mesh => o.name === 'land' && o instanceof THREE.Mesh);
    this.land = landMesh
      ? {
          mesh: landMesh,
          positions: (landMesh.geometry.getAttribute('position').array as Float32Array).slice(),
          colors: (landMesh.geometry.getAttribute('color').array as Float32Array).slice(),
        }
      : null;
    this.setHighlight(null);
    this.plotsKey = '';
    this.buildFieldLines(planet, sampler);
    this.layout = layoutFromPlots(this.grid, {}, this.shaped, BUILDING_IDS, {}, [], true);
    this.applyColony(this.layout, true);
  }

  /** Kolektor energii gwiazdy na orbicie (v0.44): korpus ze stali i złote lustra zwrócone ku gwieździe. */
  setOrbital(level: number): void {
    const want = Math.max(0, Math.floor(level));
    if (want === this.orbitalLevel) return;
    this.orbitalLevel = want;
    if (this.orbital) {
      this.scene.remove(this.orbital);
      disposeObject(this.orbital);
      this.orbital = null;
    }
    if (want <= 0) return;
    const group = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: '#8a9794', roughness: 0.5, metalness: 0.5, flatShading: true });
    const gold = new THREE.MeshStandardMaterial({ color: '#c9a24a', emissive: '#3a2a08', roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide });
    const span = 0.12 + 0.014 * want;
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.05), steel));
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(span, 0.004, 0.05), gold);
      wing.position.x = side * (span / 2 + 0.022);
      group.add(wing);
    }
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), new THREE.MeshBasicMaterial({ color: '#bff6ff', toneMapped: false })));
    group.children[group.children.length - 1]!.position.y = 0.024;
    this.orbital = group;
    this.scene.add(group);
  }

  setGridVisible(visible: boolean): void {
    this.gridVisible = visible;
    if (this.fieldLines) this.fieldLines.visible = visible;
  }

  setHighlight(cells: readonly number[] | null, mode: HighlightMode = 'footprint'): void {
    const key = cells && cells.length > 0 ? `${mode}:${cells.join(',')}` : '';
    if (key === (this.highlight?.key ?? '')) return;
    if (this.highlight) {
      this.highlight.object.parent?.remove(this.highlight.object);
      disposeObject(this.highlight.object);
      const at = this.lineMaterials.indexOf(this.highlight.material);
      if (at >= 0) this.lineMaterials.splice(at, 1);
      this.highlight = null;
    }
    if (!key || !this.grid || !this.liftPoint) return;
    const positions: number[] = [];
    for (const i of mode === 'choice' ? cellBorders(this.grid, cells!) : outlineBorders(this.grid, cells!)) {
      const border = this.grid.borders[i]!;
      positions.push(...this.liftPoint(border.from), ...this.liftPoint(border.to));
    }
    const line = (width: number, color: string, opacity: number, order: number) => {
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(positions);
      const material = new LineMaterial({ linewidth: width, color, transparent: true, opacity, depthWrite: false, toneMapped: false });
      material.resolution.set(this.width, this.height);
      this.lineMaterials.push(material);
      const object = new LineSegments2(geometry, material);
      object.renderOrder = order;
      return { object, material };
    };
    const halo = line(HIGHLIGHT.halo, HIGHLIGHT.haloColor, HIGHLIGHT.haloAlpha, 3);
    const main = mode === 'choice' ? line(CHOICE.width, CHOICE.color, 0.95, 4) : line(HIGHLIGHT.width, HIGHLIGHT.color, 0.95, 4);
    const group = new THREE.Group().add(halo.object, main.object);
    group.name = 'highlight';
    this.spinGroup.add(group);
    this.highlight = { key, object: group, material: main.material };
  }

  /** Obrysy pól jako jedna siatka linii tuż nad terenem (jeden draw call; ukryta, gdy siatka wyłączona). */
  private buildFieldLines(planet: Planet, sampler: SurfaceSampler): void {
    if (this.fieldLines) {
      this.fieldLines.parent?.remove(this.fieldLines);
      disposeObject(this.fieldLines);
    }
    const grid = this.grid!;
    const positions: number[] = [];
    // Nad terenem z zapasem: płaskie fasety low-poly bywają wyżej niż teren w punkcie granicy.
    const lift = (p: readonly [number, number, number]) => {
      const h = sampler.height(...p);
      const r = Math.max(1.004, shapedRadius(planet, Math.max(h, sampler.lakeLevel(...p))) + 0.009);
      return [p[0] * r, p[1] * r, p[2] * r];
    };
    // Granice pól lądu i lodu (wzdłuż brzegów) — woda i lawa nie mają pól.
    for (const border of grid.borders) positions.push(...lift(border.from), ...lift(border.to));
    this.liftPoint = lift;
    this.lineMaterials.length = 0;
    const line = (width: number, color: string | null, opacity: number, order: number) => {
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(positions);
      const material = new LineMaterial({
        linewidth: width,
        color: color ?? '#ffffff',
        vertexColors: color === null,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
      });
      material.resolution.set(this.width, this.height);
      this.lineMaterials.push(material);
      const object = new LineSegments2(geometry, material);
      object.renderOrder = order;
      return object;
    };
    const halo = line(FIELD_LINE.halo, FIELD_LINE.haloColor, FIELD_LINE.haloAlpha, 1);
    const colored = line(FIELD_LINE.width, null, FIELD_LINE.alpha, 2);
    this.fieldColors = colored.geometry;
    this.fieldLines = new THREE.Group().add(halo, colored);
    this.fieldLines.name = 'fields';
    this.fieldLines.visible = this.gridVisible;
    this.spinGroup.add(this.fieldLines);
    this.colorFieldLines({});
  }

  /** Kolory obrysów według zajętości (wołane, gdy zmieniają się zajęte pola). */
  private colorFieldLines(plots: Plots): void {
    if (!this.fieldColors || !this.grid) return;
    const states = borderStates(this.grid, plots);
    const palette = Object.fromEntries(Object.entries(FIELD_COLORS).map(([k, hex]) => [k, new THREE.Color(hex)])) as Record<string, THREE.Color>;
    const colors = new Float32Array(states.length * 6);
    states.forEach((state, i) => {
      const c = palette[state]!;
      colors.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    });
    this.fieldColors.setColors(colors);
  }

  setStructures(levels: BuildingLevels, site: BuildSite | null = null, plots?: Plots, complexes: readonly Complex[] = []): void {
    if (plots && this.grid && this.shaped) {
      const key = plotsKey(plots, BUILDING_IDS, levels, complexes);
      if (key !== this.plotsKey) {
        this.plotsKey = key;
        this.layout = layoutFromPlots(this.grid, plots, this.shaped, BUILDING_IDS, levels, complexes, true);
        this.applyColony(this.layout, false);
        this.colorFieldLines(plots);
      }
    }
    this.colony.setConstruction(site);
  }

  /** Nowy układ kolonii: grunt i odkrywki w ścianach lądu, obrys kompleksów, zabudowa (wszystko raz, nie co klatkę). */
  private applyColony(layout: ColonyLayout, fresh: boolean): void {
    // Obniżenie odkrywki → rozstawienie budowli (stoją w odkrywce) → teren: grunt, odkrywka i fundamenty budowli.
    this.colony.setSink(this.pitSink(layout));
    if (fresh) this.colony.setLayout(layout);
    else this.colony.updateLayout(layout);
    this.paintLand(layout, this.colony.pads());
    // Wyrobisko może zejść poniżej poziomu morza — tafla oceanu nad nim jest wycięta.
    const pit = layout.complexes.find((c) => c.building === 'crystalMine');
    if (pit) this.oceanCut.value.set(...pit.core, Math.cos(pit.radius * pitShare(pit.stage)));
    else this.oceanCut.value.set(0, 1, 0, 2);
    this.buildOutlines(layout);
  }

  /**
   * Grunt kompleksów (v0.45): ścianki lądu w obszarze budynku dostają kolory zabudowy (`complexGround`), a w odkrywce
   * kryształów teren schodzi tarasami w głąb (nie poniżej poziomu morza). Zwraca obniżenie terenu w punkcie.
   */
  /** Kompleks pod punktem sfery (null — poza obszarami). */
  private complexAt(layout: ColonyLayout): (x: number, y: number, z: number) => ColonyComplex | null {
    if (!this.grid) return () => null;
    const lookup = cellLookup(this.grid);
    return (x, y, z) => {
      const cell = lookup(x, y, z);
      const index = cell >= 0 ? layout.owner[cell]! : -1;
      return index >= 0 ? layout.complexes[index]! : null;
    };
  }

  /** Obniżenie terenu odkrywki w punkcie (tarasy, głębsze z etapem). */
  private pitSink(layout: ColonyLayout): (dir: Vec3) => number {
    const complexAt = this.complexAt(layout);
    return (dir) => {
      const c = complexAt(...dir);
      return c ? pitSink3d(c, dir) : 0;
    };
  }

  private paintLand(layout: ColonyLayout, pads: readonly Pad[]): void {
    const land = this.land;
    const grid = this.grid;
    if (!land || !grid) return;
    const lookup = cellLookup(grid);
    const geometry = land.mesh.geometry;
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = geometry.getAttribute('color') as THREE.BufferAttribute;
    const pos = positions.array as Float32Array;
    const col = colors.array as Float32Array;
    pos.set(land.positions);
    col.set(land.colors);
    const complexAt = this.complexAt(layout);
    for (let t = 0; t < pos.length; t += 9) {
      const mx = pos[t]! + pos[t + 3]! + pos[t + 6]!;
      const my = pos[t + 1]! + pos[t + 4]! + pos[t + 7]!;
      const mz = pos[t + 2]! + pos[t + 5]! + pos[t + 8]!;
      const len = Math.hypot(mx, my, mz) || 1;
      const dir: Vec3 = [mx / len, my / len, mz / len];
      const cell = lookup(...dir);
      const c = complexAt(...dir);
      if (!c) continue;
      // Ścianki lądu (~0,03 rad) są ok. 3× większe niż działki wzoru zabudowy (`complexGround`) — w 3D wzór dawał
      // szachownicę (v0.47). Grunt = spokojna płyta w kolorze budynku, lekko inna na każdym polu; odkrywka zachowuje
      // tarasy (wzór o niskiej częstotliwości), bez świecących kryształów na pojedynczych ściankach. Szczegół — zabudowa 3D.
      const base = GROUND_BASE[c.building];
      const tone = 0.93 + 0.14 * hash01(cell, 7);
      // Wyrobisko: skała ciemniejsza z głębokością, tarasy na przemian jaśniejsze (warstwy), dno — ciemne.
      const sunk = pitSink3d(c, dir);
      const deep = sunk / pitDepthMax(c.level);
      const strata = Math.round(deep * 9) % 2 === 0 ? 1 : 0.88;
      const rgb = sunk <= 0 ? base.map((v) => Math.min(1, v * tone)) : deep >= 0.999 ? PIT_FLOOR : PIT_ROCK.map((v) => v * (1 - 0.55 * deep) * strata * tone);
      for (let v = 0; v < 3; v++) {
        const i = t + v * 3;
        col[i] = rgb[0]!;
        col[i + 1] = rgb[1]!;
        col[i + 2] = rgb[2]!;
        if (c.building !== 'crystalMine') continue;
        // Wyrobisko: wierzchołek obniżony schodkami tarasów — także poniżej poziomu morza (ocean nad nim wycięty).
        const r = Math.hypot(pos[i]!, pos[i + 1]!, pos[i + 2]!);
        const vd: Vec3 = [pos[i]! / r, pos[i + 1]! / r, pos[i + 2]! / r];
        const depth = pitSink3d(c, vd);
        if (depth <= 0) continue;
        const target = Math.max(PIT_MIN_RADIUS, r - depth) / r;
        pos[i] = pos[i]! * target;
        pos[i + 1] = pos[i + 1]! * target;
        pos[i + 2] = pos[i + 2]! * target;
      }
    }
    this.levelPads(pos, pads, complexAt);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.setAttribute('normal', new THREE.BufferAttribute(facetNormals(positions.array as Float32Array), 3));
    geometry.computeBoundingSphere();
  }

  /**
   * Fundamenty (v0.47): każdy wierzchołek lądu w zasięgu budowli własnego obszaru dostaje wysokość jej podstawy —
   * teren nie przebija płyt i budowle nie wiszą nad stokiem. Decyzja zależy tylko od położenia wierzchołka, więc
   * sąsiednie ścianki (osobne wierzchołki) zostają szczelne. Jezior nie zasypuje.
   */
  private levelPads(pos: Float32Array, pads: readonly Pad[], complexAt: (x: number, y: number, z: number) => ColonyComplex | null): void {
    const sampler = this.shaped;
    if (!sampler || pads.length === 0) return;
    const byBuilding = new Map<string, { d: Vec3; surface: number; cos: number }[]>();
    for (const p of pads) {
      const list = byBuilding.get(p.building) ?? [];
      list.push({ d: p.dir, surface: p.surface, cos: Math.cos(p.reach) });
      byBuilding.set(p.building, list);
    }
    for (let i = 0; i < pos.length; i += 3) {
      const r = Math.hypot(pos[i]!, pos[i + 1]!, pos[i + 2]!);
      const x = pos[i]! / r;
      const y = pos[i + 1]! / r;
      const z = pos[i + 2]! / r;
      const c = complexAt(x, y, z);
      const list = c ? byBuilding.get(c.building) : undefined;
      if (!list) continue;
      let best = null;
      let bestDot = -2;
      for (const p of list) {
        const dot = p.d[0] * x + p.d[1] * y + p.d[2] * z;
        if (dot >= p.cos && dot > bestDot) {
          bestDot = dot;
          best = p;
        }
      }
      if (!best || sampler.lakeLevel(x, y, z) > sampler.height(x, y, z)) continue;
      const target = Math.max(PIT_MIN_RADIUS, best.surface) / r;
      pos[i] = pos[i]! * target;
      pos[i + 1] = pos[i + 1]! * target;
      pos[i + 2] = pos[i + 2]! * target;
    }
  }

  /** Subtelny turkusowy obrys całych obszarów kompleksów (nie pojedynczych pól) — jedna siatka linii. */
  private buildOutlines(layout: ColonyLayout): void {
    if (this.outlines) {
      this.outlines.object.parent?.remove(this.outlines.object);
      disposeObject(this.outlines.object);
      for (const m of this.outlines.materials) {
        const at = this.lineMaterials.indexOf(m);
        if (at >= 0) this.lineMaterials.splice(at, 1);
      }
      this.outlines = null;
    }
    if (!this.grid || !this.liftPoint || layout.complexes.length === 0) return;
    const positions: number[] = [];
    for (const c of layout.complexes) {
      for (const i of outlineBorders(this.grid, c.cells)) {
        const border = this.grid.borders[i]!;
        positions.push(...this.liftPoint(border.from), ...this.liftPoint(border.to));
      }
    }
    if (positions.length === 0) return;
    const materials: LineMaterial[] = [];
    const line = (width: number, color: string, opacity: number, order: number) => {
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(positions);
      const material = new LineMaterial({ linewidth: width, color, transparent: true, opacity, depthWrite: false, toneMapped: false });
      material.resolution.set(this.width, this.height);
      this.lineMaterials.push(material);
      materials.push(material);
      const object = new LineSegments2(geometry, material);
      object.renderOrder = order;
      return object;
    };
    const group = new THREE.Group().add(line(2.6, '#041012', 0.35, 1), line(1.2, HIGHLIGHT.color, 0.55, 2));
    group.name = 'outlines';
    this.spinGroup.add(group);
    this.outlines = { object: group, materials };
  }

  pickStructure(x: number, y: number): StructureHit | null {
    if (!this.layout || !this.grid) return null;
    const f = this.height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    const view = {
      cx: this.focus.cx,
      cy: this.focus.cy,
      yaw: this.rotator.yaw,
      pitch: this.rotator.pitch,
      tilt: this.axialTilt,
      projection: { kind: 'perspective' as const, f, d: this.camera.position.z },
    };
    return pickComplex(this.layout, this.grid, view, x, y, true);
  }

  pickCell(x: number, y: number, cells: readonly number[]): number | null {
    if (!this.grid) return null;
    const f = this.height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    const view = {
      cx: this.focus.cx,
      cy: this.focus.cy,
      yaw: this.rotator.yaw,
      pitch: this.rotator.pitch,
      tilt: this.axialTilt,
      projection: { kind: 'perspective' as const, f, d: this.camera.position.z },
    };
    const r = this.focus.r * this.zoom;
    return pickCell(this.grid.cells.map((c) => c.center), cells, view, x, y, Math.max(30, r * 0.14));
  }

  showBuilding(id: BuildingId): boolean {
    const dir = this.layout?.complexes.find((c) => c.building === id)?.core;
    if (!dir) return false;
    const { yaw, pitch } = facingAngles(dir, this.axialTilt, focusLift(this.zoomer.target));
    this.rotator.turnTo(yaw, pitch, performance.now());
    return true;
  }

  beginDrag(): void {
    this.spinHeld = false;
    this.rotator.start(performance.now());
  }

  drag(dx: number, dy: number): void {
    // Przy przybliżeniu ten sam ruch palca obraca planetę wolniej.
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
    this.updateCamera();
  }

  holdSpin(hold: boolean): void {
    this.spinHeld = hold;
  }

  resetView(): void {
    this.spinHeld = false;
    this.zoomer.set(1, this.reducedMotion);
    this.updateCamera();
    this.rotator.turnTo(this.rotator.yaw, 0, performance.now());
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
    this.focus = { cx, cy, r: Math.max(40, r) };
    this.updateCamera();
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    // Grube linie siatki liczą grubość w pikselach ekranu.
    for (const material of this.lineMaterials) material.resolution.set(this.width, this.height);
    this.applyPixelRatio();
    this.updateCamera();
  }

  /** Gęstość pikseli z budżetu × automatyczna skala (spada, gdy klatki są za długie). */
  private applyPixelRatio(): void {
    const ratio = renderPixelRatio(this.width, this.height, window.devicePixelRatio) * this.resolution.scale;
    // Jedno przeliczenie bufora (setPixelRatio + setSize robiły to dwa razy — widoczne zacięcie).
    const size = this.renderer.getSize(new THREE.Vector2());
    if (ratio === this.renderer.getPixelRatio() && size.x === this.width && size.y === this.height) return;
    this.renderer.setDrawingBufferSize(this.width, this.height, ratio);
  }

  /** Skala rozdzielczości 3D (diagnostyka): 1 = pełna. */
  renderScale(): number {
    return this.resolution.scale;
  }

  /** Kamera tak, by planeta (promień 1) miała na ekranie promień `focus.r` w punkcie `focus`. */
  private updateCamera(): void {
    const { width, height } = this;
    this.camera.aspect = width / height;
    const halfFov = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const distance = height / (2 * this.focus.r * this.zoom * halfFov);
    // Minimum 1,3: przy dużym przybliżeniu kamera nie wchodzi w atmosferę.
    this.camera.position.set(0, 0, Math.max(1.3, distance));
    this.camera.lookAt(0, 0, 0);
    this.camera.setViewOffset(width, height, width / 2 - this.focus.cx, height / 2 - this.focus.cy, width, height);
    this.camera.updateProjectionMatrix();
  }

  private loop(time: number): void {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const frameMs = time - this.lastTime;
    const dt = Math.min(0.1, frameMs / 1000);
    this.lastTime = time;
    if (this.resolution.sample(frameMs)) this.applyPixelRatio();
    // Przy przybliżeniu od 2× planeta przestaje sama się obracać (od 1× do 2× autoobrót słabnie);
    // pokazany budynek wstrzymuje autoobrót całkiem.
    this.rotator.spinFactor = this.spinHeld ? 0 : Math.min(1, Math.max(0, 2 - this.zoom));
    this.rotator.update(dt, time);
    if (this.zoomer.update(dt)) this.updateCamera();
    this.spinGroup.rotation.y = this.rotator.yaw;
    this.tiltGroup.rotation.x = this.rotator.pitch;
    if (this.clouds) {
      this.clouds.rotation.y += dt * 0.012;
      const fade = 1 - Math.min(1, Math.max(0, (this.zoomer.value - CLOUDS_FADE[0]) / (CLOUDS_FADE[1] - CLOUDS_FADE[0])));
      ((this.clouds as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = this.cloudOpacity * fade;
      this.clouds.visible = fade > 0.01;
    }
    this.time += dt;
    // Lawa „oddycha”: animowany tylko kolor materiału (bez przeliczania geometrii).
    if (this.lava) (this.lava.material as THREE.MeshBasicMaterial).color.setScalar(0.85 + 0.15 * Math.sin(this.time * 1.6));
    this.colony.update(dt);
    if (this.orbital) {
      const [x, y, z] = collectorOrbit(this.time, this.still);
      this.orbital.position.set(x, y, z);
      // Lustra zwrócone ku gwieździe (światło z lewej-góry).
      this.orbital.lookAt(LIGHT_POSITION);
    }
    if (this.highlight && !this.still) this.highlight.material.opacity = 0.75 + 0.25 * Math.sin(this.time * 2.2);
    this.renderer.render(this.scene, this.camera);
  }

  gpuStats(): { drawCalls: number; triangles: number; geometries: number; textures: number } {
    const info = this.renderer.info;
    return { drawCalls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures };
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    for (const object of this.planetObjects) disposeObject(object);
    if (this.fieldLines) disposeObject(this.fieldLines);
    if (this.highlight) disposeObject(this.highlight.object);
    if (this.outlines) disposeObject(this.outlines.object);
    if (this.orbital) disposeObject(this.orbital);
    this.colony.dispose();
    this.renderer.dispose();
  }
}

/** Kolor bazowy gruntu kompleksu w 3D (ściany lądu): stal huty, beton krawędzi odkrywki, łupek elektrowni… */
const GROUND_BASE: Record<BuildingId, readonly [number, number, number]> = {
  metalMine: [0.36, 0.36, 0.34],
  crystalMine: [0.42, 0.44, 0.46],
  powerPlant: [0.24, 0.29, 0.33],
  storage: [0.47, 0.47, 0.44],
  antimatterCollector: [0.2, 0.17, 0.27],
  laboratory: [0.6, 0.65, 0.64],
};

/** Dno odkrywki kryształów w 3D (zamiast świecących kryształów na pojedynczych ściankach) i skała jej ścian. */
const PIT_FLOOR: readonly number[] = [0.07, 0.13, 0.16];
const PIT_ROCK: readonly number[] = [0.5, 0.46, 0.44];
/** Najgłębszy punkt wyrobiska (promień) — zapas nad środkiem planety. */
const PIT_MIN_RADIUS = 0.82;

/**
 * Tafla oceanu (i morza lawy) z otworem: piksele w stożku `cut` (kierunek, cos kąta) są odrzucane, więc wyrobisko
 * poniżej poziomu morza nie jest „zalane”. Jeden warunek w shaderze — bez dodatkowych rysowań.
 */
function cutOcean(material: THREE.MeshStandardMaterial, cut: { value: THREE.Vector4 }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPitCut = cut;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPitDir;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPitDir = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPitDir;\nuniform vec4 uPitCut;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (dot(normalize(vPitDir), uPitCut.xyz) > uPitCut.w) discard;');
  };
  material.customProgramCacheKey = () => 'ocean-pit-cut';
  material.needsUpdate = true;
}

function buildPlanetObjects(planet: Planet, sampler: SurfaceSampler): THREE.Object3D[] {
  const v = planet.visual;

  // Ląd low-poly: fasety z własnym kolorem (ostre granice biomów), tarasy wysokości, ciemne klify.
  const ico = new THREE.IcosahedronGeometry(1, SURFACE_DETAIL);
  const triangles = ico.getAttribute('position').array as Float32Array;
  const built = buildLowPolyLand(planet, sampler, triangles);
  ico.dispose();
  const landGeometry = new THREE.BufferGeometry();
  landGeometry.setAttribute('position', new THREE.BufferAttribute(built.positions, 3));
  landGeometry.setAttribute('color', new THREE.BufferAttribute(built.colors, 3));
  // Normalne faset przechylone ku górze (v0.47) zamiast `flatShading` — fasety widoczne, bez szachownicy światła.
  landGeometry.setAttribute('normal', new THREE.BufferAttribute(facetNormals(built.positions), 3));
  const land = new THREE.Mesh(
    landGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: Math.max(0.8, v.roughness), metalness: 0, flatShading: false }),
  );
  land.name = 'land';

  // Lawa na lądzie: osobna siatka bez cieniowania (świeci także nocą); jasność pulsuje w `loop`.
  const objects: THREE.Object3D[] = [land];
  if (built.lava.heat.length > 0) {
    const lavaGeometry = new THREE.BufferGeometry();
    lavaGeometry.setAttribute('position', new THREE.BufferAttribute(built.lava.positions, 3));
    const lavaColors = new Float32Array(built.lava.heat.length * 3);
    const cool = new THREE.Color(v.ocean.emissive ?? v.palette.shallowWater);
    const hot = new THREE.Color(1, 0.82, 0.45);
    built.lava.heat.forEach((heat, i) => {
      const c = cool.clone().lerp(hot, Math.max(0, heat - 0.5) * 1.2);
      lavaColors.set([c.r, c.g, c.b], i * 3);
    });
    lavaGeometry.setAttribute('color', new THREE.BufferAttribute(lavaColors, 3));
    const lava = new THREE.Mesh(
      lavaGeometry,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    lava.name = 'lava';
    objects.push(lava);
  }

  // Woda: fasetowana tafla; dno pod nią ma własne kolory (głębina → płycizna), więc prześwit jest ostry.
  // Morze lawy: nieprzezroczysta skorupa z teksturą, świecą tylko pęknięcia (ten sam wzór co w 2D).
  const lavaSea = v.hydrology.liquid === 'lava';
  const lavaLook = lavaSea ? createLavaSeaTextures(planet) : null;
  const ocean = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.001, 18),
    lavaLook
      ? new THREE.MeshStandardMaterial({
          map: lavaLook.map,
          emissiveMap: lavaLook.glow,
          emissive: new THREE.Color('#ffffff'),
          emissiveIntensity: 1.25,
          roughness: 0.9,
          metalness: 0,
          flatShading: true,
        })
      : new THREE.MeshStandardMaterial({
      color: new THREE.Color(v.palette.shallowWater),
      // Gładka tafla (v0.47): normalne kuli zamiast płaskich ścianek — bez „sześciokątów” odbicia.
      roughness: Math.max(0.55, v.ocean.roughness),
      metalness: 0,
      flatShading: false,
      transparent: true,
      opacity: Math.max(0.7, v.ocean.opacity),
      emissive: new THREE.Color(v.ocean.emissive ?? '#000000'),
      emissiveIntensity: v.ocean.emissive ? (v.ocean.emissiveIntensity ?? 1) : 0,
        }),
  );
  ocean.name = 'ocean';

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.03, 64, 40),
    new THREE.MeshStandardMaterial({
      map: createCloudTexture(v.noiseSeed, v.clouds),
      transparent: true,
      depthWrite: false,
      roughness: 1,
    }),
  );
  clouds.name = 'clouds';

  const atmosphere = createAtmosphere(v.atmosphereColor, v.atmosphereIntensity, LIGHT_POSITION, 1 + v.style.atmosphereWidth);
  return [...objects, ocean, clouds, ...atmosphere];
}

/**
 * Tekstury morza lawy w układzie UV `IcosahedronGeometry` (azymut, inklinacja): kolor skorupy z żyłami
 * i osobna mapa świecenia (czarna skorupa, jasne pęknięcia). 512 × 256 — ok. 1 MB pamięci grafiki.
 */
function createLavaSeaTextures(planet: Planet): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const width = 512;
  const height = 256;
  const make = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx, image: ctx.createImageData(width, height) };
  };
  const color = make();
  const glow = make();
  // Ten sam wzór i kolory co morze lawy w 2D (`surface.ts`), pęknięcia liczone raz na teksel.
  const veins = createLavaVeins(planet.visual.noiseSeed);
  const { crust, glow: hot } = lavaColors(planet);
  for (let row = 0; row < height; row++) {
    // Wiersz 0 obrazu = v = 1 (tekstury three są odwracane w pionie).
    const incl = (1 - (row + 0.5) / height - 0.5) * Math.PI;
    const r = Math.cos(incl);
    const y = -Math.sin(incl);
    for (let col = 0; col < width; col++) {
      const az = ((col + 0.5) / width - 0.5) * Math.PI * 2;
      const v = veins(-r * Math.cos(az), y, r * Math.sin(az));
      const c = [0, 1, 2].map((k) => crust[k]! + (hot[k]! - crust[k]!) * v);
      const g = v * 0.9;
      const i = (row * width + col) * 4;
      color.image.data.set([c[0]! * 255, c[1]! * 255, c[2]! * 255, 255], i);
      glow.image.data.set([c[0]! * g * 255, c[1]! * g * 255, c[2]! * g * 255, 255], i);
    }
  }
  const texture = (part: ReturnType<typeof make>) => {
    part.ctx.putImageData(part.image, 0, 0);
    const t = new THREE.CanvasTexture(part.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: texture(color), glow: texture(glow) };
}

function createCloudTexture(noiseSeed: number, look: Planet['visual']['clouds']): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  const noise = createNoise3D(noiseSeed ^ 0x5bd1e995);
  const color = new THREE.Color(look.color);
  const [r, g, b] = [color.r * 255, color.g * 255, color.b * 255];
  for (let row = 0; row < height; row++) {
    const lat = (row / (height - 1) - 0.5) * Math.PI;
    for (let col = 0; col < width; col++) {
      const lon = (col / width) * Math.PI * 2;
      const x = Math.cos(lat) * Math.cos(lon);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.sin(lon);
      const n = fbm(noise, x * 2.2 + 3, y * 4 + 3, z * 2.2 + 3, 5);
      // Chmury stylizowane: wyraźny brzeg (krótkie przejście), lżejsze — nie zasłaniają lądu.
      const density = Math.max(0, Math.min(1, (n - look.threshold) * 14)) * 0.75;
      const i = (row * width + col) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = density * look.opacity * 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      (material as THREE.MeshStandardMaterial).map?.dispose();
      (material as THREE.MeshStandardMaterial).emissiveMap?.dispose();
      material.dispose();
    }
  });
}
