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
  /**
   * `sides`: panel planety po lewej, produkcja po prawej (komputer, tablet w obu orientacjach).
   * `stacked`: panel planety u góry, produkcja na dole (telefon — za wąski na boki).
   */
  mode: 'sides' | 'stacked';
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
    /** Szeroki ekran: dodatkowy panel pod panelem planety na karty spoza prawej kolumny. */
    overflow: Rect | null;
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
  cardCount = 6,
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

  // Panele po bokach na komputerze i tablecie (poziomo i pionowo); telefon → góra/dół.
  const wide = width / height >= 1.15;
  if ((wide && width >= 700 && height >= 500) || (!wide && width >= 600 && height >= 700)) {
    // ——— panele po bokach: planeta pośrodku, panel planety po lewej, produkcja po prawej ———
    const infoW = clamp(width * (wide ? 0.24 : 0.29), 220, 320);
    const info: Rect = {
      x: left,
      y: contentTop,
      w: infoW,
      // +52: przycisk „Badania” nad „Planety”/„Ustawienia”.
      h: Math.min(avail, Math.round((state.infoOpen ? 404 : 210) * u)),
    };

    let cardH = CARD_H_COLUMN * u;
    const space = avail - HEADER_H * u - 2 * pad;
    // Ile kart mieści się w kolumnie; reszta w kolejnych kolumnach (niskie ekrany, np. telefon poziomo).
    let perColumn = clamp(Math.floor((space + gap) / (cardH + gap)), 1, cardCount);
    // Szeroki ekran: karty, które nie mieszczą się w prawej kolumnie, trafiają pod panel planety
    // (zamiast drugiej kolumny, która mocno zmniejsza planetę) — o ile jest tam miejsce.
    const infoBottom = info.y + info.h + gap;
    const extra = cardCount - perColumn;
    const overflowH = extra * cardH + (extra - 1) * gap + 2 * pad;
    const overflow = wide && state.productionOpen && extra > 0 && extra <= 2 && infoBottom + overflowH <= bottom;
    if (overflow) perColumn = cardCount - extra;
    const columnCount = overflow ? perColumn : cardCount;
    const cols = Math.ceil(columnCount / perColumn);
    const rows = Math.ceil(columnCount / cols);
    // Kilka kolumn musi zmieścić się obok panelu planety.
    const roomW = right - (left + infoW + gap) - 2 * pad - (cols - 1) * gap;
    const cardW = Math.min(clamp(width * (wide ? 0.25 : 0.29), 220, 300), roomW / cols);
    if (rows * cardH + (rows - 1) * gap > space) cardH = (space - (rows - 1) * gap) / rows;
    const production = productionPanel(
      state.productionOpen,
      { x: right - (cols * cardW + (cols - 1) * gap + 2 * pad), y: contentTop },
      cols,
      rows,
      cardW,
      cardH,
      columnCount,
      pad,
      gap,
      u,
      { x: right - 168 * u, y: contentTop },
    );
    if (overflow) {
      const rect: Rect = { x: left, y: infoBottom, w: info.w, h: overflowH };
      production.overflow = rect;
      for (let i = 0; i < extra; i++) {
        production.cards.push({ x: rect.x + pad, y: rect.y + pad + i * (cardH + gap), w: rect.w - 2 * pad, h: cardH });
      }
    }

    let planet: Layout['planet'];
    if (wide) {
      // Szeroki ekran: planeta mieści się między panelami i rośnie po ich zwinięciu.
      const x1 = state.infoOpen ? info.x + info.w + gap : left;
      const x2 = state.productionOpen ? production.rect.x - gap : right;
      planet = { cx: (x1 + x2) / 2, cy: contentTop + avail / 2, r: Math.max(60, Math.min((x2 - x1) / 2, avail / 2) * 0.92) };
    } else {
      // Wąski ekran (tablet pionowo): planeta ma stały rozmiar (mieści się obok jednego panelu),
      // a otwarty panel „odsuwa” scenę: prawy w lewo, lewy w prawo; oba — planeta pośrodku.
      const productionW = cols * cardW + (cols - 1) * gap + 2 * pad;
      const sideW = Math.max(info.w, productionW);
      const r = Math.max(60, Math.min((innerW - sideW - gap) / 2, avail / 2) * 0.95);
      const shift = ((state.infoOpen ? info.w + gap : 0) - (state.productionOpen ? productionW + gap : 0)) / 2;
      planet = { cx: (left + right) / 2 + shift, cy: contentTop + avail / 2, r };
    }
    return {
      mode: 'sides',
      u,
      topBar,
      info: { rect: info, open: state.infoOpen, toggle: toggleAt(info) },
      production,
      planet,
      toastY: bottom - 36 * u,
    };
  }

  // ——— telefon: panel planety u góry, planeta pośrodku, produkcja na dole ———
  // Na wąskim ekranie (telefon) tekst w kolumnie zawija się częściej — panel jest wyższy.
  const infoOpenH = width < 520 ? 150 : 124;
  const info: Rect = { x: left, y: contentTop, w: innerW, h: Math.round((state.infoOpen ? infoOpenH : 62) * u) };
  // Niski ekran (telefon poziomo): węższe karty, żeby zmieściły się w jednym wierszu.
  const minCardW = (width < 520 ? 150 : height < 500 ? 155 : 190) * u;
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
    mode: 'stacked',
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
    return { open, rect, toggle: rect, cards: [], overflow: null };
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
  return { open, rect, toggle: { x: rect.x + rect.w - TOUCH, y: rect.y, w: TOUCH, h: TOUCH }, cards, overflow: null };
}
