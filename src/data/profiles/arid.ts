import type { SurfaceProfile } from '../../core/types.ts';

/** Suchy, gorący świat: piaski, wyżyny i doliny po dawnej wodzie, nieliczne płytkie morza. */
export const ARID: SurfaceProfile = {
  id: 'arid',
  label: 'pustynny',
  status: 'robocza',
  methods: [
    { id: 'erosion', weight: 3 },
    { id: 'tectonic', weight: 1 },
    { id: 'fractured', weight: 1 },
  ],
  liquid: 'water',
  expect: { land: [0.8, 1] },
  bands: [
    { upTo: 0.35, material: 'sand' },
    { upTo: 0.7, material: 'rock' },
    { upTo: 1, material: 'peak' },
  ],
  look: {
    palette: {
      deepWater: '#173238',
      shallowWater: '#3f6f69',
      shore: '#d9c08e',
      lowland: '#c49a5e',
      highland: '#9a6a43',
      peak: '#e8d6b4',
    },
    seaLevel: [0.26, 0.34],
    terrainAmplitude: [0.055, 0.09],
    terrainScale: [1.6, 2.6],
    roughness: 0.94,
    atmosphereColor: '#e7b98a',
    atmosphereIntensity: 0.75,
    ocean: { opacity: 0.6, roughness: 0.4 },
    clouds: { threshold: [0.6, 0.66], opacity: 0.5, color: '#f3e6d2' },
    polarCap: 0.93,
  },
};
