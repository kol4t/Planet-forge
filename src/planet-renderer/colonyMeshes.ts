import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BuildingId } from '../core/types.ts';
import type { BuildSite } from './PlanetDisplay.ts';
import type { ColonyComplex, ColonyLayout, Vec3 } from './colony.ts';
import { STRUCTURE_COLORS } from './PlanetDisplay.ts';

// Zabudowa kompleksów na powierzchni planety 3D (v0.45): każdy budynek to jeden kompleks na swoim obszarze pól —
// główna konstrukcja w środku (rośnie z etapem) i zabudowa w jego wnętrzu. Grunt kompleksu (dachy, drogi, odkrywka)
// jest w kolorach ścianek lądu (PlanetView). Każdy rodzaj kształtu = kilka InstancedMesh, czyli stała liczba
// draw calli niezależnie od poziomów; macierze liczone przy zmianie układu, co klatkę tylko ruchome części.


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


/** Wielkość konstrukcji (względem promienia planety): zabudowa wnętrza i główna konstrukcja. */
const SPOT_SIZE = 0.06;
const CORE_SIZE = 0.1;
/** Najwięcej instancji jednego rodzaju kształtu. */
const MAX_ITEMS = 160;
/** Wyrastanie kompleksu po wzroście albo zmianie etapu (s). */
const GROW_SECONDS = 1.4;

/** Rodzaje kształtów: duże (bryła, wnętrze, ruchoma część, światła) z poprzednich wersji i małe budynki. */
type KindId = 'drill' | 'drillTower' | 'hall' | 'foundry' | 'teslaNode' | 'teslaTower' | 'storage' | 'antimatterCollector' | 'laboratory';

const KIND_LOOK: Record<KindId, { shape: () => BigShape; rotor: string; glow: string; speed: number }> = {
  drill: { shape: createRig, rotor: STRUCTURE_COLORS.crystalMine.light, glow: '#6fe9ff', speed: 1.6 },
  drillTower: { shape: createHub, rotor: STRUCTURE_COLORS.crystalMine.light, glow: '#6fe9ff', speed: 0.9 },
  hall: { shape: createFactory, rotor: '#e6c77a', glow: '#ff9a3c', speed: 0.35 },
  foundry: { shape: createFoundry, rotor: '#e6c77a', glow: '#ff9a3c', speed: 0.25 },
  teslaNode: { shape: createTeslaNode, rotor: '#e6c77a', glow: '#bff6ff', speed: 0.8 },
  teslaTower: { shape: createTeslaTower, rotor: '#e6c77a', glow: '#bff6ff', speed: 0.5 },
  storage: { shape: () => small('storage'), rotor: '#c9a24a', glow: STRUCTURE_COLORS.storage.light, speed: 0 },
  antimatterCollector: { shape: () => small('antimatterCollector'), rotor: '#c9a24a', glow: STRUCTURE_COLORS.antimatterCollector.light, speed: 0 },
  laboratory: { shape: () => small('laboratory'), rotor: '#c9a24a', glow: STRUCTURE_COLORS.laboratory.light, speed: 0 },
};

/** Mały budynek jako „duży kształt”: bryła w kolorze budynku, światła; bez wnętrza i ruchomej części. */
function small(id: BuildingId): BigShape {
  const shape = createShapes()[id];
  const empty = new THREE.BufferGeometry();
  empty.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  return { body: paint(shape.body, STRUCTURE_COLORS[id].body), pit: empty, rotor: empty.clone(), glow: shape.light };
}

/** Co stoi w kompleksie: główna konstrukcja i rodzaj zabudowy wnętrza (od etapu — gęściej). */
function plan(c: ColonyComplex): { core: KindId; spot: KindId | null; every: number; skipCenter: number } {
  const every = c.stage >= 2 ? 1 : c.stage === 1 ? 2 : 0;
  switch (c.building) {
    case 'metalMine':
      return { core: c.stage >= 1 ? 'foundry' : 'hall', spot: 'hall', every, skipCenter: 0 };
    case 'crystalMine':
      // Wnętrze to odkrywka — zabudowa tylko na krawędzi.
      return { core: 'drillTower', spot: 'drill', every, skipCenter: 0.66 };
    case 'powerPlant':
      return { core: c.stage >= 1 ? 'teslaTower' : 'teslaNode', spot: 'teslaNode', every, skipCenter: 0 };
    default:
      return { core: c.building as KindId, spot: c.building as KindId, every: c.stage >= 1 ? 2 : 0, skipCenter: 0 };
  }
}

interface Item {
  building: BuildingId;
  dir: Vec3;
  surface: number;
  spin: number;
  size: number;
}

interface Kind {
  body: THREE.InstancedMesh;
  pit: THREE.InstancedMesh;
  rotor: THREE.InstancedMesh;
  glow: THREE.InstancedMesh;
  items: Item[];
  glowColor: string;
  speed: number;
}

export class ColonyMeshes {
  readonly object = new THREE.Group();
  private readonly kinds = new Map<KindId, Kind>();
  private layout: ColonyLayout | null = null;
  /** Wyrastanie kompleksów: chwila ostatniej zmiany (czas `time`) każdego budynku. */
  private readonly grownAt = new Map<BuildingId, number>();
  private readonly signature = new Map<BuildingId, string>();
  private seeded = false;
  /** Obniżenie terenu w miejscu (odkrywka) — podaje PlanetView, żeby konstrukcje stały na dnie. */
  private sink: (dir: Vec3) => number = () => 0;
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
  /** `still` — „Ogranicz ruch”: nic się nie obraca ani nie pulsuje. */
  private readonly still: boolean;

  constructor(still = false) {
    this.still = still;
    this.object.name = 'colony';
    this.scaffold = new THREE.Mesh(
      createShapes().metalMine.body,
      new THREE.MeshBasicMaterial({ color: '#e6c77a', wireframe: true, transparent: true, depthWrite: false, toneMapped: false }),
    );
    this.scaffold.visible = false;
    this.scaffold.frustumCulled = false;
    this.object.add(this.scaffold);
    for (const [id, look] of Object.entries(KIND_LOOK) as [KindId, (typeof KIND_LOOK)[KindId]][]) {
      const shape = look.shape();
      const kind: Kind = {
        body: new THREE.InstancedMesh(shape.body, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.3, flatShading: true, side: THREE.DoubleSide }), MAX_ITEMS),
        pit: new THREE.InstancedMesh(shape.pit, new THREE.MeshStandardMaterial({ color: '#0b1517', roughness: 1, metalness: 0, side: THREE.DoubleSide }), MAX_ITEMS),
        rotor: new THREE.InstancedMesh(shape.rotor, new THREE.MeshBasicMaterial({ color: look.rotor, toneMapped: false }), MAX_ITEMS),
        glow: new THREE.InstancedMesh(shape.glow, new THREE.MeshBasicMaterial({ color: look.glow, toneMapped: false }), MAX_ITEMS),
        items: [],
        glowColor: look.glow,
        speed: look.speed,
      };
      for (const mesh of [kind.body, kind.pit, kind.rotor, kind.glow]) {
        mesh.count = 0;
        mesh.visible = false;
        mesh.frustumCulled = false;
        this.object.add(mesh);
      }
      this.kinds.set(id, kind);
    }
  }

  /** Nowa planeta → nowe kompleksy bez animacji. */
  setLayout(layout: ColonyLayout): void {
    this.seeded = false;
    this.grownAt.clear();
    this.signature.clear();
    this.updateLayout(layout);
  }

  /** Obniżenie terenu (odkrywka) w punkcie — konstrukcje odkrywki stoją niżej. */
  setSink(sink: (dir: Vec3) => number): void {
    this.sink = sink;
  }

  /** Kompleksy urosły albo zmieniły etap: przebudowa instancji; zmienione wyrastają od nowa. */
  updateLayout(layout: ColonyLayout): void {
    this.layout = layout;
    for (const kind of this.kinds.values()) kind.items = [];
    for (const c of layout.complexes) {
      const sig = `${c.cells.length}@${c.stage}${c.mega ? '+' : ''}`;
      if (this.seeded && this.signature.get(c.building) !== sig && !this.still) this.grownAt.set(c.building, this.time);
      this.signature.set(c.building, sig);
      const p = plan(c);
      const stage = c.stage + (c.mega ? 1 : 0);
      const core = this.kinds.get(p.core)!;
      core.items.push({ building: c.building, dir: c.core, surface: c.surface - this.sink(c.core), spin: c.spots[0]?.spin ?? 0, size: CORE_SIZE * (0.75 + 0.3 * stage) });
      if (p.spot && p.every > 0) {
        const spot = this.kinds.get(p.spot)!;
        c.spots.forEach((s, k) => {
          if (k === 0 || k % p.every !== 0 || s.t < p.skipCenter || spot.items.length >= MAX_ITEMS) return;
          spot.items.push({ building: c.building, dir: s.dir, surface: s.surface - this.sink(s.dir), spin: s.spin, size: SPOT_SIZE * (0.8 + 0.12 * stage) });
        });
      }
    }
    this.seeded = true;
    for (const kind of this.kinds.values()) {
      const count = Math.min(kind.items.length, MAX_ITEMS);
      for (const mesh of [kind.body, kind.pit, kind.rotor, kind.glow]) {
        mesh.count = count;
        mesh.visible = count > 0;
      }
    }
    this.place(true);
  }

  /** Trwająca budowa (null = brak). Wołane często — tanie. */
  setConstruction(site: BuildSite | null): void {
    this.site = site;
  }

  /** Środek kompleksu budynku (do obrotu kamery), w układzie planety. */
  focusDir(id: BuildingId): [number, number, number] | null {
    return this.layout?.complexes.find((c) => c.building === id)?.core ?? this.layout?.center ?? null;
  }

  update(dt: number): void {
    this.time += dt;
    this.updateScaffold();
    this.place(false);
  }

  /** Macierze instancji: wszystkie przy zmianie układu, co klatkę — ruchome części i wyrastające kompleksy. */
  private place(all: boolean): void {
    const { m, q, spin, p, s, n, up } = this.tmp;
    for (const kind of this.kinds.values()) {
      if (kind.items.length === 0) continue;
      const moving = !this.still && kind.speed > 0;
      let dirty = all;
      kind.items.forEach((item, i) => {
        if (i >= MAX_ITEMS) return;
        const born = this.grownAt.get(item.building);
        const g = born === undefined ? 1 : Math.min(1, (this.time - born) / GROW_SECONDS);
        if (!all && !moving && g >= 1) return;
        dirty = true;
        // Lekkie „przeskoczenie” przy wyrastaniu.
        const pop = g < 1 ? g * (1 + Math.sin(g * Math.PI) * 0.15) : 1;
        n.set(item.dir[0], item.dir[1], item.dir[2]);
        q.setFromUnitVectors(up, n);
        spin.setFromAxisAngle(up, item.spin);
        q.multiply(spin);
        p.copy(n).multiplyScalar(item.surface - item.size * 0.06);
        s.setScalar(Math.max(item.size * pop, 1e-5));
        m.compose(p, q, s);
        kind.body.setMatrixAt(i, m);
        kind.pit.setMatrixAt(i, m);
        kind.glow.setMatrixAt(i, m);
        spin.setFromAxisAngle(up, moving ? this.time * kind.speed : 0);
        q.multiply(spin);
        m.compose(p, q, s);
        kind.rotor.setMatrixAt(i, m);
      });
      if (dirty) for (const mesh of [kind.body, kind.pit, kind.rotor, kind.glow]) mesh.instanceMatrix.needsUpdate = true;
      // Kryształy, żar pieców i kule Tesli lekko pulsują.
      const pulse = this.still ? 1 : 0.82 + 0.18 * Math.sin(this.time * 2);
      (kind.glow.material as THREE.MeshBasicMaterial).color.set(kind.glowColor).multiplyScalar(pulse);
    }
  }

  private updateScaffold(): void {
    const site = this.site;
    const c = site && this.layout?.complexes.find((x) => x.building === site.building);
    if (!site || !c) {
      this.scaffold.visible = false;
      return;
    }
    // Rusztowanie na najnowszym polu obszaru (tam rośnie budynek).
    const newest = c.spots.find((x) => x.cell === c.cells[c.cells.length - 1]) ?? c.spots[0]!;
    const { q, spin, p, s, n, up } = this.tmp;
    const size = SPOT_SIZE * 1.1;
    n.set(newest.dir[0], newest.dir[1], newest.dir[2]);
    q.setFromUnitVectors(up, n);
    spin.setFromAxisAngle(up, newest.spin);
    q.multiply(spin);
    p.copy(n).multiplyScalar(newest.surface - this.sink(newest.dir) - size * 0.08);
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
    for (const kind of this.kinds.values()) {
      for (const mesh of [kind.body, kind.pit, kind.rotor, kind.glow]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
    }
  }
}
