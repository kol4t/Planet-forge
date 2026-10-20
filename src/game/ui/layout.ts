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
  buildings: Rect;
  cardsDirection: 'column' | 'row';
  planet: { cx: number; cy: number; r: number };
  toastY: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export function computeLayout(width: number, height: number, safe: Insets = NO_INSETS): Layout {
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
  if (width / height >= 1.15 && width >= 700) {
    const sideW = clamp(width * 0.25, 250, 340);
    const avail = bottom - contentTop;
    const info: Rect = { x: left, y: contentTop, w: sideW, h: Math.min(avail, Math.round(430 * u)) };
    const buildings: Rect = {
      x: right - sideW,
      y: contentTop,
      w: sideW,
      h: Math.min(avail, Math.round(450 * u + 2 * gap)),
    };
    const pLeft = info.x + info.w + gap;
    const pRight = buildings.x - gap;
    const r = Math.max(60, Math.min((pRight - pLeft) / 2, (bottom - contentTop) / 2) * 0.8);
    return {
      mode: 'landscape',
      u,
      topBar,
      info,
      buildings,
      cardsDirection: 'column',
      planet: { cx: (pLeft + pRight) / 2, cy: (contentTop + bottom) / 2, r },
      toastY: bottom - 40 * u,
    };
  }

  // Pionowo / telefon: panel planety u góry, karty budynków w wierszu na dole.
  const info: Rect = { x: left, y: contentTop, w: innerW, h: Math.round(134 * u) };
  const cardsH = Math.round((width < 520 ? 206 : 168) * u);
  const buildings: Rect = { x: left, y: bottom - cardsH, w: innerW, h: cardsH };
  const pTop = info.y + info.h + gap;
  const pBottom = buildings.y - gap;
  const r = Math.max(60, Math.min(innerW / 2, (pBottom - pTop) / 2) * 0.82);
  return {
    mode: 'portrait',
    u,
    topBar,
    info,
    buildings,
    cardsDirection: 'row',
    planet: { cx: (left + right) / 2, cy: (pTop + pBottom) / 2, r },
    toastY: buildings.y - 34 * u,
  };
}
