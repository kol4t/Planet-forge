// Miniatura planety (np. w oknie „Twoje planety”): mała pikselowa tarcza rysowana tym samym
// kodem co planeta 2D. UI podaje kontekst canvas i kąt obrotu, miniatura się w nim rysuje.
import type { Planet } from '../core/types.ts';
import { renderDisc, type DiscLook } from './discRenderer.ts';
import { createSurfaceSampler, hexToRgb } from './surface.ts';

/** Rozdzielczość miniatury (piksele planety na średnicę) — celowo mała, pikselowa. */
export const THUMBNAIL_SIZE = 36;
const PITCH = 0.32;

export class PlanetThumbnail {
  private readonly look: DiscLook;
  private image: ImageData | null = null;

  constructor(planet: Planet) {
    this.look = {
      sampler: createSurfaceSampler(planet),
      seaLevel: planet.visual.seaLevel,
      atmosphere: hexToRgb(planet.visual.atmosphereColor),
    };
  }

  /** Rysuje planetę obróconą o `yaw` w lewym górnym rogu `ctx` (THUMBNAIL_SIZE × THUMBNAIL_SIZE). */
  draw(ctx: CanvasRenderingContext2D, yaw: number): void {
    this.image ??= ctx.createImageData(THUMBNAIL_SIZE, THUMBNAIL_SIZE);
    renderDisc(this.image.data, THUMBNAIL_SIZE, this.look, yaw, PITCH);
    ctx.putImageData(this.image, 0, 0);
  }
}
