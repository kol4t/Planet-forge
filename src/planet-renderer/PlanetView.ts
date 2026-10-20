import * as THREE from 'three';
import { createRng } from '../core/random/rng.ts';
import { createNoise3D, fbm } from '../core/random/noise.ts';
import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';
import { BALANCE } from '../data/balance.ts';
import { createAtmosphere } from './atmosphere.ts';
import { layoutColony } from './colony.ts';
import { ColonyMeshes } from './colonyMeshes.ts';
import { DragRotator } from './input/dragRotator.ts';
import { facingAngles, type BuildSite, type PlanetDisplay } from './PlanetDisplay.ts';
import { createSurfaceSampler, type SurfaceSampler } from './surface.ts';

/** Szczegółowość siatki lądu (IcosahedronGeometry detail). Pilnuj na iPadzie! */
export const SURFACE_DETAIL = 56;
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
  private readonly rotator = new DragRotator();
  private readonly colony = new ColonyMeshes(BUILDING_IDS);
  private planetObjects: THREE.Object3D[] = [];
  private clouds: THREE.Object3D | undefined;
  private axialTilt = 0;
  private width = 1;
  private height = 1;
  private focus = { cx: 0.5, cy: 0.5, r: 200 };
  private zoom = 1;
  private frame = 0;
  private lastTime = performance.now();
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, onContextLost?: () => void) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // Na ekranach Retina wygładzanie jest prawie niewidoczne, a kosztuje dużo pamięci grafiki.
      antialias: (window.devicePixelRatio || 1) < 2,
      alpha: true,
      powerPreference: 'default',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      onContextLost?.();
    });

    this.scene.add(this.tiltGroup);
    this.tiltGroup.add(this.spinGroup);
    this.spinGroup.add(this.colony.object);
    this.scene.add(createStarfield());

    const sun = new THREE.DirectionalLight(0xffeedc, 2.6);
    sun.position.copy(LIGHT_POSITION);
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0x5d8f8a, 0x1a1410, 0.35));

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
    this.clouds = this.planetObjects.find((o) => o.name === 'clouds');
    for (const object of this.planetObjects) {
      // Atmosfera nie musi się obracać z planetą (jest symetryczna).
      if (object.name === 'atmosphere' || object.name === 'haze') this.tiltGroup.add(object);
      else this.spinGroup.add(object);
    }
    this.axialTilt = THREE.MathUtils.degToRad(planet.visual.axialTiltDeg);
    this.tiltGroup.rotation.z = this.axialTilt;
    this.colony.setLayout(layoutColony(planet, sampler, BUILDING_IDS));
  }

  setStructures(levels: BuildingLevels, site: BuildSite | null = null): void {
    this.colony.setLevels(levels);
    this.colony.setConstruction(site);
  }

  showBuilding(id: BuildingId): void {
    const dir = this.colony.focusDir(id);
    if (!dir) return;
    const { yaw, pitch } = facingAngles(dir, this.axialTilt);
    this.rotator.turnTo(yaw, pitch, performance.now());
  }

  beginDrag(): void {
    this.rotator.start(performance.now());
  }

  drag(dx: number, dy: number): void {
    // Przy przybliżeniu ten sam ruch palca obraca planetę wolniej.
    this.rotator.move(dx / this.zoom, dy / this.zoom, performance.now());
  }

  setZoom(zoom: number): void {
    this.zoom = Math.min(3.5, Math.max(1, zoom));
    this.updateCamera();
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
    this.renderer.setPixelRatio(renderPixelRatio(this.width, this.height, window.devicePixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    this.updateCamera();
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
    const dt = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.rotator.update(dt, time);
    this.spinGroup.rotation.y = this.rotator.yaw;
    this.tiltGroup.rotation.x = this.rotator.pitch;
    if (this.clouds) this.clouds.rotation.y += dt * 0.012;
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

  // Ląd: ikosfera z przesuniętymi wierzchołkami (wspólne wierzchołki → gładkie normalne).
  const ico = new THREE.IcosahedronGeometry(1, SURFACE_DETAIL);
  const source = ico.getAttribute('position');
  const indexByKey = new Map<string, number>();
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < source.count; i++) {
    p.fromBufferAttribute(source, i).normalize();
    const key = `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`;
    let index = indexByKey.get(key);
    if (index === undefined) {
      const h = sampler.height(p.x, p.y, p.z);
      const r = h >= v.seaLevel ? sampler.radius(h) : 1 - (v.seaLevel - h) * 0.25;
      index = positions.length / 3;
      indexByKey.set(key, index);
      positions.push(p.x * r, p.y * r, p.z * r);
      colors.push(...sampler.color(h, p.x, p.y, p.z));
    }
    indices.push(index);
  }
  ico.dispose();
  const landGeometry = new THREE.BufferGeometry();
  landGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  landGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  landGeometry.setIndex(indices);
  landGeometry.computeVertexNormals();
  const land = new THREE.Mesh(
    landGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: v.roughness, metalness: 0 }),
  );
  land.name = 'land';

  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(1.001, 96, 64),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(v.palette.shallowWater),
      roughness: v.ocean.roughness,
      metalness: 0.05,
      transparent: true,
      opacity: v.ocean.opacity,
      emissive: new THREE.Color(v.ocean.emissive ?? '#000000'),
      emissiveIntensity: v.ocean.emissive ? (v.ocean.emissiveIntensity ?? 1) : 0,
    }),
  );
  ocean.name = 'ocean';

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.035, 72, 48),
    new THREE.MeshStandardMaterial({
      map: createCloudTexture(v.noiseSeed, v.clouds),
      transparent: true,
      depthWrite: false,
      roughness: 1,
    }),
  );
  clouds.name = 'clouds';

  const atmosphere = createAtmosphere(v.atmosphereColor, v.atmosphereIntensity, LIGHT_POSITION);
  return [land, ocean, clouds, ...atmosphere];
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
      const density = Math.max(0, Math.min(1, (n - look.threshold) * 3.2));
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

function createStarfield(): THREE.Points {
  const rng = createRng('planet-forge-starfield');
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tints = ['#ffffff', '#cfe6ff', '#ffe6bf', '#a8d8cf'].map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    const y = rng.next() * 2 - 1;
    const angle = rng.next() * Math.PI * 2;
    const dist = 60 + rng.next() * 40;
    const r = Math.sqrt(1 - y * y);
    positions.set([dist * r * Math.cos(angle), dist * y, dist * r * Math.sin(angle) - 30], i * 3);
    const c = tints[rng.int(0, tints.length - 1)]!.clone().multiplyScalar(0.35 + rng.next() * 0.65);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 }),
  );
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      (material as THREE.MeshStandardMaterial).map?.dispose();
      material.dispose();
    }
  });
}
