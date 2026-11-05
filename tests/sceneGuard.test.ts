// v0.69.2: osłona pętli scen — wyjątek w update() nie zatrzymuje gry po cichu: zgłoszenie (raz na treść), scena działa dalej.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guardScenes } from '../src/app/sceneGuard.ts';

test('osłona scen: błąd w update() zgłoszony raz na treść, kolejne klatki działają, wartość zwracana bez zmian', () => {
  let frames = 0;
  const scene = {
    name: 'planeta',
    update(this: { name: string }, fail: boolean) {
      frames++;
      if (fail) throw new Error('zepsute');
      return this.name;
    },
  };
  const reports: [string, string, boolean][] = [];
  assert.equal(guardScenes({ planeta: scene as never, pusta: {} }, (m, w, f) => reports.push([m, w, f])), 1);
  const update = scene.update as unknown as (fail: boolean) => unknown;
  assert.equal(update.call(scene, false), 'planeta', 'this i wynik zachowane');
  assert.equal(update.call(scene, true), undefined);
  update.call(scene, true);
  assert.equal(update.call(scene, false), 'planeta', 'następna klatka działa');
  assert.equal(frames, 4);
  assert.deepEqual(reports, [
    ['zepsute', 'scena planeta', true],
    ['zepsute', 'scena planeta', false],
  ]);
});
