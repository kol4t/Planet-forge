import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOT_KEY, BootGuard } from '../src/app/bootGuard.ts';
import { FpsMeter } from '../src/app/fpsMeter.ts';
import { renderPixelRatio } from '../src/planet-renderer/PlanetView.ts';

const memory = () => {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), store };
};

test('pierwsze uruchomienie: planeta 2D (domyślnie)', () => {
  const boot = new BootGuard(memory(), 0);
  assert.deepEqual(boot.state, { safeMode: true, crashedLastTime: false, graphics: '2d' });
});

test('start w 3D, który nie dotrwał do stabilnej pracy → powrót do 2D na stałe, ze śladem', () => {
  const storage = memory();
  new BootGuard(storage, 0).setGraphics('3d');
  const first = new BootGuard(storage, 1000);
  assert.equal(first.state.safeMode, false, '3D z wyboru gracza');
  first.step('grafika webgl');
  // …iPad zamknął aplikację — brak markStable()
  const second = new BootGuard(storage, 2000);
  assert.equal(second.state.safeMode, true);
  assert.equal(second.crashedLastTime, true);
  const diag = second.diagnostics({ wersja: '0.6.1' });
  assert.match(diag, /ostatnia awaria: .*start → grafika webgl/);
  assert.match(diag, /powrót do 2D po awarii/);
  assert.equal(new BootGuard(storage, 3000).state.graphics, '2d', 'także przy kolejnych startach');
});

test('odświeżenie albo zamknięcie przed upływem 8 s to nie awaria', () => {
  const storage = memory();
  new BootGuard(storage, 0).setGraphics('3d');
  const first = new BootGuard(storage, 1000);
  first.markClosed();
  const second = new BootGuard(storage, 2000);
  assert.equal(second.crashedLastTime, false);
  assert.equal(second.state.graphics, '3d');
  assert.match(second.diagnostics({}), /ostatnia awaria: brak/);
});

test('stabilny start w 3D zostawia 3D', () => {
  const storage = memory();
  new BootGuard(storage, 0).setGraphics('3d');
  new BootGuard(storage, 1).markStable();
  assert.equal(new BootGuard(storage, 2).state.graphics, '3d');
});

test('ustawienie „auto” sprzed v0.7 = 2D; „Wróć do 2D” zostaje na stałe', () => {
  const storage = memory();
  storage.store.set(BOOT_KEY, JSON.stringify({ run: null, ok: true, lastCrash: null, graphics: 'auto' }));
  assert.equal(new BootGuard(storage, 0).state.graphics, '2d');
  const boot = new BootGuard(storage, 1);
  boot.setGraphics('3d');
  new BootGuard(storage, 2).setGraphics('2d');
  assert.equal(new BootGuard(storage, 3).state.safeMode, true);
});

test('uszkodzony wpis albo brak pamięci nie wywraca startu', () => {
  const storage = memory();
  storage.store.set(BOOT_KEY, '{zepsute');
  assert.equal(new BootGuard(storage, 0).state.graphics, '2d');
  const boot = new BootGuard(null, 0);
  boot.step('x');
  boot.markStable();
  assert.equal(boot.state.graphics, '2d');
});

test('planeta 3D: gęstość pikseli mieści się w budżecie pamięci', () => {
  const ipad = renderPixelRatio(1180, 820, 2);
  assert.ok(ipad < 2 && ipad >= 1);
  assert.ok(1180 * 820 * ipad ** 2 <= 2_400_000 + 1);
  assert.equal(renderPixelRatio(390, 844, 3), 2, 'mały ekran: maks. 2×');
  assert.equal(renderPixelRatio(1180, 820, 1), 1);
});

test('licznik płynności: średnia i najsłabsza sekunda, przerwy (tło) pomijane', () => {
  const meter = new FpsMeter();
  assert.match(meter.describe(), /za mało danych/);
  let t = 0;
  for (let i = 0; i < 60 * 3; i++) meter.frame((t += 1000 / 60)); // 3 s po 60 kl./s
  t += 5000; // aplikacja w tle
  for (let i = 0; i < 30 * 2 + 1; i++) meter.frame((t += 1000 / 30)); // 2 s po 30 kl./s
  const s = meter.summary()!;
  assert.equal(s.seconds, 4);
  assert.ok(Math.abs(s.worst - 30) < 1.5, `najsłabsza ${s.worst}`);
  assert.ok(s.average > 40 && s.average < 50, `średnia ${s.average}`);
  assert.match(meter.describe(), /średnio \d+ kl\.\/s, najsłabsza sekunda \d+ kl\.\/s/);
});
