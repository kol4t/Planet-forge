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
  if (geometries.length === 0) {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    return empty;
  }
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


// ——— Rodzina metalowa (v0.47, prototyp B) ———
// Standard modelu: PLATFORMA (fundament wpuszczony w teren) → BRYŁA (sylwetka etapu) → DETAL (kominy, zbiorniki, taśmy)
// → ŚWIATŁO (okna pieców, wyloty kominów). Jednostki: 1 = szerokość konstrukcji, podstawa na y = 0. Sylwetka zmienia
// się razem z etapem gry (poz. 1 / 6 / 12 / 20 — decyzja właściciela): kopalnia → zakład → huta → megakompleks.
const SLAB = '#66706d';
const ORE = '#6e5b4a';
const DARK = '#3a4241';

/** Platforma: niska płyta wpuszczona w teren (zakrywa nierówności pod budowlą). */
function slab(radius: number, sides: number, height = 0.08): THREE.BufferGeometry {
  return paint(at(new THREE.CylinderGeometry(radius, radius * 1.06, height + 0.1, sides), 0, height / 2 - 0.05, 0), SLAB);
}

/** Wieża wyciągowa szybu: dwie nogi (kozioł), belka, koło na szczycie. */
function headframe(x: number, z: number, h: number, ry = 0): THREE.BufferGeometry[] {
  return [
    paint(at(new THREE.BoxGeometry(0.04, h, 0.04).rotateZ(0.12), x - 0.05, h / 2, z, ry), STEEL),
    paint(at(new THREE.BoxGeometry(0.04, h, 0.04).rotateZ(-0.12), x + 0.05, h / 2, z, ry), STEEL),
    paint(at(new THREE.BoxGeometry(0.04, h * 0.8, 0.04).rotateX(0.45), x, h * 0.42, z + h * 0.18, ry), STEEL),
    paint(at(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10).rotateX(Math.PI / 2), x, h, z, ry), GOLD),
  ];
}

/** Etap 1 — Kopalnia: szyb z wieżą wyciągową, budynek maszyny, hałda, dwa pojazdy. */
function createMineHead(): BigShape {
  return {
    body: prepare([
      slab(0.46, 6),
      paint(at(new THREE.CylinderGeometry(0.11, 0.13, 0.08, 8), 0, 0.12, 0), STEEL),
      ...headframe(0, 0, 0.62),
      paint(at(new THREE.BoxGeometry(0.22, 0.16, 0.18), 0.24, 0.16, -0.06), STEEL),
      paint(at(new THREE.BoxGeometry(0.24, 0.03, 0.2), 0.24, 0.255, -0.06), GOLD),
      paint(at(new THREE.ConeGeometry(0.16, 0.16, 7), -0.24, 0.16, 0.18), ORE),
      paint(at(new THREE.BoxGeometry(0.09, 0.05, 0.06), -0.06, 0.1, 0.32, 0.4), GOLD),
      paint(at(new THREE.BoxGeometry(0.08, 0.05, 0.06), 0.3, 0.1, 0.24, -0.7), GOLD),
    ]),
    pit: prepare([at(new THREE.CircleGeometry(0.09, 8).rotateX(-Math.PI / 2), 0, 0.165, 0)]),
    rotor: prepare([at(new THREE.BoxGeometry(0.3, 0.025, 0.03), 0.24, 0.32, -0.06), at(new THREE.BoxGeometry(0.02, 0.07, 0.02), 0.36, 0.29, -0.06)]),
    glow: prepare([at(new THREE.BoxGeometry(0.12, 0.035, 0.01), 0.24, 0.17, 0.035), at(new THREE.BoxGeometry(0.03, 0.03, 0.03), 0, 0.64, 0)]),
  };
}

/** Etap 2 — Zakład przetwórczy: dwie hale, zbiorniki, komin, taśmociąg od szybu do hali. */
function createMetalPlant(): BigShape {
  return {
    body: prepare([
      slab(0.5, 8),
      paint(at(new THREE.BoxGeometry(0.46, 0.22, 0.26), 0.04, 0.19, -0.1), STEEL),
      paint(at(new THREE.BoxGeometry(0.5, 0.04, 0.3), 0.04, 0.31, -0.1), GOLD),
      paint(at(new THREE.BoxGeometry(0.26, 0.16, 0.2), -0.2, 0.16, 0.2), STEEL),
      paint(at(new THREE.BoxGeometry(0.28, 0.03, 0.22), -0.2, 0.255, 0.2), GOLD),
      paint(at(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), 0.24, 0.18, 0.22), GOLD),
      paint(at(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), 0.36, 0.16, 0.08), GOLD),
      paint(at(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 6), -0.06, 0.45, -0.22), STEEL),
      ...headframe(0.34, -0.3, 0.42, 0.6),
      // Taśmociąg od szybu do hali (nachylony).
      paint(at(new THREE.BoxGeometry(0.05, 0.03, 0.3).rotateX(-0.35), 0.24, 0.22, -0.18, 0.9), DARK),
    ]),
    pit: prepare([at(new THREE.BoxGeometry(0.12, 0.1, 0.01), 0.1, 0.13, 0.035), at(new THREE.BoxGeometry(0.08, 0.08, 0.01), -0.2, 0.12, 0.305)]),
    rotor: prepare([at(new THREE.BoxGeometry(0.44, 0.025, 0.035), 0.02, 0.4, -0.02), at(new THREE.BoxGeometry(0.02, 0.08, 0.02), 0.2, 0.36, -0.02)]),
    glow: prepare([
      at(new THREE.BoxGeometry(0.3, 0.04, 0.01), 0.04, 0.2, 0.035),
      at(new THREE.CylinderGeometry(0.037, 0.037, 0.02, 6), -0.06, 0.71, -0.22),
    ]),
  };
}

/** Etap 3 — Huta: dwa wielkie piece, trzy kominy, hala odlewni, kadzie; światło pieców i kanału z metalem. */
function createSmelter(): BigShape {
  const furnace = (x: number, z: number, h: number) => [
    paint(at(new THREE.CylinderGeometry(0.07, 0.12, h, 10), x, h / 2 + 0.02, z), STEEL),
    paint(at(new THREE.CylinderGeometry(0.125, 0.125, 0.03, 10), x, h * 0.35, z), GOLD),
    paint(at(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), x, h * 0.7, z), GOLD),
  ];
  return {
    body: prepare([
      slab(0.54, 8),
      ...furnace(-0.16, -0.14, 0.62),
      ...furnace(0.12, -0.2, 0.54),
      paint(at(new THREE.BoxGeometry(0.5, 0.18, 0.22), 0, 0.15, 0.2), STEEL),
      paint(at(new THREE.BoxGeometry(0.54, 0.035, 0.26), 0, 0.255, 0.2), GOLD),
      paint(at(new THREE.CylinderGeometry(0.035, 0.05, 0.78, 6), 0.34, 0.41, -0.06), STEEL),
      paint(at(new THREE.CylinderGeometry(0.035, 0.05, 0.86, 6), 0.4, 0.45, 0.08), STEEL),
      paint(at(new THREE.CylinderGeometry(0.03, 0.045, 0.7, 6), -0.38, 0.37, 0.06), STEEL),
      paint(at(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), -0.32, 0.1, 0.3), GOLD),
      paint(at(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10), 0.3, 0.1, 0.32), GOLD),
      // Most rurowy między piecami.
      paint(at(new THREE.BoxGeometry(0.3, 0.035, 0.035), -0.02, 0.42, -0.17), DARK),
    ]),
    pit: prepare([at(new THREE.BoxGeometry(0.14, 0.1, 0.01), 0.12, 0.12, 0.315), at(new THREE.BoxGeometry(0.12, 0.08, 0.01), -0.14, 0.11, 0.315)]),
    rotor: prepare([at(new THREE.BoxGeometry(0.56, 0.025, 0.035), 0, 0.36, 0.2), at(new THREE.BoxGeometry(0.02, 0.08, 0.02), -0.2, 0.32, 0.2)]),
    glow: prepare([
      at(new THREE.BoxGeometry(0.06, 0.06, 0.06), -0.16, 0.1, -0.02),
      at(new THREE.BoxGeometry(0.06, 0.06, 0.06), 0.12, 0.1, -0.08),
      at(new THREE.BoxGeometry(0.42, 0.012, 0.03), 0, 0.03, 0.06),
      at(new THREE.BoxGeometry(0.36, 0.04, 0.01), 0, 0.16, 0.315),
      at(new THREE.CylinderGeometry(0.037, 0.037, 0.02, 6), 0.34, 0.81, -0.06),
      at(new THREE.CylinderGeometry(0.037, 0.037, 0.02, 6), 0.4, 0.89, 0.08),
      at(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 6), -0.38, 0.73, 0.06),
    ]),
  };
}

/** Etap 4 — Megakompleks: dwupoziomowa platforma, dominująca wieża centralna, cztery piece wokół, łączniki, suwnica. */
function createMetalMega(): BigShape {
  const blocks = [0, 1, 2, 3].flatMap((k) => {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.34;
    const z = Math.sin(a) * 0.34;
    return [
      paint(at(new THREE.CylinderGeometry(0.06, 0.1, 0.42, 8), x, 0.33, z), STEEL),
      paint(at(new THREE.CylinderGeometry(0.105, 0.105, 0.03, 8), x, 0.3, z), GOLD),
      paint(at(new THREE.CylinderGeometry(0.025, 0.035, 0.6, 6), x * 1.28, 0.42, z * 1.28), STEEL),
      // Łącznik do wieży.
      paint(at(new THREE.BoxGeometry(0.04, 0.035, 0.24), x * 0.55, 0.36, z * 0.55, -a + Math.PI / 2), DARK),
    ];
  });
  return {
    body: prepare([
      slab(0.56, 8),
      paint(at(new THREE.CylinderGeometry(0.36, 0.4, 0.08, 8), 0, 0.12, 0), SLAB),
      paint(at(new THREE.CylinderGeometry(0.1, 0.14, 0.95, 6), 0, 0.6, 0), STEEL),
      paint(at(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 6), 0, 0.42, 0), GOLD),
      paint(at(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 6), 0, 0.7, 0), GOLD),
      paint(at(new THREE.CylinderGeometry(0.06, 0.1, 0.12, 6), 0, 1.13, 0), GOLD),
      ...blocks,
    ]),
    pit: prepare([at(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 6), 0, 1.2, 0)]),
    // Pierścień suwnicy wokół wieży obraca się powoli.
    rotor: prepare([at(new THREE.TorusGeometry(0.24, 0.012, 4, 18).rotateX(Math.PI / 2), 0, 0.82, 0), at(new THREE.BoxGeometry(0.48, 0.014, 0.02), 0, 0.82, 0)]),
    glow: prepare([
      at(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 6), 0, 0.55, 0),
      at(new THREE.IcosahedronGeometry(0.05, 0), 0, 1.26, 0),
      ...[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        return at(new THREE.BoxGeometry(0.06, 0.05, 0.06), Math.cos(a) * 0.34, 0.15, Math.sin(a) * 0.34);
      }),
    ]),
  };
}

/** Moduł zabudowy (pozostałe pola): płyta, hala ze złotym dachem, para zbiorników, komin z żarem. */
function createMetalBlock(): BigShape {
  return {
    body: prepare([
      paint(at(new THREE.BoxGeometry(0.92, 0.12, 0.92), 0, 0.01, 0), SLAB),
      paint(at(new THREE.BoxGeometry(0.56, 0.24, 0.34), -0.12, 0.19, -0.18), STEEL),
      paint(at(new THREE.BoxGeometry(0.6, 0.04, 0.38), -0.12, 0.32, -0.18), GOLD),
      paint(at(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 10), 0.24, 0.2, 0.22), GOLD),
      paint(at(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 10), 0.02, 0.17, 0.28), GOLD),
      paint(at(new THREE.CylinderGeometry(0.04, 0.055, 0.5, 6), 0.3, 0.32, -0.26), STEEL),
    ]),
    pit: prepare([at(new THREE.BoxGeometry(0.14, 0.1, 0.01), -0.02, 0.14, -0.005)]),
    rotor: prepare([]),
    glow: prepare([at(new THREE.BoxGeometry(0.3, 0.04, 0.01), -0.16, 0.21, -0.005), at(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 6), 0.3, 0.58, -0.26)]),
  };
}

/** Moduł placu: płyta, dwie hałdy rudy, stacja przeładunku, pojazd. */
function createMetalYard(): BigShape {
  return {
    body: prepare([
      paint(at(new THREE.BoxGeometry(0.92, 0.12, 0.92), 0, 0.01, 0), SLAB),
      paint(at(new THREE.ConeGeometry(0.22, 0.22, 7), -0.18, 0.18, 0.12), ORE),
      paint(at(new THREE.ConeGeometry(0.16, 0.16, 7), 0.2, 0.15, -0.16), ORE),
      paint(at(new THREE.BoxGeometry(0.18, 0.16, 0.14), 0.26, 0.15, 0.24), STEEL),
      paint(at(new THREE.BoxGeometry(0.19, 0.03, 0.15), 0.26, 0.245, 0.24), GOLD),
      paint(at(new THREE.BoxGeometry(0.1, 0.06, 0.07), -0.3, 0.1, -0.28, 0.5), GOLD),
    ]),
    pit: prepare([]),
    rotor: prepare([]),
    glow: prepare([]),
  };
}

/** Taśmociąg między modułami (odcinek długości 1 wzdłuż z, na podporach) — tylko bryła. */
function createConveyor(): THREE.BufferGeometry {
  return prepare([
    paint(at(new THREE.BoxGeometry(0.16, 0.06, 1), 0, 0.09, 0), DARK),
    paint(at(new THREE.BoxGeometry(0.2, 0.02, 1), 0, 0.13, 0), STEEL),
    paint(at(new THREE.BoxGeometry(0.06, 0.08, 0.06), 0, 0.04, -0.3), STEEL),
    paint(at(new THREE.BoxGeometry(0.06, 0.08, 0.06), 0, 0.04, 0.3), STEEL),
  ]);
}

/** Wielkość konstrukcji (względem promienia planety): zabudowa wnętrza i główna konstrukcja. */
const SPOT_SIZE = 0.06;
const CORE_SIZE = 0.1;
/** Najwięcej instancji jednego rodzaju kształtu. */
const MAX_ITEMS = 160;
/** Najwięcej odcinków taśmociągów (wszystkie kompleksy metalu planety). */
const MAX_BELTS = 120;

/** Kąt między dwoma kierunkami (rad). */
function angleOf(a: Vec3, b: Vec3): number {
  return Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
}
/** Wyrastanie kompleksu po wzroście albo zmianie etapu (s). */
const GROW_SECONDS = 1.4;

/** Rodzaje kształtów: duże (bryła, wnętrze, ruchoma część, światła) z poprzednich wersji i małe budynki. */
type KindId =
  | 'drill'
  | 'drillTower'
  | 'mineHead'
  | 'metalPlant'
  | 'smelter'
  | 'metalMega'
  | 'metalBlock'
  | 'metalYard'
  | 'teslaNode'
  | 'teslaTower'
  | 'storage'
  | 'antimatterCollector'
  | 'laboratory';

const KIND_LOOK: Record<KindId, { shape: () => BigShape; rotor: string; glow: string; speed: number }> = {
  drill: { shape: createRig, rotor: STRUCTURE_COLORS.crystalMine.light, glow: '#6fe9ff', speed: 1.6 },
  drillTower: { shape: createHub, rotor: STRUCTURE_COLORS.crystalMine.light, glow: '#6fe9ff', speed: 0.9 },
  // Suwnice i dźwigi rodziny metalowej w przygaszonym złocie (jaskrawe przyćmiewały bryły — v0.47).
  mineHead: { shape: createMineHead, rotor: '#9c8650', glow: '#ffb35a', speed: 0.3 },
  metalPlant: { shape: createMetalPlant, rotor: '#9c8650', glow: '#ff9a3c', speed: 0.25 },
  smelter: { shape: createSmelter, rotor: '#9c8650', glow: '#ff8a2c', speed: 0.2 },
  metalMega: { shape: createMetalMega, rotor: '#9c8650', glow: '#ff9a3c', speed: 0.12 },
  metalBlock: { shape: createMetalBlock, rotor: '#e6c77a', glow: '#ff9a3c', speed: 0 },
  metalYard: { shape: createMetalYard, rotor: '#e6c77a', glow: '#ff9a3c', speed: 0 },
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

/** Główna konstrukcja rodziny metalowej na każdym etapie (poz. 1 / 6 / 12 / 20 — v0.47, prototyp B). */
const METAL_CORE: readonly KindId[] = ['mineHead', 'metalPlant', 'smelter', 'metalMega'];
/** Wielkość głównej konstrukcji metalu względem promienia jej pola — rośnie z etapem i dominuje na megakompleksie. */
const METAL_CORE_SCALE = [1.7, 2.2, 2.8, 3.6] as const;
/** Moduł zabudowy na pozostałych polach ≈ 2/3 średnicy pola. */
const METAL_SPOT_SCALE = 1.35;

/** Moduł na polu `k` obszaru metalu: na etapie kopalni place, potem na przemian hala i plac, od huty głównie hale. */
function metalSpot(stage: number, k: number): KindId {
  if (stage <= 0) return 'metalYard';
  if (stage === 1) return k % 2 === 0 ? 'metalBlock' : 'metalYard';
  return k % 3 === 0 ? 'metalYard' : 'metalBlock';
}

/** Co stoi w kompleksie: główna konstrukcja i rodzaj zabudowy wnętrza (od etapu — gęściej). */
function plan(c: ColonyComplex): { core: KindId; spot: KindId | null; every: number; skipCenter: number } {
  const every = c.stage >= 2 ? 1 : c.stage === 1 ? 2 : 0;
  switch (c.building) {
    case 'metalMine':
      return { core: METAL_CORE[Math.max(0, Math.min(3, c.stage))]!, spot: 'metalBlock', every: 1, skipCenter: 0 };
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
  /** Taśmociągi rodziny metalowej (v0.47): jeden InstancedMesh, odcinki między modułami. */
  private readonly conveyor: THREE.InstancedMesh;
  private belts: { building: BuildingId; from: Vec3; to: Vec3; surface: number; width: number }[] = [];

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
    this.conveyor = new THREE.InstancedMesh(
      createConveyor(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.25, flatShading: true }),
      MAX_BELTS,
    );
    this.conveyor.count = 0;
    this.conveyor.visible = false;
    this.conveyor.frustumCulled = false;
    this.object.add(this.conveyor);
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
    this.belts = [];
    for (const c of layout.complexes) {
      const sig = `${c.cells.length}@${c.stage}${c.mega ? '+' : ''}`;
      if (this.seeded && this.signature.get(c.building) !== sig && !this.still) this.grownAt.set(c.building, this.time);
      this.signature.set(c.building, sig);
      const p = plan(c);
      if (c.building === 'metalMine') {
        this.addMetal(c, p.core);
        continue;
      }
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
    this.conveyor.count = Math.min(this.belts.length, MAX_BELTS);
    this.conveyor.visible = this.conveyor.count > 0;
    for (const kind of this.kinds.values()) {
      const count = Math.min(kind.items.length, MAX_ITEMS);
      for (const mesh of [kind.body, kind.pit, kind.rotor, kind.glow]) {
        mesh.count = count;
        mesh.visible = count > 0;
      }
    }
    this.place(true);
  }

  /**
   * Rodzina metalowa (v0.47, prototyp B): główna konstrukcja etapu dopasowana do pola (rośnie i dominuje), na pozostałych
   * polach moduły (hale, place) wielkości ~2/3 pola, bez nakładania na główną konstrukcję; od zakładu taśmociągi łączą
   * każdy moduł z najbliższym bliżej środka (drzewo transportu do huty). Deterministycznie z układu pól.
   */
  private addMetal(c: ColonyComplex, coreKind: KindId): void {
    const stage = Math.max(0, Math.min(3, c.stage));
    const coreSpot = c.spots[0];
    const coreR = coreSpot?.r ?? 0.1;
    const coreSize = coreR * METAL_CORE_SCALE[stage]! * (c.mega ? 1.1 : 1);
    this.kinds.get(coreKind)!.items.push({ building: c.building, dir: c.core, surface: c.surface - this.sink(c.core), spin: coreSpot?.spin ?? 0, size: coreSize });
    // Pola zasłonięte przez główną konstrukcję zostają puste (bez nakładania brył).
    const reach = coreSize * 0.55;
    const placed: { dir: Vec3; surface: number }[] = [{ dir: c.core, surface: c.surface - this.sink(c.core) }];
    c.spots.forEach((spot, k) => {
      if (k === 0 || angleOf(spot.dir, c.core) < reach + spot.r * 0.4) return;
      const kind = this.kinds.get(metalSpot(stage, k))!;
      if (kind.items.length >= MAX_ITEMS) return;
      const surface = spot.surface - this.sink(spot.dir);
      kind.items.push({ building: c.building, dir: spot.dir, surface, spin: spot.spin, size: spot.r * METAL_SPOT_SCALE });
      if (stage >= 1) {
        // Taśmociąg do najbliższego już postawionego modułu (spoty są posortowane od środka — drzewo do huty).
        let best = placed[0]!;
        let bestA = Infinity;
        for (const q of placed) {
          const a = angleOf(spot.dir, q.dir);
          if (a < bestA) {
            bestA = a;
            best = q;
          }
        }
        // Bez taśmy przez uskok terenu (wisiałaby albo ginęła w zboczu).
        if (Math.abs(best.surface - surface) < 0.012 && this.belts.length < MAX_BELTS) {
          this.belts.push({ building: c.building, from: spot.dir, to: best.dir, surface: (best.surface + surface) / 2, width: spot.r * 0.5 });
        }
      }
      placed.push({ dir: spot.dir, surface });
    });
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
    if (this.belts.length > 0) this.placeBelts(all);
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

  /** Odcinki taśmociągów: środek na powierzchni między końcami, wzdłuż kierunku do celu, długość = odległość. */
  private placeBelts(all: boolean): void {
    const { m, q, p, s, n } = this.tmp;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    let dirty = all;
    this.belts.forEach((belt, i) => {
      if (i >= MAX_BELTS) return;
      const born = this.grownAt.get(belt.building);
      const g = born === undefined ? 1 : Math.min(1, (this.time - born) / GROW_SECONDS);
      if (!all && g >= 1) return;
      dirty = true;
      a.set(...belt.from);
      b.set(...belt.to);
      n.copy(a).add(b).normalize();
      fwd.copy(b).sub(a);
      const length = fwd.length();
      fwd.addScaledVector(n, -fwd.dot(n)).normalize();
      right.crossVectors(n, fwd).normalize();
      basis.makeBasis(right, n, fwd);
      q.setFromRotationMatrix(basis);
      p.copy(n).multiplyScalar(belt.surface - belt.width * 0.05);
      s.set(belt.width, belt.width, Math.max(1e-5, length * g));
      m.compose(p, q, s);
      this.conveyor.setMatrixAt(i, m);
    });
    if (dirty) this.conveyor.instanceMatrix.needsUpdate = true;
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
    this.conveyor.geometry.dispose();
    (this.conveyor.material as THREE.Material).dispose();
    this.conveyor.dispose();
    for (const kind of this.kinds.values()) {
      for (const mesh of [kind.body, kind.pit, kind.rotor, kind.glow]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
    }
  }
}
