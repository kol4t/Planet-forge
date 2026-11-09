// Ekran stacji w 3D (etap 1 planu stacji, decyzje właściciela: „Pierścień z osią”, kolory jak interfejs, rośnie
// z modułami). Rdzeń SI Matki na osi z masztem i skrzydłami paneli, pierścień na sześciu szprychach, moduły w gniazdach
// po zewnętrznej stronie pierścienia: magazyn — kontenery (więcej z poziomem), stocznia — ażurowy dok z kadłubem,
// puste gniazdo — płyta z turkusowym światłem, budowa — złote rusztowanie, „wkrótce” — blady szkielet.
// Low-poly, płaskie cieniowanie, kilkanaście rysowań.
import * as THREE from 'three';
import { socketAngle, type StationModuleView, type StationScreenModel } from '../core/station/stationScreen.ts';
import { ringRadius, socketOut, STATION_SCREEN as S } from './stationScreenLayout.ts';
import { AXIS_SOCKET } from '../data/stationModules.ts';

export interface StationScreenMesh {
  /** Obiekt do sceny: zewnętrzna grupa — pochylenie (stałe + pitch), wewnętrzna — obrót wokół osi (yaw). */
  group: THREE.Group;
  setOrientation(yaw: number, pitch: number): void;
  update(dt: number, still: boolean): void;
  dispose(): void;
}

const flat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.45, flatShading: true, ...extra });

export function createStationScreenMesh(model: StationScreenModel): StationScreenMesh {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);
  const stone = flat(S.stone);
  const steel = flat(S.steel);
  const gold = flat(S.gold, { emissive: '#3a2a08', roughness: 0.35, metalness: 0.6 });
  const lightMaterial = new THREE.MeshBasicMaterial({ color: S.light, toneMapped: false });
  const ready = model.ready;

  // Rdzeń: graniastosłup (oś pionowa) z turkusowym pasem światła i poświatą.
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(S.hub, S.hub * 1.1, S.hubHeight, 8), stone);
  spin.add(hub);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(S.hub * 1.02, S.hub * 1.02, S.hubHeight * 0.18, 8, 1, true), lightMaterial);
  spin.add(band);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(S.hub * 2.2, 12, 8),
    new THREE.MeshBasicMaterial({ color: S.light, transparent: true, opacity: ready ? 0.12 : 0.05, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  spin.add(halo);
  // Maszt wzdłuż osi i skrzydła paneli (złote) na obu końcach.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, S.mast * 2, 6), steel);
  spin.add(mast);
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.008, 0.16), gold, ready ? 4 : 2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < panels.count; i++) {
    const top = i % 2 === 0 ? 1 : -1;
    const side = i < 2 ? 1 : -1;
    m.compose(new THREE.Vector3(side * 0.3, top * S.mast * 0.92, 0), q.identity(), one);
    panels.setMatrixAt(i, m);
  }
  spin.add(panels);

  // Pierścień (w budowie — tylko część łuku) i sześć szprych do gniazd.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(S.ring, S.tube, 6, 48, ready ? Math.PI * 2 : Math.PI * 1.2), steel);
  ring.rotation.x = Math.PI / 2;
  spin.add(ring);
  const spokes = new THREE.InstancedMesh(new THREE.BoxGeometry(S.ring - S.hub, 0.022, 0.022), stone, 6);
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 6; i++) {
    const a = socketAngle(i);
    const mid = (S.ring + S.hub) / 2;
    q.setFromAxisAngle(yAxis, a);
    m.compose(new THREE.Vector3(Math.cos(a) * mid, 0, -Math.sin(a) * mid), q, one);
    spokes.setMatrixAt(i, m);
  }
  spin.add(spokes);
  // Drugi i trzeci pierścień (krok 2d-1) z łącznikami od poprzedniego pierścienia przy gniazdach.
  for (let r = 2; r <= model.coreLevel; r++) {
    const R = ringRadius(r);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(R, S.tube * 0.85, 6, 64), steel);
    outer.rotation.x = Math.PI / 2;
    spin.add(outer);
    const prev = ringRadius(r - 1);
    for (let k = 0; k < 3; k++) {
      const a = socketAngle(6 + (r - 2) * 3 + k);
      const link = new THREE.Mesh(new THREE.BoxGeometry(R - prev, 0.018, 0.018), stone);
      link.position.set(Math.cos(a) * (R + prev) / 2, 0, -Math.sin(a) * (R + prev) / 2);
      link.rotation.y = a;
      spin.add(link);
    }
  }

  // Moduły w gniazdach.
  const scaffold = new THREE.MeshBasicMaterial({ color: S.gold, wireframe: true });
  const ghost = new THREE.MeshBasicMaterial({ color: S.light, wireframe: true, transparent: true, opacity: 0.18 });
  const plate = flat('#1d2726');
  const containers = flat(S.container);
  for (const module of model.modules) {
    if (module.socket === null || module.state === 'locked') continue;
    if (module.socket === AXIS_SOCKET) {
      // Dok megakonstruktów (wkrótce): trzy stanowiska wokół osi pod rdzeniem.
      const dock = new THREE.Group();
      dock.position.y = -S.axisDock;
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), module.state === 'soon' ? ghost : scaffold);
        const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
        b.position.set(Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2);
        b.rotation.y = a;
        dock.add(b);
      }
      spin.add(dock);
      continue;
    }
    const holder = new THREE.Group();
    const a = socketAngle(module.socket);
    holder.position.set(Math.cos(a) * socketOut(module.socket), 0, -Math.sin(a) * socketOut(module.socket));
    holder.rotation.y = a;
    holder.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.16), plate));
    addModule(holder, module, { stone, steel, gold, containers, scaffold, ghost, lightMaterial });
    spin.add(holder);
  }

  let time = 0;
  return {
    group,
    setOrientation(yaw, pitch) {
      group.rotation.x = S.tilt + pitch;
      spin.rotation.y = yaw;
    },
    update(dt, still) {
      time += dt;
      if (still) return;
      lightMaterial.color.set(S.light).multiplyScalar(0.75 + 0.25 * Math.sin(time * 2));
    },
    dispose() {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
      });
      for (const mat of [stone, steel, gold, lightMaterial, scaffold, ghost, plate, containers]) mat.dispose();
      (halo.material as THREE.Material).dispose();
    },
  };
}

interface Materials {
  stone: THREE.Material;
  steel: THREE.Material;
  gold: THREE.Material;
  containers: THREE.Material;
  scaffold: THREE.Material;
  ghost: THREE.Material;
  lightMaterial: THREE.Material;
}

/** Bryła modułu w uchwycie gniazda (oś X uchwytu = na zewnątrz pierścienia). */
function addModule(holder: THREE.Group, module: StationModuleView, mat: Materials): void {
  if (module.state === 'soon') {
    holder.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.18), mat.ghost));
    return;
  }
  if (module.state === 'building' && module.level === 0) {
    holder.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.18), mat.scaffold));
    return;
  }
  if (module.level === 0) {
    // Puste gniazdo czekające na moduł: turkusowe światło na płycie.
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), mat.lightMaterial);
    lamp.position.y = 0.04;
    holder.add(lamp);
    return;
  }
  if (module.id.startsWith('storage')) {
    // Kontenery: 2 + poziom/2, maks. 8, w dwóch rzędach i piętrach.
    const count = Math.min(8, 1 + Math.ceil(module.level * 0.7));
    const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.045, 0.07), mat.containers, count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2) % 2;
      const floor = Math.floor(i / 4);
      m.makeTranslation(0.02 + col * 0.065, 0.04 + floor * 0.05, -0.04 + row * 0.08);
      boxes.setMatrixAt(i, m);
    }
    holder.add(boxes);
  } else if (module.id.startsWith('shipyard')) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.12), mat.scaffold);
    frame.position.x = 0.06;
    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 5), mat.steel);
    hull.rotation.z = -Math.PI / 2;
    hull.position.x = 0.06;
    holder.add(frame, hull);
  } else {
    holder.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.14), mat.stone));
  }
  if (module.state === 'building') {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), mat.scaffold);
    s.position.y = 0.05;
    holder.add(s);
  }
}
