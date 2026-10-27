import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BuildingId, BuildingLevels } from '../core/types.ts';
import type { BuildSite } from './PlanetDisplay.ts';
import { groupFull, MAX_STRUCTURES, RIG_BUILDINGS, visibleStructures, type ColonyLayout } from './colony.ts';
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

/** Kolor części bryły (stal / złote maszyny — paleta szkiców właściciela, v0.38.1). */
const STEEL = '#6f7b78';
const GOLD = '#c9a24a';
function paint(geometry: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new THREE.Color(hex);
  const count = g.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
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

/** Wiertło pełnego pola i szyb główny kompleksu (v0.38) — większe niż zwykła budowla. */
const RIG_SIZE = 0.085;
const HUB_SIZE = 0.13;
const MAX_RIGS = 70;
const MAX_HUBS = 24;
const PIPE_SEGMENTS = 5;
/** Czas animacji łączenia w kompleks (s). */
const MERGE_SECONDS = 2.4;
const MAX_PIPES = 72 * PIPE_SEGMENTS;

type BigShape = { body: THREE.BufferGeometry; pit: THREE.BufferGeometry; rotor: THREE.BufferGeometry; glow: THREE.BufferGeometry };

/**
 * Szyb jako bryła: podwyższenie z otworem — ściany szybu schodzą od krawędzi niemal do gruntu, na dnie
 * świecące kryształy. Teren planety nie przykrywa wnętrza, bo szyb jest wpuszczony w platformę.
 */
function createRig(): BigShape {
  const legs = [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    return at(new THREE.BoxGeometry(0.05, 0.62, 0.05).rotateZ(-0.38), Math.cos(a) * 0.3, 0.5, Math.sin(a) * 0.3, -a);
  });
  return {
    body: prepare([
      paint(at(new THREE.CylinderGeometry(0.5, 0.58, 0.24, 8, 1, true), 0, 0.12, 0), STEEL),
      paint(at(new THREE.RingGeometry(0.27, 0.5, 8).rotateX(-Math.PI / 2), 0, 0.24, 0), STEEL),
      ...legs.map((g) => paint(g, GOLD)),
      paint(at(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 6), 0, 0.8, 0), GOLD),
      // Hale i ramię transportowe na krawędzi platformy (v0.38.1 — modułowa infrastruktura).
      paint(at(new THREE.BoxGeometry(0.2, 0.14, 0.32), 0.44, 0.31, 0.05, 0.2), GOLD),
      paint(at(new THREE.BoxGeometry(0.16, 0.1, 0.2), -0.42, 0.29, -0.12, -0.3), STEEL),
      paint(at(new THREE.BoxGeometry(0.06, 0.05, 0.4).rotateX(0.35), 0.18, 0.38, 0.3), GOLD),
    ]),
    pit: prepare([
      at(new THREE.CylinderGeometry(0.27, 0.19, 0.22, 8, 1, true), 0, 0.13, 0),
      at(new THREE.CircleGeometry(0.19, 8).rotateX(-Math.PI / 2), 0, 0.02, 0),
    ]),
    rotor: prepare([
      at(new THREE.ConeGeometry(0.08, 0.34, 6).rotateX(Math.PI), 0, 0.3, 0),
      at(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 4), 0, 0.6, 0),
      at(new THREE.BoxGeometry(0.42, 0.035, 0.05), 0, 0.72, 0),
      at(new THREE.OctahedronGeometry(0.06), 0.12, 0.06, 0.04),
      at(new THREE.OctahedronGeometry(0.05), -0.1, 0.05, -0.06),
    ]),
    // Świecąca kolumna kryształu w szybie i kryształy wyrastające przy krawędzi platformy.
    glow: prepare([
      at(new THREE.CylinderGeometry(0.06, 0.07, 0.42, 6), 0, 0.23, 0),
      at(new THREE.OctahedronGeometry(0.09).scale(0.6, 1.8, 0.6), -0.5, 0.18, 0.28),
      at(new THREE.OctahedronGeometry(0.07).scale(0.6, 1.8, 0.6), -0.36, 0.14, 0.42),
      at(new THREE.OctahedronGeometry(0.08).scale(0.6, 1.8, 0.6), 0.32, 0.15, -0.46),
    ]),
  };
}

function createHub(): BigShape {
  const towers = [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    return at(new THREE.BoxGeometry(0.09, 0.42, 0.09), Math.cos(a) * 0.4, 0.33, Math.sin(a) * 0.4);
  });
  return {
    body: prepare([
      paint(at(new THREE.CylinderGeometry(0.52, 0.58, 0.2, 8, 1, true), 0, 0.1, 0), STEEL),
      paint(at(new THREE.RingGeometry(0.24, 0.52, 8).rotateX(-Math.PI / 2), 0, 0.2, 0), STEEL),
      ...towers.map((g) => paint(g, STEEL)),
      paint(at(new THREE.BoxGeometry(0.06, 0.5, 0.06), 0.2, 0.45, 0), GOLD),
      paint(at(new THREE.BoxGeometry(0.06, 0.5, 0.06), -0.2, 0.45, 0), GOLD),
      paint(at(new THREE.BoxGeometry(0.5, 0.07, 0.1), 0, 0.72, 0), GOLD),
    ]),
    pit: prepare([
      at(new THREE.CylinderGeometry(0.24, 0.16, 0.19, 8, 1, true), 0, 0.11, 0),
      at(new THREE.CircleGeometry(0.16, 8).rotateX(-Math.PI / 2), 0, 0.02, 0),
    ]),
    rotor: prepare([
      at(new THREE.ConeGeometry(0.1, 0.36, 8).rotateX(Math.PI), 0, 0.28, 0),
      at(new THREE.TorusGeometry(0.17, 0.025, 4, 12).rotateX(Math.PI / 2), 0, 0.5, 0),
      at(new THREE.BoxGeometry(0.36, 0.03, 0.04), 0, 0.5, 0),
      at(new THREE.OctahedronGeometry(0.07), 0.08, 0.06, 0.05),
      at(new THREE.OctahedronGeometry(0.06), -0.09, 0.05, -0.04),
      at(new THREE.OctahedronGeometry(0.05), 0.02, 0.05, -0.1),
    ]),
    glow: prepare([
      at(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 6), 0, 0.27, 0),
      at(new THREE.OctahedronGeometry(0.1).scale(0.6, 1.8, 0.6), 0.5, 0.18, 0.3),
      at(new THREE.OctahedronGeometry(0.08).scale(0.6, 1.8, 0.6), -0.52, 0.15, -0.2),
      at(new THREE.OctahedronGeometry(0.07).scale(0.6, 1.8, 0.6), 0.15, 0.13, -0.56),
    ]),
  };
}

/** Zakład przetwórczy metalu (pełne pole, v0.39): hala ze złotym dachem, kominy, okna pieców, dźwig. */
function createFactory(): BigShape {
  return {
    body: prepare([
      paint(at(new THREE.CylinderGeometry(0.5, 0.56, 0.14, 6), 0, 0.07, 0), STEEL),
      paint(at(new THREE.BoxGeometry(0.5, 0.26, 0.34), 0.05, 0.27, -0.05), STEEL),
      paint(at(new THREE.BoxGeometry(0.54, 0.05, 0.38), 0.05, 0.42, -0.05), GOLD),
      paint(at(new THREE.CylinderGeometry(0.05, 0.065, 0.46, 6), -0.28, 0.37, 0.18), STEEL),
      paint(at(new THREE.CylinderGeometry(0.04, 0.05, 0.32, 6), -0.15, 0.3, 0.26), STEEL),
      paint(at(new THREE.BoxGeometry(0.04, 0.52, 0.04), 0.32, 0.38, -0.28), GOLD),
      paint(at(new THREE.BoxGeometry(0.08, 0.04, 0.46).rotateX(0.3), 0.36, 0.22, 0.12), GOLD),
    ]),
    // Ciemne bramy hali (zamiast szybu).
    pit: prepare([at(new THREE.BoxGeometry(0.14, 0.12, 0.02), 0.2, 0.2, 0.125), at(new THREE.BoxGeometry(0.1, 0.1, 0.02), -0.08, 0.19, 0.125)]),
    // Dźwig nad halą obraca się powoli.
    rotor: prepare([at(new THREE.BoxGeometry(0.62, 0.03, 0.05), 0.1, 0.6, 0), at(new THREE.BoxGeometry(0.03, 0.12, 0.03), 0.36, 0.53, 0)]),
    // Żar: okna pieców, wylot komina, kadź z roztopionym metalem.
    glow: prepare([
      at(new THREE.BoxGeometry(0.36, 0.05, 0.01), 0.05, 0.31, 0.125),
      at(new THREE.CylinderGeometry(0.052, 0.052, 0.03, 6), -0.28, 0.61, 0.18),
      at(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8), 0.28, 0.15, 0.3),
    ]),
  };
}

/** Wielka fabryka (hala główna kompleksu metalu, v0.39): kilka hal, trzy kominy, zbiorniki, żar okien. */
function createFoundry(): BigShape {
  return {
    body: prepare([
      paint(at(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 8), 0, 0.06, 0), STEEL),
      paint(at(new THREE.BoxGeometry(0.6, 0.3, 0.4), 0, 0.27, 0), STEEL),
      paint(at(new THREE.BoxGeometry(0.64, 0.05, 0.44), 0, 0.44, 0), GOLD),
      paint(at(new THREE.BoxGeometry(0.25, 0.2, 0.3), 0.38, 0.22, 0.2), STEEL),
      paint(at(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 6), -0.3, 0.42, -0.25), STEEL),
      paint(at(new THREE.CylinderGeometry(0.05, 0.07, 0.66, 6), -0.15, 0.45, -0.28), STEEL),
      paint(at(new THREE.CylinderGeometry(0.05, 0.07, 0.56, 6), 0, 0.4, -0.3), STEEL),
      paint(at(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8), 0.36, 0.2, -0.3), GOLD),
      paint(at(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8), -0.4, 0.18, 0.28), GOLD),
    ]),
    pit: prepare([at(new THREE.BoxGeometry(0.16, 0.14, 0.02), 0, 0.19, 0.205), at(new THREE.BoxGeometry(0.1, 0.1, 0.02), 0.38, 0.17, 0.355)]),
    rotor: prepare([at(new THREE.BoxGeometry(0.7, 0.03, 0.05), 0, 0.66, 0.05), at(new THREE.BoxGeometry(0.03, 0.14, 0.03), 0.3, 0.58, 0.05)]),
    glow: prepare([
      at(new THREE.BoxGeometry(0.5, 0.05, 0.01), 0, 0.33, 0.205),
      at(new THREE.CylinderGeometry(0.052, 0.052, 0.03, 6), -0.3, 0.73, -0.25),
      at(new THREE.CylinderGeometry(0.052, 0.052, 0.03, 6), -0.15, 0.79, -0.28),
      at(new THREE.CylinderGeometry(0.052, 0.052, 0.03, 6), 0, 0.69, -0.3),
    ]),
  };
}

/** Węzeł Tesli (pełne pole elektrowni, v0.40): ażurowa wieża na równinie, obracający się pierścień, świecąca kula. */
function createTeslaNode(): BigShape {
  const legs = [0, 1, 2].map((k) => {
    const a = (k * Math.PI * 2) / 3;
    return at(new THREE.BoxGeometry(0.04, 0.5, 0.04).rotateZ(-0.22), Math.cos(a) * 0.14, 0.33, Math.sin(a) * 0.14, -a);
  });
  return {
    body: prepare([
      paint(at(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 6), 0, 0.05, 0), STEEL),
      ...legs.map((g) => paint(g, STEEL)),
      paint(at(new THREE.CylinderGeometry(0.035, 0.06, 0.62, 6), 0, 0.4, 0), STEEL),
      paint(at(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 8), 0, 0.3, 0), GOLD),
      paint(at(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 8), 0, 0.46, 0), GOLD),
      paint(at(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), 0, 0.6, 0), GOLD),
      // Transformatory przy podstawie.
      paint(at(new THREE.BoxGeometry(0.14, 0.12, 0.12), 0.3, 0.16, 0.08, 0.4), GOLD),
      paint(at(new THREE.BoxGeometry(0.12, 0.1, 0.1), -0.28, 0.15, -0.12, -0.3), STEEL),
    ]),
    // Izolatory (ciemne talerze) na kolumnie.
    pit: prepare([at(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 8), 0, 0.38, 0), at(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8), 0, 0.53, 0)]),
    // Pierścień (toroid) obraca się powoli.
    rotor: prepare([at(new THREE.TorusGeometry(0.14, 0.022, 4, 12).rotateX(Math.PI / 2), 0, 0.72, 0), at(new THREE.BoxGeometry(0.3, 0.015, 0.015), 0, 0.72, 0)]),
    glow: prepare([at(new THREE.IcosahedronGeometry(0.08, 0), 0, 0.8, 0), at(new THREE.BoxGeometry(0.1, 0.03, 0.01), 0.3, 0.18, 0.145)]),
  };
}

/** Wieża przesyłowa sieci Tesli (hub, v0.40): wysoka kratownica, dwa pierścienie, duża kula, transformatory. */
function createTeslaTower(): BigShape {
  const legs = [0, 1, 2, 3].map((k) => {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    return at(new THREE.BoxGeometry(0.05, 0.7, 0.05).rotateZ(-0.25), Math.cos(a) * 0.2, 0.4, Math.sin(a) * 0.2, -a);
  });
  return {
    body: prepare([
      paint(at(new THREE.CylinderGeometry(0.5, 0.56, 0.1, 8), 0, 0.05, 0), STEEL),
      ...legs.map((g) => paint(g, STEEL)),
      paint(at(new THREE.CylinderGeometry(0.04, 0.08, 0.86, 6), 0, 0.52, 0), STEEL),
      paint(at(new THREE.BoxGeometry(0.34, 0.03, 0.03), 0, 0.42, 0), GOLD),
      paint(at(new THREE.BoxGeometry(0.03, 0.03, 0.34), 0, 0.42, 0), GOLD),
      paint(at(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8), 0, 0.62, 0), GOLD),
      paint(at(new THREE.BoxGeometry(0.16, 0.14, 0.14), 0.36, 0.17, 0.12, 0.3), GOLD),
      paint(at(new THREE.BoxGeometry(0.16, 0.14, 0.14), -0.34, 0.17, 0.16, -0.4), GOLD),
      paint(at(new THREE.BoxGeometry(0.14, 0.1, 0.12), 0.05, 0.15, -0.38), STEEL),
    ]),
    pit: prepare([at(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8), 0, 0.5, 0), at(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 8), 0, 0.72, 0)]),
    rotor: prepare([
      at(new THREE.TorusGeometry(0.2, 0.025, 4, 14).rotateX(Math.PI / 2), 0, 0.9, 0),
      at(new THREE.TorusGeometry(0.13, 0.02, 4, 12).rotateX(Math.PI / 2), 0, 0.8, 0),
    ]),
    glow: prepare([
      at(new THREE.IcosahedronGeometry(0.11, 0), 0, 1.0, 0),
      at(new THREE.BoxGeometry(0.1, 0.03, 0.01), 0.36, 0.2, 0.195),
      at(new THREE.BoxGeometry(0.1, 0.03, 0.01), -0.34, 0.2, 0.235),
    ]),
  };
}

/** Rodzina konstrukcji (wiertła kryształu, zakłady metalu, węzły Tesli): kształty pełnego pola i huba, kolory światła. */
const FAMILY_LOOK: Partial<Record<BuildingId, { rig: () => BigShape; hub: () => BigShape; rotor: string; glow: string; pipe: string; speed: number; arcs?: boolean }>> = {
  crystalMine: { rig: createRig, hub: createHub, rotor: STRUCTURE_COLORS.crystalMine.light, glow: '#6fe9ff', pipe: '#4f8a82', speed: 1.6 },
  metalMine: { rig: createFactory, hub: createFoundry, rotor: '#e6c77a', glow: '#ff9a3c', pipe: '#c9a24a', speed: 0.35 },
  // Sieć Tesli: kable po gruncie (ciemne) i wyładowania między szczytami wież (`arcs`).
  powerPlant: { rig: createTeslaNode, hub: createTeslaTower, rotor: '#e6c77a', glow: '#bff6ff', pipe: '#2f3d44', speed: 0.8, arcs: true },
};

/** Wysokość kul na szczytach wież (w jednostkach kształtu) — tu zaczynają się i kończą wyładowania. */
const NODE_TOP = 0.8;
const TOWER_TOP = 1.0;
const ARC_SEGMENTS = 7;
const MAX_ARCS = 72 * ARC_SEGMENTS;
/** Zmiana kształtu wyładowań co tyle sekund (lekki efekt bez cząsteczek). */
const ARC_TICK = 0.09;

interface BigMeshes {
  body: THREE.InstancedMesh;
  pit: THREE.InstancedMesh;
  rotor: THREE.InstancedMesh;
  glow: THREE.InstancedMesh;
  /** Bieżąca skala (wyrastanie) każdej konstrukcji. */
  current: Float32Array;
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
  /** Konstrukcje rodzin (v0.38–v0.39): na każdy budynek z `RIG_BUILDINGS` — pełne pola i huby. */
  private readonly families = new Map<BuildingId, { rigs: BigMeshes; hubs: BigMeshes; glow: string; speed: number }>();
  private readonly pipes: THREE.InstancedMesh;
  /** Wyładowania sieci Tesli (v0.40): świecące odcinki łamanej między kulami wież. */
  private readonly arcs: THREE.InstancedMesh;
  /** Animacja łączenia (v0.38.2): postęp 0..1 każdego szybu głównego (szyb wyrasta, rury rosną do wierteł). */
  private readonly hubGrowth = new Map<string, number>();
  private hubsSeeded = false;
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
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    x: new THREE.Vector3(1, 0, 0),
    h0: new THREE.Vector3(),
    h1: new THREE.Vector3(),
  };
  private readonly tmpColor = new THREE.Color();

  /** `still` — „Ogranicz ruch”: głowice wierteł nie obracają się. */
  private readonly still: boolean;

  constructor(ids: readonly BuildingId[], still = false) {
    this.still = still;
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
    // Wiertła, zakłady i huby kompleksów (v0.38–v0.39): po 4 InstancedMesh na rodzaj (bryła, wnętrze/bramy,
    // ruchoma głowica/dźwig, świecące elementy) + wspólne rury i taśmociągi (kolor na instancję).
    const big = (shape: BigShape, count: number, rotor: string, glow: string): BigMeshes => {
      const meshes = {
        body: new THREE.InstancedMesh(shape.body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.3, flatShading: true, side: THREE.DoubleSide }), count),
        pit: new THREE.InstancedMesh(shape.pit, new THREE.MeshStandardMaterial({ color: '#0b1517', roughness: 1, metalness: 0, side: THREE.DoubleSide }), count),
        rotor: new THREE.InstancedMesh(shape.rotor, new THREE.MeshBasicMaterial({ color: rotor, toneMapped: false }), count),
        glow: new THREE.InstancedMesh(shape.glow, new THREE.MeshBasicMaterial({ color: glow, toneMapped: false }), count),
        current: new Float32Array(count),
      };
      for (const mesh of [meshes.body, meshes.pit, meshes.rotor, meshes.glow]) {
        mesh.count = 0;
        mesh.frustumCulled = false;
        this.object.add(mesh);
      }
      return meshes;
    };
    for (const id of RIG_BUILDINGS) {
      const look = FAMILY_LOOK[id];
      if (!look) continue;
      this.families.set(id, { rigs: big(look.rig(), MAX_RIGS, look.rotor, look.glow), hubs: big(look.hub(), MAX_HUBS, look.rotor, look.glow), glow: look.glow, speed: look.speed });
    }
    this.pipes = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, metalness: 0.4 }),
      MAX_PIPES,
    );
    this.pipes.count = 0;
    this.pipes.frustumCulled = false;
    this.object.add(this.pipes);
    this.arcs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: '#bff6ff', toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      MAX_ARCS,
    );
    this.arcs.count = 0;
    this.arcs.frustumCulled = false;
    this.object.add(this.arcs);
  }

  /** Nowa planeta → nowe miejsca; budowle pojawiają się bez animacji. */
  setLayout(layout: ColonyLayout): void {
    this.layout = layout;
    this.hubGrowth.clear();
    this.hubsSeeded = false;
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
    this.registerHubs();
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
      // Pełne pole wierteł: zamiast 3 małych budowli jedno wiertło z szybem (v0.38).
      const rigged = RIG_BUILDINGS.includes(id);
      for (let i = 0; i < MAX_STRUCTURES; i++) {
        group.target[i] = i < count && !(rigged && groupFull(level, Math.floor(i / 3))) ? slots[i]!.size : 0;
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
    this.updateBig(dt);
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

  /** Nowe szyby główne zaczynają animację od zera; te z wczytanej gry stoją od razu. */
  private registerHubs(): void {
    if (!this.layout) return;
    for (const hub of this.layout.hubs) {
      const key = hub.dir.join(',');
      if (!this.hubGrowth.has(key)) this.hubGrowth.set(key, this.hubsSeeded && !this.still ? 0 : 1);
    }
    if (this.layout.hubs.length > 0 || Object.values(this.layout.slots).some((s) => s.length > 0)) this.hubsSeeded = true;
  }

  /** Wiertła i szyby kompleksów: wyrastanie, obracające się głowice, rury (kilkanaście instancji — co klatkę). */
  private updateBig(dt: number): void {
    const layout = this.layout;
    if (!layout || !this.levels) return;
    const { m, q, spin, p, s, n, up, a, b, x } = this.tmp;
    const grow = dt / GROW_SECONDS;
    const place = (meshes: BigMeshes, i: number, dir: readonly number[], surface: number, turn: number, target: number, size: number, speed: number) => {
      const cur = meshes.current[i]!;
      const next = target > cur ? Math.min(target, cur + grow) : Math.max(target, cur - grow * 2);
      meshes.current[i] = next;
      n.set(dir[0]!, dir[1]!, dir[2]!);
      q.setFromUnitVectors(up, n);
      spin.setFromAxisAngle(up, turn);
      q.multiply(spin);
      p.copy(n).multiplyScalar(surface - size * 0.06);
      s.setScalar(Math.max(next * size, 1e-5));
      m.compose(p, q, s);
      meshes.body.setMatrixAt(i, m);
      meshes.pit.setMatrixAt(i, m);
      meshes.glow.setMatrixAt(i, m);
      // Głowica wiertła obraca się wokół osi szybu.
      spin.setFromAxisAngle(up, this.still ? 0 : this.time * speed);
      q.multiply(spin);
      m.compose(p, q, s);
      meshes.rotor.setMatrixAt(i, m);
    };
    const hubs = layout.hubs.slice(0, MAX_HUBS);
    const growth = hubs.map((hub) => {
      const key = hub.dir.join(',');
      const g = Math.min(1, (this.hubGrowth.get(key) ?? 1) + dt / MERGE_SECONDS);
      this.hubGrowth.set(key, g);
      return g;
    });
    for (const [id, family] of this.families) {
      const rigs = layout.rigs.filter((r) => r.building === id).slice(0, MAX_RIGS);
      rigs.forEach((rig, i) => place(family.rigs, i, rig.dir, rig.surface, rig.spin, groupFull(this.levels![id] ?? 0, rig.group) ? 1 : 0, RIG_SIZE, family.speed));
      // Szyb / hala główna wyrasta w pierwszej połowie animacji łączenia, rury rosną w drugiej.
      let h = 0;
      hubs.forEach((hub, i) => {
        if (hub.building === id) place(family.hubs, h++, hub.dir, hub.surface, hub.spin, Math.min(1, growth[i]! * 2), HUB_SIZE, family.speed * 0.6);
      });
      for (const [meshes, count] of [[family.rigs, rigs.length], [family.hubs, h]] as const) {
        meshes.body.count = meshes.pit.count = meshes.rotor.count = meshes.glow.count = count;
        for (const mesh of [meshes.body, meshes.pit, meshes.rotor, meshes.glow]) mesh.instanceMatrix.needsUpdate = true;
      }
    }
    // Rury: prosty odcinek nad gruntem od szybu głównego do każdego wiertła kompleksu.
    let pipe = 0;
    // Każda rura to kilka odcinków po łuku nad powierzchnią (prosty odcinek chowałby się w planecie).
    const { h0, h1 } = this.tmp;
    hubs.forEach((hub, hi) => {
      const reach = Math.max(0, growth[hi]! * 2 - 1) * PIPE_SEGMENTS;
      h0.set(hub.dir[0], hub.dir[1], hub.dir[2]);
      const color = this.tmpColor.set(FAMILY_LOOK[hub.building]?.pipe ?? '#4f8a82');
      for (const member of hub.members) {
        h1.set(member[0], member[1], member[2]);
        for (let k = 0; k < PIPE_SEGMENTS && pipe < MAX_PIPES && k < reach; k++) {
          const end = Math.min(k + 1, reach);
          a.copy(h0).lerp(h1, k / PIPE_SEGMENTS).normalize().multiplyScalar(hub.surface + 0.009);
          b.copy(h0).lerp(h1, end / PIPE_SEGMENTS).normalize().multiplyScalar(hub.surface + 0.009);
          p.copy(a).add(b).multiplyScalar(0.5);
          q.setFromUnitVectors(x, n.copy(b).sub(a).normalize());
          s.set(a.distanceTo(b) * 1.04, 0.006, 0.006);
          m.compose(p, q, s);
          this.pipes.setColorAt(pipe, color);
          this.pipes.setMatrixAt(pipe++, m);
        }
      }
    });
    this.pipes.count = pipe;
    if (this.pipes.instanceColor) this.pipes.instanceColor.needsUpdate = true;
    this.updateArcs(hubs, growth);
    // Kryształy i żar pieców lekko pulsują (bez „Ogranicz ruch”).
    const pulse = this.still ? 1 : 0.82 + 0.18 * Math.sin(this.time * 2);
    for (const family of this.families.values()) {
      for (const glow of [family.rigs.glow, family.hubs.glow]) (glow.material as THREE.MeshBasicMaterial).color.set(family.glow).multiplyScalar(pulse);
    }
    this.pipes.instanceMatrix.needsUpdate = true;
  }

  /**
   * Wyładowania sieci Tesli: łamana od kuli wieży przesyłowej do kuli każdego węzła, kształt losowany
   * co `ARC_TICK` s (deterministycznie z czasu), część łuków na chwilę gaśnie. „Ogranicz ruch” — stałe, proste.
   */
  private updateArcs(hubs: readonly ColonyLayout['hubs'][number][], growth: readonly number[]): void {
    const { m, q, p, s, n, a, b, x, h0, h1 } = this.tmp;
    const tick = this.still ? 0 : Math.floor(this.time / ARC_TICK);
    let arc = 0;
    const point = (out: THREE.Vector3, from: THREE.Vector3, to: THREE.Vector3, t: number, r0: number, r1: number, seed: number) => {
      out.copy(from).lerp(to, t).normalize();
      // Lekki łuk ponad prostą (wyżej w środku) i drganie poprzeczne (poza końcami).
      const lift = Math.sin(t * Math.PI) * 0.012;
      out.multiplyScalar(r0 + (r1 - r0) * t + lift);
      if (t > 0 && t < 1 && !this.still) {
        const j = (hash(seed) - 0.5) * 0.014;
        const k = (hash(seed + 7.1) - 0.5) * 0.014;
        out.x += j;
        out.y += k;
        out.z += (hash(seed + 3.3) - 0.5) * 0.014;
      }
      return out;
    };
    hubs.forEach((hub, hi) => {
      if (!FAMILY_LOOK[hub.building]?.arcs) return;
      const ready = growth[hi]! * 2 - 1;
      if (ready <= 0) return;
      h0.set(hub.dir[0], hub.dir[1], hub.dir[2]);
      const r0 = hub.surface + HUB_SIZE * (TOWER_TOP - 0.06);
      hub.members.forEach((member, mi) => {
        // Łuk miga: w części chwil gaśnie (każdy w innym rytmie).
        if (!this.still && hash(tick * 13.7 + mi * 5.3 + hi) < 0.3) return;
        h1.set(member[0], member[1], member[2]);
        const r1 = hub.surface + RIG_SIZE * (NODE_TOP - 0.06);
        for (let k = 0; k < ARC_SEGMENTS && arc < MAX_ARCS && k / ARC_SEGMENTS < ready; k++) {
          const seed = tick * 31.7 + hi * 101 + mi * 17 + k;
          point(a, h0, h1, k / ARC_SEGMENTS, r0, r1, seed);
          point(b, h0, h1, (k + 1) / ARC_SEGMENTS, r0, r1, seed + 1);
          p.copy(a).add(b).multiplyScalar(0.5);
          q.setFromUnitVectors(x, n.copy(b).sub(a).normalize());
          s.set(a.distanceTo(b) * 1.05, 0.0032, 0.0032);
          m.compose(p, q, s);
          this.arcs.setMatrixAt(arc++, m);
        }
      });
    });
    this.arcs.count = arc;
    this.arcs.instanceMatrix.needsUpdate = true;
    (this.arcs.material as THREE.MeshBasicMaterial).opacity = this.still ? 0.8 : 0.65 + 0.35 * hash(tick * 3.1);
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
    const big = [...this.families.values()].flatMap((f) => [f.rigs, f.hubs]).flatMap((b) => [b.body, b.pit, b.rotor, b.glow]);
    for (const mesh of [...big, this.pipes, this.arcs]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    }
    for (const group of this.groups.values()) {
      for (const mesh of [group.body, group.light]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
    }
  }
}

/** Szybki pseudolosowy skrót 0..1 (wygląd wyładowań — nie logika gry, więc bez `rng`). */
function hash(v: number): number {
  const t = Math.sin(v * 12.9898) * 43758.5453;
  return t - Math.floor(t);
}

/** Indeks miejsca dla budowli danego poziomu (powyżej limitu: ostatnie miejsce). */
function slotIndex(level: number, slotCount: number): number {
  return Math.max(0, Math.min(visibleStructures(level), slotCount) - 1);
}
