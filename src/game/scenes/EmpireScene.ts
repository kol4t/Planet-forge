import Phaser from 'phaser';
import type { PlanetOverview } from '../../app/GameController.ts';
import { AI_RULES, type AiLevel } from '../../core/ai/advisor.ts';
import type { JournalKind } from '../../core/types.ts';
import { PlanetThumbnail, THUMBNAIL_SIZE } from '../../planet-renderer/PlanetThumbnail.ts';
import { TOUCH, type Rect } from '../ui/layout.ts';
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
};

interface CardLive {
  index: number;
  metal: Phaser.GameObjects.Text;
  crystal: Phaser.GameObjects.Text;
  build: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
  barRect: Rect;
}

/**
 * Ekran „Imperium”: wszystkie planety naraz (zasoby, produkcja, budowy, przejście, usuwanie),
 * statki w drodze i dziennik ekspedycji. Lista przewija się palcem.
 */
export class EmpireScene extends OverlayScene {
  private tab: 'planets' | 'journal' | 'ai' = 'planets';
  private content: Phaser.GameObjects.Container | undefined;
  private contentH = 0;
  private cards: CardLive[] = [];
  private summary: Phaser.GameObjects.Text | undefined;
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

  create(): void {
    this.setupInput();
    this.relayout();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearThumbs());
  }

  relayout(): void {
    const { bar } = this.frame(0, 0, false);
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
      this.text(bar.x + pad, bar.y + this.s(30), `Planet: ${c.slotInfo.used} z ${c.slotInfo.unlocked}`, 10.5, COLORS.muted, { fixedWidth: this.px(titleW) });
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

  /** Buduje listę planet; zwraca wysokość treści (pt). */
  private buildPlanets(): number {
    const c = this.deps.controller;
    const area = this.area;
    const items: Phaser.GameObjects.GameObject[] = [];
    const gap = this.s(10);
    let y = area.y + this.s(4);
    this.summary = this.text(area.x + this.s(4), y, '', 12, COLORS.text, { wordWrap: { width: this.px(area.w - this.s(8)) }, lineSpacing: this.px(3) }, false);
    items.push(this.summary);
    y += this.s(44);
    const overview = c.overview();
    const missions = c.missionsView();
    this.shape = `${overview.length}|${missions.length}|${c.planets().find((p) => p.active)?.index}`;
    const cols = Math.max(1, Math.min(3, Math.floor((area.w + gap) / (this.s(300) + gap))));
    const cardW = (area.w - gap * (cols - 1)) / cols;
    const cardH = this.s(168);
    overview.forEach((p, i) => {
      const x = area.x + (i % cols) * (cardW + gap);
      const top = y + Math.floor(i / cols) * (cardH + gap);
      items.push(...this.planetCard(p, { x, y: top, w: cardW, h: cardH }));
    });
    y += Math.ceil(overview.length / cols) * (cardH + gap);
    for (const m of missions) {
      items.push(
        this.text(area.x + this.s(4), y, `Statek kolonizacyjny: ${m.fromName} → ${m.targetName} (${m.target})`, 12, COLORS.gold, { fontStyle: '600' }, false),
      );
      y += this.s(22);
    }
    const halfW = Math.min(this.s(240), (area.w - gap) / 2);
    items.push(
      this.button(area.x, y + this.s(6), halfW, 'Mapa układu', 'primary', () => this.scene.start('map', { system: c.homeSystem })),
      this.button(area.x + halfW + gap, y + this.s(6), halfW, 'Dziennik', 'secondary', () => this.switchTab('journal')),
    );
    y += this.s(6) + TOUCH + this.s(12);
    this.content!.add(items);
    return y - area.y;
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
    const thumbD = this.s(46);
    items.push(this.add.image(this.px(rect.x + pad + thumbD / 2), this.px(rect.y + pad + thumbD / 2), key).setDisplaySize(this.px(thumbD), this.px(thumbD)));
    const tx = rect.x + pad + thumbD + this.s(10);
    const tw = rect.w - (tx - rect.x) - pad;
    items.push(
      this.text(tx, rect.y + pad - this.s(2), p.name, 15, p.active ? COLORS.gold : COLORS.text, { fontStyle: '600', fixedWidth: this.px(tw) }, false),
      this.text(tx, rect.y + pad + this.s(19), `${p.address} · ${p.category}`, 10.5, COLORS.faint, { fixedWidth: this.px(tw) }, false),
    );
    let y = rect.y + pad + thumbD + this.s(6);
    const metal = this.text(rect.x + pad, y, '', 11, COLORS.stone, {}, false);
    const crystal = this.text(rect.x + pad + (rect.w - 2 * pad) / 2, y, '', 11, COLORS.teal, {}, false);
    y += this.s(17);
    const build = this.text(rect.x + pad, y, '', 11, COLORS.muted, { fixedWidth: this.px(rect.w - 2 * pad) }, false);
    const barRect = { x: rect.x + pad, y: y + this.s(17), w: rect.w - 2 * pad, h: this.s(3) };
    const bar = this.add.graphics();
    items.push(metal, crystal, build, bar);
    this.cards.push({ index: p.index, metal, crystal, build, bar, barRect });
    // Przyciski.
    const by = rect.y + rect.h - pad - TOUCH;
    const half = (rect.w - 2 * pad - this.s(8)) / 2;
    if (p.active) {
      items.push(this.button(rect.x + pad, by, rect.w - 2 * pad, 'Tu jesteś', 'disabled', () => this.close()));
    } else {
      const armed = this.removeArmed?.index === p.index && Date.now() <= this.removeArmed.until;
      items.push(
        this.button(rect.x + pad, by, half, 'Przejdź', 'primary', () => {
          const result = c.switchPlanet(p.index);
          this.close(result.message);
        }),
        this.button(rect.x + pad + half + this.s(8), by, half, armed ? 'Na pewno?' : 'Usuń', armed ? 'danger' : 'secondary', () => {
          if (!armed) {
            // Pierwsze dotknięcie tylko pyta — postęp usuniętej planety przepada.
            this.removeArmed = { index: p.index, until: Date.now() + 3000 };
          } else {
            this.removeArmed = null;
            const result = c.removePlanet(p.index);
            this.showToast(result.message, result.ok ? 'info' : 'error');
          }
          this.relayout();
        }),
      );
    }
    return items;
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

  protected onTap(): void {
    // Lista: przyciski obsługują się same.
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
    if (`${overview.length}|${missions.length}|${overview.find((p) => p.active)?.index}` !== this.shape) {
      this.relayout();
      return;
    }
    const total = overview.reduce((sum, p) => ({ metal: sum.metal + p.rates.metal, crystal: sum.crystal + p.rates.crystal }), { metal: 0, crystal: 0 });
    const ships = missions.map((m) => `${m.targetName} za ${formatDuration(m.secondsLeft)}`).join(', ');
    this.summary?.setText(
      `Całe imperium: +${formatRate(total.metal)} metalu/min · +${formatRate(total.crystal)} kryształów/min · antymateria ${formatInt(c.economy.antimatter)}` +
        (ships ? `\nStatki w drodze: ${ships}` : ''),
    );
    for (const card of this.cards) {
      const p = overview.find((o) => o.index === card.index);
      if (!p) continue;
      const full = (have: number) => (have >= p.capacity ? ' · pełny' : '');
      card.metal.setText(`Metal ${formatInt(p.stock.metal)} · +${formatRate(p.rates.metal)}/min${full(p.stock.metal)}`);
      card.crystal.setText(`Kryształy ${formatInt(p.stock.crystal)} · +${formatRate(p.rates.crystal)}/min${full(p.stock.crystal)}`);
      const b = p.construction;
      card.build.setText(b ? `Buduje: ${b.name} poz. ${b.level} · ${formatDuration(b.secondsLeft)}` : 'Brak budowy');
      card.build.setColor(b ? COLORS.gold : COLORS.faint);
      const { x, y, w, h } = card.barRect;
      card.bar.clear();
      if (b) {
        card.bar
          .fillStyle(COLORS.divider, 1)
          .fillRect(this.px(x), this.px(y), this.px(w), this.px(h))
          .fillStyle(COLORS.goldHex, 1)
          .fillRect(this.px(x), this.px(y), this.px(Math.max(h, w * b.progress)), this.px(h));
      }
    }
  }

  private clearThumbs(): void {
    for (const key of this.thumbs) if (this.textures.exists(key)) this.textures.remove(key);
    this.thumbs = [];
  }
}
