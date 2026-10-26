import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateGalaxy, generateSystem } from '../src/core/galaxy/galaxy.ts';
import { orbitAngle, orbitalPeriod, systemPeriods } from '../src/core/galaxy/orbits.ts';
import { setTimeSource, WORLD_EPOCH, worldNow, worldSeconds } from '../src/core/time/worldClock.ts';
import { ORBIT_RULES } from '../src/data/galaxy.ts';

const TAU = Math.PI * 2;
const MIN = 60_000;
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('orbity: najbliższa planeta ~2 min, najdalsza ~25 min, dalej = wolniej (z odległości, nie z numeru)', () => {
  assert.deepEqual(ORBIT_RULES.periodSeconds, [120, 1500]);
  const galaxy = generateGalaxy(1);
  for (const index of [1, 7, 42, 99]) {
    const system = generateSystem(galaxy, index)!;
    const periods = systemPeriods(system.planets.map((p) => p.orbit));
    assert.ok(near(periods[0]!, 120), `układ ${index}: najbliższa`);
    assert.ok(near(periods.at(-1)!, 1500), `układ ${index}: najdalsza`);
    for (let i = 1; i < periods.length; i++) assert.ok(periods[i]! > periods[i - 1]!, `układ ${index}: rośnie`);
  }
  // Prawo Keplera (T ∝ a^1,5) rozciągnięte na zakres: środek odległości to nie środek okresu.
  const mid = orbitalPeriod(2, 1, 3);
  const k = (a: number) => a ** 1.5;
  assert.ok(near(mid, 120 + 1380 * ((k(2) - k(1)) / (k(3) - k(1)))));
  // Jedna orbita (brak rozpiętości) — najkrótszy okres, bez dzielenia przez zero.
  assert.equal(orbitalPeriod(1, 1, 1), 120);
});

test('orbity: kąt wynika z czasu świata — ta sama chwila = to samo położenie, bez zależności od klatek', () => {
  const phase = 1.2;
  const period = 240;
  const t0 = WORLD_EPOCH + 10 * MIN;
  // W epoce planeta stoi w fazie początkowej.
  assert.ok(near(orbitAngle(phase, period, WORLD_EPOCH), phase));
  // Po pełnym okresie — z powrotem w tym samym miejscu; po pół okresu — po drugiej stronie.
  assert.ok(near(orbitAngle(phase, period, t0 + period * 1000), orbitAngle(phase, period, t0), 1e-6));
  assert.ok(near(orbitAngle(phase, period, t0 + period * 500), (orbitAngle(phase, period, t0) + Math.PI) % TAU, 1e-6));
  // Wiele małych kroków (np. 60 kl./s z drganiami) = jeden duży skok (np. powrót po kilku minutach).
  let t = t0;
  for (let i = 0; i < 1000; i++) t += 16 + (i % 3);
  assert.ok(near(orbitAngle(phase, period, t), orbitAngle(phase, period, t0 + (t - t0))));
  for (const at of [t0, t0 + 7 * MIN, t0 + 3 * 24 * 60 * MIN]) {
    const a = orbitAngle(phase, period, at);
    assert.ok(a >= 0 && a < TAU);
  }
});

test('zegar świata: wspólne źródło czasu, podmienialne (testy, przyszły serwer)', () => {
  const restore = setTimeSource(() => WORLD_EPOCH + 90_000);
  try {
    assert.equal(worldNow(), WORLD_EPOCH + 90_000);
    assert.equal(worldSeconds(), 90);
    assert.ok(near(orbitAngle(0, 360), TAU / 4));
  } finally {
    restore();
  }
  assert.ok(Math.abs(worldNow() - Date.now()) < 1000);
});
