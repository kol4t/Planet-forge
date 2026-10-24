import type { SurfaceProfile } from '../../core/types.ts';

/** Świat wulkaniczny: bazalt i popiół, świecąca lawa w zagłębieniach. */
export const VOLCANIC: SurfaceProfile = {
  id: 'volcanic',
  label: 'wulkaniczny',
  status: 'robocza',
  methods: [
    { id: 'fractured', weight: 3 },
    { id: 'tectonic', weight: 1 },
    { id: 'erosion', weight: 1 },
  ],
  liquid: 'lava',
  // Jeziora lawy tylko w wyraźnych kalderach.
  hydrology: { lakeNodes: 6, lakeDepth: 0.015 },
  expect: { land: [0.5, 0.97] },
  bands: [
    { upTo: 0.06, material: 'ash' },
    { upTo: 0.55, material: 'basalt' },
    { upTo: 0.8, material: 'rock' },
    { upTo: 1, material: 'peak' },
  ],
  look: {
    palette: {
      deepWater: '#5a1406',
      shallowWater: '#d8561c',
      shore: '#3a2a26',
      lowland: '#2d2626',
      highland: '#4a3d39',
      peak: '#8a7c74',
    },
    seaLevel: [0.4, 0.48],
    terrainAmplitude: [0.06, 0.095],
    terrainScale: [1.8, 2.8],
    roughness: 0.96,
    atmosphereColor: '#e08a5f',
    atmosphereIntensity: 0.7,
    ocean: { opacity: 0.92, roughness: 0.75, emissive: '#ff5a14', emissiveIntensity: 0.55 },
    clouds: { threshold: [0.58, 0.63], opacity: 0.55, color: '#8c8580' },
    polarCap: 1.1,
  },
};
