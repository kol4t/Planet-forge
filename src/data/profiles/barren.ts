import type { SurfaceProfile } from '../../core/types.ts';

/** Martwy świat bez atmosfery: regolit, kratery, uskoki; woda co najwyżej zamarznięta w kotlinach. */
export const BARREN: SurfaceProfile = {
  id: 'barren',
  label: 'jałowy',
  status: 'robocza',
  methods: [
    { id: 'fractured', weight: 3 },
    { id: 'tectonic', weight: 1 },
  ],
  incompatible: [{ method: 'erosion', reason: 'bez wody i atmosfery nie ma erozji wodnej — doliny rzeczne byłyby fałszywym śladem' }],
  liquid: 'none',
  expect: { land: [0.95, 1] },
  bands: [
    { upTo: 0.45, material: 'regolith' },
    { upTo: 0.8, material: 'rock' },
    { upTo: 1, material: 'peak' },
  ],
  look: {
    // Skały i pył; prawie bez wody (płytkie, zamarznięte resztki tylko w najgłębszych kotlinach).
    palette: {
      deepWater: '#3a3f44',
      shallowWater: '#6f767a',
      shore: '#8a7a66',
      lowland: '#7d6e60',
      highland: '#6a5650',
      peak: '#b0a596',
    },
    seaLevel: [0.12, 0.16],
    terrainAmplitude: [0.045, 0.06],
    terrainScale: [1.9, 2.9],
    roughness: 0.97,
    atmosphereColor: '#b9aa98',
    atmosphereIntensity: 0.25,
    ocean: { opacity: 0.9, roughness: 0.8 },
    clouds: { threshold: [1.1, 1.15], opacity: 0, color: '#a09890' },
    polarCap: 0.93,
    style: { terraces: 4, relief: 1.8, cliffShade: 0.45, facetJitter: 0.06, atmosphereWidth: 0.015 },
  },
};
