// Konteksty WebGL z testów „czy urządzenie ma grafikę 3D” (audyt widoku układu, etap A): test gry (`hasWebGL`)
// i test możliwości urządzenia w Phaserze tworzą konteksty WebGL na płótnach poza stroną i nigdy ich nie zwalniają —
// na iPadzie każdy zajmuje pamięć grafiki. Ten moduł (importowany w main.ts PRZED Phaserem) zapamiętuje konteksty
// tworzone na płótnach spoza dokumentu, a `releaseProbeContexts` zwalnia je po starcie (zostaje tylko kontekst planety).
// Plik w app/ (dotyka DOM) — nie w core.

const probes: WebGLRenderingContext[] = [];
const original = HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
  const ctx = (original as (...a: unknown[]) => RenderingContext | null).call(this, type, ...rest);
  // Płótno nie jest w dokumencie = test (płótno planety jest w HTML od początku).
  if (ctx && /webgl/.test(type) && !this.isConnected) probes.push(ctx as WebGLRenderingContext);
  return ctx;
} as typeof HTMLCanvasElement.prototype.getContext;

/** Zwalnia konteksty testowe (oprócz `keep` — kontekstu renderera planety) i przywraca zwykłe `getContext`. */
export function releaseProbeContexts(keep?: unknown): number {
  HTMLCanvasElement.prototype.getContext = original;
  let released = 0;
  for (const ctx of probes.splice(0)) {
    if (ctx === keep) continue;
    try {
      ctx.getExtension('WEBGL_lose_context')?.loseContext();
      released++;
    } catch {
      // przeglądarka bez rozszerzenia — kontekst zwolni się z płótnem
    }
  }
  return released;
}
