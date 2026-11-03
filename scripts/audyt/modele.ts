// Audyt (2026-11): ile wierzchołków / trójkątów mają modele budowli (jeden egzemplarz każdego kształtu) i obiekty orbitalne.
// `node scripts/audyt/modele.ts`. Liczy geometrie zbudowane w kodzie (bez rysowania).
import * as THREE from 'three';
import { ColonyMeshes, createOrbitalConstruct } from '../../src/planet-renderer/colonyMeshes.ts';
import { createStationMesh } from '../../src/planet-renderer/stationMesh.ts';
import { createCrystalRig } from '../../src/planet-renderer/crystalRigMesh.ts';

const count = (o: THREE.Object3D) => {
  let v = 0, t = 0, meshes = 0;
  const seen = new Set<THREE.BufferGeometry>();
  o.traverse((x) => {
    const m = x as THREE.Mesh;
    if (!m.isMesh || seen.has(m.geometry)) return;
    seen.add(m.geometry);
    meshes++;
    const n = m.geometry.getAttribute('position')?.count ?? 0;
    v += n;
    t += m.geometry.index ? m.geometry.index.count / 3 : n / 3;
  });
  return { v, t: Math.round(t), meshes };
};
const colony = new ColonyMeshes(true);
const kinds = (colony as unknown as { kinds: Map<string, Record<string, THREE.InstancedMesh>> }).kinds;
const rows: [string, number, number][] = [];
for (const [id, k] of kinds) {
  let v = 0, t = 0;
  for (const part of ['body', 'pit', 'rotor', 'glow']) {
    const g = k[part]?.geometry;
    const n = g?.getAttribute('position')?.count ?? 0;
    v += n;
    t += g?.index ? g.index.count / 3 : n / 3;
  }
  rows.push([id, v, Math.round(t)]);
}
rows.sort((a, b) => b[2] - a[2]);
console.log(`Rodzaje kształtów budowli: ${rows.length} (każdy = 4 InstancedMesh: bryła, wykop, część ruchoma, światło)`);
console.log('| Kształt | Wierzchołki | Trójkąty |\n|---|---:|---:|');
for (const [id, v, t] of rows) console.log(`| ${id} | ${v} | ${t} |`);
const s = count(createStationMesh({ modules: 4, building: false, shipyard: true } as never).group);
console.log(`| Stacja macierzysta (4 moduły, stocznia) | ${s.v} | ${s.t} |`);
const o = count(createOrbitalConstruct());
console.log(`| Megakonstrukt metalu na orbicie | ${o.v} | ${o.t} |`);
const r = count(createCrystalRig({ dir: [0, 1, 0], radius: 1, size: 0.1, spin: 0 }, 5).group);
console.log(`| Wiertnica kryształów (5 lin) | ${r.v} | ${r.t} |`);
