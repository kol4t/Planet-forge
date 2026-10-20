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
    for (const r of [l.topBar, l.info, l.buildings]) assert.ok(inside(r, w, h), JSON.stringify(r));
    assert.ok(!overlap(l.topBar, l.info) && !overlap(l.info, l.buildings) && !overlap(l.topBar, l.buildings));
    const p = l.planet;
    const planetBox = { x: p.cx - p.r, y: p.cy - p.r, w: 2 * p.r, h: 2 * p.r };
    assert.ok(p.r >= 60);
    if (l.mode === 'portrait') {
      assert.ok(!overlap(planetBox, l.info) && !overlap(planetBox, l.buildings), 'planeta między panelami');
    }
  });
}

test('tryb zależy od orientacji', () => {
  assert.equal(computeLayout(1180, 820).mode, 'landscape');
  assert.equal(computeLayout(820, 1180).mode, 'portrait');
});
