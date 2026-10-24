import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createErrorLog, ERROR_LOG_KEY, ERROR_LOG_SIZE, issueLink, ISSUES_URL, reportText } from '../src/app/feedback.ts';

test('zgłoszenie błędu: szablon, tytuł z przedrostkiem, opis, diagnostyka i zapis w adresie', () => {
  const { url, dropped } = issueLink({ kind: 'bug', title: 'Budowle na wodzie', description: 'Kopalnia stoi w jeziorze.', diagnostics: 'wersja: 0.26.5', save: 'PF2:abc' });
  assert.ok(url.startsWith(`${ISSUES_URL}?`));
  const params = new URL(url).searchParams;
  assert.equal(params.get('template'), 'blad.yml');
  assert.equal(params.get('title'), '[Błąd] Budowle na wodzie');
  assert.equal(params.get('opis'), 'Kopalnia stoi w jeziorze.');
  assert.equal(params.get('diagnostyka'), 'wersja: 0.26.5');
  assert.equal(params.get('zapis'), 'PF2:abc');
  assert.deepEqual(dropped, []);
});

test('sugestia: własny szablon; pusty tytuł dostaje domyślny', () => {
  const params = new URL(issueLink({ kind: 'idea', title: ' ', description: 'Więcej planet.' }).url).searchParams;
  assert.equal(params.get('template'), 'sugestia.yml');
  assert.equal(params.get('title'), '[Sugestia] Propozycja zmiany');
  assert.equal(params.get('zapis'), null);
});

test('za długi adres: najpierw wypada zapis, potem diagnostyka jest skracana — opis zostaje', () => {
  const draft = { kind: 'bug' as const, title: 'X', description: 'Opis gracza', diagnostics: 'd'.repeat(3000), save: 'PF2:' + 's'.repeat(5000) };
  const a = issueLink(draft);
  assert.deepEqual(a.dropped, ['save']);
  assert.ok(a.url.length <= 7000);
  const b = issueLink({ ...draft, diagnostics: 'd'.repeat(9000) });
  assert.deepEqual(b.dropped, ['save', 'diagnostics']);
  assert.ok(b.url.length <= 7000);
  assert.equal(new URL(b.url).searchParams.get('opis'), 'Opis gracza');
  assert.ok(new URL(b.url).searchParams.get('diagnostyka')!.endsWith('(skrócone)'));
});

test('tekst zgłoszenia do skopiowania zawiera rodzaj, opis, diagnostykę i zapis', () => {
  const text = reportText({ kind: 'idea', title: 'Księżyc', description: 'Dodać księżyc.', diagnostics: 'wersja: 1', save: 'PF2:x' });
  for (const part of ['sugestia', 'Księżyc', 'Dodać księżyc.', 'wersja: 1', 'PF2:x']) assert.ok(text.includes(part), part);
});

test('dziennik błędów: łączy powtórzenia, pamięta ostatnie, przetrwa ponowne uruchomienie', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  const log = createErrorLog(storage, '0.26.5');
  assert.equal(log.describe(), 'ostatnie błędy: brak');
  log.record('TypeError: x is undefined', 'index.html:1:200', 1000);
  log.record('TypeError: x is undefined', 'index.html:1:200', 2000);
  assert.equal(log.list().length, 1);
  assert.equal(log.list()[0]!.count, 2);
  for (let i = 0; i < ERROR_LOG_SIZE + 3; i++) log.record(`błąd ${i}`, 'promise', 3000 + i);
  assert.equal(log.list().length, ERROR_LOG_SIZE);
  const again = createErrorLog(storage, '0.26.5');
  assert.equal(again.list().length, ERROR_LOG_SIZE);
  assert.ok(again.describe().includes(`błąd ${ERROR_LOG_SIZE + 2}`));
  again.clear();
  assert.equal(store.has(ERROR_LOG_KEY), false);
  // Brak pamięci (tryb prywatny) nie psuje gry.
  const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => {} };
  const quiet = createErrorLog(broken, '1');
  quiet.record('a', 'b');
  assert.equal(quiet.list().length, 1);
});
