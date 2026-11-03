// Megakonstrukt kryształów — wiertnica wisząca nad lejem na linach-rurach (prototyp wyglądu, decyzje właściciela
// 2026-11-02/03): jak wiszący ekstraktor wielkiej odkrywki (v0.49) — piasta, złoty pierścień zaczepów, ramiona po
// jednym na linę (3–5 lin, na najwyższym etapie 5), głowica wiertła w dół i gromada kryształów na wierzchu; liny do kotew
// na krawędzi leja rysuje `createPitCables` (te same punkty zaczepienia — `HANG_ATTACH`). Do tego pojedyncze gromady
// kryształów na półkach leja. Kolory robocze.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash01, type Vec3 } from './colony.ts';
import { HANG_ATTACH, type Hanging } from './colonyMeshes.ts';
import { pitBand, type OpenPit } from './openPit.ts';

export const CRYSTAL_RIG_LOOK = {
  steel: '#7d8a88',
  dark: '#3b4342',
  gold: '#c9a24a',
  crystal: '#8ff5e2',
  crystalGlow: '#1f8f84',
} as const;

export interface CrystalRig {
  group: THREE.Group;
  update(dt: number, still: boolean): void;
}

const colored = (g: THREE.BufferGeometry, hex: string): THREE.BufferGeometry => {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  return geo;
};

/**
 * Wiertnica w miejscu `hanging` (kierunek, promień zawieszenia, wielkość, obrót) z `cables` ramionami — zaczepy lin
 * w tych samych punktach co `hangingAttachPoints`. Jedna siatka stali (scalona) + kryształy (świecą) + obracający się
 * pierścień: 3 rysowania.
 */
export function createCrystalRig(hanging: Hanging, cables: number): CrystalRig {
  const L = CRYSTAL_RIG_LOOK;
  const group = new THREE.Group();
  const up = new THREE.Vector3(...hanging.dir).normalize();
  group.position.copy(up.clone().multiplyScalar(hanging.radius - hanging.size * 0.06));
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  group.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hanging.spin));
  const body = new THREE.Group();
  body.scale.setScalar(hanging.size);
  group.add(body);
  const hub = 0.32;
  const parts: THREE.BufferGeometry[] = [
    colored(new THREE.CylinderGeometry(hub, hub * 1.1, 0.16, 8).translate(0, 0.1, 0), L.steel),
    colored(new THREE.CylinderGeometry(HANG_ATTACH.radius, HANG_ATTACH.radius, 0.035, 16).translate(0, HANG_ATTACH.height, 0), L.gold),
    colored(new THREE.CylinderGeometry(hub * 0.55, hub * 0.9, 0.12, 8).translate(0, 0.24, 0), L.steel),
    colored(new THREE.CylinderGeometry(hub * 0.8, hub, 0.08, 8).translate(0, 0.33, 0), L.gold),
    // Głowica wiertła: stożek w dół, ku jądru.
    colored(new THREE.CylinderGeometry(hub * 0.75, 0.04, 0.34, 8).translate(0, -0.15, 0), L.dark),
  ];
  for (let k = 0; k < cables; k++) {
    const a = (k * Math.PI * 2) / cables;
    const len = HANG_ATTACH.radius - hub * 0.9;
    const mid = hub * 0.9 + len / 2;
    const arm = new THREE.BoxGeometry(len, 0.04, 0.05).rotateY(a).translate(Math.cos(a) * mid, HANG_ATTACH.height, -Math.sin(a) * mid);
    parts.push(colored(arm, L.steel));
  }
  const steel = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  steel.computeVertexNormals();
  body.add(new THREE.Mesh(steel, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5, flatShading: true })));
  // Gromada kryształów na wierzchu (urobek) — świeci.
  const spires = [
    [0, 0, 0.11, 3.4],
    [0.13, 0.06, 0.07, 2.4],
    [-0.11, 0.09, 0.06, 2.2],
    [0.02, -0.14, 0.07, 2.3],
  ] as const;
  const crystalGeo = mergeGeometries(spires.map(([x, z, r, k]) => new THREE.OctahedronGeometry(r).scale(0.7, k, 0.7).translate(x, 0.37 + r * k * 0.8, z)))!;
  const crystalMat = new THREE.MeshStandardMaterial({ color: L.crystal, emissive: L.crystalGlow, roughness: 0.2, metalness: 0.1, flatShading: true });
  body.add(new THREE.Mesh(crystalGeo, crystalMat));
  // Obracający się pierścień nad piastą.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.014, 4, 18).rotateX(Math.PI / 2).translate(0, 0.42, 0), new THREE.MeshStandardMaterial({ color: L.gold, roughness: 0.4, metalness: 0.6 }));
  body.add(ring);
  return {
    group,
    update(dt, still) {
      if (still) return;
      ring.rotation.y += dt * 0.6;
    },
  };
}

/**
 * Pojedyncze gromady kryształów na półkach leja (akcenty): `count` gromad po 2–3 odłamki, położone na środku półki
 * warstwy (deterministycznie z `seed`). `groundAt` — promień terenu z wykopanym lejem. Jedno rysowanie.
 */
export function createCraterCrystals(pit: OpenPit, groundAt: (dir: Vec3) => number, count: number, seed: number): THREE.Mesh {
  const L = pit.look.layers;
  const c = new THREE.Vector3(...pit.center);
  const helper = Math.abs(c.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const e1 = helper.clone().cross(c).normalize();
  const e2 = c.clone().cross(e1);
  const parts: THREE.BufferGeometry[] = [];
  const R = pit.centerDistance;
  for (let k = 0; k < count; k++) {
    // Tylko górne warstwy (skała) — niżej płaszcz i żar.
    const layer = Math.floor(hash01(seed + k, 31) * Math.max(1, Math.ceil(L * 0.8)));
    const s = (layer + 1 - pit.look.shelf * (0.15 + 0.7 * hash01(seed + k, 36))) / L;
    if (!pitBand(pit.look, s).shelf) continue;
    const angle = R - s * (R - pit.floorAngle);
    const bearing = hash01(seed + k, 32) * Math.PI * 2;
    const t = e1.clone().multiplyScalar(Math.cos(bearing)).add(e2.clone().multiplyScalar(Math.sin(bearing)));
    const dir = c.clone().multiplyScalar(Math.cos(angle)).add(t.multiplyScalar(Math.sin(angle))).normalize();
    const radius = groundAt([dir.x, dir.y, dir.z]);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const size = 0.01 + 0.008 * hash01(seed + k, 33);
    const shards = 2 + Math.floor(hash01(seed + k, 34) * 2);
    for (let j = 0; j < shards; j++) {
      const h = (2 + hash01(seed + k * 7 + j, 35) * 1.5) * size;
      const g = new THREE.OctahedronGeometry(size * 0.6, 0).scale(0.7, h / (size * 0.6), 0.7);
      g.rotateZ((j - 1) * 0.35).rotateY(j * 2.1 + bearing);
      g.translate((j - 1) * size * 0.5, h * 0.4, (j % 2) * size * 0.4);
      g.applyQuaternion(q);
      g.translate(dir.x * radius, dir.y * radius, dir.z * radius);
      parts.push(g);
    }
  }
  const geometry = parts.length > 0 ? mergeGeometries(parts)! : new THREE.BufferGeometry();
  for (const p of parts) p.dispose();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: CRYSTAL_RIG_LOOK.crystal, emissive: CRYSTAL_RIG_LOOK.crystalGlow, roughness: 0.2, metalness: 0.1, flatShading: true }));
  mesh.name = 'crater-crystals';
  return mesh;
}

/** Znaleziska widoczne w leju (prototyp): id znaleziska → liczba sztuk (`data/finds.ts`). */
export type CraterFinds = Readonly<Record<string, number>>;

/** Wygląd znalezisk w leju (robocze; bez treści fabularnych — tylko kształt i barwa z opisu znaleziska). */
export const CRATER_FIND_LOOK = {
  /** Kryształ rdzeniowy — wielki, regularny, sześciokątny kryształ na półce. */
  'core-crystal': { color: '#9ffcff', emissive: '#2bb8c4' },
  /** Odłamek rezonansowy — fioletowy odłamek unoszący się nad półką w pierścieniu. */
  'resonant-shard': { color: '#c9a8ff', emissive: '#6a3fd0' },
  /** Zapis z głębi — ciemna płyta z jasnym, uporządkowanym wzorem. */
  'deep-record': { color: '#26221f', emissive: '#e0a040' },
} as const;

/**
 * Obiekty znalezisk na półkach leja: każda sztuka to osobny obiekt na środku półki (deterministycznie z `seed` i id),
 * najwyżej 3 warstwy od dna. Kilka rysowań (po jednym na rodzaj). Odłamki unoszą się i obracają (`update`).
 */
export function createCraterFinds(pit: OpenPit, groundAt: (dir: Vec3) => number, finds: CraterFinds, seed: number): { group: THREE.Group; update(dt: number, still: boolean): void } {
  const group = new THREE.Group();
  group.name = 'crater-finds';
  const L = pit.look.layers;
  const c = new THREE.Vector3(...pit.center);
  const helper = Math.abs(c.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const e1 = helper.clone().cross(c).normalize();
  const e2 = c.clone().cross(e1);
  const R = pit.centerDistance;
  // Wielkość obiektów rośnie z lejem (najwyżej jak duża gromada kryształów × 3).
  const unit = Math.min(0.045, 0.015 + R * 0.06);
  const spinners: THREE.Object3D[] = [];
  let slot = 0;
  const place = (id: string, n: number): { dir: THREE.Vector3; radius: number; q: THREE.Quaternion } => {
    const h = hash01(seed + slot * 13, id.length + 40);
    slot++;
    const layer = Math.max(0, Math.min(L - 1, Math.floor(L * 0.25 + h * L * 0.5)));
    const s = (layer + 1 - pit.look.shelf / 2) / L;
    const angle = R - s * (R - pit.floorAngle);
    const bearing = (slot / 10) * Math.PI * 2 + n * 0.37 + hash01(seed + slot, 41) * 0.4;
    const t = e1.clone().multiplyScalar(Math.cos(bearing)).add(e2.clone().multiplyScalar(Math.sin(bearing)));
    const dir = c.clone().multiplyScalar(Math.cos(angle)).add(t.multiplyScalar(Math.sin(angle))).normalize();
    const radius = groundAt([dir.x, dir.y, dir.z]);
    return { dir, radius, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir) };
  };
  const material = (id: keyof typeof CRATER_FIND_LOOK) =>
    new THREE.MeshStandardMaterial({ color: CRATER_FIND_LOOK[id].color, emissive: CRATER_FIND_LOOK[id].emissive, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.2, flatShading: true });
  const at = (o: THREE.Object3D, p: { dir: THREE.Vector3; radius: number; q: THREE.Quaternion }) => {
    o.position.copy(p.dir.clone().multiplyScalar(p.radius));
    o.quaternion.copy(p.q);
    group.add(o);
  };
  for (let n = 0; n < (finds['core-crystal'] ?? 0); n++) {
    // Sześciokątny słup z ostrym szczytem i dwoma mniejszymi u podstawy.
    const g = mergeGeometries([
      new THREE.CylinderGeometry(unit * 0.45, unit * 0.5, unit * 2.2, 6).translate(0, unit * 1.1, 0),
      new THREE.ConeGeometry(unit * 0.45, unit * 0.9, 6).translate(0, unit * 2.65, 0),
      new THREE.CylinderGeometry(unit * 0.22, unit * 0.25, unit * 1.1, 6).rotateZ(0.5).translate(unit * 0.55, unit * 0.45, 0),
      new THREE.CylinderGeometry(unit * 0.2, unit * 0.22, unit * 0.9, 6).rotateX(-0.5).translate(0, unit * 0.4, unit * 0.5),
    ])!;
    at(new THREE.Mesh(g, material('core-crystal')), place('core-crystal', n));
  }
  for (let n = 0; n < (finds['resonant-shard'] ?? 0); n++) {
    // Odłamek w powietrzu nad półką, wokół cienki pierścień.
    const holder = new THREE.Group();
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(unit * 0.6, 0).scale(0.6, 1.8, 0.6), material('resonant-shard'));
    shard.position.y = unit * 2.2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(unit * 0.9, unit * 0.07, 4, 16).rotateX(Math.PI / 2), material('resonant-shard'));
    ring.position.y = unit * 2.2;
    holder.add(shard, ring);
    spinners.push(shard);
    at(holder, place('resonant-shard', n));
  }
  for (let n = 0; n < (finds['deep-record'] ?? 0); n++) {
    // Pionowa ciemna płyta z jasnymi, równoległymi pasami (uporządkowany wzór).
    const holder = new THREE.Group();
    holder.add(new THREE.Mesh(new THREE.BoxGeometry(unit * 1.6, unit * 2.4, unit * 0.3).translate(0, unit * 1.2, 0), new THREE.MeshStandardMaterial({ color: CRATER_FIND_LOOK['deep-record'].color, roughness: 0.6, metalness: 0.3, flatShading: true })));
    const lines = mergeGeometries([0.6, 1.1, 1.6, 2.0].map((y, i) => new THREE.BoxGeometry(unit * (1.2 - i * 0.15), unit * 0.08, unit * 0.34).translate(0, unit * y, 0)))!;
    holder.add(new THREE.Mesh(lines, new THREE.MeshBasicMaterial({ color: CRATER_FIND_LOOK['deep-record'].emissive, toneMapped: false })));
    at(holder, place('deep-record', n));
  }
  let time = 0;
  return {
    group,
    update(dt, still) {
      if (still) return;
      time += dt;
      for (const [i, o] of spinners.entries()) {
        o.rotation.y += dt * 0.8;
        o.position.y = unit * (2.2 + 0.25 * Math.sin(time * 1.5 + i));
      }
    },
  };
}
