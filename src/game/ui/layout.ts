// Układ ekranu: czysta funkcja (rozmiar okna + stan paneli) → prostokąty (testowalna bez Phaser).
// Planeta jest tłem gry: zajmuje wolne miejsce między panelami, a po ich zwinięciu rośnie.
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

/** Stan paneli (zapamiętywany na urządzeniu). */
export interface PanelState {
  infoOpen: boolean;
  productionOpen: boolean;
}

export interface Layout {
  /** Poziomo: panele po bokach. Pionowo: panel planety u góry, produkcja na dole. */
  mode: 'landscape' | 'portrait';
  /** Mnożnik wielkości UI (telefon ~0,8, tablet ~0,9, komputer do 1,1). */
  u: number;
  topBar: Rect;
  info: {
    rect: Rect;
    open: boolean;
    /** Przycisk zwijania (prawy górny róg panelu). */
    toggle: Rect;
  };
  production: {
    open: boolean;
    /** Rozwinięty: cały panel. Zwinięty: mała zakładka „Produkcja”. */
    rect: Rect;
    toggle: Rect;
    /** Karty budynków (puste, gdy zwinięty). */
    cards: Rect[];
  };
  planet: { cx: number; cy: number; r: number };
  toastY: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
export const OPEN_PANELS: PanelState = { infoOpen: true, productionOpen: true };

/** Przycisk dotykowy — zawsze co najmniej 44 pt. */
export const TOUCH = 44;
/** Nagłówek panelu „Produkcja”. */
const HEADER_H = 40;
/** Karta budynku w kolumnie (poziomo). */
const CARD_H_COLUMN = 124;
/** Karta w siatce (pionowo) — węższa karta = więcej zawijania tekstu. */
const cardHeightFor = (cardW: number, u: number) => (cardW >= 210 * u ? 132 : cardW >= 160 * u ? 150 : 168);

export function computeLayout(
  width: number,
  height: number,
  safe: Insets = NO_INSETS,
  cardCount = 5,
  state: PanelState = OPEN_PANELS,
): Layout {
  const u = clamp(Math.min(width, height) / 880, 0.8, 1.1);
  const gap = Math.round(10 * u);
  const left = safe.left + gap;
  const right = width - safe.right - gap;
  const top = safe.top + gap;
  const bottom = height - safe.bottom - gap;
  const innerW = right - left;
  const topBar: Rect = { x: left, y: top, w: innerW, h: Math.round(54 * u) };
  const contentTop = topBar.y + topBar.h + gap;
  const avail = bottom - contentTop;
  const pad = Math.round(8 * u);
  const toggleAt = (r: Rect): Rect => ({ x: r.x + r.w - TOUCH, y: r.y, w: TOUCH, h: TOUCH });

  // Boczne panele tylko na szerokich i dość wysokich ekranach (telefon poziomo → układ góra/dół).
  if (width / height >= 1.15 && width >= 700 && height >= 500) {
    // ——— poziomo: planeta pośrodku, panel planety po lewej, produkcja po prawej ———
    const infoW = clamp(width * 0.24, 230, 320);
    const info: Rect = {
      x: left,
      y: contentTop,
      w: infoW,
      h: Math.min(avail, Math.round((state.infoOpen ? 352 : 158) * u)),
    };

    let cardH = CARD_H_COLUMN * u;
    const space = avail - HEADER_H * u - 2 * pad;
    // Ile kart mieści się w kolumnie; reszta w kolejnych kolumnach (niskie ekrany, np. telefon poziomo).
    const perColumn = clamp(Math.floor((space + gap) / (cardH + gap)), 1, cardCount);
    const cols = Math.ceil(cardCount / perColumn);
    const rows = Math.ceil(cardCount / cols);
    // Kilka kolumn musi zmieścić się obok panelu planety.
    const roomW = right - (left + infoW + gap) - 2 * pad - (cols - 1) * gap;
    const cardW = Math.min(clamp(width * 0.25, 230, 300), roomW / cols);
    if (rows * cardH + (rows - 1) * gap > space) cardH = (space - (rows - 1) * gap) / rows;
    const production = productionPanel(
      state.productionOpen,
      { x: right - (cols * cardW + (cols - 1) * gap + 2 * pad), y: contentTop },
      cols,
      rows,
      cardW,
      cardH,
      cardCount,
      pad,
      gap,
      u,
      { x: right - 168 * u, y: contentTop },
    );

    const x1 = state.infoOpen ? info.x + info.w + gap : left;
    const x2 = state.productionOpen ? production.rect.x - gap : right;
    const r = Math.max(60, Math.min((x2 - x1) / 2, avail / 2) * 0.92);
    return {
      mode: 'landscape',
      u,
      topBar,
      info: { rect: info, open: state.infoOpen, toggle: toggleAt(info) },
      production,
      planet: { cx: (x1 + x2) / 2, cy: contentTop + avail / 2, r },
      toastY: bottom - 36 * u,
    };
  }

  // ——— pionowo: panel planety u góry, planeta pośrodku, produkcja na dole ———
  // Na wąskim ekranie (telefon) tekst w kolumnie zawija się częściej — panel jest wyższy.
  const infoOpenH = width < 520 ? 150 : 124;
  const info: Rect = { x: left, y: contentTop, w: innerW, h: Math.round((state.infoOpen ? infoOpenH : 62) * u) };
  const minCardW = (width < 520 ? 150 : 190) * u;
  const maxCols = clamp(Math.floor((innerW - 2 * pad + gap) / (minCardW + gap)), 1, cardCount);
  const rows = Math.ceil(cardCount / maxCols);
  const cols = Math.ceil(cardCount / rows);
  const cardW = (innerW - 2 * pad - gap * (cols - 1)) / cols;
  const cardH = cardHeightFor(cardW, u) * u;
  const panelH = HEADER_H * u + 2 * pad + rows * cardH + (rows - 1) * gap;
  const production = productionPanel(
    state.productionOpen,
    { x: left, y: bottom - panelH },
    cols,
    rows,
    cardW,
    cardH,
    cardCount,
    pad,
    gap,
    u,
    { x: right - 168 * u, y: bottom - TOUCH },
  );
  const y1 = info.y + info.h + gap;
  // Rozwinięta produkcja albo zwinięta zakładka — planeta kończy się nad nią.
  const y2 = production.rect.y - gap;
  const r = Math.max(60, Math.min(innerW / 2, (y2 - y1) / 2) * 0.94);
  return {
    mode: 'portrait',
    u,
    topBar,
    info: { rect: info, open: state.infoOpen, toggle: toggleAt(info) },
    production,
    planet: { cx: (left + right) / 2, cy: (y1 + y2) / 2, r },
    toastY: production.rect.y - 30 * u,
  };
}

/** Panel „Produkcja”: rozwinięty (nagłówek + siatka kart) albo zwinięty do zakładki. */
function productionPanel(
  open: boolean,
  origin: { x: number; y: number },
  cols: number,
  rows: number,
  cardW: number,
  cardH: number,
  count: number,
  pad: number,
  gap: number,
  u: number,
  tabOrigin: { x: number; y: number },
): Layout['production'] {
  if (!open) {
    const rect: Rect = { x: tabOrigin.x, y: tabOrigin.y, w: 168 * u, h: TOUCH };
    return { open, rect, toggle: rect, cards: [] };
  }
  const w = cols * cardW + (cols - 1) * gap + 2 * pad;
  const h = HEADER_H * u + 2 * pad + rows * cardH + (rows - 1) * gap;
  const rect: Rect = { x: origin.x, y: origin.y, w, h };
  const cardsTop = rect.y + HEADER_H * u + pad;
  const cards: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, count - row * cols);
    // Niepełny ostatni wiersz jest wyśrodkowany.
    const offset = ((cols - inRow) * (cardW + gap)) / 2;
    cards.push({ x: rect.x + pad + offset + (i % cols) * (cardW + gap), y: cardsTop + row * (cardH + gap), w: cardW, h: cardH });
  }
  return { open, rect, toggle: { x: rect.x + rect.w - TOUCH, y: rect.y, w: TOUCH, h: TOUCH }, cards };
}
