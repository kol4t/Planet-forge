import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEconomy } from '../src/core/economy/economy.ts';
import { empireFromLegacy, type EmpireSave } from '../src/core/save/empire.ts';
import { serialize } from '../src/core/save/save.ts';
import { EXPORT_PREFIX, exportSave, importSave } from '../src/core/save/transfer.ts';

const slot = (definitionId: string, seed: string) => ({
  kind: 'planet' as const,
  planet: { definitionId, seed, generatorVersion: 1 },
  economy: { ...createEconomy(1000), antimatter: 0 },
});
const empire: Omit<EmpireSave, 'saveVersion'> = {
  active: 1,
  unlockedSlots: 5,
  antimatter: 7.5,
  slots: [slot('kepler-186f', 'KEPLER-186F-ALFA'), slot('ice', 'PF-ŻÓŁW-1')],
  research: {
    done: ['prod-core'],
    current: { id: 'eng-1', startedAt: 1000, finishesAt: 5000, cost: { metal: 10, crystal: 20 }, antimatter: 0, paidBy: 'PF-ŻÓŁW-1' },
  },
};
const known = (id: string) => ['ice', 'kepler-186f'].includes(id);
const load = (text: string) => importSave(text, known, 1);

test('eksport → import daje to samo imperium (także polskie znaki w seedzie)', () => {
  const text = exportSave(empire);
  assert.ok(text.startsWith(EXPORT_PREFIX));
  assert.match(text, /^PF2:[A-Za-z0-9+/=]+$/, 'jedna linijka bez spacji');
  const result = load(text);
  assert.ok(result.ok);
  assert.deepEqual(result.ok && { ...result.data, saveVersion: undefined }, { ...empire, saveVersion: undefined });
});

test('import toleruje spacje i zawinięcia linii (np. z notatek)', () => {
  const text = exportSave(empire);
  const wrapped = `  ${text.slice(0, 30)}\n${text.slice(30, 61)} ${text.slice(61)}\n`;
  assert.ok(load(wrapped).ok);
});

test('stary zapis „PF1:” jednej planety i surowy JSON też się wczytują', () => {
  const legacy = { planet: { definitionId: 'ice', seed: 'PF-STARY', generatorVersion: 1 }, economy: { ...createEconomy(0), antimatter: 4 } };
  const json = serialize(legacy);
  const pf1 = `PF1:${Buffer.from(json, 'utf8').toString('base64')}`;
  for (const text of [pf1, json]) {
    const r = load(text);
    assert.ok(r.ok);
    assert.equal(r.ok && r.data.slots.length, 1);
    assert.equal(r.ok && r.data.antimatter, 4);
  }
  assert.deepEqual(empireFromLegacy({ saveVersion: 1, ...legacy }).slots[0]!.economy.antimatter, 0);
});

test('błędy importu są czytelne i po polsku', () => {
  const message = (text: string) => {
    const r = load(text);
    assert.equal(r.ok, false);
    return r.ok ? '' : r.message;
  };
  assert.match(message('   '), /Wklej tekst zapisu/);
  assert.match(message('cześć'), /nie wygląda na zapis Planet Forge/);
  const text = exportSave(empire);
  assert.match(message(text.slice(0, text.length - 7)), /niepełny lub uszkodzony|uszkodzony albo/);
  assert.match(message('PF2:!!!'), /niepełny lub uszkodzony/);
  assert.match(message('{"saveVersion":2}'), /uszkodzony albo pochodzi z innej wersji/);
  assert.match(message(exportSave({ ...empire, slots: [slot('gazowy-olbrzym', 'X')], active: 0 })), /nieznany typ planety/);
  const oldGen = { ...slot('ice', 'Y'), planet: { definitionId: 'ice', seed: 'Y', generatorVersion: 2 } };
  assert.match(message(exportSave({ ...empire, slots: [oldGen], active: 0 })), /innej wersji generatora/);
});

test('zapis imperium jest walidowany: limit miejsc, aktywne miejsce, portfel', () => {
  const tooMany = { ...empire, unlockedSlots: 5, slots: Array.from({ length: 6 }, (_, i) => slot('ice', `S${i}`)) };
  assert.equal(load(exportSave(tooMany)).ok, false);
  assert.equal(load(exportSave({ ...empire, active: 5 })).ok, false);
  assert.equal(load(exportSave({ ...empire, antimatter: -1 })).ok, false);
  assert.equal(load(exportSave({ ...empire, unlockedSlots: 11 })).ok, false);
  assert.ok(load(exportSave({ ...empire, unlockedSlots: 10 })).ok, 'do 10 po odblokowaniu');
});
