import type { SurfaceProfile } from '../../core/types.ts';

/** Zimny świat: lodowce, zamarznięte morza, ciemne wody przy równiku. */
export const ICE: SurfaceProfile = {
  id: 'ice',
  label: 'lodowy',
  status: 'robocza',
  methods: [
    { id: 'tectonic', weight: 3 },
    { id: 'erosion', weight: 1 },
    { id: 'fractured', weight: 1 },
  ],
  liquid: 'water',
  expect: { land: [0.2, 0.8] },
  bands: [
    { upTo: 0.03, material: 'shore', color: '#c9d6dc' },
    { upTo: 0.4, material: 'rock', color: '#8e9fae' },
    { upTo: 1, material: 'snow', color: '#f2f6f8' },
  ],
  look: {
    palette: {
      deepWater: '#1d3a52',
      shallowWater: '#8fb8cf',
      shore: '#c9d6dc',
      lowland: '#a9bccb',
      highland: '#7d8f9f',
      peak: '#f2f6f8',
    },
    seaLevel: [0.46, 0.56],
    terrainAmplitude: [0.04, 0.07],
    terrainScale: [1.2, 2.0],
    roughness: 0.7,
    atmosphereColor: '#a9c8ff',
    atmosphereIntensity: 0.8,
    ocean: { opacity: 0.88, roughness: 0.55 },
    clouds: { threshold: [0.55, 0.6], opacity: 0.6, color: '#eef4ff' },
    polarCap: 0.42,
    // Lód: wyraźne grzbiety i tarasy lodowców, ciemne szczeliny, jasne (ale nie wypalone) światło.
    style: { terraces: 6, relief: 1.7, cliffShade: 0.45, facetJitter: 0.04, sunIntensity: 2.1 },
  },
};
