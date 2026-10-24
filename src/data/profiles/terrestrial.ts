import type { SurfaceProfile } from '../../core/types.ts';

/** Skalisty świat z wodą: kontynenty, pasma gór, morza. */
export const TERRESTRIAL: SurfaceProfile = {
  id: 'terrestrial',
  label: 'ziemiopodobny',
  status: 'robocza',
  methods: [
    { id: 'tectonic', weight: 3 },
    { id: 'erosion', weight: 1 },
    { id: 'fractured', weight: 1 },
  ],
  liquid: 'water',
  expect: { land: [0.25, 0.85] },
  bands: [
    { upTo: 0.03, material: 'shore', color: '#b8a77e' },
    { upTo: 0.3, material: 'lowland', color: '#4f6b4b' },
    { upTo: 0.6, material: 'highland', color: '#7b6a54' },
    { upTo: 1, material: 'peak', color: '#dcd5c6' },
  ],
  look: {
    palette: {
      deepWater: '#0f2e3c',
      shallowWater: '#2a6670',
      shore: '#b8a77e',
      lowland: '#4f6b4b',
      highland: '#7b6a54',
      peak: '#dcd5c6',
    },
    seaLevel: [0.44, 0.56],
    terrainAmplitude: [0.05, 0.085],
    terrainScale: [1.3, 2.3],
    roughness: 0.88,
    atmosphereColor: '#7fd0c4',
    atmosphereIntensity: 0.9,
  },
};
