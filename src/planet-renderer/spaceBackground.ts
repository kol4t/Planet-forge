// Tło kosmosu (v0.17) — wspólne dla planety 2D i 3D, pod przezroczystym płótnem planety.
// Warstwy rysowane RAZ (przy zmianie rozmiaru / planety) do małych płócien Canvas 2D,
// a paralaksa to tylko przesunięcie CSS (transform) — praca kompozytora, prawie bez kosztu.
import { generatePlanet } from '../core/generation/generatePlanet.ts';
import { discLook, renderDisc } from './discRenderer.ts';
import type { RGB } from './surface.ts';
import { hexToRgb } from './surface.ts';
import type { DistantBody, SkyLayout, SkyStar } from './sky.ts';
import { layoutSky } from './sky.ts';

/** Zapas wokół ekranu, by przesunięte warstwy nie odsłaniały krawędzi (piksele CSS). */
const MARGIN = 28;
/** Paralaksa: przesunięcie (px) na radian obrotu — daleka, ciała układu, bliska warstwa. */
const DEPTH = { far: 10, bodies: 22, near: 30 } as const;
/** Jak szybko tło wraca na miejsce po ruchu planety (s). */
const SETTLE_SECONDS = 0.9;

export interface SkyScene {
  seed: string;
  /** Kolor gwiazdy układu (zabarwia jedną mgławicę). */
  starColor: string;
  bodies: DistantBody[];
}

export interface Orientation {
  yaw: number;
  pitch: number;
}

export class SpaceBackground {
  private readonly root = document.createElement('div');
  private readonly far = document.createElement('canvas');
  private readonly nearLayer = document.createElement('div');
  private readonly near = document.createElement('canvas');
  private readonly bodyLayer = document.createElement('div');
  private readonly meteor = document.createElement('div');
  private scene: SkyScene = { seed: 'planet-forge', starColor: '#f2d27a', bodies: [] };
  private w = 1;
  private h = 1;
  private focus = { cx: 0, cy: 0, r: 100 };
  private offset = { x: 0, y: 0 };
  private last: Orientation | null = null;
  private written = '';
  private lastTime = performance.now();
  private raf = 0;
  private meteorTimer = 0;
  private disposed = false;
  private readonly reducedMotion = prefersReducedMotion();

  private readonly orientation: () => Orientation;

  constructor(host: HTMLElement, orientation: () => Orientation) {
    this.orientation = orientation;
    this.root.id = 'space';
    this.root.setAttribute('aria-hidden', 'true');
    this.far.className = 'space-layer';
    this.nearLayer.className = 'space-layer';
    this.bodyLayer.className = 'space-layer';
    this.meteor.className = 'space-meteor';
    this.nearLayer.append(this.near);
    this.root.append(this.far, this.bodyLayer, this.nearLayer, this.meteor);
    host.prepend(this.root);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    if (!this.reducedMotion) this.scheduleMeteor();
  }

  setScene(scene: SkyScene): void {
    this.scene = scene;
    this.redraw();
  }

  resize(width: number, height: number): void {
    if (Math.round(width) === this.w && Math.round(height) === this.h) return;
    this.w = Math.max(1, Math.round(width));
    this.h = Math.max(1, Math.round(height));
    this.redraw();
  }

  setFocus(cx: number, cy: number, r: number): void {
    this.focus = { cx, cy, r };
    this.placeBodies();
  }

  private redraw(): void {
    const layout = layoutSky(this.scene.seed, this.w + MARGIN * 2, this.h + MARGIN * 2, this.scene.starColor);
    drawFar(this.far, layout);
    drawNear(this.near, layout);
    // Migoczące gwiazdy: kropki z animacją CSS (bez rysowania w pętli).
    for (const old of this.nearLayer.querySelectorAll('.space-twinkle')) old.remove();
    layout.twinkle.forEach((s, i) => {
      const dot = document.createElement('i');
      dot.className = 'space-twinkle';
      const size = s.r * 2;
      dot.style.cssText = `left:${s.x - s.r}px;top:${s.y - s.r}px;width:${size}px;height:${size}px;background:${s.color};color:${s.color};animation-duration:${5 + (i % 4) * 1.7}s;animation-delay:${-i * 1.3}s`;
      this.nearLayer.append(dot);
    });
    this.buildBodies();
  }

  private buildBodies(): void {
    this.bodyLayer.replaceChildren();
    for (const body of this.scene.bodies) {
      const canvas = document.createElement('canvas');
      canvas.className = 'space-body';
      canvas.title = body.name;
      this.bodyLayer.append(canvas);
    }
    this.placeBodies();
  }

  /** Ciała układu: rozmiar i miejsce zależą od planety gracza (rysowane od nowa tylko przy zmianie rozmiaru). */
  private placeBodies(): void {
    const canvases = this.bodyLayer.children;
    const { cx, cy, r } = this.focus;
    this.scene.bodies.forEach((body, i) => {
      const canvas = canvases[i] as HTMLCanvasElement | undefined;
      if (!canvas) return;
      const radius = Math.max(3, Math.round(body.size * r));
      const box = radius * (body.rings ? 5 : 3);
      if (canvas.dataset.box !== String(box)) drawBody(canvas, body, radius, box);
      // W granicach ekranu (z zapasem), nawet gdy planeta jest przesunięta przez panele.
      const x = Math.min(this.w - radius * 1.5, Math.max(radius * 1.5, cx + body.dx * r));
      // Nie pod paskiem zasobów u góry ani pod komunikatami u dołu.
      const y = Math.min(this.h * 0.85, Math.max(this.h * 0.16, cy + body.dy * r));
      // Brak miejsca obok planety (np. telefon w pionie) — ciało się chowa zamiast wystawać zza tarczy.
      canvas.hidden = Math.hypot(x - cx, y - cy) < r * 1.12 + radius;
      canvas.style.left = `${x - box / 2 + MARGIN}px`;
      canvas.style.top = `${y - box / 2 + MARGIN}px`;
    });
  }

  /** Paralaksa: tło przesuwa się przy obrocie planety i powoli wraca na miejsce. */
  private loop(time: number): void {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.reducedMotion) return;
    const dt = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;
    const now = this.orientation();
    const prev = this.last ?? now;
    this.last = now;
    const decay = Math.exp(-dt / SETTLE_SECONDS);
    this.offset.x = clamp(this.offset.x * decay + (now.yaw - prev.yaw), 1);
    this.offset.y = clamp(this.offset.y * decay - (now.pitch - prev.pitch), 1);
    const key = `${this.offset.x.toFixed(3)},${this.offset.y.toFixed(3)}`;
    if (key === this.written) return;
    this.written = key;
    const move = (el: HTMLElement, depth: number) => {
      el.style.transform = `translate3d(${(this.offset.x * depth - MARGIN).toFixed(1)}px,${(this.offset.y * depth - MARGIN).toFixed(1)}px,0)`;
    };
    move(this.far, DEPTH.far);
    move(this.bodyLayer, DEPTH.bodies);
    move(this.nearLayer, DEPTH.near);
  }

  /** Bardzo rzadka spadająca gwiazda (co 25–60 s, tylko przy widocznej karcie). Losowość tylko wizualna. */
  private scheduleMeteor(): void {
    this.meteorTimer = window.setTimeout(() => {
      if (this.disposed) return;
      if (document.visibilityState === 'visible' && typeof this.meteor.animate === 'function') {
        const x = this.w * (0.15 + Math.random() * 0.7);
        const y = this.h * (0.05 + Math.random() * 0.35);
        const angle = 18 + Math.random() * 20;
        const travel = 180 + Math.random() * 120;
        const dx = Math.cos((angle * Math.PI) / 180) * travel;
        const dy = Math.sin((angle * Math.PI) / 180) * travel;
        const base = `translate(${x}px,${y}px) rotate(${angle}deg)`;
        this.meteor.animate(
          [
            { transform: `${base} scaleX(0.2)`, opacity: 0 },
            { opacity: 0.75, offset: 0.25 },
            { transform: `translate(${x + dx}px,${y + dy}px) rotate(${angle}deg) scaleX(1)`, opacity: 0 },
          ],
          { duration: 1100, easing: 'ease-out' },
        );
      }
      this.scheduleMeteor();
    }, 25_000 + Math.random() * 35_000);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.meteorTimer);
    this.root.remove();
  }
}

const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

function rgba([r, g, b]: RGB, a: number): string {
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
}

function prepare(canvas: HTMLCanvasElement, layout: SkyLayout): CanvasRenderingContext2D {
  // Rozdzielczość 1:1 z pikselami CSS: tło jest miękkie, a na Retinie oszczędza ¾ pamięci.
  canvas.width = Math.round(layout.width);
  canvas.height = Math.round(layout.height);
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function drawStars(ctx: CanvasRenderingContext2D, stars: SkyStar[]): void {
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = s.color;
    if (s.r < 0.6) {
      ctx.fillRect(s.x, s.y, 1, 1);
    } else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawFar(canvas: HTMLCanvasElement, layout: SkyLayout): void {
  const ctx = prepare(canvas, layout);
  const { width: w, height: h, band } = layout;
  // Pas galaktyki: bardzo słaba, szeroka smuga wzdłuż pasa gwiazd.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(band.angle);
  const strip = ctx.createLinearGradient(0, band.offset - band.width, 0, band.offset + band.width);
  strip.addColorStop(0, 'rgba(120,170,200,0)');
  strip.addColorStop(0.5, 'rgba(120,170,200,0.07)');
  strip.addColorStop(1, 'rgba(120,170,200,0)');
  ctx.fillStyle = strip;
  const diagonal = Math.hypot(w, h);
  ctx.fillRect(-diagonal, band.offset - band.width, diagonal * 2, band.width * 2);
  ctx.restore();
  // Mgławice: miękkie elipsy z gradientem, nakładane addytywnie.
  ctx.globalCompositeOperation = 'lighter';
  for (const n of layout.nebulae) {
    const color = hexToRgb(n.color);
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rotation);
    ctx.scale(1, n.ry / n.rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
    g.addColorStop(0, rgba(color, n.alpha));
    g.addColorStop(0.45, rgba(color, n.alpha * 0.45));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, n.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  drawStars(ctx, layout.far);
}

function drawNear(canvas: HTMLCanvasElement, layout: SkyLayout): void {
  const ctx = prepare(canvas, layout);
  drawStars(ctx, layout.near);
  // Krzyżyk blasku przy najjaśniejszych gwiazdach (subtelny, bez bloomu).
  for (const s of layout.near) {
    if (!s.glint) continue;
    const len = s.r * 6;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const g = ctx.createLinearGradient(s.x - dx * len, s.y - dy * len, s.x + dx * len, s.y + dy * len);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(s.x - dx * len - dy * 0.5, s.y - dy * len - dx * 0.5, dx * len * 2 + dy, dy * len * 2 + dx);
    }
    const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
    halo.addColorStop(0, 'rgba(255,255,255,0.35)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(s.x - s.r * 4, s.y - s.r * 4, s.r * 8, s.r * 8);
  }
}

/** Mała tarcza sąsiedniego ciała: pasy albo ląd/woda, światło z tej samej strony co na planecie gracza. */
function drawBody(canvas: HTMLCanvasElement, body: DistantBody, radius: number, box: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(box * dpr);
  canvas.height = Math.round(box * dpr);
  canvas.style.width = `${box}px`;
  canvas.style.height = `${box}px`;
  canvas.dataset.box = String(box);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const c = box / 2;
  ctx.clearRect(0, 0, box, box);
  const ring = (front: boolean) => {
    if (!body.rings) return;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-0.35);
    ctx.scale(1, 0.28);
    ctx.beginPath();
    if (front) ctx.arc(0, 0, radius * 2.1, 0, Math.PI);
    else ctx.arc(0, 0, radius * 2.1, Math.PI, Math.PI * 2);
    ctx.lineWidth = radius * 0.5;
    ctx.strokeStyle = 'rgba(214,196,160,0.45)';
    ctx.stroke();
    ctx.restore();
  };
  ring(false);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, radius, 0, Math.PI * 2);
  ctx.clip();
  if (body.kind === 'gas-giant') {
    const bands = body.colors;
    const step = (radius * 2) / bands.length;
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(c - radius, c - radius + i * step, radius * 2, step + 1);
    });
  } else if (body.definition) {
    // Prawdziwa planeta sąsiada (ten sam generator co mapa), mała i pikselowa.
    const planet = generatePlanet(body.definition, body.seed);
    const size = Math.max(8, Math.min(48, Math.round(radius * 2)));
    const disc = document.createElement('canvas');
    disc.width = disc.height = size;
    const dctx = disc.getContext('2d')!;
    const image = dctx.createImageData(size, size);
    renderDisc(image.data, size, discLook(planet), 0.8, 0.25);
    dctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(disc, c - radius, c - radius, radius * 2, radius * 2);
  }
  // Oświetlenie gazowego olbrzyma: jasno z lewej-góry (jak planeta gracza), noc z prawej-dołu.
  if (body.kind === 'gas-giant') {
    const shade = ctx.createLinearGradient(c - radius * 0.7, c - radius * 0.6, c + radius * 0.8, c + radius * 0.7);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.45, 'rgba(2,5,10,0.35)');
    shade.addColorStop(0.75, 'rgba(2,5,10,0.9)');
    ctx.fillStyle = shade;
    ctx.fillRect(c - radius, c - radius, radius * 2, radius * 2);
  }
  ctx.restore();
  // Cienki brzeg atmosfery po stronie światła.
  ctx.beginPath();
  ctx.arc(c, c, radius, Math.PI * 0.85, Math.PI * 1.6);
  ctx.strokeStyle = 'rgba(190,225,230,0.35)';
  ctx.lineWidth = Math.max(0.6, radius * 0.08);
  ctx.stroke();
  ring(true);
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
