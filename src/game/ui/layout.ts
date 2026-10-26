// Układ ekranu: czysta funkcja (rozmiar okna + otwarty panel) → prostokąty (testowalna bez Phaser).
// Od v0.19 (szkice właściciela): pasek zasobów u góry, dolny pasek z przyciskami, nad nim wysuwany
// panel; planeta zajmuje najwyżej ~30% ekranu i stoi w wolnym miejscu obok panelu.
// Jeden system dla komputera, tabletu i telefonu — wielkość UI skaluje `u`.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Panele wysuwane z dolnego paska („planets” — z okrągłego przycisku ☰). */
export type PanelId = 'production' | 'planet' | 'ai' | 'planets';
/** Przyciski dolnego paska: panel albo ekran pełnoekranowy. */
export type DockItemId = Exclude<PanelId, 'planets'> | 'research' | 'map' | 'empire';

/** Kolejność przycisków dolnego paska — gdy brakuje miejsca, ostatnie trafiają tylko do menu. */
export const DOCK_ORDER: readonly DockItemId[] = ['production', 'research', 'map', 'empire', 'planet', 'ai'];
export const DOCK_PANELS: ReadonlySet<DockItemId> = new Set<DockItemId>(['production', 'planet', 'ai']);

/** Stan paneli (zapamiętywany na urządzeniu): otwarty jest najwyżej jeden. */
export interface PanelState {
  open: PanelId | null;
}

export interface Layout {
  /**
   * `side`: panel po lewej, planeta po prawej (komputer, tablet, telefon poziomo).
   * `sheet`: panel na całą szerokość nad dolnym paskiem, planeta nad nim (telefon pionowo).
   */
  mode: 'side' | 'sheet';
  /** Mnożnik wielkości UI (telefon ~0,8, tablet ~0,9, komputer do 1,1). */
  u: number;
  topBar: Rect;
  dock: {
    rect: Rect;
    /** Okrągły przycisk menu po lewej. */
    menu: Rect;
    items: { id: DockItemId; rect: Rect }[];
    /** Przyciski, które się nie zmieściły (dostępne w menu). */
    hidden: DockItemId[];
  };
  /** Otwarty panel albo null. */
  panel: {
    id: PanelId;
    rect: Rect;
    /** Przycisk zamykania (prawy górny róg). */
    close: Rect;
    /** Miejsce na treść pod nagłówkiem. */
    body: Rect;
  } | null;
  /** Karty budynków (tylko przy otwartym panelu „Produkcja”). */
  cards: Rect[];
  /** Wolne miejsce na planetę (poza panelami). */
  stage: Rect;
  planet: { cx: number; cy: number; r: number };
  /**
   * Przyciski kamery w prawym dolnym rogu wolnego miejsca: przybliż, oddal, resetuj widok.
   * null — za mało miejsca (np. telefon poziomo z otwartym panelem); szczypanie działa dalej.
   */
  camera: { zoomIn: Rect; zoomOut: Rect; reset: Rect } | null;
  toastY: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function circleHitsRect(c: { cx: number; cy: number; r: number }, b: Rect): boolean {
  const nx = clamp(c.cx, b.x, b.x + b.w);
  const ny = clamp(c.cy, b.y, b.y + b.h);
  return Math.hypot(nx - c.cx, ny - c.cy) < c.r;
}
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
export const NO_PANEL: PanelState = { open: null };

/** Przycisk dotykowy — zawsze co najmniej 44 pt. */
export const TOUCH = 44;
/** Planeta (średnica) zajmuje najwyżej tyle dłuższego boku ekranu (decyzja właściciela: ≤ 30%). */
export const PLANET_SCREEN_SHARE = 0.3;
/** Wiersz planety w panelu „Planety” (pt, × u) i odstęp między wierszami. */
export const PLANET_ROW_H = 58;
export const PLANET_ROW_GAP = 6;
/** Przyciski pod listą planet: Ustawienia + przyciski paska, które się nie zmieściły — po dwa w wierszu. */
export const planetFooterRows = (hidden: number) => Math.ceil((hidden + 1) / 2);
/** Nagłówek panelu. */
const HEADER_H = 40;
/** Wysokość karty budynku zależna od szerokości (węższa karta = więcej zawijania tekstu). */
const cardHeightFor = (cardW: number, u: number) => (cardW >= 230 * u ? 128 : 176) * u;

export function computeLayout(
  width: number,
  height: number,
  safe: Insets = NO_INSETS,
  cardCount = 6,
  state: PanelState = NO_PANEL,
  /** Liczba reguł w panelu SI (0 = SI jeszcze niezbadana — krótki panel). */
  aiRows = 4,
  /** Liczba planet na liście w panelu „Planety”. */
  planetRows = 1,
): Layout {
  const u = clamp(Math.min(width, height) / 880, 0.8, 1.1);
  const gap = Math.round(10 * u);
  const pad = Math.round(8 * u);
  const left = safe.left + gap;
  const right = width - safe.right - gap;
  const top = safe.top + gap;
  const bottom = height - safe.bottom - gap;
  const innerW = right - left;
  const topBar: Rect = { x: left, y: top, w: innerW, h: Math.round(54 * u) };
  const dock = dockLayout({ x: left, y: bottom - Math.max(TOUCH + 12, Math.round(62 * u)), w: innerW, h: Math.max(TOUCH + 12, Math.round(62 * u)) }, u);
  const contentTop = topBar.y + topBar.h + gap;
  const contentBottom = dock.rect.y - gap;
  const avail = contentBottom - contentTop;
  const minPlanet = 60;

  const side = width >= 600;
  let panel: Layout['panel'] = null;
  let cards: Rect[] = [];
  let stage: Rect = { x: left, y: contentTop, w: innerW, h: avail };

  if (state.open) {
    // Panel wysuwa się z dolnego paska: dosunięty do niego, tak wysoki, jak jego treść.
    const want = (w: number) =>
      state.open === 'production'
        ? HEADER_H * u + pad + gridHeight(cardGrid({ x: 0, y: 0, w: w - 2 * pad, h: Infinity }, cardCount, gap, u))
        : state.open === 'planets'
          ? HEADER_H * u + planetRows * (PLANET_ROW_H + PLANET_ROW_GAP) * u + planetFooterRows(dock.hidden.length) * (TOUCH + gap) + pad
          : state.open === 'planet'
          ? 380 * u + TOUCH
          : HEADER_H * u + (aiRows > 0 ? 50 * u + aiRows * 78 * u + TOUCH + 2 * pad : 110 * u);
    let rect: Rect;
    if (side) {
      // Niski ekran (telefon poziomo): panel prawie na całą szerokość (karty w jednym wierszu),
      // obok zostaje mała planeta.
      const w = height < 500 ? innerW - 2 * minPlanet - 2 * gap : clamp(width * (width / height >= 1.15 ? 0.4 : 0.5), 300, 540);
      const h = Math.min(avail, want(w));
      rect = { x: left, y: contentBottom - h, w, h };
      stage = { x: left + w + gap, y: contentTop, w: right - (left + w + gap), h: avail };
    } else {
      // Nad panelem zostaje miejsce na planetę.
      const h = Math.min(want(innerW), avail - 2 * minPlanet - 2 * gap);
      rect = { x: left, y: contentBottom - h, w: innerW, h };
      stage = { x: left, y: contentTop, w: innerW, h: rect.y - gap - contentTop };
    }
    const body: Rect = { x: rect.x + pad, y: rect.y + HEADER_H * u, w: rect.w - 2 * pad, h: rect.h - HEADER_H * u - pad };
    panel = { id: state.open, rect, close: { x: rect.x + rect.w - TOUCH, y: rect.y, w: TOUCH, h: TOUCH }, body };
    if (state.open === 'production') cards = cardGrid(body, cardCount, gap, u);
  }

  // Kolumna przycisków kamery (od dołu: reset, oddal, przybliż) przy prawej krawędzi wolnego miejsca.
  const column = stage.x + stage.w - TOUCH - 4;
  const button = (row: number): Rect => ({ x: column, y: stage.y + stage.h - 4 - (row + 1) * TOUCH - row * 6, w: TOUCH, h: TOUCH });
  let camera: Layout['camera'] = { reset: button(0), zoomOut: button(1), zoomIn: button(2) };
  const target = (PLANET_SCREEN_SHARE * Math.max(width, height)) / 2;
  const fit = (area: Rect) => {
    const r = Math.max(minPlanet, Math.min(target, (area.w / 2) * 0.92, (area.h / 2) * 0.92));
    return { cx: area.x + area.w / 2, cy: area.y + area.h / 2, r };
  };
  let planet = fit(stage);
  // Gdy miejsca jest mało, planeta odsuwa się od przycisków kamery (nie chowa się pod nimi).
  const buttons = [camera.zoomIn, camera.zoomOut, camera.reset];
  if (buttons.some((b) => circleHitsRect(planet, b))) {
    const moved = fit({ ...stage, w: column - 6 - stage.x });
    if (moved.r >= planet.r * 0.85 && !buttons.some((b) => circleHitsRect(moved, b))) planet = moved;
    else camera = null;
  }
  const toastY = (panel && !side ? panel.rect.y : dock.rect.y) - 28 * u;
  return { mode: side ? 'side' : 'sheet', u, topBar, dock, panel, cards, stage, planet, camera, toastY };
}

/** Dolny pasek: menu po lewej, potem przyciski; te, które się nie mieszczą, są tylko w menu. */
function dockLayout(rect: Rect, u: number): Layout['dock'] {
  const p = Math.round(6 * u);
  const gap = Math.round(6 * u);
  const y = rect.y + (rect.h - TOUCH) / 2;
  const menu: Rect = { x: rect.x + p, y, w: Math.max(TOUCH, Math.round(52 * u)), h: TOUCH };
  const x0 = menu.x + menu.w + gap * 2;
  const room = rect.x + rect.w - p - x0;
  const minW = 84 * u;
  const count = clamp(Math.floor((room + gap) / (minW + gap)), 1, DOCK_ORDER.length);
  const itemW = Math.min(132 * u, (room - (count - 1) * gap) / count);
  const items = DOCK_ORDER.slice(0, count).map((id, i) => ({ id, rect: { x: x0 + i * (itemW + gap), y, w: itemW, h: TOUCH } }));
  return { rect, menu, items, hidden: DOCK_ORDER.slice(count) };
}

/** Ile kolumn kart: najmniej takich, przy których karta ma wygodną szerokość i wysokość. */
function columnsFor(w: number, count: number, gap: number, u: number): number {
  for (let cols = 1; cols <= count; cols++) {
    const cardW = (w - (cols - 1) * gap) / cols;
    if (cardW <= 300 * u) return cols;
  }
  return count;
}

const gridHeight = (cards: Rect[]) => Math.max(...cards.map((c) => c.y + c.h)) - Math.min(...cards.map((c) => c.y));

/** Siatka kart w panelu „Produkcja”; przy braku wysokości więcej kolumn albo niższe karty. */
function cardGrid(body: Rect, count: number, gap: number, u: number): Rect[] {
  let best: { cols: number; cardW: number; cardH: number } | null = null;
  for (let cols = columnsFor(body.w, count, gap, u); cols <= count; cols++) {
    const cardW = (body.w - (cols - 1) * gap) / cols;
    const rows = Math.ceil(count / cols);
    const fitH = (body.h - (rows - 1) * gap) / rows;
    const cardH = Math.min(cardHeightFor(cardW, u), fitH);
    const option = { cols, cardW, cardH };
    if (cardH >= cardHeightFor(cardW, u) - 0.5) {
      best = option;
      break;
    }
    // Nic nie mieści się w całości: karta najmniej ściśnięta (ale nie węższa niż 120 pt).
    if (cardW >= 120 * u && (!best || cardH > best.cardH)) best = option;
  }
  const { cols, cardW, cardH } = best ?? { cols: count, cardW: (body.w - (count - 1) * gap) / count, cardH: body.h };
  const cards: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    // Niepełny ostatni wiersz jest wyśrodkowany.
    const offset = ((cols - inRow) * (cardW + gap)) / 2;
    cards.push({ x: body.x + offset + (i % cols) * (cardW + gap), y: body.y + row * (cardH + gap), w: cardW, h: cardH });
  }
  return cards;
}
