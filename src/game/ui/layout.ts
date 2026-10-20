// Układ ekranu: czysta funkcja rozmiaru okna → prostokąty paneli (testowalna bez Phaser).

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

export interface Layout {
  mode: 'landscape' | 'portrait';
  /** Mnożnik wielkości UI. */
  u: number;
  topBar: Rect;
  info: Rect;
  /** Prostokąty kart budynków (w kolejności z balansu). */
  cards: Rect[];
  planet: { cx: number; cy: number; r: number };
  toastY: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Wysokość karty w kolumnie (iPad poziomo), w jednostkach `u`. */
const CARD_H_COLUMN = 150;
/** Wysokość karty w pionie zależnie od szerokości karty (węższa = więcej zawijania). */
const cardHeightFor = (cardW: number) => (cardW >= 220 ? 190 : cardW >= 150 ? 212 : 232);
/** Najmniejsza szerokość karty w pionie (px CSS). */
const MIN_CARD_W_PHONE = 110;
const MIN_CARD_W_TABLET = 170;

export function computeLayout(width: number, height: number, safe: Insets = NO_INSETS, cardCount = 5): Layout {
  const u = clamp(Math.min(width, height) / 760, 0.82, 1.2);
  const gap = Math.round(12 * u);
  const left = safe.left + gap;
  const right = width - safe.right - gap;
  const top = safe.top + gap;
  const bottom = height - safe.bottom - gap;
  const innerW = right - left;
  const topBar: Rect = { x: left, y: top, w: innerW, h: Math.round(62 * u) };
  const contentTop = topBar.y + topBar.h + gap;

  // iPad poziomo: panel planety po lewej, budynki po prawej, planeta pośrodku.
  // Karty, które nie mieszczą się w prawej kolumnie, trafiają pod panel planety.
  if (width / height >= 1.15 && width >= 700) {
    const sideW = clamp(width * 0.25, 250, 340);
    const avail = bottom - contentTop;
    const info: Rect = { x: left, y: contentTop, w: sideW, h: Math.min(avail, Math.round(430 * u)) };
    let cardH = CARD_H_COLUMN * u;
    const fits = (space: number) => Math.max(0, Math.floor((space + gap) / (cardH + gap)));
    let rightCount = Math.min(cardCount, fits(avail));
    let leftCount = Math.min(cardCount - rightCount, fits(avail - info.h - gap));
    if (rightCount + leftCount < cardCount) {
      // Awaryjnie (bardzo niski ekran): wszystkie karty po prawej, ściśnięte.
      rightCount = cardCount;
      leftCount = 0;
      cardH = (avail - gap * (cardCount - 1)) / cardCount;
    }
    const cards: Rect[] = [];
    for (let i = 0; i < rightCount; i++) {
      cards.push({ x: right - sideW, y: contentTop + i * (cardH + gap), w: sideW, h: cardH });
    }
    const leftTop = info.y + info.h + gap;
    for (let i = 0; i < leftCount; i++) {
      cards.push({ x: left, y: leftTop + i * (cardH + gap), w: sideW, h: cardH });
    }
    const pLeft = info.x + info.w + gap;
    const pRight = right - sideW - gap;
    const r = Math.max(60, Math.min((pRight - pLeft) / 2, (bottom - contentTop) / 2) * 0.8);
    return {
      mode: 'landscape',
      u,
      topBar,
      info,
      cards,
      planet: { cx: (pLeft + pRight) / 2, cy: (contentTop + bottom) / 2, r },
      toastY: bottom - 40 * u,
    };
  }

  // Pionowo: panel planety u góry, karty budynków na dole w równej siatce
  // (np. 5 kart = 3 + 2), tak by żadna karta nie była węższa niż minimum.
  const info: Rect = { x: left, y: contentTop, w: innerW, h: Math.round(134 * u) };
  const minCardW = width < 520 ? MIN_CARD_W_PHONE : MIN_CARD_W_TABLET;
  const maxCols = clamp(Math.floor((innerW + gap) / (minCardW + gap)), 1, cardCount);
  const rows = Math.ceil(cardCount / maxCols);
  const cols = Math.ceil(cardCount / rows);
  const cardW = (innerW - gap * (cols - 1)) / cols;
  const cardH = cardHeightFor(cardW) * u;
  const cardsTop = bottom - (rows * cardH + (rows - 1) * gap);
  const cards: Rect[] = [];
  for (let i = 0; i < cardCount; i++) {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, cardCount - row * cols);
    // Niepełny ostatni wiersz jest wyśrodkowany.
    const offset = ((cols - inRow) * (cardW + gap)) / 2;
    const col = i % cols;
    cards.push({ x: left + offset + col * (cardW + gap), y: cardsTop + row * (cardH + gap), w: cardW, h: cardH });
  }
  const pTop = info.y + info.h + gap;
  const pBottom = cardsTop - gap;
  const r = Math.max(60, Math.min(innerW / 2, (pBottom - pTop) / 2) * 0.82);
  return {
    mode: 'portrait',
    u,
    topBar,
    info,
    cards,
    planet: { cx: (left + right) / 2, cy: (pTop + pBottom) / 2, r },
    toastY: cardsTop - 34 * u,
  };
}
