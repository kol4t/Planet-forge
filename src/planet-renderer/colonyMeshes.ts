import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BuildingId, BuildingLevels } from '../core/types.ts';
import type { BuildSite } from './PlanetDisplay.ts';
import { MAX_STRUCTURES, visibleStructures, type ColonyLayout } from './colony.ts';
import { STRUCTURE_COLORS } from './PlanetDisplay.ts';

// Zabudowa kolonii na powierzchni planety: każdy typ budynku = 2 InstancedMesh
// (bryła + światła), czyli stała liczba draw calli niezależnie od poziomów.

/** Wielkość budowli względem promienia planety (1). */
const STRUCTURE_SIZE = 0.052;
const GROW_SECONDS = 0.9;

type Shape = { body: THREE.BufferGeometry; light: THREE.BufferGeometry };

function prepare(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Wspólny format atrybutów (bez uv) — wymagany przez mergeGeometries.
  const clean = geometries.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    ng.deleteAttribute('uv');
    return ng;
  });
  const merged = mergeGeometries(clean)!;
  merged.computeVertexNormals();
  return merged;
}

function at(geometry: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0): THREE.BufferGeometry {
  geometry.rotateY(ry);
  geometry.translate(x, y, z);
  return geometry;
}

/** Kształty w jednostkach „1 = szerokość budowli”, podstawa na y = 0. */
function createShapes(): Record<BuildingId, Shape> {
  return {
    // Kopalnia: sześciokątny szyb + wieża wyciągowa.
    metalMine: {
      body: prepare([
        at(new THREE.CylinderGeometry(0.42, 0.5, 0.32, 6), 0, 0.16, 0),
        at(new THREE.BoxGeometry(0.16, 0.75, 0.16), 0.18, 0.5, 0),
        at(new THREE.BoxGeometry(0.4, 0.08, 0.1), 0.05, 0.86, 0),
      ]),
      light: prepare([at(new THREE.BoxGeometry(0.1, 0.1, 0.1), -0.12, 0.88, 0)]),
    },
    // Ekstraktor: niska kopuła z wystającym kryształem.
    crystalMine: {
      body: prepare([
        at(new THREE.CylinderGeometry(0.34, 0.46, 0.22, 8), 0, 0.11, 0),
        at(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), 0, 0.37, 0),
      ]),
      light: prepare([
        at(new THREE.OctahedronGeometry(0.2), 0, 0.68, 0),
        at(new THREE.OctahedronGeometry(0.09), 0.26, 0.3, 0.1),
      ]),
    },
    // Elektrownia: chłodnia kominowa + świecący pierścień.
    powerPlant: {
      body: prepare([
        at(new THREE.CylinderGeometry(0.24, 0.36, 0.78, 10, 1, true), 0, 0.39, 0),
        at(new THREE.BoxGeometry(0.3, 0.26, 0.3), 0.36, 0.13, 0.1),
      ]),
      light: prepare([at(new THREE.TorusGeometry(0.25, 0.045, 6, 14).rotateX(Math.PI / 2), 0, 0.8, 0)]),
    },
    // Magazyn: dwa silosy z kopułami + niska hala.
    storage: {
      body: prepare([
        at(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 10), -0.18, 0.25, 0),
        at(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), -0.18, 0.5, 0),
        at(new THREE.CylinderGeometry(0.16, 0.16, 0.38, 10), 0.2, 0.19, 0.08),
        at(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.2, 0.38, 0.08),
        at(new THREE.BoxGeometry(0.5, 0.16, 0.24), 0, 0.08, -0.22),
      ]),
      light: prepare([at(new THREE.BoxGeometry(0.06, 0.06, 0.06), -0.18, 0.72, 0)]),
    },
    // Kolektor antymaterii: smukła iglica na trójnogu, na szczycie świecąca kula w pierścieniu.
    antimatterCollector: {
      body: prepare([
        at(new THREE.CylinderGeometry(0.3, 0.38, 0.1, 8), 0, 0.05, 0),
        at(new THREE.CylinderGeometry(0.04, 0.1, 0.95, 6), 0, 0.57, 0),
        at(new THREE.BoxGeometry(0.06, 0.4, 0.06).rotateZ(0.5), 0.17, 0.25, 0),
        at(new THREE.BoxGeometry(0.06, 0.4, 0.06).rotateZ(-0.5), -0.17, 0.25, 0),
      ]),
      light: prepare([
        at(new THREE.IcosahedronGeometry(0.13, 1), 0, 1.12, 0),
        at(new THREE.TorusGeometry(0.21, 0.025, 4, 16).rotateX(Math.PI / 2), 0, 1.12, 0),
      ]),
    },
    // Laboratorium: niska kopuła obserwatorium z antenką i podstawą.
    laboratory: {
      body: prepare([
        at(new THREE.CylinderGeometry(0.36, 0.4, 0.14, 10), 0, 0.07, 0),
        at(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.14, 0),
        at(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), 0.14, 0.52, 0),
      ]),
      light: prepare([at(new THREE.BoxGeometry(0.08, 0.05, 0.3).rotateY(0.4), 0, 0.42, 0)]),
    },
  };
}

interface Group {
  body: THREE.InstancedMesh;
  light: THREE.InstancedMesh;
  /** Bieżąca i docelowa skala każdej budowli (0 = niewidoczna). */
  current: Float32Array;
  target: Float32Array;
}

export class ColonyMeshes {
  readonly object = new THREE.Group();
  private readonly groups = new Map<BuildingId, Group>();
  private layout: ColonyLayout | null = null;
  private levels: BuildingLevels | null = null;
  private animating = false;
  private readonly shapes = createShapes();
  /** Rusztowanie trwającej budowy: zarys budynku rosnący wraz z postępem. */
  private readonly scaffold: THREE.Mesh;
  private site: BuildSite | null = null;
  private time = 0;
  private readonly tmp = {
    m: new THREE.Matrix4(),
    q: new THREE.Quaternion(),
    spin: new THREE.Quaternion(),
    p: new THREE.Vector3(),
    s: new THREE.Vector3(),
    n: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
  };

  constructor(ids: readonly BuildingId[]) {
    this.object.name = 'colony';
    const shapes = this.shapes;
    this.scaffold = new THREE.Mesh(
      shapes.metalMine.body,
      new THREE.MeshBasicMaterial({ color: '#e6c77a', wireframe: true, transparent: true, depthWrite: false, toneMapped: false }),
    );
    this.scaffold.visible = false;
    this.scaffold.frustumCulled = false;
    this.object.add(this.scaffold);
    for (const id of ids) {
      const colors = STRUCTURE_COLORS[id];
      const body = new THREE.InstancedMesh(
        shapes[id].body,
        new THREE.MeshStandardMaterial({ color: colors.body, roughness: 0.6, metalness: 0.25, flatShading: true }),
        MAX_STRUCTURES,
      );
      const light = new THREE.InstancedMesh(
        shapes[id].light,
        new THREE.MeshBasicMaterial({ color: colors.light, toneMapped: false }),
        MAX_STRUCTURES,
      );
      for (const mesh of [body, light]) {
        mesh.count = 0;
        mesh.frustumCulled = false;
        this.object.add(mesh);
      }
      this.groups.set(id, {
        body,
        light,
        current: new Float32Array(MAX_STRUCTURES),
        target: new Float32Array(MAX_STRUCTURES),
      });
    }
  }

  /** Nowa planeta → nowe miejsca; budowle pojawiają się bez animacji. */
  setLayout(layout: ColonyLayout): void {
    this.layout = layout;
    this.levels = null;
    for (const group of this.groups.values()) {
      group.current.fill(0);
      group.target.fill(0);
      group.body.count = 0;
      group.light.count = 0;
    }
  }

  /**
   * Kolonia urosła o nowe pola (te same budowle zostają na swoich miejscach, nowe dochodzą na końcu
   * list) — bez zerowania animacji, więc nowa budowla „wyrasta” jak dotąd.
   */
  updateLayout(layout: ColonyLayout): void {
    this.layout = layout;
    if (this.levels) this.setLevels(this.levels, true);
  }

  setLevels(levels: BuildingLevels, force = false): void {
    if (!this.layout) return;
    const first = this.levels === null;
    if (!force && !first && [...this.groups.keys()].every((id) => this.levels![id] === levels[id])) return;
    this.levels = { ...levels };
    for (const [id, group] of this.groups) {
      const slots = this.layout.slots[id] ?? [];
      const level = levels[id] ?? 0;
      const count = Math.min(visibleStructures(level), slots.length);
      for (let i = 0; i < MAX_STRUCTURES; i++) {
        group.target[i] = i < count ? slots[i]!.size : 0;
        if (first) group.current[i] = group.target[i]!;
      }
      // Rysujemy też budowle znikające (np. nowa gra), dopóki nie zmaleją do zera.
      const drawn = Math.max(count, group.body.count);
      group.body.count = group.light.count = Math.min(drawn, slots.length);
    }
    this.animating = true;
    this.update(0);
  }

  /** Trwająca budowa (null = brak). Wołane często — tanie. */
  setConstruction(site: BuildSite | null): void {
    this.site = site;
    if (site) this.scaffold.geometry = this.shapes[site.building].body;
  }

  /** Miejsce budowli danego typu (do obrotu kamery), w układzie planety. */
  focusDir(id: BuildingId): [number, number, number] | null {
    const slots = this.layout?.slots[id];
    if (!slots?.length) return this.layout?.center ?? null;
    // Trwa budowa tego typu → pokaż rusztowanie; inaczej najnowszą budowlę.
    const level = this.site?.building === id ? this.site.targetLevel : (this.levels?.[id] ?? 1);
    return slots[slotIndex(level, slots.length)]!.dir;
  }

  update(dt: number): void {
    this.time += dt;
    this.updateScaffold();
    if (!this.animating || !this.layout) return;
    const { m, q, spin, p, s, n, up } = this.tmp;
    let stillMoving = false;
    const step = dt / GROW_SECONDS;
    for (const [id, group] of this.groups) {
      const slots = this.layout.slots[id] ?? [];
      let groupMoving = false;
      for (let i = 0; i < group.body.count; i++) {
        const target = group.target[i]!;
        let cur = group.current[i]!;
        if (cur !== target) {
          cur = target > cur ? Math.min(target, cur + step * Math.max(target, 0.3)) : Math.max(target, cur - step * 2);
          group.current[i] = cur;
          if (cur !== target) groupMoving = true;
        }
        const slot = slots[i]!;
        // Lekkie „przeskoczenie” przy wyrastaniu nowej budowli.
        const t = target > 0 ? cur / target : 0;
        const pop = target > 0 && t < 1 ? 1 + Math.sin(t * Math.PI) * 0.18 : 1;
        const size = cur * pop * STRUCTURE_SIZE;
        n.set(slot.dir[0], slot.dir[1], slot.dir[2]);
        q.setFromUnitVectors(up, n);
        spin.setFromAxisAngle(up, slot.spin);
        q.multiply(spin);
        p.copy(n).multiplyScalar(slot.surface - STRUCTURE_SIZE * 0.08);
        s.setScalar(Math.max(size, 1e-5));
        m.compose(p, q, s);
        group.body.setMatrixAt(i, m);
        group.light.setMatrixAt(i, m);
      }
      group.body.instanceMatrix.needsUpdate = true;
      group.light.instanceMatrix.needsUpdate = true;
      if (groupMoving) {
        stillMoving = true;
      } else {
        let visible = 0;
        for (let i = 0; i < MAX_STRUCTURES; i++) if (group.target[i]! > 0) visible = i + 1;
        group.body.count = group.light.count = Math.min(visible, slots.length);
      }
    }
    this.animating = stillMoving;
  }

  private updateScaffold(): void {
    const site = this.site;
    const slots = site && this.layout?.slots[site.building];
    if (!site || !slots?.length) {
      this.scaffold.visible = false;
      return;
    }
    const slot = slots[slotIndex(site.targetLevel, slots.length)]!;
    const { q, spin, p, s, n, up } = this.tmp;
    const size = STRUCTURE_SIZE * slot.size * 1.08;
    n.set(slot.dir[0], slot.dir[1], slot.dir[2]);
    q.setFromUnitVectors(up, n);
    spin.setFromAxisAngle(up, slot.spin);
    q.multiply(spin);
    p.copy(n).multiplyScalar(slot.surface - STRUCTURE_SIZE * 0.08);
    // Zarys „rośnie” od fundamentów do pełnej wysokości wraz z postępem budowy.
    s.set(size, size * (0.2 + 0.8 * site.progress), size);
    this.scaffold.position.copy(p);
    this.scaffold.quaternion.copy(q);
    this.scaffold.scale.copy(s);
    (this.scaffold.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.3 * Math.sin(this.time * 4);
    this.scaffold.visible = true;
  }

  dispose(): void {
    (this.scaffold.material as THREE.Material).dispose();
    for (const group of this.groups.values()) {
      for (const mesh of [group.body, group.light]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
    }
  }
}

/** Indeks miejsca dla budowli danego poziomu (powyżej limitu: ostatnie miejsce). */
function slotIndex(level: number, slotCount: number): number {
  return Math.max(0, Math.min(visibleStructures(level), slotCount) - 1);
}
