import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEconomy } from '../src/core/economy/economy.ts';
import { EXPORT_PREFIX, exportSave, importSave } from '../src/core/save/transfer.ts';
import { serialize } from '../src/core/save/save.ts';

const data = {
  planet: { definitionId: 'ice', seed: 'PF-ŻÓŁW-1', generatorVersion: 1 },
  economy: { ...createEconomy(1000), antimatter: 7.5 },
};
const known = (id: string) => ['ice', 'kepler-186f'].includes(id);
const load = (text: string) => importSave(text, known, 1);

test('eksport → import daje ten sam zapis (także polskie znaki w seedzie)', () => {
  const text = exportSave(data);
  assert.ok(text.startsWith(EXPORT_PREFIX));
  assert.match(text, /^PF1:[A-Za-z0-9+/=]+$/, 'jedna linijka bez spacji');
  const result = load(text);
  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.data.planet, data.planet);
  assert.deepEqual(result.ok && result.data.economy, data.economy);
});

test('import toleruje spacje i zawinięcia linii (np. z notatek)', () => {
  const text = exportSave(data);
  const wrapped = `  ${text.slice(0, 30)}\n${text.slice(30, 61)} ${text.slice(61)}\n`;
  assert.ok(load(wrapped).ok);
});

test('import przyjmuje też surowy JSON zapisu', () => {
  assert.ok(load(serialize(data)).ok);
});

test('błędy importu są czytelne i po polsku', () => {
  const message = (text: string) => {
    const r = load(text);
    assert.equal(r.ok, false);
    return r.ok ? '' : r.message;
  };
  assert.match(message('   '), /Wklej tekst zapisu/);
  assert.match(message('cześć'), /nie wygląda na zapis Planet Forge/);
  const text = exportSave(data);
  assert.match(message(text.slice(0, text.length - 7)), /niepełny lub uszkodzony|uszkodzony albo/);
  assert.match(message('PF1:!!!'), /niepełny lub uszkodzony/);
  assert.match(message('{"saveVersion":1}'), /uszkodzony albo pochodzi z innej wersji/);
  assert.match(message(exportSave({ ...data, planet: { ...data.planet, definitionId: 'gazowy-olbrzym' } })), /nieznany typ planety/);
  assert.match(message(exportSave({ ...data, planet: { ...data.planet, generatorVersion: 2 } })), /innej wersji generatora/);
});
