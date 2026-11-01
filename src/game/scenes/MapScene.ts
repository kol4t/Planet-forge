import Phaser from 'phaser';
import type { MapOccupant } from '../../app/GameController.ts';
import { fuelLabel } from '../../core/economy/fuel.ts';
import { findStar, parseAddress, SPIRAL, spiralPoint, type GasGiantLook, type StarSystem, type SystemPlanet, type SystemSummary } from '../../core/galaxy/galaxy.ts';
import { createRng } from '../../core/random/rng.ts';
import { DISCOVERY, DISCOVERY_LABELS } from '../../core/galaxy/discovery.ts';
import { GALAXY_FILTERS, galaxyFilterCount, matchesGalaxyFilter, type GalaxyFilter } from '../../core/galaxy/galaxyIndex.ts';
import { openSearchPanel } from '../ui/searchPanel.ts';
import { orbitAngle, systemPeriods } from '../../core/galaxy/orbits.ts';
import { worldNow } from '../../core/time/worldClock.ts';
import { compareGeology } from '../../core/economy/geology.ts';
import { generatePlanet } from '../../core/generation/generatePlanet.ts';
import { GALAXY_RULES, STAR_KINDS, ZONE_LABELS } from '../../data/galaxy.ts';
import type { Planet } from '../../core/types.ts';
import { findDefinition, STARTER } from '../../data/planets.ts';
import { PlanetThumbnail, THUMBNAIL_SIZE } from '../../planet-renderer/PlanetThumbnail.ts';
import { Button, type ButtonStyle } from '../ui/Button.ts';
import { TOUCH, type Rect } from '../ui/layout.ts';
import { geologyLines } from '../ui/geologyText.ts';
import { filterCount, MAP_FILTERS, systemRows, ZONE_COLORS, type MapFilter, type SystemRowInput } from '../ui/systemTable.ts';
import { COLORS, FONTS, formatDuration, formatInt } from '../ui/theme.ts';
import { OverlayScene, type OverlaySceneDeps } from './OverlayScene.ts';
import { prefersReducedMotion } from '../ui/motion.ts';
import { centerOn, edgePointer } from '../ui/mapCamera.ts';

/** Z czym otworzyć mapę: cała galaktyka albo od razu układ. */
export interface MapSceneData {
  system?: number;
}

const OCCUPANT_LABEL: Record<MapOccupant, string> = {
  you: 'Twoja planeta',
  bot: 'Miejsce startowe innego gracza (na razie bot)',
  alien: 'Forma obca',
  free: 'Wolna — do przejęcia',
};
const OCCUPANT_COLOR: Record<MapOccupant, number> = {
  you: COLORS.goldHex,
  bot: COLORS.dangerHex,
  alien: COLORS.antimatterHex,
  free: COLORS.tealHex,
};
const hex = (color: string) => Phaser.Display.Color.HexStringToColor(color).color;

/**
 * Ekran „Mapa”: galaktyka (układy jako gwiazdy; przesuwanie i przybliżanie palcami)
 * oraz widok układu (gwiazda, orbity, planety z miniaturami). Dotknięcie pokazuje szczegóły.
 */
export class MapScene extends OverlayScene {
  private mode: 'galaxy' | 'system' = 'galaxy';
  private systemIndex = 1;
  private world: Phaser.GameObjects.Container | undefined;
  private marks: Phaser.GameObjects.Graphics | undefined;
  private labels: { text: Phaser.GameObjects.Text; x: number; y: number; always: boolean }[] = [];
  private details: Phaser.GameObjects.Container | undefined;
  private thumbs: string[] = [];
  /** Środek mapy na ekranie i jednostka (px urządzenia na 1 jednostkę mapy). */
  private view = { cx: 0, cy: 0, unit: 1 };
  /** Zaznaczony układ (widok galaktyki) albo pozycja planety (widok układu). */
  private selected: number | null = null;
  private system: StarSystem | null = null;
  /** Położenia planet w widoku układu (px urządzenia). */
  private planetSpots: { position: number; x: number; y: number }[] = [];
  /** Pas asteroid w widoku układu (promień i pół szerokości, px urządzenia). */
  private beltRing: { r: number; half: number } | null = null;
  /** Odliczanie powrotu ekspedycji w szczegółach układu. */
  private expCountdown: { text: Phaser.GameObjects.Text; target: number } | null = null;
  /** Odliczanie lotu statku w szczegółach planety. */
  private countdown: { text: Phaser.GameObjects.Text; target: string } | null = null;
  /** Komety przelatujące przez galaktykę (tylko wygląd; jednostki mapy na sekundę). */
  private comets: Phaser.GameObjects.Graphics | undefined;
  private cometList: { x: number; y: number; vx: number; vy: number; age: number; life: number }[] = [];
  private nextComet = 0;
  private readonly cometRng = createRng(`komety-${Date.now()}`);
  /** Kamera galaktyki sprzed wejścia do układu (powrót = to samo miejsce). */
  private galaxyCamera: { pan: { x: number; y: number }; zoom: number } | null = null;
  private homeTween: Phaser.Tweens.Tween | undefined;
  /** Strzałka do Twojego układu przy krawędzi mapy (warstwa ekranu, nie mapy). */
  private homePointer: Phaser.GameObjects.Graphics | undefined;
  private homePointerAt: { x: number; y: number } | null = null;
  /** Filtr znanych układów w widoku galaktyki (v0.34.5). */
  private galaxyFilter: GalaxyFilter = 'all';
  private closeSearch: (() => void) | null = null;
  /** Filtr podświetlania planet w widoku układu (v0.33). */
  private filter: MapFilter = 'all';
  /** Dane wierszy tabeli złóż układu (liczone raz przy budowie widoku). */
  private rowInputs: SystemRowInput[] = [];
  /** Planety w ruchu (widok układu, v0.34): obiekt, orbita i okres obiegu. */
  private orbiters: {
    position: number;
    body: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
    baseScale: number;
    label: { text: Phaser.GameObjects.Text; x: number; y: number; always: boolean };
    labelDrop: number;
    r: number;
    phase: number;
    period: number;
    behind: boolean | null;
  }[] = [];
  /** Spłaszczenie orbit (widok pod kątem) dobrane do kształtu obszaru mapy. */
  private tilt: number = TILT_RANGE[0];
  /** Gwiazda układu — planety za nią rysowane są pod nią. */
  private starLayer: Phaser.GameObjects.Graphics | undefined;
  /** Promień miniatury planety (px urządzenia) — do przygaszania przez filtr. */
  private thumbR = 0;
  /** Planety z galaktyki (miniatury i tabela liczą je raz). */
  private readonly planetCache = new Map<string, Planet>();

  constructor(deps: OverlaySceneDeps) {
    super('map', deps, { min: 0.8, max: 4 });
  }

  init(data: MapSceneData): void {
    const requested = data?.system;
    const index = requested && this.deps.controller.discoveryLevel(requested) >= DISCOVERY.explored ? requested : undefined;
    this.mode = index ? 'system' : 'galaxy';
    this.systemIndex = index ?? this.deps.controller.homeSystem;
    this.selected = this.mode === 'galaxy' ? this.systemIndex : null;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.mode === 'galaxy') this.animateComets(delta / 1000);
    else if (this.orbiters.length > 0) {
      // Ruch planet: położenie z czasu świata (nie z liczby klatek), znaczniki i podpisy za nimi.
      this.placeOrbiters(worldNow());
      this.drawSystemMarks();
      this.applyTransform();
    }
  }

  create(): void {
    this.setupInput();
    this.relayout();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearThumbs();
      this.closeSearch?.();
      this.closeSearch = null;
    });
  }

  relayout(): void {
    // Widok układu na telefonie: wyższy panel na tabelę złóż.
    const { bar } = this.frame(this.mode === 'system' ? 440 : 250, this.mode === 'system' ? 450 : 300);
    this.panZoom = this.mode === 'galaxy';
    this.world?.destroy(true);
    this.details?.destroy(true);
    this.details = undefined;
    for (const label of this.labels) label.text.destroy();
    this.labels = [];
    this.clearThumbs();
    this.world = this.add.container(0, 0);
    this.homePointer?.destroy();
    this.homePointer = this.add.graphics();
    if (this.mode === 'galaxy') this.buildGalaxy();
    else this.buildSystem();
    this.beginUi();
    this.buildTopBar(bar);
    this.panel(this.panelRect);
    this.applyTransform();
    this.refresh();
    this.buildDetails();
  }

  // ——— widok galaktyki ———

  private buildGalaxy(): void {
    const galaxy = this.deps.controller.galaxy;
    const radius = GALAXY_RULES.radius + 6;
    this.view = {
      cx: this.px(this.area.x + this.area.w / 2),
      cy: this.px(this.area.y + this.area.h / 2),
      unit: this.px(Math.min(this.area.w, this.area.h) / 2 / radius),
    };
    const U = this.view.unit;
    // Tło: jasne zgrubienie centralne, dwa ramiona spiralne z tysiącami gwiazd i pasami pyłu.
    // Rozdzielczość tła z wielkości na ekranie (mocne pomniejszenie dużego obrazka daje „szachownicę”).
    const size = 2 * radius * U;
    const T = Math.min(1536, Math.max(768, Math.ceil((size * 1.25) / 256) * 256));
    const art = this.add.image(0, 0, galaxyArt(this, T)).setDisplaySize(size, size);
    // Układy jak gwiazdy na zdjęciu: małe, jasny środek, delikatna poświata w barwie gwiazdy;
    // wielkość z rodzaju gwiazdy (olbrzym większy, karzeł mniejszy), czarna dziura — ciemny środek z dyskiem.
    const g = this.add.graphics();
    const controller = this.deps.controller;
    for (const s of galaxy.systems) {
      // Wiedza o układzie (v0.34.2): nieznanych nie widać, sygnał — blady punkt z obwódką,
      // wykryty — szara gwiazda bez barwy, rozpoznany i zbadany — gwiazda w swoim kolorze.
      const level = controller.discoveryLevel(s.index);
      if (level === DISCOVERY.unknown) continue;
      if (level === DISCOVERY.signal) {
        const r = Math.max(1.4 * this.dpr, 0.5 * U);
        g.fillStyle(SIGNAL_COLOR, 0.1).fillCircle(s.x * U, s.y * U, r * 3.4);
        g.lineStyle(Math.max(1, this.dpr * 0.8), SIGNAL_COLOR, 0.45).strokeCircle(s.x * U, s.y * U, r * 2.2);
        g.fillStyle(SIGNAL_COLOR, 0.6).fillCircle(s.x * U, s.y * U, r * 0.6);
        continue;
      }
      const color = level === DISCOVERY.detected ? 0xc8ced4 : hex(findStar(s.star).color);
      const r = Math.max(1.1 * this.dpr, (STAR_DOT[s.star] ?? 0.5) * U);
      const x = s.x * U;
      const y = s.y * U;
      g.fillStyle(color, 0.07).fillCircle(x, y, r * 3.2);
      g.fillStyle(color, 0.16).fillCircle(x, y, r * 1.8);
      if (s.star === 'black-hole' && level >= DISCOVERY.recognized) {
        g.lineStyle(Math.max(1, r * 0.35), color, 0.85).strokeEllipse(x, y, r * 3, r * 1.1);
        g.fillStyle(0x000000, 1).fillCircle(x, y, r * 0.7);
        continue;
      }
      g.fillStyle(color, 0.9).fillCircle(x, y, r);
      g.fillStyle(0xffffff, 0.75).fillCircle(x, y, r * 0.45);
    }
    // Filtr (v0.34.5): pasujące — turkusowa obwódka, pozostałe znane — przygaszone.
    if (this.galaxyFilter !== 'all') {
      const list = controller.knownSystemsList();
      for (const k of list) {
        const sys = galaxy.systems[k.index - 1]!;
        const r = Math.max(3 * this.dpr, 1.6 * U);
        if (matchesGalaxyFilter(k, this.galaxyFilter)) g.lineStyle(Math.max(1.2, this.dpr * 1.2), COLORS.tealHex, 0.95).strokeCircle(sys.x * U, sys.y * U, r);
        else g.fillStyle(0x05080a, 0.75).fillCircle(sys.x * U, sys.y * U, r * 1.3);
      }
    }
    // Rzadkie obiekty, o których gracz już wie: fioletowy pierścień (wykryty — przerywany).
    for (const s of galaxy.systems) {
      if (!controller.knownRare(s.index)) continue;
      const r = Math.max(3 * this.dpr, 1.5 * U);
      if (controller.discoveryLevel(s.index) >= DISCOVERY.recognized) g.lineStyle(Math.max(1, this.dpr), RARE_COLOR, 0.9).strokeCircle(s.x * U, s.y * U, r);
      else dashedCircle(g, s.x * U, s.y * U, r, Math.max(1, this.dpr), RARE_COLOR, 0.8);
    }
    this.marks = this.add.graphics();
    this.comets = this.add.graphics();
    this.world!.add([art, g, this.comets, this.marks]);
    const home = this.deps.controller.homeSystem;
    for (const s of galaxy.systems) {
      // Nazwy tylko układów co najmniej wykrytych.
      if (controller.discoveryLevel(s.index) < DISCOVERY.detected) continue;
      const own = s.index === home;
      const text = this.add
        .text(0, 0, own ? `${s.name}\nTwój układ` : s.name, {
          fontFamily: FONTS.body,
          fontSize: `${this.px(this.s(own ? 10.5 : 9.5))}px`,
          fontStyle: own ? '600' : 'normal',
          color: own ? COLORS.gold : COLORS.muted,
          align: 'center',
        })
        .setOrigin(0.5, 0);
      this.labels.push({ text, x: s.x, y: s.y, always: own });
    }
  }

  private drawGalaxyMarks(): void {
    const g = this.marks;
    if (!g || this.mode !== 'galaxy') return;
    g.clear();
    const U = this.view.unit;
    const line = Math.max(1, this.dpr) / this.zoom;
    // Twój układ: złoty celownik o stałej wielkości na ekranie (pierścień + cztery kreski) — widać go
    // przy każdym przybliżeniu; poza widokiem prowadzi do niego strzałka przy krawędzi (`drawHomePointer`).
    const home = this.deps.controller.galaxy.systems[this.deps.controller.homeSystem - 1];
    if (home) {
      const hx = home.x * U;
      const hy = home.y * U;
      const r = this.px(this.s(11)) / this.zoom;
      g.fillStyle(COLORS.goldHex, 0.12).fillCircle(hx, hy, r);
      g.lineStyle(line * 2, COLORS.goldHex, 1).strokeCircle(hx, hy, r);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        g.lineBetween(hx + dx * r * 1.25, hy + dy * r * 1.25, hx + dx * r * 1.75, hy + dy * r * 1.75);
      }
    }
    // Ekspedycje: zasięg wokół własnych układów (gdy zaznaczony jest układ niezbadany) i trasy wypraw.
    const controller = this.deps.controller;
    const systems = controller.galaxy.systems;
    const chosen = this.selected ? systems[this.selected - 1] : undefined;
    const stats = controller.expeditionStats;
    if (stats.unlocked && chosen && controller.discoveryLevel(chosen.index) < DISCOVERY.explored) {
      const range = controller.expeditionPlan(chosen.index).range;
      for (const index of controller.ownSystemIndexes()) {
        const o = systems[index - 1];
        if (o) dashedCircle(g, o.x * U, o.y * U, range * U, line * 1.2, COLORS.tealHex, 0.45);
      }
    }
    for (const e of controller.expeditionsView()) {
      const t = systems[e.target - 1];
      const from = controller.expeditionOrigin(e.target);
      const o = from ? systems[from - 1] : undefined;
      if (!t || !o) continue;
      const steps = 12;
      for (let i = 0; i < steps; i += 2) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;
        g.lineStyle(line * 1.2, COLORS.tealHex, 0.6).lineBetween(
          (o.x + (t.x - o.x) * t0) * U,
          (o.y + (t.y - o.y) * t0) * U,
          (o.x + (t.x - o.x) * t1) * U,
          (o.y + (t.y - o.y) * t1) * U,
        );
      }
      // Sonda: tam (pierwsza połowa czasu) i z powrotem (druga).
      const k = e.progress < 0.5 ? e.progress * 2 : 2 - e.progress * 2;
      g.fillStyle(COLORS.tealHex, 1).fillCircle((o.x + (t.x - o.x) * k) * U, (o.y + (t.y - o.y) * k) * U, line * 2.6);
    }
    const selected = chosen;
    if (selected && selected !== home) g.lineStyle(line * 1.6, 0xffffff, 0.9).strokeCircle(selected.x * U, selected.y * U, this.px(this.s(13)) / this.zoom);
    else if (selected) g.lineStyle(line * 1.2, 0xffffff, 0.7).strokeCircle(selected.x * U, selected.y * U, this.px(this.s(22)) / this.zoom);
  }

  // ——— widok układu ———

  private buildSystem(): void {
    const controller = this.deps.controller;
    const system = controller.system(this.systemIndex);
    this.system = system;
    this.orbiters = [];
    if (!system) return;
    const cx = this.px(this.area.x + this.area.w / 2);
    const cy = this.px(this.area.y + this.area.h / 2);
    this.view = { cx, cy, unit: 1 };
    const n = system.planets.length;
    const thumbD = this.px(this.s(n > 7 ? 26 : 30));
    // Widok pod kątem (v0.34): orbity jako spłaszczone elipsy — szerokość z ekranu, wysokość × this.tilt.
    this.tilt = Math.min(TILT_RANGE[1], Math.max(TILT_RANGE[0], (this.area.h / this.area.w) * 0.55));
    const margin = this.px(this.s(30));
    const maxR = Math.min(this.px(this.area.w / 2) - margin, (this.px(this.area.h / 2) - margin) / this.tilt);
    const minR = Math.max(this.px(this.s(60)), maxR * 0.2);
    const orbitG = this.add.graphics();
    const starG = this.add.graphics();
    this.drawStar(starG, system);
    this.starLayer = starG;
    this.planetSpots = [];
    const planets: Phaser.GameObjects.GameObject[] = [];
    // Orbity w równych odstępach (czytelniej niż w prawdziwej skali); kolejność jak od gwiazdy.
    const orbit = (i: number) => (n === 1 ? minR : minR + ((maxR - minR) * i) / (n - 1));
    this.beltRing = null;
    if (system.belt) {
      const inner = orbit(system.belt.after - 1);
      const outer = orbit(system.belt.after);
      this.beltRing = { r: (inner + outer) / 2, half: (outer - inner) * 0.3 };
      drawBelt(orbitG, this.beltRing.r, this.beltRing.half, `${system.index}`, this.dpr, this.tilt);
      const beltText = this.add
        .text(0, 0, this.beltLabel(system.index), { fontFamily: FONTS.body, fontSize: `${this.px(this.s(9))}px`, color: COLORS.stone })
        .setOrigin(0.5, 0.5)
        .setAlpha(0.8);
      this.labels.push({ text: beltText, x: 0, y: (this.beltRing.r + this.beltRing.half) * this.tilt + this.px(this.s(8)), always: true });
    }
    this.rowInputs = system.planets.map((p) => {
      const gas = p.body === 'gas-giant' && controller.slotAt(p.address) < 0;
      const planet = gas ? null : this.planetFor(p);
      const total = planet ? controller.geologyAt(planet, p.address).total : { metal: 0, crystal: 0 };
      return {
        position: p.position,
        gas,
        occupant: controller.occupantAt(p),
        kind: gas ? 'gazowy olbrzym' : planet!.category.split(', ')[0]!,
        richness: planet ? planet.gameplay.richness : { metal: 0, crystal: 0 },
        total,
      };
    });
    this.thumbR = thumbD / 2;
    const periods = systemPeriods(system.planets.map((p) => p.orbit));
    // Strefy temperatury: orbita w barwie strefy z miękką poświatą (nazwy — w legendzie panelu).
    system.planets.forEach((p, i) => {
      const r = orbit(i);
      const zone = ZONE_COLORS[p.zone];
      orbitG.lineStyle(this.px(this.s(8)), zone, 0.05).strokeEllipse(0, 0, 2 * r, 2 * r * this.tilt, 128);
      orbitG.lineStyle(Math.max(1, this.dpr * 0.8), zone, 0.5).strokeEllipse(0, 0, 2 * r, 2 * r * this.tilt, 128);
      const own = controller.slotAt(p.address) >= 0;
      const gas = p.body === 'gas-giant' && !!p.gas && !own;
      let body: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
      if (gas) {
        // Gazowy olbrzym: większa tarcza w pikselowe pasy, czasem z pierścieniem.
        const giant = this.add.graphics();
        drawGasGiant(giant, 0, 0, thumbD * 0.8, p.gas!, this.dpr);
        body = giant;
      } else {
        const key = `map-thumb-${p.address}-${Date.now()}`;
        const texture = this.textures.createCanvas(key, THUMBNAIL_SIZE, THUMBNAIL_SIZE)!;
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        new PlanetThumbnail(this.planetFor(p)).draw(texture.context, p.position * 1.3);
        texture.refresh();
        this.thumbs.push(key);
        body = this.add.image(0, 0, key).setDisplaySize(thumbD, thumbD);
      }
      planets.push(body);
      const text = this.add
        .text(0, 0, `${String.fromCharCode(97 + p.position)}`, {
          fontFamily: FONTS.body,
          fontSize: `${this.px(this.s(10.5))}px`,
          fontStyle: '600',
          color: COLORS.muted,
        })
        .setOrigin(0.5, 0);
      const label = { text, x: 0, y: 0, always: true };
      this.labels.push(label);
      this.orbiters.push({
        position: p.position,
        body,
        baseScale: body.scaleX,
        label,
        labelDrop: thumbD * (gas ? 0.85 : 0.62),
        r,
        phase: p.angle,
        period: periods[i]!,
        behind: null,
      });
    });
    this.marks = this.add.graphics();
    this.world!.add([orbitG, starG, ...planets, this.marks]);
    this.placeOrbiters(worldNow());
  }

  /**
   * Położenia planet z czasu świata (v0.34): kąt = faza + 2π · czas / okres. Planety po dalszej stronie
   * orbity chowają się za gwiazdą i są odrobinę mniejsze — głębia widoku pod kątem.
   */
  private placeOrbiters(now: number): void {
    const star = this.starLayer;
    if (!star || this.orbiters.length === 0) return;
    this.planetSpots = [];
    for (const o of this.orbiters) {
      const a = orbitAngle(o.phase, o.period, now);
      const x = Math.cos(a) * o.r;
      const y = Math.sin(a) * o.r * this.tilt;
      const depth = Math.sin(a);
      o.body.setPosition(x, y).setScale(o.baseScale * (1 + 0.1 * depth));
      const behind = depth < 0;
      if (behind !== o.behind) {
        if (behind) this.world?.moveBelow(o.body, star);
        else this.world?.moveAbove(o.body, star);
        o.behind = behind;
      }
      o.label.x = x;
      o.label.y = y + o.labelDrop * (1 + 0.1 * depth);
      this.planetSpots.push({ position: o.position, x: this.view.cx + x, y: this.view.cy + y });
    }
  }

  /** Planeta do miniatury: Twoja (z prawdziwym wyglądem) albo z galaktyki. */
  private planetFor(p: SystemPlanet) {
    const controller = this.deps.controller;
    const own = controller.planetAtSlot(controller.slotAt(p.address));
    if (own) return own;
    let planet = this.planetCache.get(p.address);
    if (!planet) {
      planet = generatePlanet(findDefinition(p.definitionId) ?? STARTER.definition, p.address);
      this.planetCache.set(p.address, planet);
    }
    return planet;
  }

  private drawStar(g: Phaser.GameObjects.Graphics, system: StarSystem): void {
    const star = findStar(system.star);
    const color = hex(star.color);
    const r = this.px(this.s(16));
    if (system.star === 'black-hole') {
      g.lineStyle(this.px(this.s(5)), color, 0.35).strokeEllipse(0, 0, r * 3.6, r * 1.3);
      g.lineStyle(this.px(this.s(2)), color, 0.9).strokeEllipse(0, 0, r * 3, r * 1.05);
      g.fillStyle(0x000000, 1).fillCircle(0, 0, r * 0.85);
      g.lineStyle(this.px(1.2), color, 0.8).strokeCircle(0, 0, r * 0.88);
      return;
    }
    const glow = (x: number, y: number, size: number) => {
      for (const [k, a] of [
        [2.6, 0.06],
        [1.8, 0.12],
        [1.3, 0.25],
      ] as const) {
        g.fillStyle(color, a).fillCircle(x, y, size * k);
      }
      g.fillStyle(color, 1).fillCircle(x, y, size);
    };
    if (system.star === 'binary') {
      glow(-r * 0.7, 0, r * 0.7);
      glow(r * 0.8, r * 0.2, r * 0.55);
    } else if (system.star === 'pulsar') {
      g.fillStyle(color, 0.25).fillTriangle(0, 0, -r * 0.5, -r * 4, r * 0.5, -r * 4);
      g.fillStyle(color, 0.25).fillTriangle(0, 0, -r * 0.5, r * 4, r * 0.5, r * 4);
      glow(0, 0, r * 0.45);
    } else {
      glow(0, 0, system.star === 'blue-giant' ? r * 1.25 : system.star === 'red-dwarf' ? r * 0.7 : r);
    }
  }

  private drawSystemMarks(): void {
    const g = this.marks;
    const system = this.system;
    if (!g || !system || this.mode !== 'system') return;
    g.clear();
    const controller = this.deps.controller;
    const ring = this.px(this.s(system.planets.length > 7 ? 18 : 20));
    const rows = systemRows(this.rowInputs, this.filter);
    for (const p of system.planets) {
      const spot = this.planetSpots.find((s) => s.position === p.position)!;
      const x = spot.x - this.view.cx;
      const y = spot.y - this.view.cy;
      const occupant = controller.occupantAt(p);
      // Filtr: pasujące planety w turkusowej obwódce, pozostałe przygaszone.
      if (this.filter !== 'all') {
        const match = rows.find((r) => r.position === p.position)?.match;
        if (match) g.lineStyle(Math.max(2, this.dpr * 1.6), COLORS.tealHex, 1).strokeCircle(x, y, ring * 1.12);
        else g.fillStyle(0x05080a, 0.68).fillCircle(x, y, this.thumbR * (p.body === 'gas-giant' ? 1.7 : 1.05));
      }
      if (occupant !== 'free') {
        g.lineStyle(Math.max(1.5, this.dpr * 1.3), OCCUPANT_COLOR[occupant], occupant === 'you' ? 1 : 0.75).strokeCircle(x, y, ring);
      }
      if (p.address === controller.address) g.fillStyle(COLORS.goldHex, 1).fillCircle(x + ring * 0.75, y - ring * 0.75, this.px(3));
      if (controller.missionTo(p.address)) {
        // Statek w drodze: przerywany złoty pierścień i mały trójkąt.
        for (let k = 0; k < 12; k += 2) {
          g.lineStyle(Math.max(1.5, this.dpr), COLORS.goldHex, 0.9);
          g.beginPath();
          g.arc(x, y, ring * 1.15, (k * Math.PI) / 6, ((k + 1) * Math.PI) / 6, false);
          g.strokePath();
        }
        const sx = x - ring * 1.1;
        const sy = y - ring * 1.1;
        const t = this.px(4);
        g.fillStyle(COLORS.goldHex, 1).fillTriangle(sx + t, sy, sx - t, sy - t * 0.7, sx - t, sy + t * 0.7);
      }
      if (p.position === this.selected) g.lineStyle(Math.max(1.5, this.dpr * 1.2), 0xffffff, 0.9).strokeCircle(x, y, ring * 1.3);
    }
    if (this.selected === BELT && this.beltRing) {
      g.lineStyle(Math.max(1, this.dpr), 0xffffff, 0.5);
      const inner = this.beltRing.r - this.beltRing.half;
      const outer = this.beltRing.r + this.beltRing.half;
      g.strokeEllipse(0, 0, 2 * inner, 2 * inner * this.tilt, 128);
      g.strokeEllipse(0, 0, 2 * outer, 2 * outer * this.tilt, 128);
    }
  }

  /** Komety: kilka naraz, przelatują przez galaktykę po prostej, z warkoczem. */
  private animateComets(dt: number): void {
    const g = this.comets;
    if (!g) return;
    const R = GALAXY_RULES.radius;
    const rng = this.cometRng;
    this.nextComet -= dt;
    if (this.nextComet <= 0 && this.cometList.length < 3) {
      this.nextComet = rng.range(3, 8);
      // Start za krawędzią galaktyki, lot mniej więcej przez nią (12–20 s).
      const from = rng.range(0, Math.PI * 2);
      const to = from + Math.PI + rng.range(-0.7, 0.7);
      const start = { x: Math.cos(from) * (R + 12), y: Math.sin(from) * (R + 12) };
      const end = { x: Math.cos(to) * (R + 12), y: Math.sin(to) * (R + 12) };
      const life = rng.range(12, 20);
      this.cometList.push({ ...start, vx: (end.x - start.x) / life, vy: (end.y - start.y) / life, age: 0, life });
    }
    g.clear();
    const U = this.view.unit;
    const width = Math.max(1, this.dpr) / this.zoom;
    this.cometList = this.cometList.filter((c) => (c.age += dt) < c.life);
    for (const c of this.cometList) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // Pojawia się i znika płynnie na krańcach lotu.
      const fade = Math.min(1, c.age / 1.5, (c.life - c.age) / 1.5);
      const speed = Math.hypot(c.vx, c.vy) || 1;
      const tail = 9;
      for (let i = 0; i < 6; i++) {
        const a = (c.x - (c.vx / speed) * tail * (i / 6)) * U;
        const b = (c.y - (c.vy / speed) * tail * (i / 6)) * U;
        const a2 = (c.x - (c.vx / speed) * tail * ((i + 1) / 6)) * U;
        const b2 = (c.y - (c.vy / speed) * tail * ((i + 1) / 6)) * U;
        g.lineStyle(width * (2.2 - i * 0.3), 0xcfe8ff, fade * 0.55 * (1 - i / 6)).lineBetween(a, b, a2, b2);
      }
      g.fillStyle(0xffffff, fade).fillCircle(c.x * U, c.y * U, width * 1.8);
    }
    // Statki kolonizacyjne: złota przerywana trasa i statek w miejscu zgodnym z postępem lotu.
    const systems = this.deps.controller.galaxy.systems;
    for (const m of this.deps.controller.missionsView()) {
      const a = systems[(parseAddress(m.from)?.system ?? 1) - 1];
      const b = systems[(parseAddress(m.target)?.system ?? 1) - 1];
      if (!a || !b) continue;
      const steps = 14;
      for (let i = 0; i < steps; i += 2) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;
        g.lineStyle(width * 1.4, COLORS.goldHex, 0.7).lineBetween(
          (a.x + (b.x - a.x) * t0) * U,
          (a.y + (b.y - a.y) * t0) * U,
          (a.x + (b.x - a.x) * t1) * U,
          (a.y + (b.y - a.y) * t1) * U,
        );
      }
      const pulse = 0.75 + 0.25 * Math.sin(this.time.now / 250);
      g.fillStyle(COLORS.goldHex, pulse).fillCircle((a.x + (b.x - a.x) * m.progress) * U, (a.y + (b.y - a.y) * m.progress) * U, width * 3);
    }
  }

  // ——— wspólne ———

  protected applyTransform(): void {
    const scale = this.view.unit * this.zoom;
    if (this.mode === 'galaxy') {
      const limit = GALAXY_RULES.radius * scale * 0.9;
      this.pan.x = Math.max(-limit, Math.min(limit, this.pan.x));
      this.pan.y = Math.max(-limit, Math.min(limit, this.pan.y));
    }
    const cx = this.view.cx + this.pan.x;
    const cy = this.view.cy + this.pan.y;
    this.world?.setPosition(cx, cy).setScale(this.zoom);
    // Nazwy układów dopiero przy przybliżeniu (Twój układ — zawsze).
    const showAll = this.mode === 'system' || (scale * GALAXY_RULES.minSpacing) / this.dpr >= 70;
    const area = this.area;
    for (const label of this.labels) {
      const x = cx + label.x * scale;
      const y = cy + label.y * scale + (this.mode === 'galaxy' ? Math.max(1.6 * scale, this.px(this.s(20))) : 0);
      const inside = x > this.px(area.x) && x < this.px(area.x + area.w) && y > this.px(area.y) && y < this.px(area.y + area.h);
      label.text.setPosition(x, y).setVisible(inside && (label.always || showAll));
    }
    this.drawGalaxyMarks();
    this.drawHomePointer();
  }

  protected refresh(): void {
    this.drawGalaxyMarks();
    const exp = this.expCountdown;
    if (exp) {
      const flying = this.deps.controller.expeditionsView().find((e) => e.target === exp.target);
      if (flying) exp.text.setText(`Ekspedycja w drodze — powrót za ${formatDuration(flying.secondsLeft)}`);
      else {
        // Wróciła: wiedza się zmieniła — mapa i szczegóły od nowa.
        this.expCountdown = null;
        this.relayout();
        return;
      }
    }
    this.drawSystemMarks();
    const live = this.countdown;
    if (live) {
      const mission = this.deps.controller.missionsView().find((m) => m.target === live.target);
      if (mission) live.text.setText(`Statek w drodze — przylot za ${formatDuration(mission.secondsLeft)}`);
      else {
        // Statek dotarł: kolonia gotowa — szczegóły od nowa.
        this.countdown = null;
        this.buildDetails();
      }
    }
  }

  /** Po wysłaniu / zawróceniu statku: komunikat i odświeżone szczegóły. */
  private afterShip(result: { ok: boolean; message: string }): void {
    this.showToast(result.message, result.ok ? 'ok' : 'error', 3200);
    this.buildDetails();
    this.refresh();
  }

  protected onTap(px: number, py: number): void {
    const pointer = this.homePointerAt;
    if (this.mode === 'galaxy' && pointer && Math.hypot(px - pointer.x, py - pointer.y) <= this.px(TOUCH / 2 + 4)) {
      this.focusHome();
      return;
    }
    if (this.mode === 'galaxy') {
      const scale = this.view.unit * this.zoom;
      const gx = (px - this.view.cx - this.pan.x) / scale;
      const gy = (py - this.view.cy - this.pan.y) / scale;
      // Cel dotykowy co najmniej ~24 pt promienia, nawet przy oddaleniu.
      const reach = Math.max(GALAXY_RULES.minSpacing * 0.45, (24 * this.dpr) / scale);
      let best: SystemSummary | null = null;
      let bestD = reach;
      for (const s of this.deps.controller.galaxy.systems) {
        if (this.deps.controller.discoveryLevel(s.index) === DISCOVERY.unknown) continue;
        const d = Math.hypot(s.x - gx, s.y - gy);
        if (d <= bestD) {
          best = s;
          bestD = d;
        }
      }
      this.selected = best?.index ?? null;
    } else {
      const reach = this.px(28);
      let best: number | null = null;
      let bestD = reach;
      for (const spot of this.planetSpots) {
        const d = Math.hypot(spot.x - px, spot.y - py);
        if (d <= bestD) {
          best = spot.position;
          bestD = d;
        }
      }
      if (best === null && this.beltRing) {
        // Odległość „na orbicie” — z odwróconym spłaszczeniem widoku pod kątem.
        const d = Math.hypot(px - this.view.cx, (py - this.view.cy) / this.tilt);
        if (Math.abs(d - this.beltRing.r) <= Math.max(this.beltRing.half, this.px(14))) best = BELT;
      }
      this.selected = best;
    }
    this.refresh();
    this.buildDetails();
  }

  private openSystem(index: number): void {
    // Widok układu (planety, złoża) — tylko dla zbadanych.
    if (this.deps.controller.discoveryLevel(index) < DISCOVERY.explored) return;
    // Powrót do galaktyki wraca do tego samego miejsca i przybliżenia.
    if (this.mode === 'galaxy') this.galaxyCamera = { pan: { ...this.pan }, zoom: this.zoom };
    this.mode = 'system';
    this.systemIndex = index;
    this.selected = null;
    this.resetView();
    this.relayout();
  }

  private openGalaxy(): void {
    this.mode = 'galaxy';
    this.selected = this.systemIndex;
    this.resetView();
    const camera = this.galaxyCamera;
    if (camera) {
      this.zoom = camera.zoom;
      this.gestures.zoom = camera.zoom;
      this.pan = { ...camera.pan };
    }
    this.relayout();
  }

  /** „Mój układ”: płynny przejazd mapy do Twojego układu z przybliżeniem (bez zmiany zaznaczenia). */
  private focusHome(): void {
    const home = this.deps.controller.galaxy.systems[this.deps.controller.homeSystem - 1];
    if (!home || this.mode !== 'galaxy') return;
    this.moveCameraTo(home);
  }

  /** Płynny przejazd kamery galaktyki do punktu (przybliżenie ≥ 2,2×; „Ogranicz ruch” — od razu). */
  private moveCameraTo(point: { x: number; y: number }): void {
    const zoom = Math.max(this.zoom, 2.2);
    const scale = this.view.unit * zoom;
    const to = { ...centerOn(point, scale), zoom };
    const from = { x: this.pan.x, y: this.pan.y, zoom: this.zoom };
    this.homeTween?.stop();
    const apply = (t: number) => {
      this.zoom = from.zoom + (to.zoom - from.zoom) * t;
      this.gestures.zoom = this.zoom;
      this.pan = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      this.applyTransform();
    };
    if (prefersReducedMotion()) {
      apply(1);
      return;
    }
    this.homeTween = this.tweens.addCounter({ from: 0, to: 1, duration: 450, ease: 'Cubic.easeInOut', onUpdate: (tw) => apply(tw.getValue() ?? 1) });
  }

  /** Filtr znanych układów: podświetlenie na mapie (przebudowa widoku galaktyki). */
  private setGalaxyFilter(filter: GalaxyFilter): void {
    this.galaxyFilter = filter;
    this.relayout();
  }

  /** Okno „Szukaj układu” (pole tekstowe HTML); wybór przenosi mapę do układu i go zaznacza. */
  /** Podpis pasa asteroid w widoku układu (z Twoją stacją, jeśli jest). */
  private beltLabel(system: number): string {
    const station = this.deps.controller.beltInfo(system).station;
    return station ? `pas asteroid · stacja poz. ${station.level}` : 'pas asteroid';
  }

  private openSearch(): void {
    this.closeSearch?.();
    this.closeSearch = openSearchPanel({
      systems: this.deps.controller.knownSystemsList(),
      filter: this.galaxyFilter,
      onFilter: (filter) => {
        this.galaxyFilter = filter;
      },
      onPick: (index) => {
        this.closeSearch = null;
        this.relayout();
        this.flyTo(index);
      },
    });
  }

  /** Przejazd mapy do układu z przybliżeniem i zaznaczeniem. */
  private flyTo(index: number): void {
    const target = this.deps.controller.galaxy.systems[index - 1];
    if (!target || this.mode !== 'galaxy') return;
    this.selected = index;
    this.moveCameraTo(target);
    this.refresh();
    this.buildDetails();
  }

  /**
   * Strzałka do Twojego układu przy krawędzi mapy, gdy układ jest poza widokiem (galaktyka).
   * Zwraca jej położenie (px urządzenia) albo null, gdy układ widać.
   */
  private drawHomePointer(): { x: number; y: number } | null {
    const g = this.homePointer;
    if (!g) return null;
    g.clear();
    this.homePointerAt = null;
    const home = this.deps.controller.galaxy.systems[this.deps.controller.homeSystem - 1];
    if (!home || this.mode !== 'galaxy') return null;
    const scale = this.view.unit * this.zoom;
    const hx = this.view.cx + this.pan.x + home.x * scale;
    const hy = this.view.cy + this.pan.y + home.y * scale;
    const inset = this.px(this.s(22));
    const left = this.px(this.area.x) + inset;
    const right = this.px(this.area.x + this.area.w) - inset;
    const top = this.px(this.area.y) + inset;
    const bottom = this.px(this.area.y + this.area.h) - inset;
    const edge = edgePointer({ left, top, right, bottom }, { x: hx, y: hy });
    if (!edge) return null;
    const { x, y, angle: a } = edge;
    const r = this.px(this.s(13));
    g.fillStyle(COLORS.panel, 0.85).fillCircle(x, y, r * 1.25);
    g.lineStyle(this.px(1.6), COLORS.goldHex, 1).strokeCircle(x, y, r * 1.25);
    const tip = { x: x + Math.cos(a) * r * 0.95, y: y + Math.sin(a) * r * 0.95 };
    const side = (s: number) => ({ x: x + Math.cos(a + s * 2.55) * r * 0.75, y: y + Math.sin(a + s * 2.55) * r * 0.75 });
    const l = side(1);
    const rr = side(-1);
    g.fillStyle(COLORS.goldHex, 1).fillTriangle(tip.x, tip.y, l.x, l.y, rr.x, rr.y);
    this.homePointerAt = { x, y };
    return this.homePointerAt;
  }

  private clearThumbs(): void {
    for (const key of this.thumbs) if (this.textures.exists(key)) this.textures.remove(key);
    this.thumbs = [];
  }

  // ——— panele ———

  private buildTopBar(bar: Rect): void {
    this.panel(bar);
    const pad = 14 * this.u;
    const closeW = 104 * this.u;
    const controller = this.deps.controller;
    const galaxy = controller.galaxy;
    const title = this.mode === 'galaxy' ? `MAPA · ${galaxy.name.toUpperCase()}` : `UKŁAD ${this.system?.name ?? ''}`;
    const sub =
      this.mode === 'galaxy'
        ? `Znane układy: ${controller.knownSystems} z ${galaxy.systems.length} · Twój: ${galaxy.systems[controller.homeSystem - 1]?.name ?? ''}`
        : `Adres 1:${this.systemIndex} · ${this.system ? findStar(this.system.star).label : ''}`;
    const backW = 112 * this.u;
    this.text(bar.x + pad, bar.y + this.s(8), title, 15, COLORS.gold, { fontFamily: FONTS.serif, letterSpacing: 2, fixedWidth: this.px(bar.w - 2 * pad - closeW - backW) });
    this.text(bar.x + pad, bar.y + this.s(30), sub, 10.5, COLORS.muted, { fixedWidth: this.px(bar.w - 2 * pad - closeW - backW) });
    const y = bar.y + (bar.h - TOUCH) / 2;
    // Galaktyka: „Mój układ” przesuwa mapę do Twojego układu; układ: powrót do galaktyki.
    const [label, action] = this.mode === 'system' ? ['Galaktyka', () => this.openGalaxy()] : ['Mój układ', () => this.focusHome()];
    this.addButton(bar.x + bar.w - pad / 2 - closeW - this.s(8) - backW, y, backW, TOUCH, label, 'secondary', action);
    this.addButton(bar.x + bar.w - pad / 2 - closeW, y, closeW, TOUCH, 'Zamknij', 'secondary', () => this.close());
  }

  private buildDetails(): void {
    this.countdown = null;
    this.expCountdown = null;
    this.details?.destroy(true);
    this.details = this.add.container(0, 0).setDepth(11);
    const items: Phaser.GameObjects.GameObject[] = [];
    const rect = this.panelRect;
    const pad = 14 * this.u;
    const w = rect.w - 2 * pad;
    const x = rect.x + pad;
    let y = rect.y + pad - this.s(2);
    const line = (content: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, after = 6) => {
      const t = this.text(x, y, content, size, color, { wordWrap: { width: this.px(w) }, lineSpacing: this.px(2), ...extra }, false);
      items.push(t);
      y += t.height / this.dpr + this.s(after);
      return t;
    };
    const buttonY = rect.y + rect.h - pad - TOUCH;
    const gap = this.s(8);
    const half = (w - gap) / 2;
    const buttons = (left: [string, ButtonStyle, () => void], right: [string, ButtonStyle, () => void]) => {
      items.push(this.button(x, buttonY, half, ...left), this.button(x + half + gap, buttonY, half, ...right));
    };
    const controller = this.deps.controller;

    if (this.mode === 'galaxy') {
      const s = this.selected ? controller.galaxy.systems[this.selected - 1] : undefined;
      if (!s) {
        line('Galaktyka', 18, COLORS.gold, { fontFamily: FONTS.serif });
        line('Kolorowe gwiazdy — znane układy, szare — wykryte, blade obwódki — sygnały.', 11, COLORS.muted, {}, 4);
        // Filtry znanych układów (podświetlenie na mapie) — jeden wiersz krótkich przycisków.
        const list = controller.knownSystemsList();
        const gap = this.s(6);
        const chipW = (w - gap * (GALAXY_FILTERS.length - 1)) / GALAXY_FILTERS.length;
        GALAXY_FILTERS.forEach((f, i) => {
          const count = f.id === 'all' ? null : galaxyFilterCount(list, f.id);
          const label = count === null ? f.label : `${f.label} ${count}`;
          const style: ButtonStyle = this.galaxyFilter === f.id ? 'primary' : count === 0 ? 'disabled' : 'secondary';
          items.push(
            new Button(this, this.px(x + i * (chipW + gap)), this.px(y), this.px(chipW), this.px(TOUCH), label, this.dpr, () => this.setGalaxyFilter(this.galaxyFilter === f.id ? 'all' : f.id), this.s(chipW < 80 ? 11 : 12.5)).setStyle(style),
          );
        });
        y += TOUCH + this.s(8);
        const science = controller.rareBonuses.filter((b) => b.count > 0);
        if (science.length > 0) {
          line(`Dane naukowe: ${science.map((b) => `${b.label.toLowerCase()} ${b.count}/${b.max} — ${b.text}`).join(' · ')}`, 11, RARE_TEXT);
        }
        y = this.buildStarLegend(items, x, y, w, buttonY - this.s(10));
        buttons(['Szukaj układu', 'primary', () => this.openSearch()], ['Twój układ', 'secondary', () => this.openSystem(controller.homeSystem)]);
      } else if (controller.discoveryLevel(s.index) < DISCOVERY.explored) {
        // Wiedza niepełna: tylko to, co gracz już wie (bez planet, złóż i — przed rozpoznaniem — gwiazdy).
        const level = controller.discoveryLevel(s.index);
        const home = controller.galaxy.systems[controller.homeSystem - 1]!;
        const distance = Math.round(Math.hypot(s.x - home.x, s.y - home.y));
        if (level === DISCOVERY.signal) {
          line('Nieznany sygnał', 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
          line(`Sygnał · ${distance} jedn. od Twojego układu`, 10.5, COLORS.stone, { fontStyle: '600' });
          line('Coś tu jest — gwiazda, a może coś rzadszego. Nie znamy ani nazwy, ani planet.', 11.5, COLORS.muted);
        } else {
          line(s.name, 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
          line(`Układ 1:${s.index} · ${DISCOVERY_LABELS[level]} · ${distance} jedn. od Twojego układu`, 10.5, COLORS.teal, { fontStyle: '600' });
          if (controller.knownRare(s.index) && level < DISCOVERY.recognized) {
            line('Niezwykły obiekt — sygnał nie przypomina zwykłej gwiazdy.', 11.5, RARE_TEXT);
          } else if (level === DISCOVERY.recognized) {
            const star = findStar(s.star);
            line(`${star.label} — ${star.description}`, 11.5, COLORS.muted);
            line(`Planet: ${s.planetCount} · szczegóły planet i złóż nieznane.`, 11.5, COLORS.text);
          } else {
            line('Znamy położenie i nazwę. Rodzaj gwiazdy i planety — nieznane.', 11.5, COLORS.muted);
          }
        }
        // Ekspedycja (v0.34.3): plan albo powód, czemu się nie da; w drodze — odliczanie.
        const flying = controller.expeditionsView().find((e) => e.target === s.index);
        const plan = controller.expeditionPlan(s.index);
        let action: [string, ButtonStyle, () => void] = ['Ekspedycja', 'disabled', () => undefined];
        if (flying) {
          const t = line(`Ekspedycja w drodze — powrót za ${formatDuration(flying.secondsLeft)}`, 11.5, COLORS.teal, { fontStyle: '600' });
          this.expCountdown = { text: t, target: s.index };
          action = ['W drodze', 'disabled', () => undefined];
        } else if (plan.ok) {
          line(
            `Ekspedycja: ok. ${Math.max(1, Math.round(plan.seconds / 60))} min · ${formatInt(plan.cost.metal)} metalu, ${formatInt(plan.cost.crystal)} kryształów · ${fuelLabel(controller.expeditionFuel(s.index))} · szansa ${Math.round(plan.chance * 100)}%`,
            11.5,
            COLORS.text,
          );
          line('Wyprawa może wrócić bez wyników — koszt i paliwo przepadają.', 10.5, COLORS.faint);
          action = ['Wyślij ekspedycję', 'primary', () => this.afterShip(controller.sendExpedition(s.index))];
        } else {
          line(plan.reason ?? '', 11, COLORS.faint);
        }
        buttons(action, ['Odznacz', 'secondary', () => this.onTap(-1e6, -1e6)]);
      } else {
        const star = findStar(s.star);
        const system = controller.system(s.index)!;
        const own = s.index === controller.homeSystem;
        const homes = system.planets.filter((p) => p.occupant === 'home').length;
        line(s.name, 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
        line(`Układ 1:${s.index} · ${own ? 'Twój układ' : 'zbadany'}`, 10.5, own ? COLORS.gold : COLORS.teal, { fontStyle: '600' });
        line(`${star.label} — ${star.description}`, 11.5, COLORS.muted);
        const rare = controller.rareBonuses.find((b) => b.label === star.label);
        if (rare && controller.knownRare(s.index)) line(`Rzadki obiekt · dane naukowe: ${rare.text} dla imperium.`, 11, RARE_TEXT, { fontStyle: '600' });
        const giants = system.planets.filter((p) => p.body === 'gas-giant').length;
        line(
          `Planet: ${s.planetCount} (gazowe olbrzymy: ${giants}) · miejsca startowe graczy: ${homes} · formy obce: ${system.planets.filter((p) => p.occupant === 'alien').length}${system.belt ? ' · pas asteroid' : ''}`,
          11.5,
          COLORS.text,
        );
        const ships = controller.missionsView().filter((m) => parseAddress(m.target)?.system === s.index);
        if (ships.length) line(`Statek kolonizacyjny w drodze: ${ships.map((m) => `${m.targetName} (${formatDuration(m.secondsLeft)})`).join(', ')}`, 11, COLORS.gold);
        buttons(['Pokaż układ', 'primary', () => this.openSystem(s.index)], ['Odznacz', 'secondary', () => this.onTap(-1e6, -1e6)]);
      }
      this.details.add(items);
      return;
    }

    const system = this.system;
    if (system?.belt && this.selected === BELT) {
      line('Pas asteroid', 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
      line(`${system.name} · między orbitami ${letter(system.belt.after)} i ${letter(system.belt.after + 1)}`, 10.5, COLORS.stone, { fontStyle: '600' });
      // Górnictwo asteroid (v0.37): stację buduje Twoja planeta z tego układu (panel „Planeta” → Pas asteroid).
      const belt = controller.beltInfo(system.index);
      line('Tysiące skalnych odłamków na wspólnej orbicie. Stacja wydobywcza wysyła metal i kryształy do magazynu planety z tego układu — bez zużywania jej złóż.', 11.5, COLORS.muted, {}, 4);
      line(
        belt.station
          ? `Stacja poz. ${belt.station.level} — należy do ${belt.station.planet}.`
          : belt.own
            ? `Bez stacji. Zbuduj ją z ${belt.own.name}: panel „Planeta” → Pas asteroid.`
            : 'Bez stacji. Stację może postawić tylko Twoja planeta w tym układzie.',
        11.5,
        belt.station ? COLORS.teal : COLORS.stone,
        { fontStyle: '600' },
      );
      const own = belt.own;
      buttons(
        own
          ? ['Do planety', 'secondary', () => {
              if (own.active) return this.close();
              const result = controller.switchPlanet(own.index);
              this.close(result.message);
            }]
          : ['Brak planety', 'disabled', () => undefined],
        ['Odznacz', 'secondary', () => this.onTap(-1e6, -1e6)],
      );
      this.details.add(items);
      return;
    }
    const p = system && this.selected && this.selected > 0 ? system.planets[this.selected - 1] : undefined;
    if (!system || !p) {
      if (system) y = this.buildSystemTable(system, items, x, y, w, buttonY - this.s(10));
      buttons(['Galaktyka', 'secondary', () => this.openGalaxy()], ['Zamknij', 'secondary', () => this.close()]);
      this.details.add(items);
      return;
    }
    const occupant = controller.occupantAt(p);
    const slot = controller.slotAt(p.address);
    if (p.body === 'gas-giant' && slot < 0) {
      line(p.name, 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
      line(`${p.address} · Gazowy olbrzym`, 10.5, COLORS.stone, { fontStyle: '600' });
      line(
        `Strefa ${ZONE_LABELS[p.zone]} (${String(p.orbit).replace('.', ',')} j.a.)${p.gas?.rings ? ' · z pierścieniami' : ''}. Bez stałej powierzchni — nie da się go skolonizować.`,
        11.5,
        COLORS.text,
      );
      line('W przyszłości: stacje wydobycia gazu na orbicie (wkrótce).', 11, COLORS.muted);
      buttons(['Gazowy olbrzym', 'disabled', () => this.showToast(controller.colonize(p.address).message, 'info', 3200)], [
        'Odznacz',
        'secondary',
        () => this.onTap(-1e6, -1e6),
      ]);
      this.details.add(items);
      return;
    }
    const planet = this.planetFor(p);
    const rich = planet.gameplay.richness;
    line(occupant === 'you' ? planet.displayName : p.name, 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
    line(`${p.address} · ${OCCUPANT_LABEL[occupant]}`, 10.5, Phaser.Display.Color.IntegerToColor(OCCUPANT_COLOR[occupant]).rgba, { fontStyle: '600' });
    line(
      `${planet.category} · ${planet.gameplay.sizeClass.label} · ${formatInt(planet.gameplay.radiusKm)} km · strefa ${ZONE_LABELS[p.zone]} (${String(p.orbit).replace('.', ',')} j.a.) · obieg ${formatPeriod(this.orbiters.find((o) => o.position === p.position)?.period ?? 0)}`,
      11.5,
      COLORS.text,
    );
    line(
      `Bogactwo złóż: metal ${Math.round(rich.metal * 100)}% · kryształy ${Math.round(rich.crystal * 100)}% · energia ${Math.round(rich.energy * 100)}%`,
      11,
      COLORS.muted,
      {},
      2,
    );
    // Geologia: pola i złoża (własna planeta — ile zostało) oraz porównanie z planetą, na której jesteś.
    const geology = controller.geologyAt(planet, p.address);
    const here = p.address === controller.address;
    const compare = here ? null : { name: controller.planet.displayName, diff: compareGeology(geology, controller.geologyAt(controller.planet, controller.address)) };
    for (const text of geologyLines(geology, compare)) line(text, 11, COLORS.stone, {}, 2);
    // Specjalizacja kolonii zależy od gwiazdy i strefy orbity — podpowiedź przy wyborze planety.
    const best = controller.bestSpecializationAt(p.address);
    if (best) line(`Najlepsza specjalizacja tutaj: ${best.name} (dopasowanie ${best.label})`, 11, COLORS.teal, {}, 2);
    y += this.s(4);
    let action: [string, ButtonStyle, () => void];
    if (occupant === 'you') {
      action =
        p.address === controller.address
          ? ['Tu jesteś', 'disabled', () => undefined]
          : ['Przejdź', 'primary', () => this.finish(controller.switchPlanet(slot))];
    } else if (occupant === 'free') {
      // Statek kolonizacyjny (od v0.53 także we własnym układzie — krótki lot); inne układy po badaniu „Napęd międzygwiezdny”.
      const own = this.systemIndex === controller.homeSystem;
      const mission = controller.missionTo(p.address);
      const ships = controller.fleetView().ships.find((x) => x.type === 'colonyShip')!.docked;
      if (mission) {
        this.countdown = { text: line('', 11.5, COLORS.gold, { fontStyle: '600' }), target: p.address };
        action = ['Zawróć statek', 'secondary', () => this.afterShip(controller.cancelMission(p.address))];
      } else if (own || controller.colonyShipUnlocked) {
        line(
          // v0.58: statek z floty (stocznia na stacji macierzystej), lot kosztuje paliwo.
          `Statek kolonizacyjny z floty (na stanie: ${ships}) · ${fuelLabel(controller.colonyFuelTo(p.address))} · lot ${formatDuration(controller.flightSeconds(this.systemIndex))}`,
          11,
          ships > 0 ? COLORS.text : COLORS.danger,
        );
        action = ['Wyślij statek', 'primary', () => this.afterShip(own ? controller.colonize(p.address) : controller.sendColonyShip(p.address))];
      } else {
        line('Do innych układów poleci statek kolonizacyjny — najpierw badanie „Napęd międzygwiezdny” (Eksploracja).', 11, COLORS.faint);
        action = ['Wymaga badania', 'disabled', () => this.showToast(controller.colonize(p.address).message, 'info', 3600)];
      }
    } else {
      action = [occupant === 'alien' ? 'Forma obca' : 'Inny gracz', 'disabled', () => this.showToast(controller.colonize(p.address).message, 'info', 3200)];
    }
    // Wyszarzony przycisk też wyjaśnia powód po dotknięciu.
    buttons(action, ['Odznacz', 'secondary', () => this.onTap(-1e6, -1e6)]);
    this.details.add(items);
  }

  /** Przejście albo kolonizacja udana → zamknij mapę i pokaż planetę. */
  /**
   * Panel układu w spoczynku (v0.33): filtry podświetlania i tabela złóż — każda planeta w wierszu
   * z właścicielem i paskami metalu i kryształów (względem najbogatszej w układzie). Dotknięcie wiersza
   * = jak dotknięcie planety. Zwraca y pod tabelą.
   */
  private buildSystemTable(system: StarSystem, items: Phaser.GameObjects.GameObject[], x: number, top: number, w: number, bottom: number): number {
    let y = top;
    const star = findStar(system.star);
    const add = (content: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) => {
      const t = this.text(x, y, content, size, color, { wordWrap: { width: this.px(w) }, ...extra }, false);
      items.push(t);
      return t;
    };
    const mine = this.rowInputs.filter((r) => r.occupant === 'you').length;
    y += add(system.name, 18, COLORS.gold, { fontFamily: FONTS.serif }).height / this.dpr + this.s(1);
    y += add(`${star.label} · planet ${system.planets.length}${mine ? ` · Twoich ${mine}` : ''}`, 11, COLORS.muted).height / this.dpr + this.s(6);
    // Legenda stref temperatury (barwy orbit) — tylko strefy obecne w układzie.
    const zones = [...new Set(system.planets.map((p) => p.zone))];
    const legend = this.add.graphics();
    items.push(legend);
    let lx = x;
    for (const zone of zones) {
      const t = this.text(lx + this.s(12), y, ZONE_LABELS[zone], 10, COLORS.stone, {}, false);
      if (lx + this.s(12) + t.width / this.dpr > x + w) {
        lx = x;
        y += this.s(15);
        t.setPosition(this.px(lx + this.s(12)), this.px(y));
      }
      legend.lineStyle(this.px(2), ZONE_COLORS[zone], 0.9).strokeCircle(this.px(lx + this.s(4)), this.px(y + this.s(7)), this.px(this.s(3.5)));
      items.push(t);
      lx += this.s(12) + t.width / this.dpr + this.s(12);
    }
    y += this.s(22);
    // Filtry podświetlania — jeden wiersz krótkich przycisków.
    add('PODŚWIETL', 9.5, COLORS.muted, { fontStyle: '600' });
    y += this.s(14);
    const gap = this.s(6);
    const chipW = (w - gap * (MAP_FILTERS.length - 1)) / MAP_FILTERS.length;
    const short: Record<MapFilter, string> = { all: 'Wszystkie', free: 'Wolne', metal: 'Metal', crystal: 'Kryształy' };
    MAP_FILTERS.forEach((f, i) => {
      const count = f.id === 'all' ? null : filterCount(this.rowInputs, f.id);
      const label = count === null ? short[f.id] : `${short[f.id]} ${count}`;
      const style: ButtonStyle = this.filter === f.id ? 'primary' : count === 0 ? 'disabled' : 'secondary';
      const chip = new Button(this, this.px(x + i * (chipW + gap)), this.px(y), this.px(chipW), this.px(TOUCH), label, this.dpr, () => {
        this.filter = this.filter === f.id ? 'all' : f.id;
        this.refresh();
        this.buildDetails();
      }, this.s(chipW < 80 ? 11.5 : 12.5)).setStyle(style);
      items.push(chip);
    });
    y += TOUCH + this.s(4);
    if (this.filter === 'metal' || this.filter === 'crystal') {
      y += add('Bogate złoża: bogactwo co najmniej 120%.', 10, COLORS.faint).height / this.dpr + this.s(2);
    }
    y += this.s(6);
    // Nagłówek tabeli.
    const nameW = Math.min(this.s(150), w * 0.44);
    const barGap = this.s(10);
    const barW = (w - nameW - barGap * 2) / 2;
    const header = (text: string, hx: number) => {
      const t = this.text(hx, y, text, 9.5, COLORS.muted, { fontStyle: '600' }, false);
      items.push(t);
    };
    header('PLANETA', x);
    header('METAL', x + nameW + barGap);
    header('KRYSZTAŁY', x + nameW + barGap * 2 + barW);
    y += this.s(16);
    const rows = systemRows(this.rowInputs, this.filter);
    const rowH = Math.max(this.s(20), Math.min(this.s(30), (bottom - y) / Math.max(1, rows.length)));
    const fit = Math.max(0, Math.floor((bottom - y) / rowH));
    const g = this.add.graphics();
    items.push(g);
    for (const row of rows.slice(0, fit)) {
      const cy = y + rowH / 2;
      const alpha = row.match ? 1 : 0.35;
      const selected = row.position === this.selected;
      if (selected) g.fillStyle(COLORS.tealHex, 0.12).fillRect(this.px(x - this.s(4)), this.px(y), this.px(w + this.s(8)), this.px(rowH));
      g.fillStyle(OCCUPANT_COLOR[row.occupant], alpha).fillCircle(this.px(x + this.s(4)), this.px(cy), this.px(this.s(3.5)));
      const own = row.occupant === 'you' ? ' · Twoja' : row.occupant === 'free' && !row.gas ? ' · wolna' : '';
      const label = this.text(x + this.s(13), cy, `${row.letter}  ${row.kind}${own}`, 11, row.occupant === 'you' ? COLORS.gold : COLORS.text, {
        fixedWidth: this.px(nameW - this.s(13)),
      }, false).setOrigin(0, 0.5).setAlpha(alpha);
      items.push(label);
      const bar = (bx: number, value: number, color: number) => {
        const bh = this.s(5);
        g.fillStyle(COLORS.divider, alpha).fillRoundedRect(this.px(bx), this.px(cy - bh / 2), this.px(barW), this.px(bh), this.px(bh / 2));
        if (value > 0) g.fillStyle(color, alpha).fillRoundedRect(this.px(bx), this.px(cy - bh / 2), this.px(Math.max(bh, barW * value)), this.px(bh), this.px(bh / 2));
      };
      if (row.gas) {
        const t = this.text(x + nameW + barGap, cy, 'nie do kolonizacji', 10, COLORS.faint, {}, false).setOrigin(0, 0.5).setAlpha(alpha);
        items.push(t);
      } else {
        bar(x + nameW + barGap, row.metal, COLORS.stoneHex);
        bar(x + nameW + barGap * 2 + barW, row.crystal, COLORS.tealHex);
      }
      // Cały wiersz to cel dotykowy (jak dotknięcie planety na mapie).
      const hit = this.add.zone(this.px(x), this.px(y), this.px(w), this.px(rowH)).setOrigin(0).setInteractive();
      hit.on('pointerup', () => {
        this.selected = row.position;
        this.refresh();
        this.buildDetails();
      });
      items.push(hit);
      y += rowH;
    }
    if (fit < rows.length) {
      const more = this.text(x, y + this.s(2), `+${rows.length - fit} — dotknij planety na mapie`, 10, COLORS.faint, {}, false);
      items.push(more);
      y += this.s(16);
    }
    return y;
  }

  /** Legenda galaktyki: rodzaje gwiazd z barwą i liczbą układów (dwie kolumny). Zwraca y pod legendą. */
  private buildStarLegend(items: Phaser.GameObjects.GameObject[], x: number, top: number, w: number, bottom: number): number {
    let y = top + this.s(2);
    const controller = this.deps.controller;
    const systems = controller.galaxy.systems.filter((s) => controller.discoveryLevel(s.index) >= DISCOVERY.recognized);
    const title = this.text(x, y, 'RODZAJE GWIAZD — ZNANE UKŁADY', 9.5, COLORS.muted, { fontStyle: '600' }, false);
    items.push(title);
    y += this.s(16);
    const rowH = this.s(19);
    const rows = Math.ceil(STAR_KINDS.length / 2);
    if (y + rows * rowH > bottom) return top;
    const g = this.add.graphics();
    items.push(g);
    const colW = w / 2;
    STAR_KINDS.forEach((star, i) => {
      const cx = x + (i % 2) * colW;
      const cy = y + Math.floor(i / 2) * rowH + rowH / 2;
      g.fillStyle(hex(star.color), 1).fillCircle(this.px(cx + this.s(4)), this.px(cy), this.px(this.s(4)));
      const count = systems.filter((s) => s.star === star.id).length;
      const t = this.text(cx + this.s(13), cy, `${star.label} · ${count}`, 10.5, COLORS.stone, { fixedWidth: this.px(colW - this.s(14)) }, false).setOrigin(0, 0.5);
      items.push(t);
    });
    return y + rows * rowH + this.s(6);
  }

  private finish(result: { ok: boolean; message: string }): void {
    if (!result.ok) {
      this.showToast(result.message, 'error', 3200);
      return;
    }
    this.close(result.message);
  }
}

/** Przerywany okrąg (zasięg ekspedycji). */
function dashedCircle(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, width: number, color: number, alpha: number): void {
  const parts = Math.max(24, Math.round(r / 4));
  g.lineStyle(width, color, alpha);
  for (let i = 0; i < parts; i += 2) {
    g.beginPath();
    g.arc(x, y, r, (i / parts) * Math.PI * 2, ((i + 1) / parts) * Math.PI * 2, false);
    g.strokePath();
  }
}

/** Rzadkie obiekty (pulsary, czarne dziury) — fiolet jak antymateria. */
const RARE_COLOR = 0xb9a8f0;
const RARE_TEXT = '#b9a8f0';
/** Barwa sygnałów (układy znane tylko jako sygnał) — chłodna, przygaszona. */
const SIGNAL_COLOR = 0x9fb4c8;
/** Promień kropki układu w galaktyce (jednostki mapy) według rodzaju gwiazdy. */
const STAR_DOT: Partial<Record<string, number>> = {
  'red-dwarf': 0.42,
  yellow: 0.55,
  binary: 0.6,
  'blue-giant': 0.75,
  pulsar: 0.4,
  'black-hole': 0.55,
};
/** Zaznaczenie pasa asteroid (zamiast numeru orbity). */
const BELT = -1;
/** Okres obiegu po polsku: „2 min”, „12,5 min”. */
const formatPeriod = (seconds: number) => `${String(Math.round((seconds / 60) * 2) / 2).replace('.', ',')} min`;
/** Spłaszczenie orbit w widoku układu pod kątem (1 = z góry): szeroki ekran 0,42, wąski (pion) — mniej, do 0,7. */
const TILT_RANGE = [0.42, 0.7] as const;
const letter = (position: number) => String.fromCharCode(97 + position);

/** Pas asteroid: pierścień drobnych, nieregularnych okruchów (stałe położenie z adresu układu). */
function drawBelt(g: Phaser.GameObjects.Graphics, r: number, half: number, seed: string, dpr: number, tilt: number): void {
  const rng = createRng(`pas-${seed}`);
  for (let i = 0; i < 480; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = r + (rng.next() + rng.next() - 1) * half;
    const size = rng.range(0.6, 1.8) * dpr;
    g.fillStyle(rng.next() < 0.7 ? COLORS.stoneHex : 0x8a7f6c, rng.range(0.35, 0.8)).fillRect(Math.cos(a) * d, Math.sin(a) * d * tilt, size, size);
  }
}

/** Gazowy olbrzym: tarcza z poziomych pikselowych pasów, cień po nocnej stronie, opcjonalnie pierścień. */
function drawGasGiant(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, look: GasGiantLook, dpr: number): void {
  const ring = (front: boolean) => {
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (front ? 0 : Math.PI) + (Math.PI * i) / 32;
      points.push(new Phaser.Math.Vector2(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 0.5));
    }
    g.lineStyle(Math.max(1.5, r * 0.16), hex(look.bands[2] ?? look.bands[0]!), 0.75).strokePoints(points, false);
  };
  if (look.rings) ring(false);
  const stripes = Math.max(9, Math.round((r * 2) / (2.2 * dpr)));
  const h = (2 * r) / stripes;
  for (let i = 0; i < stripes; i++) {
    const cy = -r + (i + 0.5) * h;
    const w = 2 * Math.sqrt(Math.max(0, r * r - cy * cy));
    const band = look.bands[Math.floor((i / stripes) * look.bands.length * 2) % look.bands.length]!;
    g.fillStyle(hex(band), 1).fillRect(Math.round(x - w / 2), Math.round(y + cy - h / 2), Math.round(w), Math.ceil(h));
    // Nocna strona: ciemniejszy prawy brzeg.
    g.fillStyle(0x000000, 0.35).fillRect(Math.round(x + w / 2 - w * 0.28), Math.round(y + cy - h / 2), Math.round(w * 0.28), Math.ceil(h));
  }
  if (look.rings) ring(true);
}

/**
 * Tło galaktyki (rysowane raz, zapamiętane jako tekstura; v0.34.1 — bliżej zdjęć galaktyk spiralnych):
 * jasne, ciepłe zgrubienie centralne, ramiona spirali logarytmicznej z gromadami gwiazd, różowe i
 * niebieskie obłoki zjonizowanego wodoru wzdłuż ramion, ciemne pasma pyłu po ich wewnętrznej stronie
 * i rzadkie gwiazdy dysku między ramionami. Bez neonu — jasność rośnie przez gęstość, nie przez kolor.
 */
function galaxyArt(scene: Phaser.Scene, T: number): string {
  const key = `galaxy-art-v4-${T}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, T, T)!;
  const ctx = texture.context;
  const R = GALAXY_RULES.radius;
  const k = T / 2 / (R + 6);
  const c = T / 2;
  const rng = createRng('galaktyka-tlo-v4');
  const gauss = () => (rng.next() + rng.next() + rng.next() - 1.5) * 1.15;
  const dot = (x: number, y: number, size: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(c + x * k - size / 2, c + y * k - size / 2, size, size);
  };
  const blob = (x: number, y: number, radius: number, inner: string) => {
    const px = c + x * k;
    const py = c + y * k;
    const g = ctx.createRadialGradient(px, py, 0, px, py, radius * k);
    g.addColorStop(0, inner);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - radius * k, py - radius * k, radius * k * 2, radius * k * 2);
  };
  const armPoint = (arm: number, r: number) => spiralPoint(arm, r, R);
  // Poświata dysku: ciepłe jądro, chłodniejszy, coraz ciemniejszy dysk.
  const glow = ctx.createRadialGradient(c, c, 0, c, c, R * k);
  glow.addColorStop(0, 'rgba(255,238,210,0.62)');
  glow.addColorStop(0.07, 'rgba(255,224,182,0.34)');
  glow.addColorStop(0.2, 'rgba(210,196,180,0.10)');
  glow.addColorStop(0.55, 'rgba(120,145,180,0.04)');
  glow.addColorStop(1, 'rgba(60,80,110,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, T, T);
  ctx.globalCompositeOperation = 'lighter';
  // Miękka poświata ramion (gaz i niewidoczne pojedynczo gwiazdy).
  for (let i = 0; i < 1400; i++) {
    const arm = rng.int(0, SPIRAL.arms - 1);
    const r = R * (0.1 + 0.9 * rng.next() ** 0.85);
    const p = armPoint(arm, r);
    const spread = r * 0.1;
    const warm = Math.max(0, 1 - (r / R) * 1.8);
    blob(p.x + gauss() * spread, p.y + gauss() * spread, rng.range(4, 9) * (0.6 + r / R), `rgba(${Math.round(150 + 90 * warm)},${Math.round(170 + 40 * warm)},${Math.round(215 - 40 * warm)},${0.05 * (1.25 - r / R)})`);
  }
  // Gwiazdy ramion: gęsto przy osi, rzadziej na zewnątrz; wewnątrz ciepłe, na obrzeżach niebieskawe.
  for (let i = 0; i < 16000; i++) {
    const arm = rng.int(0, SPIRAL.arms - 1);
    const r = R * (0.1 + 0.95 * rng.next() ** 0.9);
    const p = armPoint(arm, r);
    const spread = r * (0.05 + 0.15 * rng.next());
    const t = r / R;
    const warm = Math.max(0, 1 - t * 1.6);
    const color = `rgba(${Math.round(185 + 70 * warm)},${Math.round(205 + 25 * warm)},${Math.round(255 - 50 * warm)},${(0.1 + 0.28 * rng.next()) * (1.1 - t * 0.5)})`;
    dot(p.x + gauss() * spread, p.y + gauss() * spread, rng.range(0.8, 2), color);
  }
  // Gromady gwiazd w ramionach: ciasne skupiska, nadają ramionom nieregularną, „ziarnistą” strukturę.
  for (let i = 0; i < 160; i++) {
    const arm = rng.int(0, SPIRAL.arms - 1);
    const r = R * (0.18 + 0.8 * rng.next());
    const p = armPoint(arm, r);
    const cx = p.x + gauss() * r * 0.07;
    const cy = p.y + gauss() * r * 0.07;
    const n = rng.int(12, 40);
    const size = rng.range(0.8, 2.2);
    blob(cx, cy, size * 1.6, 'rgba(200,215,255,0.05)');
    for (let j = 0; j < n; j++) dot(cx + gauss() * size, cy + gauss() * size, rng.range(0.8, 1.8), `rgba(220,230,255,${0.2 + 0.35 * rng.next()})`);
  }
  // Obłoki wodoru (mgławice emisyjne): różowe, czasem niebieskie, po zewnętrznej stronie ramion.
  for (let i = 0; i < 90; i++) {
    const arm = rng.int(0, SPIRAL.arms - 1);
    const r = R * (0.25 + 0.7 * rng.next());
    const p = armPoint(arm, r * 1.03);
    const pink = rng.next() < 0.75;
    const radius = rng.range(1.2, 3.6);
    blob(p.x + gauss() * r * 0.05, p.y + gauss() * r * 0.05, radius, pink ? `rgba(255,120,160,${rng.range(0.12, 0.22)})` : `rgba(120,170,255,${rng.range(0.08, 0.16)})`);
  }
  // Zgrubienie centralne: gęste, ciepłe, lekko eliptyczne.
  for (let i = 0; i < 5000; i++) {
    const r = R * 0.12 * Math.abs(gauss());
    const a = rng.range(0, Math.PI * 2);
    dot(Math.cos(a) * r, Math.sin(a) * r * 0.82, rng.range(0.8, 2), `rgba(255,228,190,${0.1 + 0.2 * rng.next()})`);
  }
  // Rozproszone gwiazdy dysku między ramionami.
  for (let i = 0; i < 3000; i++) {
    const r = R * Math.sqrt(rng.next());
    const a = rng.range(0, Math.PI * 2);
    dot(Math.cos(a) * r, Math.sin(a) * r, rng.range(0.6, 1.3), `rgba(200,215,235,${0.05 + 0.08 * rng.next()})`);
  }
  // Pasma pyłu po wewnętrznej stronie ramion: miękkie ciemne obłoki i drobny „piasek”.
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 700; i++) {
    const arm = rng.int(0, SPIRAL.arms - 1);
    const r = R * (0.12 + 0.65 * rng.next());
    const p = armPoint(arm, r * 0.93);
    blob(p.x + gauss() * r * 0.03, p.y + gauss() * r * 0.03, rng.range(1.2, 3), `rgba(3,6,8,${rng.range(0.1, 0.22)})`);
  }
  for (let i = 0; i < 4000; i++) {
    const arm = rng.int(0, SPIRAL.arms - 1);
    const r = R * (0.14 + 0.7 * rng.next());
    const p = armPoint(arm, r * 0.94);
    const spread = r * 0.035;
    dot(p.x + gauss() * spread, p.y + gauss() * spread, rng.range(1.5, 3), 'rgba(4,8,10,0.14)');
  }
  texture.refresh();
  return key;
}
