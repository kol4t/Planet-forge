// Profile powierzchni — kategorie TECHNICZNE (CANON_STATUS R-003), nie kanoniczne typy planet.
// Nowy profil = nowy plik + wpis tutaj; generator i renderery czytają tylko dane.
import type { SurfaceProfile } from '../../core/types.ts';
import { ARID } from './arid.ts';
import { BARREN } from './barren.ts';
import { ICE } from './ice.ts';
import { OCEANIC } from './oceanic.ts';
import { TERRESTRIAL } from './terrestrial.ts';
import { VOLCANIC } from './volcanic.ts';

export { ARID, BARREN, ICE, OCEANIC, TERRESTRIAL, VOLCANIC };

export const SURFACE_PROFILES: readonly SurfaceProfile[] = [TERRESTRIAL, ARID, ICE, OCEANIC, VOLCANIC, BARREN];
