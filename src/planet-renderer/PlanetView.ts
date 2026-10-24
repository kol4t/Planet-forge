import * as THREE from 'three';
import { createNoise3D, fbm } from '../core/random/noise.ts';
import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { createAtmosphere } from './atmosphere.ts';
import { layoutColony, type ColonyLayout } from './colony.ts';
import { ColonyMeshes } from './colonyMeshes.ts';
import { DragRotator } from './input/dragRotator.ts';
import { ZoomSmoother } from './input/zoom.ts';
import { AdaptiveResolution } from './adaptiveResolution.ts';
import { visibleStructures } from './colony.ts';
import { levelsWithSite, pickStructureHit, type StructureHit } from './pick.ts';
import { facingAngles, focusLift, type BuildSite, type PlanetDisplay } from './PlanetDisplay.ts';
import { buildLowPolyLand, shapedRadius } from './lowPoly.ts';
import { createLavaVeins, createSurfaceSampler, lavaColors, type SurfaceSampler } from './surface.ts';

/**
 * Szczegółowość siatki lądu (IcosahedronGeometry detail): 20 × (n+1)² faset.
 * 40 → ~34 tys. faset (low-poly, ale z czytelną rzeźbą). Pilnuj na iPadzie!
 */
export const SURFACE_DETAIL = 40;
const FOV = 32;
const LIGHT_POSITION = new THREE.Vector3(-4, 2.5, 3.5);
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
  private readonly colony = new ColonyMeshes(BUILDING_IDS);
  private planetObjects: THREE.Object3D[] = [];
  private readonly sun = new THREE.DirectionalLight(0xffeedc, 2.4);
  private readonly ambient = new THREE.HemisphereLight(0x4f7383, 0x07080a, 0.12);
  private clouds: THREE.Object3D | undefined;
  private lava: THREE.Mesh | undefined;
  private time = 0;
  /** Rozmieszczenie i poziomy kolonii — do wyboru budowli dotknięciem. */
  private layout: ColonyLayout | undefined;
  private levels: BuildingLevels | undefined;
  private site: BuildSite | null = null;
  private axialTilt = 0;
  private width = 1;
  private height = 1;
  private focus = { cx: 0.5, cy: 0.5, r: 200 };
  private readonly zoomer = new ZoomSmoother();
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
    this.lava = this.planetObjects.find((o): o is THREE.Mesh => o.name === 'lava' && o instanceof THREE.Mesh);
    for (const object of this.planetObjects) {
      // Atmosfera nie musi się obracać z planetą (jest symetryczna).
      if (object.name === 'atmosphere' || object.name === 'haze') this.tiltGroup.add(object);
      else this.spinGroup.add(object);
    }
    this.axialTilt = THREE.MathUtils.degToRad(planet.visual.axialTiltDeg);
    this.tiltGroup.rotation.z = this.axialTilt;
    // Budowle stoją na powierzchni 3D (tarasy i wyższe góry), nie na gładkiej wersji z 2D.
    const shaped: SurfaceSampler = { ...sampler, radius: (h) => shapedRadius(planet, h) };
    this.layout = layoutColony(planet, shaped, BUILDING_IDS);
    this.colony.setLayout(this.layout);
  }

  setStructures(levels: BuildingLevels, site: BuildSite | null = null): void {
    this.levels = levels;
    this.site = site;
    this.colony.setLevels(levels);
    this.colony.setConstruction(site);
  }

  pickStructure(x: number, y: number): StructureHit | null {
    if (!this.layout || !this.levels) return null;
    const f = this.height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    const view = {
      cx: this.focus.cx,
      cy: this.focus.cy,
      yaw: this.rotator.yaw,
      pitch: this.rotator.pitch,
      tilt: this.axialTilt,
      projection: { kind: 'perspective' as const, f, d: this.camera.position.z },
    };
    return pickStructureHit(this.layout, levelsWithSite(this.levels, this.site), view, x, y, undefined, true);
  }

  showBuilding(id: BuildingId, index?: number): boolean {
    const levels = this.levels ? levelsWithSite(this.levels, this.site) : null;
    if (!levels || visibleStructures(levels[id] ?? 0) === 0) return false;
    const dir = index !== undefined ? this.layout?.slots[id]?.[index]?.dir : this.colony.focusDir(id);
    if (!dir) return false;
    const { yaw, pitch } = facingAngles(dir, this.axialTilt, focusLift(this.zoomer.target));
    this.rotator.turnTo(yaw, pitch, performance.now());
    return true;
  }

  beginDrag(): void {
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

  resetView(): void {
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
    this.applyPixelRatio();
    this.updateCamera();
  }

  /** Gęstość pikseli z budżetu × automatyczna skala (spada, gdy klatki są za długie). */
  private applyPixelRatio(): void {
    const ratio = renderPixelRatio(this.width, this.height, window.devicePixelRatio) * this.resolution.scale;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.width, this.height, false);
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
    // Przy przybliżeniu od 2× planeta przestaje sama się obracać (od 1× do 2× autoobrót słabnie).
    this.rotator.spinFactor = Math.min(1, Math.max(0, 2 - this.zoom));
    this.rotator.update(dt, time);
    if (this.zoomer.update(dt)) this.updateCamera();
    this.spinGroup.rotation.y = this.rotator.yaw;
    this.tiltGroup.rotation.x = this.rotator.pitch;
    if (this.clouds) this.clouds.rotation.y += dt * 0.012;
    this.time += dt;
    // Lawa „oddycha”: animowany tylko kolor materiału (bez przeliczania geometrii).
    if (this.lava) (this.lava.material as THREE.MeshBasicMaterial).color.setScalar(0.85 + 0.15 * Math.sin(this.time * 1.6));
    this.colony.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    for (const object of this.planetObjects) disposeObject(object);
    this.colony.dispose();
    this.renderer.dispose();
  }
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
  landGeometry.computeVertexNormals();
  const land = new THREE.Mesh(
    landGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: Math.max(0.8, v.roughness), metalness: 0, flatShading: true }),
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
      roughness: Math.max(0.45, v.ocean.roughness),
      metalness: 0,
      flatShading: true,
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
