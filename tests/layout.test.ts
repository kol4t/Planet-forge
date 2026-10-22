import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeLayout, DOCK_ORDER, PLANET_SCREEN_SHARE, TOUCH, type PanelState, type Rect } from '../src/game/ui/layout.ts';

const inside = (r: Rect, w: number, h: number) => r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= w + 0.5 && r.y + r.h <= h + 0.5;
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
const within = (a: Rect, b: Rect) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;
const circleBox = (p: { cx: number; cy: number; r: number }): Rect => ({ x: p.cx - p.r, y: p.cy - p.r, w: 2 * p.r, h: 2 * p.r });

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
const STATES: PanelState[] = [{ open: null }, { open: 'production' }, { open: 'planet' }, { open: 'ai' }, { open: 'planets' }];

for (const [name, w, h] of SCREENS) {
  test(`układ mieści się i nic nie nachodzi: ${name}`, () => {
    for (const state of STATES) {
      const l = computeLayout(w, h, { top: 20, right: 0, bottom: 20, left: 0 }, 6, state);
      const label = `${name} ${JSON.stringify(state)}`;
      const blocks = [l.topBar, l.dock.rect, ...(l.panel ? [l.panel.rect] : [])];
      for (const r of [...blocks, ...l.cards]) assert.ok(inside(r, w, h), `${label}: ${JSON.stringify(r)}`);
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) assert.ok(!overlap(blocks[i]!, blocks[j]!), `${label}: ${i} nachodzi na ${j}`);
      }
      // Planeta w wolnym miejscu — nie pod panelami.
      for (const r of blocks) assert.ok(!overlap(circleBox(l.planet), r), `${label}: planeta pod panelem`);
      assert.ok(l.planet.r >= 60, label);
      assert.equal(l.cards.length, state.open === 'production' ? 6 : 0);
      for (const card of l.cards) {
        assert.ok(card.w >= 100 && card.h >= 100, `${label}: karta ${card.w}×${card.h}`);
        assert.ok(within(card, l.panel!.body), `${label}: karta poza panelem`);
      }
      for (const t of [l.dock.menu, ...l.dock.items.map((i) => i.rect), ...(l.panel ? [l.panel.close] : [])]) {
        assert.ok(t.w >= TOUCH && t.h >= TOUCH, `${label}: przycisk ≥ 44 pt`);
        assert.ok(within(t, l.panel && t === l.panel.close ? l.panel.rect : l.dock.rect), `${label}: przycisk w swoim pasku`);
      }
      // Każdy przycisk jest na pasku albo w menu.
      assert.deepEqual([...l.dock.items.map((i) => i.id), ...l.dock.hidden], [...DOCK_ORDER]);
    }
  });
}

test('planeta zajmuje najwyżej 30% dłuższego boku ekranu', () => {
  for (const [, w, h] of SCREENS) {
    for (const state of STATES) {
      const l = computeLayout(w, h, undefined, 6, state);
      assert.ok(2 * l.planet.r <= PLANET_SCREEN_SHARE * Math.max(w, h) + 0.5, `${w}×${h}`);
    }
  }
});

test('pasek zasobów u góry, dolny pasek na dole ekranu', () => {
  for (const [, w, h] of SCREENS) {
    const l = computeLayout(w, h);
    assert.ok(l.topBar.y < 20 && l.dock.rect.y + l.dock.rect.h > h - 20, `${w}×${h}`);
    assert.ok(l.dock.rect.w === l.topBar.w, 'oba paski na całą szerokość');
  }
});

test('komputer i tablet: panel po lewej, planeta przesuwa się w prawo', () => {
  for (const [w, h] of [[1080, 810], [810, 1080], [744, 1133], [1920, 1080], [844, 390]] as const) {
    const closed = computeLayout(w, h);
    const open = computeLayout(w, h, undefined, 6, { open: 'production' });
    assert.equal(open.mode, 'side', `${w}×${h}`);
    assert.ok(open.panel!.rect.x + open.panel!.rect.w <= open.planet.cx - open.planet.r + 1, `${w}×${h}: planeta obok panelu`);
    assert.ok(open.planet.cx > closed.planet.cx, `${w}×${h}: planeta w prawo`);
    assert.ok(open.panel!.rect.y + open.panel!.rect.h <= open.dock.rect.y, 'panel nad dolnym paskiem');
  }
});

test('telefon pionowo: panel nad dolnym paskiem, planeta nad panelem', () => {
  const l = computeLayout(390, 844, undefined, 6, { open: 'production' });
  assert.equal(l.mode, 'sheet');
  assert.ok(l.panel!.rect.y >= l.planet.cy + l.planet.r - 1);
  assert.ok(l.dock.hidden.length > 0, 'część przycisków tylko w menu');
});

test('bez panelu planeta stoi pośrodku', () => {
  const l = computeLayout(1080, 810);
  assert.equal(l.panel, null);
  assert.ok(Math.abs(l.planet.cx - 540) < 1);
});

test('UI skalowane do ekranu', () => {
  assert.ok(computeLayout(1080, 810).u < 0.95, 'iPad');
  assert.equal(computeLayout(390, 844).u, 0.8, 'telefon: minimum czytelności');
  assert.equal(computeLayout(2560, 1440).u, 1.1, 'duży monitor: maksimum');
});

test('panel „Planety” mieści listę planet i przyciski pod nią (do 5 planet na tablecie)', () => {
  for (const [w, h] of [[1080, 810], [810, 1080], [1920, 1080]] as const) {
    const one = computeLayout(w, h, undefined, 6, { open: 'planets' }, 4, 1);
    const five = computeLayout(w, h, undefined, 6, { open: 'planets' }, 4, 5);
    assert.ok(five.panel!.rect.h > one.panel!.rect.h, `${w}×${h}: więcej planet = wyższy panel`);
    assert.ok(five.panel!.rect.h < five.dock.rect.y - five.topBar.y - five.topBar.h, `${w}×${h}: 5 planet bez przycinania`);
  }
});
