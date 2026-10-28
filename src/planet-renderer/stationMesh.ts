// Stacja macierzysta na orbicie (v0.55, decyzja właściciela: „Pierścień”): obracający się pierścień ze stali na
// czterech szprychach, w środku rdzeń SI Matki z turkusowym światłem, na pierścieniu moduły magazynu orbitalnego
// (więcej z poziomem), z boku skrzydła paneli słonecznych. W budowie — tylko część pierścienia i rusztowanie.
// Kilka rysowań: pierścień, szprychy (instancje), moduły (instancje), rdzeń, poświata, maszt, panele (instancje).
import * as THREE from 'three';
import type { HomeStationLook } from './PlanetDisplay.ts';

/** Wymiary (ułamki promienia planety) i kolory — robocze. */
export const STATION_LOOK = {
  ring: 0.095,
  tube: 0.009,
  core: 0.021,
  spin: 0.35,
  maxModules: 8,
  steel: '#8f9b98',
  module: '#b3a58b',
  panel: '#c9a24a',
  light: '#6fe9ff',
} as const;


export interface StationMesh {
  group: THREE.Group;
  update(dt: number, still: boolean): void;
}

export function createStationMesh(look: HomeStationLook): StationMesh {
  const L = STATION_LOOK;
  const group = new THREE.Group();
  // Pierścień leży w płaszczyźnie XY obracanej w `spinner`; całość lekko pochylona, by był widoczny jako elipsa.
  const tilt = new THREE.Group();
  tilt.rotation.set(1.05, 0.35, 0);
  group.add(tilt);
  const spinner = new THREE.Group();
  tilt.add(spinner);
  const steel = new THREE.MeshStandardMaterial({ color: L.steel, roughness: 0.45, metalness: 0.55, flatShading: true });
  const arc = look.building ? Math.PI * 1.25 : Math.PI * 2;
  spinner.add(new THREE.Mesh(new THREE.TorusGeometry(L.ring, L.tube, 5, 28, arc), steel));
  // Szprychy od rdzenia do pierścienia.
  const spokes = new THREE.InstancedMesh(new THREE.BoxGeometry(L.ring, 0.004, 0.004), steel, 4);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const zAxis = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    q.setFromAxisAngle(zAxis, a);
    m.compose(new THREE.Vector3(Math.cos(a) * L.ring * 0.5, Math.sin(a) * L.ring * 0.5, 0), q, one);
    spokes.setMatrixAt(i, m);
  }
  spinner.add(spokes);
  // Moduły magazynu: skrzynie rozłożone równo na pierścieniu.
  const count = look.building ? 0 : Math.min(L.maxModules, look.modules);
  if (count > 0) {
    const modules = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.028, 0.02, 0.025),
      new THREE.MeshStandardMaterial({ color: L.module, roughness: 0.6, metalness: 0.3, flatShading: true }),
      count,
    );
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      q.setFromAxisAngle(zAxis, a);
      m.compose(new THREE.Vector3(Math.cos(a) * L.ring, Math.sin(a) * L.ring, 0), q, one);
      modules.setMatrixAt(i, m);
    }
    spinner.add(modules);
  }
  // Rdzeń SI Matki: stalowa kula ze świecącym turkusowym jądrem i poświatą (nie obraca się z pierścieniem).
  tilt.add(new THREE.Mesh(new THREE.IcosahedronGeometry(L.core, 0), steel));
  const lightMaterial = new THREE.MeshBasicMaterial({ color: L.light, toneMapped: false });
  const light = new THREE.Mesh(new THREE.IcosahedronGeometry(L.core * 0.62, 1), lightMaterial);
  light.position.z = L.core * 0.55;
  tilt.add(light);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(L.core * 1.9, 10, 8),
    new THREE.MeshBasicMaterial({ color: L.light, transparent: true, opacity: look.building ? 0.08 : 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  tilt.add(halo);
  // Maszt wzdłuż osi pierścienia i dwa skrzydła paneli słonecznych na jego końcach.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, L.ring * 2.4, 4), steel);
  mast.rotation.x = Math.PI / 2;
  tilt.add(mast);
  const panelCount = look.building ? 1 : 2;
  const panels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.095, 0.038, 0.002),
    new THREE.MeshStandardMaterial({ color: L.panel, emissive: '#3a2a08', roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide }),
    panelCount,
  );
  for (let i = 0; i < panelCount; i++) {
    const side = i === 0 ? 1 : -1;
    m.compose(new THREE.Vector3(0, 0, side * L.ring * 1.2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), one);
    panels.setMatrixAt(i, m);
  }
  tilt.add(panels);
  let time = 0;
  return {
    group,
    update(dt, still) {
      time += dt;
      if (still) return;
      spinner.rotation.z += dt * L.spin;
      // Światło rdzenia „oddycha” (tylko jasność materiału).
      lightMaterial.color.set(L.light).multiplyScalar(0.8 + 0.2 * Math.sin(time * 2.1));
    },
  };
}
