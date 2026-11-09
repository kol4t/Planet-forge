// Widok układu 2D (plan „widok układu”, etap C): gwiazda, orbity, obiekty na orbitach z czasu świata, oznaczenie
// własnych planet i aktywnej. Osobne płótno Canvas 2D nad planetą (bez nowego kontekstu WebGL), pętla rysowania
// działa tylko, gdy widok jest widoczny. Miniatury planet rysowane raz do małych płócien (pamięć podręczna),
// powiększane pikselowo. Kamera: dopasowanie całego układu + przybliżenie/przesunięcie palcem + płynne loty.
// Matematyka (położenia, kamera, trafienia) — `systemLayout.ts`. Kolory i nazwy robocze.
import type { Planet } from '../core/types.ts';
import { PlanetThumbnail, THUMBNAIL_SIZE } from './PlanetThumbnail.ts';
import { fitCamera, lerpCamera, pickBody, placeBodies, toScreen, SYSTEM_TILT, type PlacedBody, type SystemCamera } from './systemLayout.ts';

export interface SystemBody {
  address: string;
  orbit: number;
  phase: number;
  /** Litera na orbicie (b, c, …). */
  label: string;
  /** Kolor strefy temperatury (orbita). */
  zoneColor: string;
  own: boolean;
  active: boolean;
  /** Planeta skalista — miniatura z generatora 2D. */
  planet?: Planet;
  /** Obrót miniatury (rad) — dla aktywnej planety taki jak w widoku z bliska (etap F: przejście bez przeskoku lądów). */
  yaw?: number;
  /** Gazowy olbrzym — pasy (kolory) i pierścień. */
  gas?: { bands: readonly string[]; rings: boolean };
  /** Nad planetą krąży stacja macierzysta (etap 1 planu stacji) — znaczek obok, dotknięcie = ekran stacji. */
  station?: boolean;
}

/** Przesunięcie znaczka stacji względem środka planety (× promień rysunku). */
const STATION_OFFSET = { x: 1.55, y: -1.25 };

export interface SystemScene {
  starColor: string;
  bodies: SystemBody[];
  /** Pas asteroid za obiektem o tym indeksie (null — brak). */
  beltAfter: number | null;
}

/** Prostokąt widoku (piksele CSS, względem okna). */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Promień rysunku obiektu (pt) przy dopasowanym widoku; rośnie przy przybliżaniu. */
const BASE_R = 11;
const GROW = 0.85;

export class SystemView {
  private readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private scene: SystemScene | null = null;
  private rect: ViewRect = { x: 0, y: 0, w: 1, h: 1 };
  private dpr = 1;
  private fit: SystemCamera = { cx: 0, cy: 0, scale: 1 };
  /** Kamera użytkownika: przybliżenie względem dopasowania i przesunięcie (jednostki widoku). */
  private user = { zoom: 1, cx: 0, cy: 0 };
  private flight: { from: SystemCamera; to: SystemCamera; start: number; ms: number; done?: () => void } | null = null;
  private readonly thumbs = new Map<string, HTMLCanvasElement>();
  private placed: PlacedBody[] = [];
  private raf = 0;
  private shown = false;
  private readonly now: () => number;

  constructor(parent: HTMLElement, now: () => number) {
    this.now = now;
    this.canvas.className = 'system-view';
    this.canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:0;pointer-events:none;opacity:0;transition:opacity .35s ease;';
    this.ctx = this.canvas.getContext('2d')!;
    parent.append(this.canvas);
  }

  get visible(): boolean {
    return this.shown;
  }

  /** Obszar rysowania (wolne miejsce poza panelami) i gęstość pikseli. */
  setRect(rect: ViewRect, dpr: number): void {
    this.rect = rect;
    this.fullDpr = dpr;
    this.applyDpr(dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.fit = fitCamera(rect.w, rect.h);
  }

  /** Pełna gęstość pikseli; w czasie lotu kamery płótno ma mniej pikseli (etap F — lżejsze klatki ruchu). */
  private fullDpr = 1;

  private applyDpr(dpr: number): void {
    if (dpr === this.dpr && this.canvas.width > 1) return;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
  }

  /** Pokazanie układu; `from` — adres obiektu, z którego kamera „odlatuje” (oddalenie z planety). */
  show(scene: SystemScene, from?: { address: string; radiusPt: number; at?: { x: number; y: number } } | 'galaxy'): void {
    this.scene = scene;
    this.user = { zoom: 1, cx: 0, cy: 0 };
    this.placed = placeBodies(scene.bodies, this.now());
    const end = this.camera();
    // Z galaktyki (etap E): wlot z daleka — układ rośnie z małego punktu do pełnego widoku.
    const start = from === 'galaxy' ? { cx: 0, cy: 0, scale: this.fit.scale * 0.08 } : from ? this.cameraOn(from.address, from.radiusPt, from.at) : null;
    // Zegar lotu rusza od pierwszej narysowanej klatki (pierwsza klatka rysuje miniatury — bywa wolniejsza).
    this.flight = start ? { from: start, to: end, start: -1, ms: 650 } : null;
    this.shown = true;
    this.canvas.style.opacity = '1';
    this.loop();
  }

  hide(): void {
    this.shown = false;
    this.canvas.style.opacity = '0';
    this.flight = null;
    cancelAnimationFrame(this.raf);
  }

  /** Lot kamery na obiekt (do przybliżenia `radiusPt` — wielkość planety w widoku z bliska), potem `done`. */
  flyTo(address: string, radiusPt: number, done?: () => void, ms = 600, at?: { x: number; y: number }): void {
    const to = this.cameraOn(address, radiusPt, at);
    if (!to) return done?.();
    this.flight = { from: this.current(), to, start: -1, ms, ...(done ? { done } : {}) };
  }

  /** Powrót kamery do całego układu (po zamknięciu okienka obiektu). */
  flyHome(ms = 500): void {
    if (!this.shown) return;
    this.flight = { from: this.current(), to: { cx: 0, cy: 0, scale: this.fit.scale }, start: -1, ms };
  }

  /** Przesunięcie palcem (piksele CSS). */
  pan(dx: number, dy: number): void {
    if (this.flight) return;
    const s = this.fit.scale * this.user.zoom;
    this.user.cx -= dx / s;
    this.user.cy -= dy / s;
    this.clampPan();
  }

  /** Przybliżenie (szczypanie, kółko) — `zoom` względem dopasowania (0,7–6). */
  setZoom(zoom: number): void {
    if (this.flight) return;
    this.user.zoom = Math.min(6, Math.max(0.7, zoom));
    this.clampPan();
  }

  get zoom(): number {
    return this.user.zoom;
  }

  /** Obiekt pod palcem (piksele CSS okna) albo null. */
  pick(x: number, y: number): string | null {
    if (!this.shown || !this.scene) return null;
    const cam = this.current();
    const cx = this.rect.x + this.rect.w / 2;
    const cy = this.rect.y + this.rect.h / 2;
    return pickBody(this.placed, cam, x - cx, y - cy, this.radius(cam), 1);
  }

  /** Znaczek stacji pod palcem (adres planety, nad którą krąży) albo null — sprawdzany przed `pick`. */
  pickStation(x: number, y: number): string | null {
    if (!this.shown || !this.scene) return null;
    const cam = this.current();
    const cx = this.rect.x + this.rect.w / 2;
    const cy = this.rect.y + this.rect.h / 2;
    const radius = this.radius(cam);
    for (let i = 0; i < this.scene.bodies.length; i++) {
      const b = this.scene.bodies[i]!;
      const p = this.placed[i];
      if (!b.station || !p) continue;
      const s = toScreen(cam, p.x, p.y);
      const r = radius * (1 + 0.1 * p.depth);
      const hit = Math.max(22, r * 0.9);
      if (Math.hypot(x - cx - (s.x + r * STATION_OFFSET.x), y - cy - (s.y + r * STATION_OFFSET.y)) <= hit) return b.address;
    }
    return null;
  }

  /**
   * Gwiazda albo pas asteroid pod palcem (etap E; obiekty mają pierwszeństwo — sprawdź najpierw `pick`).
   * Strefa gwiazdy ≥ 22 pt, pas — jego szerokość z zapasem.
   */
  pickExtra(x: number, y: number): 'star' | 'belt' | null {
    if (!this.shown || !this.scene) return null;
    const cam = this.current();
    const sx = x - (this.rect.x + this.rect.w / 2);
    const sy = y - (this.rect.y + this.rect.h / 2);
    const star = toScreen(cam, 0, 0);
    if (Math.hypot(sx - star.x, sy - star.y) <= Math.max(22, cam.scale * 0.05 * 1.5)) return 'star';
    const belt = this.beltRadius();
    if (belt) {
      // Punkt ekranu → płaszczyzna orbit (odwrócenie nachylenia) i odległość od środka pasa.
      const wx = sx / cam.scale + cam.cx;
      const wy = (sy / cam.scale + cam.cy) / SYSTEM_TILT;
      if (Math.abs(Math.hypot(wx, wy) - belt.r) <= belt.half + 14 / cam.scale) return 'belt';
    }
    return null;
  }

  private beltRadius(): { r: number; half: number } | null {
    const after = this.scene?.beltAfter;
    if (after === null || after === undefined || !this.placed[after]) return null;
    const a = this.placed[after]!.r;
    const b = this.placed[after + 1]?.r ?? a + 0.1;
    return { r: (a + b) / 2, half: (b - a) * 0.3 };
  }

  dispose(): void {
    this.hide();
    this.canvas.remove();
    this.thumbs.clear();
  }

  // ——— kamera ———

  private camera(): SystemCamera {
    return { cx: this.user.cx, cy: this.user.cy, scale: this.fit.scale * this.user.zoom };
  }

  private current(): SystemCamera {
    const f = this.flight;
    if (!f) return this.camera();
    return lerpCamera(f.from, f.to, f.start < 0 ? 0 : (performance.now() - f.start) / f.ms);
  }

  /**
   * Kamera, przy której obiekt ma promień `radiusPt` i stoi w punkcie `at` okna (piksele CSS; domyślnie środek widoku) —
   * tam, gdzie stoi planeta w widoku z bliska (etap D: miniatura przechodzi w planetę bez skoku).
   */
  private cameraOn(address: string, radiusPt: number, at?: { x: number; y: number }): SystemCamera | null {
    const p = this.placed.find((b) => b.address === address);
    if (!p) return null;
    const scale = this.fit.scale * (Math.max(BASE_R, radiusPt) / BASE_R) ** (1 / GROW);
    const dx = at ? at.x - (this.rect.x + this.rect.w / 2) : 0;
    const dy = at ? at.y - (this.rect.y + this.rect.h / 2) : 0;
    return { cx: p.x - dx / scale, cy: p.y - dy / scale, scale };
  }

  private radius(cam: SystemCamera): number {
    return BASE_R * (cam.scale / this.fit.scale) ** GROW;
  }

  private clampPan(): void {
    const lim = 1.1;
    this.user.cx = Math.min(lim, Math.max(-lim, this.user.cx));
    this.user.cy = Math.min(lim * SYSTEM_TILT, Math.max(-lim * SYSTEM_TILT, this.user.cy));
  }

  // ——— rysowanie ———

  private loop = (): void => {
    if (!this.shown) return;
    this.raf = requestAnimationFrame(this.loop);
    const f = this.flight;
    if (f && f.start < 0) f.start = performance.now();
    if (f && performance.now() - f.start >= f.ms) {
      // Koniec lotu: kamera użytkownika przejmuje położenie celu.
      this.flight = null;
      this.user = { zoom: f.to.scale / this.fit.scale, cx: f.to.cx, cy: f.to.cy };
      f.done?.();
    }
    // W locie — 60% gęstości pikseli, po zatrzymaniu pełna (najwyżej 1,5× przy ruchu, żeby obraz nie był rozmyty).
    this.applyDpr(this.flight ? Math.max(1, Math.min(1.5, this.fullDpr * 0.6)) : this.fullDpr);
    this.placed = this.scene ? placeBodies(this.scene.bodies, this.now()) : [];
    this.draw();
  };

  private draw(): void {
    const { ctx, dpr, scene } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!scene) return;
    const cam = this.current();
    const ox = (this.rect.x + this.rect.w / 2) * dpr;
    const oy = (this.rect.y + this.rect.h / 2) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, ox, oy);
    const star = toScreen(cam, 0, 0);
    // Gwiazda: miękka poświata i jasny środek.
    const starR = Math.max(6, cam.scale * 0.05);
    const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, starR * 4);
    glow.addColorStop(0, scene.starColor);
    glow.addColorStop(0.25, `${scene.starColor}66`);
    glow.addColorStop(1, `${scene.starColor}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(star.x, star.y, starR * 4, 0, Math.PI * 2);
    ctx.fill();
    // Orbity w barwie strefy temperatury.
    scene.bodies.forEach((b, i) => {
      const r = this.placed[i]?.r ?? 0;
      ctx.strokeStyle = `${b.zoneColor}80`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(star.x, star.y, r * cam.scale, r * cam.scale * SYSTEM_TILT, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    // Pas asteroid: przerywana elipsa między orbitami.
    if (scene.beltAfter !== null && this.placed[scene.beltAfter]) {
      const a = this.placed[scene.beltAfter]!.r;
      const b = this.placed[scene.beltAfter + 1]?.r ?? a + 0.1;
      const r = (a + b) / 2;
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = '#8f9b9866';
      ctx.lineWidth = Math.max(2, (b - a) * cam.scale * 0.3);
      ctx.beginPath();
      ctx.ellipse(star.x, star.y, r * cam.scale, r * cam.scale * SYSTEM_TILT, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Obiekty: najpierw te za gwiazdą (głębia), potem przed nią.
    const radius = this.radius(cam);
    const order = scene.bodies.map((b, i) => ({ b, p: this.placed[i]! })).filter((o) => o.p).sort((x, y) => x.p.depth - y.p.depth);
    for (const { b, p } of order) {
      const s = toScreen(cam, p.x, p.y);
      const r = radius * (1 + 0.1 * p.depth) * (b.gas ? 1.45 : 1);
      if (s.x < -this.rect.w || s.x > this.rect.w || s.y < -this.rect.h || s.y > this.rect.h) continue;
      if (b.gas) this.drawGas(s.x, s.y, r, b.gas);
      else if (b.planet) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.thumb(b.address, b.planet, b.yaw ?? 0.6), s.x - r, s.y - r, 2 * r, 2 * r);
      }
      // Własne planety: złoty pierścień; aktywna — turkusowy, grubszy.
      if (b.own) {
        ctx.strokeStyle = b.active ? '#6fd6c4' : '#d8b463';
        ctx.lineWidth = b.active ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (b.station) this.drawStationMark(s.x + r * STATION_OFFSET.x, s.y + r * STATION_OFFSET.y, Math.max(7, r * 0.55));
      ctx.fillStyle = b.own ? '#e8dcc0' : '#8ea6a0';
      ctx.font = `600 ${b.own ? 12 : 11}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, s.x, s.y + r + 16);
    }
  }

  /** Znaczek stacji macierzystej: turkusowy pierścień z osią i złotymi panelami (pikselowo). */
  private drawStationMark(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#5ff2e0';
    ctx.lineWidth = Math.max(1.5, r * 0.18);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#62716e';
    ctx.fillRect(x - r * 0.08, y - r * 1.05, r * 0.16, r * 2.1);
    ctx.fillStyle = '#d6b25e';
    ctx.fillRect(x - r * 0.55, y - r * 1.1, r * 0.4, r * 0.18);
    ctx.fillRect(x + r * 0.15, y - r * 1.1, r * 0.4, r * 0.18);
    ctx.fillStyle = '#2b3735';
    ctx.fillRect(x - r * 0.22, y - r * 0.22, r * 0.44, r * 0.44);
  }

  private drawGas(x: number, y: number, r: number, gas: { bands: readonly string[]; rings: boolean }): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    const n = gas.bands.length || 1;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = gas.bands[i % n] ?? '#c9a24a';
      ctx.fillRect(x - r, y - r + (i * 2 * r) / 7, 2 * r, (2 * r) / 7 + 1);
    }
    // Cień po stronie nocnej.
    const shade = ctx.createLinearGradient(x - r, y, x + r, y);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
    if (gas.rings) {
      ctx.strokeStyle = '#d8c9a8aa';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.7, r * 0.45, -0.25, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Miniatura planety (raz na adres) — małe płótno, powiększane pikselowo. */
  private thumb(address: string, planet: Planet, yaw: number): HTMLCanvasElement {
    const key = `${address}|${yaw.toFixed(2)}`;
    let c = this.thumbs.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = THUMBNAIL_SIZE;
      c.height = THUMBNAIL_SIZE;
      new PlanetThumbnail(planet).draw(c.getContext('2d')!, yaw);
      // Mała pamięć: miniatura aktywnej planety zmienia obrót — stare wersje usuwane.
      for (const k of this.thumbs.keys()) if (k.startsWith(`${address}|`)) this.thumbs.delete(k);
      this.thumbs.set(key, c);
    }
    return c;
  }

  /** Liczba miniatur w pamięci (diagnostyka). */
  get thumbCount(): number {
    return this.thumbs.size;
  }
}
