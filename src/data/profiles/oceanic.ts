import type { SurfaceProfile } from '../../core/types.ts';

/** Świat oceanów: przeważa woda, ląd w wyspach i archipelagach. */
export const OCEANIC: SurfaceProfile = {
  id: 'oceanic',
  label: 'oceaniczny',
  status: 'robocza',
  methods: [
    { id: 'tectonic', weight: 3 },
    { id: 'erosion', weight: 1 },
    { id: 'fractured', weight: 1 },
  ],
  liquid: 'water',
  expect: { land: [0.05, 0.55] },
  bands: [
    { upTo: 0.04, material: 'shore', color: '#d4c79a' },
    { upTo: 0.35, material: 'lowland', color: '#3f7a4a' },
    { upTo: 0.65, material: 'highland', color: '#5f6e4d' },
    { upTo: 1, material: 'peak', color: '#d8dccf' },
  ],
  look: {
    palette: {
      deepWater: '#0a2440',
      shallowWater: '#1f6f8f',
      shore: '#d4c79a',
      lowland: '#3f7a4a',
      highland: '#5f6e4d',
      peak: '#d8dccf',
    },
    seaLevel: [0.57, 0.61],
    terrainAmplitude: [0.045, 0.07],
    terrainScale: [1.4, 2.4],
    roughness: 0.85,
    atmosphereColor: '#78b4ea',
    atmosphereIntensity: 1,
    ocean: { opacity: 0.62, roughness: 0.22 },
    clouds: { threshold: [0.47, 0.51], opacity: 0.85, color: '#f7f9fb' },
  },
};
