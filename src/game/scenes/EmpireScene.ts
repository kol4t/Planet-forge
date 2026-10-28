import Phaser from 'phaser';
import type { PlanetOverview } from '../../app/GameController.ts';
import { AI_RULES, type AiLevel } from '../../core/ai/advisor.ts';
import type { JournalKind } from '../../core/types.ts';
import { PlanetThumbnail, THUMBNAIL_SIZE } from '../../planet-renderer/PlanetThumbnail.ts';
import { TOUCH, type Rect } from '../ui/layout.ts';
import { empireAlerts, planetBadges, planetBars, sortPlanets, type AlertTarget, type CardTone, type EmpireAlert, type PlanetSort } from '../ui/empireCards.ts';
import { openTransportPanel } from '../ui/transportPanel.ts';
import { COLORS, FONTS, formatClock, formatDuration, formatInt, formatRate } from '../ui/theme.ts';
import { OverlayScene, type OverlaySceneDeps } from './OverlayScene.ts';

export interface EmpireSceneData {
  tab?: 'planets' | 'journal' | 'ai';
}

/** Kolor kropki wpisu dziennika. */
const KIND_COLOR: Record<JournalKind, number> = {
  build: COLORS.goldHex,
  research: COLORS.tealHex,
  colony: 0x9fd88a,
  ship: 0xcfe8ff,
  away: COLORS.stoneHex,
  empire: COLORS.antimatterHex,
  ai: 0xb9a8f0,
  expedition: 0x8fd0c8,
  find: 0xe6c77a,
};

interface CardLive {
  index: number;
  resources: Phaser.GameObjects.Text;
  build: Phaser.GameObjects.Text;
  graphics: Phaser.GameObjects.Graphics;
  bars: { value: Phaser.GameObjects.Text; rect: Rect }[];
  buildBar: Rect;
}

type TileId = 'metal' | 'crystal' | 'energy' | 'antimatter';

/** Kolory znaczków i pasków. */
const TONE: Record<CardTone, number> = { teal: COLORS.tealHex, gold: COLORS.goldHex, danger: COLORS.dangerHex };

/**
 * Ekran „Imperium”: wszystkie planety naraz (zasoby, produkcja, budowy, przejście, usuwanie),
 * statki w drodze i dziennik ekspedycji. Lista przewija się palcem.
 */
export class EmpireScene extends OverlayScene {
  private tab: 'planets' | 'journal' | 'ai' = 'planets';
  private content: Phaser.GameObjects.Container | undefined;
  private contentH = 0;
  private cards: CardLive[] = [];
  private ships: Phaser.GameObjects.Text | undefined;
  private readonly tiles = new Map<TileId, { value: Phaser.GameObjects.Text; note: Phaser.GameObjects.Text }>();
  /** Miejsca na liście do dotknięcia (pt, w układzie treści przed przewinięciem). */
  private hits: { rect: Rect; action: () => void }[] = [];
  /** Karta z otwartym menu ⋯. */
  private menuIndex: number | null = null;
  /** Kolejność kart (zapamiętana do zamknięcia gry) i rozwinięta lista alertów. */
  private static sort: PlanetSort = 'default';
  private alertsOpen = false;
  private alertRows: Phaser.GameObjects.Text[] = [];
  private thumbs: string[] = [];
  /** Liczba planet i statków przy ostatnim układzie (zmiana = przebudowa listy). */
  private shape = '';
  /** Dwa dotknięcia „Usuń” w ciągu 3 s. */
  private removeArmed: { index: number; until: number } | null = null;

  constructor(deps: OverlaySceneDeps) {
    // Bez przybliżania: jeden palec przewija listę.
    super('empire', deps, { min: 1, max: 1 });
  }

  init(data: EmpireSceneData): void {
    this.tab = data?.tab ?? 'planets';
  }

  private closeTransport: (() => void) | null = null;

  /** Statki w drodze: kolonizacyjne, ekspedycje i transportowce (wiersze nad alertami). */
  private travelling(): number {
    const c = this.deps.controller;
    return c.missionsView().length + c.expeditionsView().length + c.shipmentsView().length + c.cometsView().length;
  }

  create(): void {
    this.setupInput();
    this.relayout();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearThumbs();
      this.closeTransport?.();
      this.closeTransport = null;
    });
  }

  relayout(): void {
    const { bar } = this.frame(0, 0, false, 0.45);
    this.content?.destroy(true);
    this.clearThumbs();
    this.cards = [];
    this.content = this.add.container(0, 0);
    const mask = this.make.graphics({}, false).fillRect(this.px(this.area.x), this.px(this.area.y), this.px(this.area.w), this.px(this.area.h));
    this.content.setMask(mask.createGeometryMask());
    this.contentH = this.tab === 'planets' ? this.buildPlanets() : this.tab === 'journal' ? this.buildJournal() : this.buildAi();
    this.beginUi();
    this.buildTopBar(bar);
    this.pan = { x: 0, y: Math.min(0, this.pan.y) };
    this.applyTransform();
    this.refresh();
  }

  private buildTopBar(bar: Rect): void {
    this.panel(bar);
    const pad = 12 * this.u;
    const c = this.deps.controller;
    const gap = this.s(6);
    const buttonW = Math.min(this.s(108), (bar.w - this.s(70)) / 4 - gap);
    const y = bar.y + (bar.h - TOUCH) / 2;
    const right = bar.x + bar.w - pad / 2;
    const titleW = bar.w - 4 * buttonW - 3 * gap - pad * 1.5;
    // Na wąskim ekranie (telefon) tytuł ustępuje miejsca zakładkom.
    if (titleW >= this.s(70)) {
      this.text(bar.x + pad, bar.y + this.s(8), 'IMPERIUM', 15, COLORS.gold, { fontFamily: FONTS.serif, letterSpacing: 2, fixedWidth: this.px(titleW) });
      const f = c.empireTotals();
      const loop = c.loopProgress();
      this.text(bar.x + pad, bar.y + this.s(30), `Planet: ${c.slotInfo.used} z ${c.slotInfo.unlocked} · pola ${formatInt(f.fieldsUsed)}/${formatInt(f.fieldsBuildable)} · wyeksploatowane ${loop.exploited.length}/${loop.needed}`, 10.5, COLORS.muted, { fixedWidth: this.px(titleW) });
    }
    const tabs: [string, 'planets' | 'journal' | 'ai' | null][] = [
      ['Planety', 'planets'],
      ['Dziennik', 'journal'],
      ['SI', 'ai'],
      ['Zamknij', null],
    ];
    tabs.forEach(([label, tab], i) => {
      const bx = right - (tabs.length - i) * buttonW - (tabs.length - 1 - i) * gap;
      this.addButton(bx, y, buttonW, TOUCH, label, tab && tab === this.tab ? 'primary' : 'secondary', () => (tab ? this.switchTab(tab) : this.close()));
    });
  }

  private switchTab(tab: 'planets' | 'journal' | 'ai'): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.pan = { x: 0, y: 0 };
    this.relayout();
  }

  // ——— zakładka „Planety” ———

  /** Kształt listy: zmiana (planety, statki, znaczki, menu karty) = przebudowa. */
  private planetsShape(overview: PlanetOverview[], missions: number): string {
    const alerts = empireAlerts(overview, Math.max(0, this.deps.controller.slotInfo.unlocked - overview.length));
    return [
      overview.length,
      missions,
      this.menuIndex,
      EmpireScene.sort,
      this.alertsOpen,
      alerts.map((a) => `${a.level}${a.target.kind}${a.index}`).join(','),
      ...overview.map((p) => `${p.index}${p.active ? '*' : ''}:${planetBadges(p).map((b) => b.label).join(',')}`),
    ].join('|');
  }

  /** Buduje kafelki sumy i karty planet; zwraca wysokość treści (pt). */
  private buildPlanets(): number {
    const c = this.deps.controller;
    const area = this.area;
    const items: Phaser.GameObjects.GameObject[] = [];
    const gap = this.s(10);
    let y = area.y + this.s(4);
    const overview = c.overview();
    this.shape = this.planetsShape(overview, this.travelling());
    this.hits = [];
    this.tiles.clear();

    // Kafelki sumy imperium (2 albo 4 w rzędzie).
    const tileCols = area.w >= this.s(560) ? 4 : 2;
    const tileW = (area.w - gap * (tileCols - 1)) / tileCols;
    const tileH = this.s(60);
    const tiles: [TileId, string][] = [
      ['metal', 'METAL / H'],
      ['crystal', 'KRYSZTAŁY / H'],
      ['energy', 'ENERGIA'],
      ['antimatter', 'ANTYMATERIA'],
    ];
    tiles.forEach(([id, label], i) => {
      const x = area.x + (i % tileCols) * (tileW + gap);
      const top = y + Math.floor(i / tileCols) * (tileH + gap);
      const bg = this.add.graphics();
      bg.fillStyle(COLORS.panel, 0.92).fillRoundedRect(this.px(x), this.px(top), this.px(tileW), this.px(tileH), this.px(this.s(10)));
      bg.lineStyle(this.px(1), COLORS.panelBorder, 1).strokeRoundedRect(this.px(x), this.px(top), this.px(tileW), this.px(tileH), this.px(this.s(10)));
      const name = this.text(x + this.s(12), top + this.s(9), label, 9.5, COLORS.muted, { fontStyle: '600', letterSpacing: 1.3 }, false);
      const value = this.text(x + this.s(12), top + this.s(25), '', 19, COLORS.text, {}, false);
      const note = this.text(x + this.s(12), top + this.s(29), '', 10.5, COLORS.muted, {}, false);
      items.push(bg, name, value, note);
      this.tiles.set(id, { value, note });
    });
    y += Math.ceil(tiles.length / tileCols) * (tileH + gap);
    this.ships = this.text(area.x + this.s(4), y, '', 12, COLORS.gold, { fontStyle: '600', wordWrap: { width: this.px(area.w - this.s(8)) } }, false);
    items.push(this.ships);
    const travelling = this.travelling();
    if (travelling > 0) y += this.s(18) * travelling + this.s(8);

    // Sytuacja imperium: co wymaga uwagi (dotknięcie prowadzi na miejsce).
    const free = Math.max(0, c.slotInfo.unlocked - overview.length);
    const alerts = empireAlerts(overview, free);
    y = this.buildAlerts(items, alerts, y);

    // Kolejność kart.
    y = this.buildSort(items, y);

    // Karty planet.
    const cols = Math.max(1, Math.min(3, Math.floor((area.w + gap) / (this.s(300) + gap))));
    const cardW = (area.w - gap * (cols - 1)) / cols;
    const cardH = this.s(206);
    const count = overview.length + Math.min(1, free);
    sortPlanets(overview, EmpireScene.sort, alerts).forEach((p, i) => {
      const x = area.x + (i % cols) * (cardW + gap);
      const top = y + Math.floor(i / cols) * (cardH + gap);
      items.push(...this.planetCard(p, { x, y: top, w: cardW, h: cardH }));
    });
    if (free > 0) {
      const i = overview.length;
      const rect = { x: area.x + (i % cols) * (cardW + gap), y: y + Math.floor(i / cols) * (cardH + gap), w: cardW, h: cardH };
      items.push(...this.freeSlotCard(rect, free));
    }
    y += Math.ceil(count / cols) * (cardH + gap);
    if (free === 0) {
      items.push(this.button(area.x, y + this.s(4), Math.min(this.s(240), area.w), 'Mapa układu', 'secondary', () => this.scene.start('map', { system: c.homeSystem })));
      y += this.s(4) + TOUCH + this.s(12);
    }
    this.content!.add(items);
    return y - area.y;
  }

  /** Sekcja „Sytuacja imperium”: do 3 alertów (rozwijane), każdy prowadzi do miejsca problemu. */
  private buildAlerts(items: Phaser.GameObjects.GameObject[], alerts: EmpireAlert[], top: number): number {
    const area = this.area;
    const pad = this.s(12);
    const rowH = TOUCH;
    const shown = this.alertsOpen ? alerts : alerts.slice(0, 3);
    const more = alerts.length - shown.length;
    const h = pad + this.s(22) + Math.max(1, shown.length) * rowH + (more > 0 || this.alertsOpen ? rowH : 0) + pad / 2;
    const urgent = alerts.some((a) => a.level === 0);
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.92).fillRoundedRect(this.px(area.x), this.px(top), this.px(area.w), this.px(h), this.px(this.s(12)));
    g.lineStyle(this.px(1), urgent ? COLORS.dangerHex : alerts.length > 0 ? COLORS.goldHex : COLORS.panelBorder, urgent || alerts.length > 0 ? 0.7 : 1)
      .strokeRoundedRect(this.px(area.x), this.px(top), this.px(area.w), this.px(h), this.px(this.s(12)));
    items.push(g);
    // Problemy (czerwone i złote) osobno od okazji (turkusowe: wolne pola, Laboratorium bez badania…).
    const problems = alerts.filter((a) => a.level < 2).length;
    const chances = alerts.length - problems;
    const parts = ['SYTUACJA IMPERIUM'];
    if (problems > 0) parts.push(`WYMAGA UWAGI: ${problems}`);
    if (chances > 0) parts.push(`OKAZJE: ${chances}`);
    items.push(this.text(area.x + pad, top + pad, parts.join(' · '), 9.5, urgent ? COLORS.danger : problems > 0 ? COLORS.gold : COLORS.teal, { fontStyle: '600', letterSpacing: 1.3 }, false));
    let y = top + pad + this.s(22);
    this.alertRows = [];
    if (alerts.length === 0) {
      items.push(this.text(area.x + pad, y + this.s(12), 'Wszystko działa — nic nie wymaga uwagi.', 12, COLORS.teal, {}, false));
      return top + h + this.s(10);
    }
    const tone = [COLORS.dangerHex, COLORS.goldHex, COLORS.tealHex] as const;
    for (const alert of shown) {
      const dot = this.add.graphics().fillStyle(tone[alert.level], 1).fillCircle(this.px(area.x + pad + this.s(4)), this.px(y + rowH / 2), this.px(this.s(4)));
      const text = this.text(area.x + pad + this.s(16), y + rowH / 2 - this.s(8), alert.text, 12, COLORS.text, { fixedWidth: this.px(area.w - 2 * pad - this.s(36)) }, false);
      const arrow = this.text(area.x + area.w - pad, y + rowH / 2 - this.s(9), '›', 16, COLORS.muted, {}, false).setOrigin(1, 0);
      items.push(dot, text, arrow);
      this.alertRows.push(text);
      const target = alert.target;
      this.hits.push({ rect: { x: area.x, y, w: area.w, h: rowH }, action: () => this.goTo(target) });
      y += rowH;
    }
    if (more > 0 || this.alertsOpen) {
      items.push(this.text(area.x + pad + this.s(16), y + rowH / 2 - this.s(8), this.alertsOpen ? 'Pokaż mniej' : `Pokaż wszystkie (${alerts.length})`, 12, COLORS.teal, { fontStyle: '600' }, false));
      this.hits.push({
        rect: { x: area.x, y, w: area.w, h: rowH },
        action: () => {
          this.alertsOpen = !this.alertsOpen;
          this.relayout();
        },
      });
    }
    return top + h + this.s(10);
  }

  /** Przyciski kolejności kart. */
  private buildSort(items: Phaser.GameObjects.GameObject[], top: number): number {
    const area = this.area;
    const gap = this.s(6);
    const options: [PlanetSort, string][] = [
      ['default', 'Kolejno'],
      ['production', 'Produkcja'],
      ['problems', 'Problemy'],
      ['free', 'Wolne pola'],
    ];
    let x = area.x;
    // Wąski ekran: bez podpisu, żeby zmieściły się wszystkie przyciski.
    if (area.w >= this.s(480)) {
      const label = this.text(area.x + this.s(2), top + TOUCH / 2 - this.s(8), 'Kolejność:', 11, COLORS.muted, {}, false);
      items.push(label);
      x += label.width / this.dpr + this.s(10);
    }
    const widths = options.map(([, name]) => this.s(name.length * 7.4 + 26));
    const fit = Math.min(1, (area.x + area.w - x - gap * (options.length - 1)) / widths.reduce((a, b) => a + b, 0));
    for (const [i, [sort, name]] of options.entries()) {
      const w = widths[i]! * fit;
      items.push(
        this.button(x, top, w, name, sort === EmpireScene.sort ? 'primary' : 'secondary', () => {
          EmpireScene.sort = sort;
          this.relayout();
        }),
      );
      x += w + gap;
    }
    return top + TOUCH + this.s(10);
  }

  /** Dotknięcie alertu: planeta (przejście), jej badania albo mapa. */
  private goTo(target: AlertTarget): void {
    const c = this.deps.controller;
    if (target.kind === 'map') {
      this.scene.start('map', { system: c.homeSystem });
      return;
    }
    const active = c.planets().find((p) => p.active)?.index;
    const message = target.index !== active ? c.switchPlanet(target.index).message : undefined;
    if (target.kind === 'research') this.scene.start('research');
    else this.close(message);
  }

  /** Puste miejsce na planetę: przerywana ramka, dotknięcie otwiera mapę układu. */
  private freeSlotCard(rect: Rect, free: number): Phaser.GameObjects.GameObject[] {
    const c = this.deps.controller;
    const g = this.add.graphics();
    const line = this.px(1.2);
    g.lineStyle(line, COLORS.panelBorder, 1);
    // Przerywana ramka z odcinków (Phaser nie ma linii przerywanej).
    const dash = this.px(this.s(8));
    const [x, y, w, h] = [this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h)];
    for (let d = 0; d < w; d += dash * 2) {
      g.lineBetween(x + d, y, x + Math.min(w, d + dash), y);
      g.lineBetween(x + d, y + h, x + Math.min(w, d + dash), y + h);
    }
    for (let d = 0; d < h; d += dash * 2) {
      g.lineBetween(x, y + d, x, y + Math.min(h, d + dash));
      g.lineBetween(x + w, y + d, x + w, y + Math.min(h, d + dash));
    }
    const cx = rect.x + rect.w / 2;
    const title = this.text(cx, rect.y + rect.h / 2 - this.s(22), '+ Wolne miejsce', 16, COLORS.teal, { fontStyle: '600' }, false).setOrigin(0.5, 0);
    const hint = this.text(cx, rect.y + rect.h / 2 + this.s(4), `Dotknij, by wybrać planetę na mapie.\nWolnych miejsc: ${free} z ${c.slotInfo.unlocked}.`, 11, COLORS.muted, { align: 'center', lineSpacing: this.px(3) }, false).setOrigin(0.5, 0);
    this.hits.push({ rect, action: () => this.scene.start('map', { system: c.homeSystem }) });
    return [g, title, hint];
  }

  private planetCard(p: PlanetOverview, rect: Rect): Phaser.GameObjects.GameObject[] {
    const c = this.deps.controller;
    const items: Phaser.GameObjects.GameObject[] = [];
    const pad = this.s(12);
    const bg = this.add.graphics();
    const radius = this.px(this.s(12));
    bg.fillStyle(p.active ? COLORS.buttonIdle : COLORS.panel, 0.92).fillRoundedRect(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h), radius);
    bg.lineStyle(this.px(1), p.active ? COLORS.goldHex : COLORS.panelBorder, p.active ? 0.8 : 1).strokeRoundedRect(
      this.px(rect.x),
      this.px(rect.y),
      this.px(rect.w),
      this.px(rect.h),
      radius,
    );
    items.push(bg);
    // Miniatura (statyczna — lista może mieć kilka planet).
    const key = `empire-thumb-${p.index}-${Date.now()}`;
    const texture = this.textures.createCanvas(key, THUMBNAIL_SIZE, THUMBNAIL_SIZE)!;
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    new PlanetThumbnail(p.planet).draw(texture.context, p.index * 1.7);
    texture.refresh();
    this.thumbs.push(key);
    const thumbD = this.s(54);
    items.push(this.add.image(this.px(rect.x + pad + thumbD / 2), this.px(rect.y + pad + thumbD / 2), key).setDisplaySize(this.px(thumbD), this.px(thumbD)));
    const menuW = p.active ? 0 : TOUCH;
    const tx = rect.x + pad + thumbD + this.s(10);
    const tw = rect.w - (tx - rect.x) - pad - menuW;
    items.push(
      this.text(tx, rect.y + pad, p.name, 16, p.active ? COLORS.gold : COLORS.text, { fontFamily: FONTS.serif, fixedWidth: this.px(tw) }, false),
      this.text(tx, rect.y + pad + this.s(24), `${p.address} · ${p.category}`, 10.5, COLORS.faint, { fixedWidth: this.px(tw) }, false),
    );
    if (!p.active) {
      // Rzadka akcja (usunięcie) w menu ⋯ — daleko od „przejdź” (dotknięcie karty).
      items.push(
        this.button(rect.x + rect.w - pad / 2 - TOUCH, rect.y + pad / 2, TOUCH, '⋯', 'secondary', () => {
          this.menuIndex = this.menuIndex === p.index ? null : p.index;
          this.removeArmed = null;
          this.relayout();
        }),
      );
    }
    // Znaczki z danych gry.
    let y = rect.y + pad + thumbD + this.s(8);
    let bx = rect.x + pad;
    const chips = this.add.graphics();
    items.push(chips);
    for (const badge of planetBadges(p)) {
      const color = TONE[badge.tone];
      const t = this.text(bx + this.s(8), y + this.s(3), badge.label, 10, Phaser.Display.Color.IntegerToColor(color).rgba, { fontStyle: '600' }, false);
      const w = t.width / this.dpr + this.s(16);
      if (bx + w > rect.x + rect.w - pad) {
        t.destroy();
        break;
      }
      chips.lineStyle(this.px(1), color, 0.85).strokeRoundedRect(this.px(bx), this.px(y), this.px(w), this.px(this.s(19)), this.px(this.s(9.5)));
      items.push(t);
      bx += w + this.s(6);
    }
    y += this.s(28);
    // Paski: magazyn, złoża, pola (rysowane w `refresh`).
    const labelW = this.s(64);
    const valueW = Math.min(this.s(150), (rect.w - 2 * pad - labelW) * 0.55);
    const bars: CardLive['bars'] = [];
    for (const bar of planetBars(p)) {
      const label = this.text(rect.x + pad, y, bar.label, 10.5, COLORS.muted, {}, false);
      const value = this.text(rect.x + rect.w - pad, y, '', 10.5, COLORS.text, {}, false).setOrigin(1, 0);
      items.push(label, value);
      bars.push({ value, rect: { x: rect.x + pad + labelW, y: y + this.s(6), w: rect.w - 2 * pad - labelW - valueW - this.s(8), h: this.s(4) } });
      y += this.s(20);
    }
    const resources = this.text(rect.x + pad, y + this.s(2), '', 11, COLORS.stone, { fixedWidth: this.px(rect.w - 2 * pad) }, false);
    y += this.s(18);
    const build = this.text(rect.x + pad, y + this.s(2), '', 11, COLORS.muted, { fixedWidth: this.px(rect.w - 2 * pad) }, false);
    const graphics = this.add.graphics();
    items.push(resources, build, graphics);
    this.cards.push({ index: p.index, resources, build, graphics, bars, buildBar: { x: rect.x + pad, y: y + this.s(19), w: rect.w - 2 * pad, h: this.s(3) } });

    if (this.menuIndex === p.index && !p.active) {
      // Menu ⋯: transport z aktywnej planety (v0.36), usunięcie z potwierdzeniem drugim dotknięciem.
      const by = rect.y + rect.h - pad - TOUCH;
      const cover = this.add.graphics().fillStyle(COLORS.panel, 1).fillRect(this.px(rect.x + this.s(2)), this.px(by - this.s(8)), this.px(rect.w - this.s(4)), this.px(TOUCH + this.s(8) + pad - this.s(2)));
      const third = (rect.w - 2 * pad - 2 * this.s(8)) / 3;
      const armed = this.removeArmed?.index === p.index && Date.now() <= this.removeArmed.until;
      items.push(
        cover,
        this.button(rect.x + pad, by, third, 'Wyślij tu', 'primary', () => {
          this.menuIndex = null;
          this.removeArmed = null;
          this.openTransport(p);
          this.relayout();
        }),
        this.button(rect.x + pad + third + this.s(8), by, third, armed ? 'Na pewno?' : 'Usuń', armed ? 'danger' : 'secondary', () => {
          if (!armed) {
            // Pierwsze dotknięcie tylko pyta — postęp usuniętej planety przepada.
            this.removeArmed = { index: p.index, until: Date.now() + 3000 };
          } else {
            this.removeArmed = null;
            this.menuIndex = null;
            const result = c.removePlanet(p.index);
            this.showToast(result.message, result.ok ? 'info' : 'error');
          }
          this.relayout();
        }),
        this.button(rect.x + pad + 2 * (third + this.s(8)), by, third, 'Anuluj', 'secondary', () => {
          this.menuIndex = null;
          this.removeArmed = null;
          this.relayout();
        }),
      );
    } else {
      // Dotknięcie karty (poza przyciskami): przejście na planetę albo zamknięcie, gdy już tu jesteś.
      this.hits.push({
        rect,
        action: () => {
          if (p.active) {
            this.close();
            return;
          }
          const result = c.switchPlanet(p.index);
          this.close(result.message);
        },
      });
    }
    return items;
  }

  /** Okno „Wyślij surowce” z aktywnej planety do planety z karty. */
  private openTransport(target: PlanetOverview): void {
    const c = this.deps.controller;
    const address = target.address;
    this.closeTransport?.();
    this.closeTransport = openTransportPanel({
      fromName: c.planet.displayName,
      toName: target.name,
      stock: c.economy.stock,
      transport: c.transportView(),
      seconds: c.transportSecondsTo(address),
      fuel: c.transportFuelTo(address),
      send: (cargo) => c.sendResources(address, cargo),
      onSent: (message) => {
        this.closeTransport = null;
        this.showToast(message, 'info');
        this.relayout();
      },
    });
  }

  // ——— zakładka „Dziennik” ———

  private buildJournal(): number {
    const area = this.area;
    const items: Phaser.GameObjects.GameObject[] = [];
    const entries = this.deps.controller.journalEntries();
    this.shape = `journal|${entries.length}|${entries[0]?.at ?? 0}`;
    let y = area.y + this.s(4);
    items.push(this.text(area.x + this.s(4), y, 'Dziennik ekspedycji', 18, COLORS.gold, { fontFamily: FONTS.serif }, false));
    y += this.s(30);
    if (entries.length === 0) {
      items.push(this.text(area.x + this.s(4), y, 'Jeszcze pusto — wpisy pojawią się po pierwszej budowie, badaniu albo kolonii.', 12, COLORS.muted, {}, false));
      y += this.s(24);
    }
    const timeW = this.s(92);
    const now = Date.now();
    for (const e of entries) {
      const dot = this.add.graphics().fillStyle(KIND_COLOR[e.kind], 1).fillCircle(this.px(area.x + this.s(8)), this.px(y + this.s(8)), this.px(this.s(3.5)));
      const time = this.text(area.x + this.s(18), y, formatClock(e.at, now), 10.5, COLORS.faint, { fontFamily: FONTS.mono }, false);
      const text = this.text(area.x + this.s(18) + timeW, y - this.s(1), e.text, 12.5, COLORS.text, {
        wordWrap: { width: this.px(area.w - this.s(18) - timeW - this.s(8)) },
        lineSpacing: this.px(2),
      }, false);
      items.push(dot, time, text);
      y += Math.max(this.s(22), text.height / this.dpr + this.s(8));
    }
    this.content!.add(items);
    return y - area.y + this.s(12);
  }

  // ——— zakładka „SI” ———

  private buildAi(): number {
    const c = this.deps.controller;
    const area = this.area;
    const items: Phaser.GameObjects.GameObject[] = [];
    const w = Math.min(area.w, this.s(640));
    const x = area.x;
    let y = area.y + this.s(4);
    const line = (content: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, after = 6) => {
      const t = this.text(x + this.s(4), y, content, size, color, { wordWrap: { width: this.px(w - this.s(8)) }, lineSpacing: this.px(2), ...extra }, false);
      items.push(t);
      y += t.height / this.dpr + this.s(after);
    };
    this.shape = `ai|${c.aiUnlocked}|${c.aiAutoUnlocked}|${AI_RULES.map((r) => c.aiLevel(r.id)).join(',')}`;
    line('SI Matka', 18, COLORS.gold, { fontFamily: FONTS.serif }, 4);
    if (!c.aiUnlocked) {
      line('SI Matka jeszcze śpi. Zbadaj „SI Matka” (Badania → ramię SI), a zacznie proponować działania.', 12.5, COLORS.muted, {}, 14);
    } else {
      line(
        (c.aiAutoUnlocked
          ? 'SI obserwuje aktywną planetę. Dla każdej reguły wybierz, jak samodzielna ma być. „Działa samo” — wykonuje i zapisuje w dzienniku.'
          : 'SI obserwuje aktywną planetę i pyta o zgodę. Działanie bez pytania odblokuje badanie „SI wykonawcze”.') +
          ' Budynki rozwija najwyżej do poziomu Laboratorium danej planety (Laboratorium ulepszasz sam).' +
          (c.aiOfflineUnlocked
            ? ' Przy zamkniętej grze reguły „działa samo” dalej budują — każda budowa trwa o 50% dłużej.'
            : ' Budowanie przy zamkniętej grze odblokuje badanie „Autonomia”.'),
        12,
        COLORS.muted,
        {},
        14,
      );
    }
    const levels: [AiLevel, string][] = [
      ['propose', 'Podpowiada'],
      ['ask', 'Pyta'],
      ['auto', 'Działa samo'],
    ];
    const gap = this.s(8);
    const bw = (w - 2 * gap) / 3;
    for (const rule of AI_RULES) {
      line(rule.name, 14, COLORS.text, { fontStyle: '600' }, 2);
      line(rule.description, 11.5, COLORS.muted, {}, 8);
      levels.forEach(([level, label], i) => {
        const current = c.aiLevel(rule.id) === level;
        const locked = level === 'auto' && !c.aiAutoUnlocked;
        items.push(
          this.button(x + i * (bw + gap), y, bw, label, current ? 'primary' : locked ? 'disabled' : 'secondary', () => {
            const result = c.setAiLevel(rule.id, level);
            if (!result.ok) this.showToast(result.message, 'info', 3200);
            this.relayout();
          }),
        );
      });
      y += TOUCH + this.s(16);
    }
    this.content!.add(items);
    return y - area.y;
  }

  // ——— przewijanie i odświeżanie ———

  protected applyTransform(): void {
    this.pan.x = 0;
    const min = Math.min(0, this.px(this.area.h - this.contentH));
    this.pan.y = Math.max(min, Math.min(0, this.pan.y));
    this.content?.setPosition(0, this.pan.y);
  }

  /** Dotknięcie listy poza przyciskami: karta planety albo wolne miejsce. */
  protected onTap(px: number, py: number): void {
    if (this.tab !== 'planets') return;
    const x = px / this.dpr;
    const y = (py - this.pan.y) / this.dpr;
    if (y < this.area.y || py / this.dpr > this.area.y + this.area.h) return;
    const hit = this.hits.find(({ rect }) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
    hit?.action();
  }

  protected refresh(): void {
    const c = this.deps.controller;
    if (this.tab === 'ai') {
      if (`ai|${c.aiUnlocked}|${c.aiAutoUnlocked}|${AI_RULES.map((r) => c.aiLevel(r.id)).join(',')}` !== this.shape) this.relayout();
      return;
    }
    if (this.tab === 'journal') {
      const entries = c.journalEntries();
      if (`journal|${entries.length}|${entries[0]?.at ?? 0}` !== this.shape) this.relayout();
      return;
    }
    const overview = c.overview();
    const missions = c.missionsView();
    if (this.planetsShape(overview, this.travelling()) !== this.shape) {
      this.relayout();
      return;
    }
    const totals = c.empireTotals(overview);
    const tile = (id: TileId, value: string, note: string, color: string = COLORS.text) => {
      const t = this.tiles.get(id);
      if (!t) return;
      t.value.setText(value).setColor(color);
      t.note.setText(note).setX(t.value.x + t.value.width + this.px(this.s(6)));
    };
    tile('metal', formatInt(totals.metalPerHour), `+${formatRate(totals.metalPerHour / 60)}/min`);
    tile('crystal', formatInt(totals.crystalPerHour), `+${formatRate(totals.crystalPerHour / 60)}/min`);
    const energy = totals.energyUsed > 0 ? totals.energyProduced / totals.energyUsed : 1;
    // Suma imperium może ukryć niedobór na jednej planecie (energii nie da się przesłać).
    const short = overview.filter((p) => p.rates.efficiency < 1).length;
    const energyNote = energy < 1 ? 'niedobór' : short > 0 ? `niedobór na ${short} z ${overview.length}` : 'nadwyżka';
    tile('energy', `${Math.round(energy * 100)}%`, energyNote, energy >= 1 && short === 0 ? COLORS.text : COLORS.danger);
    // Teksty alertów (czasy się zmieniają; układ — tylko gdy zmieni się lista).
    const alerts = empireAlerts(overview, Math.max(0, c.slotInfo.unlocked - overview.length));
    this.alertRows.forEach((row, i) => row.setText(alerts[i]?.text ?? ''));
    tile('antimatter', formatInt(totals.antimatter), `+${formatRate(totals.antimatterPerHour)}/h`, COLORS.antimatter);
    this.ships?.setText(
      [
        ...missions.map((m) => `Statek kolonizacyjny: ${m.fromName} → ${m.targetName} · ${formatDuration(m.secondsLeft)}`),
        ...c.expeditionsView().map((e) => `Ekspedycja: ${e.name} · powrót za ${formatDuration(e.secondsLeft)}`),
        ...c.cometsView().map((h) => `Holownik po kometę: ${h.planetName} · ${formatDuration(h.secondsLeft)}`),
        ...c.shipmentsView().map((t) => `Transportowiec: ${t.fromName} → ${t.toName} · ${formatInt(t.cargo.metal + t.cargo.crystal)} · ${formatDuration(t.secondsLeft)}`),
      ].join('\n'),
    );
    for (const card of this.cards) {
      const p = overview.find((o) => o.index === card.index);
      if (!p) continue;
      const g = card.graphics.clear();
      planetBars(p).forEach((bar, i) => {
        const live = card.bars[i];
        if (!live) return;
        const { x, y, w, h } = live.rect;
        live.value.setText(bar.text).setColor(bar.tone === 'danger' ? COLORS.danger : COLORS.text);
        g.fillStyle(COLORS.divider, 1).fillRoundedRect(this.px(x), this.px(y), this.px(w), this.px(h), this.px(h / 2));
        if (bar.value > 0) g.fillStyle(TONE[bar.tone], 1).fillRoundedRect(this.px(x), this.px(y), this.px(Math.max(h, w * bar.value)), this.px(h), this.px(h / 2));
      });
      card.resources.setText(`Metal ${formatInt(p.stock.metal)} · +${formatRate(p.rates.metal)}/min   Kryształy ${formatInt(p.stock.crystal)} · +${formatRate(p.rates.crystal)}/min`);
      const b = p.construction;
      const next = p.queue[0];
      const queued = next ? ` · potem ${next.name} ${next.level}${p.queue.length > 1 ? ` (+${p.queue.length - 1})` : ''}` : '';
      card.build.setText(
        b
          ? `Buduje: ${b.name} poz. ${b.level} · ${formatDuration(b.secondsLeft)}${queued}`
          : next
            ? `Kolejka czeka na surowce: ${next.name} poz. ${next.level}`
            : p.active
              ? 'Brak budowy'
              : 'Brak budowy · dotknij karty, by przejść',
      );
      card.build.setColor(b || next ? COLORS.gold : COLORS.faint);
      if (b) {
        const { x, y, w, h } = card.buildBar;
        g.fillStyle(COLORS.divider, 1).fillRect(this.px(x), this.px(y), this.px(w), this.px(h));
        g.fillStyle(COLORS.goldHex, 1).fillRect(this.px(x), this.px(y), this.px(Math.max(h, w * b.progress)), this.px(h));
      }
    }
  }

  private clearThumbs(): void {
    for (const key of this.thumbs) if (this.textures.exists(key)) this.textures.remove(key);
    this.thumbs = [];
  }
}
