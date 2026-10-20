import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOT_KEY, BootGuard } from '../src/app/bootGuard.ts';
import { renderPixelRatio } from '../src/planet-renderer/PlanetView.ts';

const memory = () => {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), store };
};

test('pierwsze uruchomienie: 3D, bez trybu bezpiecznego', () => {
  const boot = new BootGuard(memory(), 0);
  assert.deepEqual(boot.state, { safeMode: false, crashedLastTime: false, graphics: 'auto' });
});

test('start, który nie dotrwał do stabilnej pracy → następny w trybie bezpiecznym, ze śladem', () => {
  const storage = memory();
  const first = new BootGuard(storage, 1000);
  first.step('grafika webgl');
  // …iPad zamknął aplikację — brak markStable()
  const second = new BootGuard(storage, 2000);
  assert.equal(second.state.safeMode, true);
  assert.equal(second.crashedLastTime, true);
  const diag = second.diagnostics({ wersja: '0.6.1' });
  assert.match(diag, /ostatnia awaria: .*start → grafika webgl/);
  assert.match(diag, /tryb bezpieczny po awarii/);
});

test('stabilny start nie jest awarią; tryb wraca do 3D', () => {
  const storage = memory();
  new BootGuard(storage, 0).markStable();
  assert.equal(new BootGuard(storage, 1).state.safeMode, false);
});

test('wybór gracza: tryb 2D zostaje na stałe, „Włącz 3D” wyłącza tryb awaryjny', () => {
  const storage = memory();
  new BootGuard(storage, 0).setGraphics('2d');
  const next = new BootGuard(storage, 1);
  assert.equal(next.state.safeMode, true);
  assert.equal(next.crashedLastTime, false);
  next.setGraphics('auto');
  assert.equal(new BootGuard(storage, 2).state.safeMode, false);
});

test('uszkodzony wpis albo brak pamięci nie wywraca startu', () => {
  const storage = memory();
  storage.store.set(BOOT_KEY, '{zepsute');
  assert.equal(new BootGuard(storage, 0).state.safeMode, false);
  const boot = new BootGuard(null, 0);
  boot.step('x');
  boot.markStable();
  assert.equal(boot.state.safeMode, false);
});

test('planeta 3D: gęstość pikseli mieści się w budżecie pamięci', () => {
  const ipad = renderPixelRatio(1180, 820, 2);
  assert.ok(ipad < 2 && ipad >= 1);
  assert.ok(1180 * 820 * ipad ** 2 <= 2_400_000 + 1);
  assert.equal(renderPixelRatio(390, 844, 3), 2, 'mały ekran: maks. 2×');
  assert.equal(renderPixelRatio(1180, 820, 1), 1);
});
