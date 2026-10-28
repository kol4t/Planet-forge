// Liny-rury wielkiej odkrywki (3D): od pierścienia wiszącego ekstraktora do kotew na krawędzi dziury. Jedna siatka
// (wszystkie liny i słupki kotew razem — jedno rysowanie), geometria liczona raz przy zmianie odkrywki. Płynący kryształ
// to tylko materiał: jasny błysk przesuwa się wzdłuż liny (czas w uniformie), geometria się nie zmienia.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PIT_CABLE } from '../data/openPit.ts';
import type { Vec3 } from './colony.ts';
import { HANG_ATTACH, type Hanging } from './colonyMeshes.ts';
import { cablePath, rimAnchor, type OpenPit } from './openPit.ts';

export interface PitCables {
  object: THREE.Mesh;
  /** Punkty zaczepienia na ekstraktorze i kotwy na krawędzi (do testów i diagnostyki). */
  anchors: Vec3[];
  update(dt: number): void;
}

/** Punkty zaczepienia lin na pierścieniu ekstraktora (układ planety) — zgodne z ramionami modelu (`hangingArms`). */
export function hangingAttachPoints(hanging: Hanging, count: number): Vec3[] {
  const n = new THREE.Vector3(...hanging.dir);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hanging.spin));
  const origin = n.clone().multiplyScalar(hanging.radius - hanging.size * 0.06);
  return Array.from({ length: count }, (_, k) => {
    const a = (k * Math.PI * 2) / count;
    const p = new THREE.Vector3(Math.cos(a) * HANG_ATTACH.radius, HANG_ATTACH.height, -Math.sin(a) * HANG_ATTACH.radius)
      .multiplyScalar(hanging.size)
      .applyQuaternion(q)
      .add(origin);
    return [p.x, p.y, p.z];
  });
}

/** Kierunek (bearing) punktu wokół środka odkrywki — taki jak w `offsetOnSphere`. */
function bearingAround(center: Vec3, p: Vec3): number {
  const helper: Vec3 = Math.abs(center[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const e = new THREE.Vector3(...helper).cross(new THREE.Vector3(...center)).normalize();
  const nth = new THREE.Vector3(...center).cross(e);
  const v = new THREE.Vector3(...p);
  return Math.atan2(v.dot(nth), v.dot(e));
}

/** Liny i kotwy. `groundAt` — promień terenu (już z dziurą) pod punktem. `still` — „Ogranicz ruch”: błysk stoi. */
export function createPitCables(pit: OpenPit, hanging: Hanging, groundAt: (dir: Vec3) => number, still: boolean): PitCables {
  const count = pit.look.cables;
  const starts = hangingAttachPoints(hanging, count);
  const parts: THREE.BufferGeometry[] = [];
  const anchors: Vec3[] = [];
  const cableColor = new THREE.Color(PIT_CABLE.color);
  const postColor = new THREE.Color(PIT_CABLE.postColor);
  const finish = (g: THREE.BufferGeometry, color: THREE.Color, flow: (i: number) => number) => {
    const geo = g.index ? g.toNonIndexed() : g;
    const n = geo.getAttribute('position').count;
    const colors = new Float32Array(n * 3);
    const flows = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      colors.set([color.r, color.g, color.b], i * 3);
      flows[i] = flow(i);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('flow', new THREE.BufferAttribute(flows, 1));
    geo.deleteAttribute('uv');
    return geo;
  };
  for (const start of starts) {
    const anchor = rimAnchor(pit, bearingAround(pit.center, start));
    anchors.push(anchor);
    const base = groundAt(anchor);
    const top: Vec3 = [anchor[0] * (base + PIT_CABLE.post), anchor[1] * (base + PIT_CABLE.post), anchor[2] * (base + PIT_CABLE.post)];
    const points = cablePath(start, top, pit.look.sag, PIT_CABLE.segments, groundAt, PIT_CABLE.radius * 2.5);
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const tube = new THREE.TubeGeometry(curve, PIT_CABLE.segments * 2, PIT_CABLE.radius, 5, false);
    // Wzdłuż liny uv.x = 0 (ekstraktor) … 1 (kotwa) — po tym płynie błysk.
    const tubeFlat = tube.toNonIndexed();
    const uvFlat = tubeFlat.getAttribute('uv');
    parts.push(finish(tubeFlat, cableColor, (i) => uvFlat.getX(i)));
    tube.dispose();
    // Słupek kotwy: od lekko pod terenem do zaczepu liny, wzdłuż pionu planety.
    const height = PIT_CABLE.post + 0.006;
    const post = new THREE.CylinderGeometry(PIT_CABLE.postRadius, PIT_CABLE.postRadius * 1.6, height, 6);
    const up = new THREE.Vector3(...anchor);
    post.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up));
    post.translate(...(up.clone().multiplyScalar(base - 0.006 + height / 2).toArray() as Vec3));
    parts.push(finish(post, postColor, () => -1));
  }
  const geometry = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  const time = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFlowTime = time;
    shader.uniforms.uFlowColor = { value: new THREE.Color(PIT_CABLE.flow) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float flow;\nvarying float vFlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlow = flow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFlow;\nuniform float uFlowTime;\nuniform vec3 uFlowColor;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
if (vFlow >= 0.0) {
  float w = fract(vFlow * ${PIT_CABLE.pulses.toFixed(1)} - uFlowTime);
  totalEmissiveRadiance += uFlowColor * (0.12 + 0.9 * exp(-pow((w - 0.5) * 10.0, 2.0)));
}`,
      );
  };
  material.customProgramCacheKey = () => 'pit-cable-flow';
  const object = new THREE.Mesh(geometry, material);
  object.name = 'pit-cables';
  return {
    object,
    anchors,
    update(dt: number) {
      if (!still) time.value = (time.value + dt * PIT_CABLE.speed * PIT_CABLE.pulses) % 1000;
    },
  };
}
