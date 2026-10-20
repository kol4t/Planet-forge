import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeLayout, TOUCH, type PanelState, type Rect } from '../src/game/ui/layout.ts';

const inside = (r: Rect, w: number, h: number) => r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= w + 0.5 && r.y + r.h <= h + 0.5;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

// Komputer, tablety i telefony — w obu orientacjach.
const SCREENS: [string, number, number][] = [
  ['komputer 1920×1080', 1920, 1080],
  ['komputer 1280×720', 1280, 720],
  ['iPad 10,2" poziomo', 1080, 810],
  ['iPad 10,2" pionowo', 810, 1080],
  ['iPad Pro poziomo', 1366, 1024],
  ['iPad mini pionowo', 744, 1133],
  ['iPhone pionowo', 390, 844],
  ['iPhone poziomo', 844, 390],
];
const STATES: PanelState[] = [
  { infoOpen: true, productionOpen: true },
  { infoOpen: false, productionOpen: true },
  { infoOpen: true, productionOpen: false },
  { infoOpen: false, productionOpen: false },
];

for (const [name, w, h] of SCREENS) {
  test(`układ mieści się i nic nie nachodzi: ${name}`, () => {
    for (const state of STATES) {
      const l = computeLayout(w, h, { top: 20, right: 0, bottom: 20, left: 0 }, 5, state);
      const label = `${name} ${JSON.stringify(state)}`;
      const panels = [l.topBar, l.info.rect, l.production.rect];
      for (const r of [...panels, ...l.production.cards]) assert.ok(inside(r, w, h), `${label}: ${JSON.stringify(r)}`);
      for (let i = 0; i < panels.length; i++) {
        for (let j = i + 1; j < panels.length; j++) assert.ok(!overlap(panels[i]!, panels[j]!), `${label}: ${i} nachodzi na ${j}`);
      }
      assert.equal(l.production.cards.length, state.productionOpen ? 5 : 0);
      for (const card of l.production.cards) {
        assert.ok(card.w >= 100 && card.h >= 100, `${label}: karta ${card.w}×${card.h}`);
        assert.ok(card.x >= l.production.rect.x && card.x + card.w <= l.production.rect.x + l.production.rect.w + 0.5, label);
      }
      for (const t of [l.info.toggle, l.production.toggle]) assert.ok(t.w >= TOUCH && t.h >= TOUCH, `${label}: przycisk ≥ 44 pt`);
      assert.ok(l.planet.r >= 60, label);
    }
  });
}

test('zwinięcie paneli powiększa planetę', () => {
  for (const [w, h] of [[1080, 810], [810, 1080], [390, 844]] as const) {
    const open = computeLayout(w, h, undefined, 5, { infoOpen: true, productionOpen: true });
    const closed = computeLayout(w, h, undefined, 5, { infoOpen: false, productionOpen: false });
    assert.ok(closed.planet.r > open.planet.r, `${w}×${h}: ${open.planet.r} → ${closed.planet.r}`);
  }
});

test('pionowo: panel planety nad planetą, produkcja pod nią; poziomo: po bokach', () => {
  const port = computeLayout(810, 1080);
  assert.equal(port.mode, 'portrait');
  assert.ok(port.info.rect.y + port.info.rect.h <= port.planet.cy - port.planet.r + 1);
  assert.ok(port.production.rect.y >= port.planet.cy + port.planet.r - 1);
  const land = computeLayout(1080, 810);
  assert.equal(land.mode, 'landscape');
  assert.ok(land.info.rect.x + land.info.rect.w <= land.planet.cx - land.planet.r + 1);
  assert.ok(land.production.rect.x >= land.planet.cx + land.planet.r - 1);
});

test('UI mniejsze niż w v0.8 i skalowane do ekranu', () => {
  assert.ok(computeLayout(1080, 810).u < 0.95, 'iPad');
  assert.equal(computeLayout(390, 844).u, 0.8, 'telefon: minimum czytelności');
  assert.equal(computeLayout(2560, 1440).u, 1.1, 'duży monitor: maksimum');
});
