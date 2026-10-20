import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeLayout, type Rect } from '../src/game/ui/layout.ts';

const inside = (r: Rect, w: number, h: number) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const SCREENS: [string, number, number][] = [
  ['iPad poziomo', 1180, 820],
  ['iPad Pro poziomo', 1366, 1024],
  ['iPad pionowo', 820, 1180],
  ['iPad mini pionowo', 744, 1133],
  ['iPhone pionowo', 390, 844],
];

for (const [name, w, h] of SCREENS) {
  test(`układ mieści się na ekranie: ${name}`, () => {
    const l = computeLayout(w, h, { top: 20, right: 0, bottom: 20, left: 0 });
    const panels = [l.topBar, l.info, ...l.cards];
    assert.equal(l.cards.length, 5);
    for (const r of panels) assert.ok(inside(r, w, h), JSON.stringify(r));
    for (let i = 0; i < panels.length; i++) {
      for (let j = i + 1; j < panels.length; j++) assert.ok(!overlap(panels[i]!, panels[j]!), `${i} nachodzi na ${j}`);
    }
    for (const card of l.cards) {
      assert.ok(card.w >= 100, `karta za wąska: ${card.w}`);
      assert.ok(card.h >= 120, `karta za niska: ${card.h}`);
    }
    const p = l.planet;
    const planetBox = { x: p.cx - p.r, y: p.cy - p.r, w: 2 * p.r, h: 2 * p.r };
    assert.ok(p.r >= 60);
    for (const r of [l.info, ...l.cards]) assert.ok(!overlap(planetBox, r), 'planeta nie wchodzi pod panele');
  });
}

test('iPad poziomo: piąta karta trafia pod panel planety; pionowo siatka 3 + 2', () => {
  const land = computeLayout(1180, 820);
  assert.equal(land.cards.filter((c) => c.x < land.info.x + land.info.w).length, 1);
  const port = computeLayout(820, 1180);
  assert.deepEqual([...new Set(port.cards.map((c) => c.y))].length, 2);
  assert.equal(port.cards.filter((c) => c.y === port.cards[0]!.y).length, 3);
});

test('tryb zależy od orientacji', () => {
  assert.equal(computeLayout(1180, 820).mode, 'landscape');
  assert.equal(computeLayout(820, 1180).mode, 'portrait');
});
