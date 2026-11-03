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
    const layer = Math.floor(hash01(seed + k, 31) * Math.max(1, Math.ceil(L * 0.6)));
    const s = (layer + 1 - pit.look.shelf / 2) / L;
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
