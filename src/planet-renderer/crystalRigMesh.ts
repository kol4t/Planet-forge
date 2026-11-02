// Megakonstrukt kryształów — unosząca się wiertnica nad środkiem krateru (prototyp wyglądu, decyzja właściciela
// 2026-11-02). Sześciokątna platforma ze stali, pod nią turkusowe płozy antygrawitacyjne, wokół pierścień odłamków
// kryształu, w dół świder i wiązka sięgająca dna krateru. Kołysze się lekko; świder i odłamki się obracają.
// Kilka rysowań (platforma, pokład, płozy — instancje, odłamki — instancje, świder, wiązka). Kolory robocze.
import * as THREE from 'three';
import type { Vec3 } from './colony.ts';

export const CRYSTAL_RIG_LOOK = {
  steel: '#7d8a88',
  deck: '#a9b5b2',
  glow: '#6fe9ff',
  crystal: '#8ff5e2',
} as const;

export interface CrystalRig {
  group: THREE.Group;
  update(dt: number, still: boolean): void;
}

/**
 * Wiertnica nad punktem `center` (kierunek od środka planety). `hover` — promień, na którym unosi się platforma,
 * `floor` — promień dna krateru (wiązka sięga do niego), `size` — skala (rośnie z kraterem).
 */
export function createCrystalRig(center: Vec3, hover: number, floor: number, size: number): CrystalRig {
  const L = CRYSTAL_RIG_LOOK;
  const group = new THREE.Group();
  const up = new THREE.Vector3(...center).normalize();
  group.position.copy(up.clone().multiplyScalar(hover));
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  const body = new THREE.Group();
  body.scale.setScalar(size);
  group.add(body);
  const steel = new THREE.MeshStandardMaterial({ color: L.steel, roughness: 0.45, metalness: 0.6, flatShading: true });
  // Platforma i pokład (sześciokąty).
  body.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 0.85, 0.18, 6), steel));
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.16, 6), new THREE.MeshStandardMaterial({ color: L.deck, roughness: 0.5, metalness: 0.4, flatShading: true }));
  deck.position.y = 0.17;
  body.add(deck);
  // Płozy antygrawitacyjne — świecące krążki pod platformą.
  const glow = new THREE.MeshBasicMaterial({ color: L.glow, toneMapped: false });
  const pods = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.06, 10), glow, 3);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    m.makeTranslation(Math.cos(a) * 0.62, -0.12, Math.sin(a) * 0.62);
    pods.setMatrixAt(i, m);
  }
  body.add(pods);
  // Pierścień odłamków kryształu wokół platformy (wydobyty kryształ unosi się w polu wiertnicy).
  const shardCount = 10;
  const shards = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({ color: L.crystal, emissive: '#1f6f66', roughness: 0.2, metalness: 0.1, flatShading: true }),
    shardCount,
  );
  const ring = new THREE.Group();
  ring.add(shards);
  body.add(ring);
  const q = new THREE.Quaternion();
  for (let i = 0; i < shardCount; i++) {
    const a = (i / shardCount) * Math.PI * 2;
    q.setFromEuler(new THREE.Euler(a, a * 2, 0));
    m.compose(new THREE.Vector3(Math.cos(a) * 1.35, 0.1 + 0.15 * Math.sin(a * 3), Math.sin(a) * 1.35), q, new THREE.Vector3(0.7, 1.4, 0.7));
    shards.setMatrixAt(i, m);
  }
  // Świder i wiązka w dół do dna krateru (długość w jednostkach planety, niezależna od skali platformy).
  const depth = Math.max(0.01, hover - floor);
  const drill = new THREE.Group();
  group.add(drill);
  const bitLen = Math.min(depth * 0.45, size * 2.2);
  const bit = new THREE.Mesh(new THREE.ConeGeometry(size * 0.28, bitLen, 6), steel);
  bit.rotation.x = Math.PI;
  bit.position.y = -bitLen / 2 - size * 0.1;
  drill.add(bit);
  const beamMaterial = new THREE.MeshBasicMaterial({ color: L.glow, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.12, size * 0.32, depth, 10, 1, true), beamMaterial);
  beam.position.y = -depth / 2;
  group.add(beam);
  let time = 0;
  return {
    group,
    update(dt, still) {
      if (still) return;
      time += dt;
      // Kołysanie platformy, obrót świdra i pierścienia odłamków, pulsująca wiązka.
      body.position.y = Math.sin(time * 1.3) * size * 0.08;
      drill.rotation.y += dt * 2.2;
      ring.rotation.y -= dt * 0.35;
      beamMaterial.opacity = 0.28 + 0.12 * Math.sin(time * 3.1);
    },
  };
}
