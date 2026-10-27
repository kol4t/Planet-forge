// docs/BALANCE.md — tabele wartości balansu wygenerowane z kodu (src/data + reguły core), nie przepisane ręcznie.
// Wszystkie liczby są ROBOCZE (decyzja właściciela: strojenie przed MVP). Uruchomienie: npm run balance-doc
import { writeFileSync } from 'node:fs';
import { BALANCE } from '../src/data/balance.ts';
import { buildSeconds, capacityAtLevel, scaled, upgradeCost } from '../src/core/economy/economy.ts';
import { fieldsFor, stageName } from '../src/core/economy/footprint.ts';
import { FOOTPRINT, STAGE_NAMES } from '../src/data/footprint.ts';
import { RESEARCH_ARMS, RESEARCH_NODES, RESEARCH_RULES } from '../src/data/research.ts';
import { describeEffects, labLevelFor, researchCost, researchSeconds } from '../src/core/research/research.ts';
import { COMPLEX_FAMILIES, MEGA_RULES } from '../src/data/complexes.ts';
import { SPECIALIZATIONS, SPECIALIZATION_RULES } from '../src/data/specializations.ts';
import { FIND_DEFS, FIND_RULES } from '../src/data/finds.ts';
import { DISCOVERY_RULES, EXPEDITION_RULES, ORBIT_RULES, RARE_OBJECTS, STAR_KINDS } from '../src/data/galaxy.ts';
import { describeEffectList } from '../src/core/research/research.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';

const out: string[] = [];
const p = (line = '') => out.push(line);
const n = (v: number) => (Math.abs(v) >= 10_000 ? Math.round(v).toLocaleString('pl-PL').replace(/ /g, ' ') : Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','));
const time = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  return h > 0 ? `${h} h ${m} min` : m > 0 ? `${m} min${sec ? ` ${sec} s` : ''}` : `${sec} s`;
};
const table = (head: string[], rows: (string | number)[][]) => {
  p(`| ${head.join(' | ')} |`);
  p(`|${head.map(() => '---').join('|')}|`);
  for (const r of rows) p(`| ${r.map((c) => (typeof c === 'number' ? n(c) : c)).join(' | ')} |`);
  p();
};

const B = BALANCE;
p('# Balans — wartości z kodu');
p();
p('> Plik **generowany** przez `npm run balance-doc` (skrypt `scripts/balance-doc.ts`) z `src/data/*` i reguł `src/core/*`.');
p('> Nie edytuj ręcznie — zmień dane i uruchom skrypt. **Wszystkie liczby są robocze** (decyzja właściciela: strojenie na końcu, przed MVP).');
p();
p('## Parametry ogólne (`src/data/balance.ts`)');
p();
table(
  ['Parametr', 'Wartość'],
  [
    ['Przyrost podstawowy (bez kopalń)', `${B.passiveIncome.metal} metalu/min, ${B.passiveIncome.crystal} kryształów/min`],
    ['Zapas startowy', `${B.startingStock.metal} metalu, ${B.startingStock.crystal} kryształów, ${B.antimatter.startingStock} antymaterii`],
    ['Wzrost wydobycia z poziomem (`levelGrowth`)', `wydobycie = baza × poziom × ${B.levelGrowth}^poziom`],
    ['Maksymalny poziom budynku', B.maxLevel],
    ['Limit naliczania nieobecności', `${B.maxOfflineSeconds / 3600} h (badania mogą wydłużyć)`],
    ['Czas budowy', `${B.buildSecondsPerLevel} s × docelowy poziom`],
    ['„Ukończ teraz” za darmo do poziomu', B.freeFinishMaxLevel],
    ['„Ukończ teraz” powyżej', `1 antymateria za każde rozpoczęte ${B.antimatter.finishSecondsPerUnit / 60} min`],
    ['Antymateria pasywnie', `${B.antimatter.passivePerHour}/h`],
    ['Magazyn', `${B.storage.base} × ${B.storage.growth}^(poz − 1) (metal i kryształy osobno)`],
    ['Miejsca na planety', `${B.planetSlots.base} na start, maks. ${B.planetSlots.max}`],
    ['Kolejka budowy', `${B.buildQueue} miejsce na start (więcej z badań SI)`],
    ['Złoża na 100 pól (× bogactwo planety)', `${n(B.deposits.perHundredFields.metal)} metalu, ${n(B.deposits.perHundredFields.crystal)} kryształów`],
    ['Teren poza dedykowanym', '75% wydajności (`OFF_SITE_FACTOR`)'],
  ],
);

p('## Budynki — koszt, czas, wydobycie, pola');
p();
p('Wydobycie przy bogactwie 100% i bez kar środowiska. Pola — obszar budynku (`fieldsFor`), etap — `src/data/footprint.ts`.');
p();
const LEVELS = [1, 2, 3, 5, 6, 8, 10, 12, 15, 19, 20, 25, 30, 40];
for (const def of B.buildings) {
  p(`### ${def.name} (\`${def.id}\`)`);
  p();
  p(`Koszt poz. 1: ${def.baseCost.metal} metalu, ${def.baseCost.crystal} kryształów; wzrost kosztu ×${def.costGrowth} na poziom.`);
  p();
  const unit = def.produces === 'metal' ? 'metal/min' : def.produces === 'crystal' ? 'kryształy/min' : def.produces === 'energy' ? 'energia' : def.produces === 'antimatter' ? 'antymateria/h' : def.produces === 'storage' ? 'pojemność' : '—';
  table(
    ['Poziom', 'Koszt metalu', 'Koszt kryształów', 'Czas budowy', `Wydobycie (${unit})`, 'Zużycie energii', 'Pola', 'Etap'],
    LEVELS.map((level) => {
      const cost = upgradeCost(def.id, level - 1);
      const output = def.produces === 'storage' ? capacityAtLevel(level) : def.produces === 'research' ? 0 : scaled(def.baseOutput, level, B.levelGrowth);
      return [level, cost.metal, cost.crystal, time(buildSeconds(level)), def.produces === 'research' ? '—' : output, scaled(def.baseEnergyUse, level, B.levelGrowth), fieldsFor(def.id, level), stageName(def.id, level) ?? '—'];
    }),
  );
}

p('## Etapy obszaru budynku (`src/data/footprint.ts`)');
p();
for (const [id, stages] of Object.entries(FOOTPRINT)) {
  const names = STAGE_NAMES[id as keyof typeof STAGE_NAMES] ?? [];
  p(`- **${B.buildings.find((b) => b.id === id)?.name ?? id}:** ${stages.map((s, i) => `${names[i] ?? '?'} od poz. ${s.from} — ${s.fields[0]}–${s.fields[1]} pól`).join('; ')}.`);
}
p();

p('## Kompleksy i megakompleksy (`src/data/complexes.ts`)');
p();
table(
  ['Rodzina', 'Budynek', 'Premia', 'Koszt', 'Badanie', 'Tryby'],
  COMPLEX_FAMILIES.map((f) => [f.name, B.buildings.find((b) => b.id === f.building)?.name ?? f.building, `+${f.bonus}%`, `${n(f.cost.metal)} / ${n(f.cost.crystal)}`, f.research, f.modes?.map((m) => `${m.name} (×${m.output} wydobycia, ×${m.energy} energii)`).join('; ') ?? '—']),
);
p(`Megakompleks: premia +${MEGA_RULES.bonus}%, koszt ${n(MEGA_RULES.cost.metal)} metalu / ${n(MEGA_RULES.cost.crystal)} kryształów, badanie ${MEGA_RULES.research}.`);
p();
p(`Znaleziska megakompleksów: co ${FIND_RULES.intervalHours[0]}–${FIND_RULES.intervalHours[1]} h; wagi rzadkości ${Object.entries(FIND_RULES.weights).map(([k, v]) => `${FIND_RULES.rarityNames[k as keyof typeof FIND_RULES.rarityNames]} ${v}`).join(', ')}.`);
p();
table(
  ['Znalezisko', 'Rzadkość', 'Premia za sztukę', 'Maks. sztuk'],
  FIND_DEFS.map((f) => [f.name, FIND_RULES.rarityNames[f.rarity], describeEffectList([f.effect]), f.max]),
);

p('## Budowle w kosmosie');
p();
table(
  ['Obiekt', 'Wydobycie poz. 1', 'Wzrost', 'Koszt poz. 1', 'Wzrost kosztu', 'Czas', 'Maks.'],
  [
    ['Stacja na pasie asteroid', `${B.asteroid.output.metal} metalu + ${B.asteroid.output.crystal} kryształów/min`, `×${B.asteroid.growth}`, `${B.asteroid.cost.metal} / ${B.asteroid.cost.crystal}`, `×${B.asteroid.costGrowth}`, `${B.asteroid.secondsPerLevel} s × poz.`, B.asteroid.maxLevel],
    ['Kolektor energii gwiazdy', `${B.starCollector.output} energii × (0,5 + 0,5 × jasność gwiazdy)`, `×${B.starCollector.growth}`, `${B.starCollector.cost.metal} / ${B.starCollector.cost.crystal}`, `×${B.starCollector.costGrowth}`, `${B.starCollector.secondsPerLevel} s × poz.`, B.starCollector.maxLevel],
  ],
);
p(`Kometa: koszt ${B.comet.cost.metal}/${B.comet.cost.crystal}, lot ${time(B.comet.seconds)}, ładunek ${B.comet.cargoMin.metal}–${B.comet.cargoMax.metal} metalu i ${B.comet.cargoMin.crystal}–${B.comet.cargoMax.crystal} kryształów.`);
p();
p(`Transportowiec: ładowność ${n(B.transport.capacity)}, lot ${B.transport.baseSeconds} s + ${B.transport.secondsPerUnit} s/jedn., maks. ${B.transport.maxActive} naraz. Statek kolonizacyjny: ${n(B.colonyShip.cost.metal)} / ${n(B.colonyShip.cost.crystal)}, lot ${B.colonyShip.baseSeconds} s + ${B.colonyShip.secondsPerUnit} s/jedn.`);
p();

p('## Badania (`src/data/research.ts`)');
p();
p(`Koszt: ${RESEARCH_RULES.baseCost.metal} metalu / ${RESEARCH_RULES.baseCost.crystal} kryształów × ${RESEARCH_RULES.ringCostGrowth}^(pierścień − 1) × ${RESEARCH_RULES.doneCostGrowth}^(liczba zbadanych); antymateria od pierścienia ${RESEARCH_RULES.antimatterFromRing}. Czas: ${RESEARCH_RULES.baseSeconds} s × ${RESEARCH_RULES.ringTimeGrowth}^(pierścień − 1), szybciej o ${RESEARCH_RULES.labSpeedPerLevel * 100}% za każdy poziom Laboratorium ponad 1. Pierścień wymaga Laboratorium: ${RESEARCH_RULES.labLevelForRing.map((l, i) => `${i + 1}→poz. ${l}`).join(', ')}.`);
p();
p('Koszt i czas w tabeli: bez wcześniejszych badań, przy Laboratorium wymaganym dla pierścienia.');
p();
for (const arm of RESEARCH_ARMS) {
  const nodes = RESEARCH_NODES.filter((r) => r.arm === arm.id);
  p(`### ${arm.name}${arm.active ? '' : ' (wkrótce)'}`);
  p();
  table(
    ['Badanie', 'Pierścień', 'Koszt (metal / kryształy / antymateria)', 'Czas', 'Efekt'],
    nodes.map((r) => {
      const c = researchCost(r, 0);
      return [`${r.name}${r.soon ? ' (wkrótce)' : ''}`, r.ring, `${n(c.metal)} / ${n(c.crystal)} / ${c.antimatter}`, time(researchSeconds(r, labLevelFor(r.ring))), describeEffects(r) || '—'];
    }),
  );
}

p('## Specjalizacje kolonii (`src/data/specializations.ts`)');
p();
p(`Zmiana trwa ${time(SPECIALIZATION_RULES.changeSeconds)}; dopasowanie miejsca ${SPECIALIZATION_RULES.affinityRange[0]}–${SPECIALIZATION_RULES.affinityRange[1]} (gwiazda × strefa orbity).`);
p();
table(
  ['Specjalizacja', 'Efekt (przy dopasowaniu 1)'],
  SPECIALIZATIONS.map((s) => [s.name, describeEffectList(s.effects)]),
);

p('## Galaktyka (`src/data/galaxy.ts`)');
p();
table(
  ['Rodzaj gwiazdy', 'Opis'],
  STAR_KINDS.map((s) => [s.label, s.description ?? '']),
);
p(`Obieg planet: ${ORBIT_RULES.periodSeconds[0] / 60}–${ORBIT_RULES.periodSeconds[1] / 60} min. Wiedza na start: ${DISCOVERY_RULES.telescopeNeighbors} najbliższych układów rozpoznanych, sygnały do ${DISCOVERY_RULES.signalRange} jedn.`);
p();
const E = EXPEDITION_RULES;
p(`Ekspedycje: zasięg ${E.baseRange} jedn., szansa ${Math.round(E.baseSuccess * 100)}% (maleje o ${E.successPerUnit * 100}% na jednostkę ponad ${E.easyDistance}, w granicach ${E.successRange[0] * 100}–${E.successRange[1] * 100}%), czas ${E.baseSeconds} s + ${E.secondsPerUnit} s/jedn., koszt ${E.cost.metal}/${E.cost.crystal} + ${E.costPerUnit.metal}/${E.costPerUnit.crystal} na jednostkę, maks. ${E.maxActive} naraz.`);
p();
table(
  ['Rzadki obiekt', 'Premia (za każdy zbadany)', 'Maks.'],
  RARE_OBJECTS.map((r) => [r.label, describeEffectList(r.effects), r.maxCount]),
);

p('## Typy planet (`src/data/planets.ts`)');
p();
table(
  ['Typ', 'Kategoria', 'Profil powierzchni', 'Bogactwo metal / kryształy / energia', 'Modyfikatory środowiska'],
  PLANET_DEFINITIONS.map((d) => {
    const r = d.generation.resourceRange;
    const range = (k: 'metal' | 'crystal' | 'energy') => `${Math.round(r[k][0] * 100)}–${Math.round(r[k][1] * 100)}%`;
    return [d.displayName ?? d.id, d.category, String(d.surface.profile.id ?? ''), `${range('metal')} / ${range('crystal')} / ${range('energy')}`, d.generation.environmentModifiers.map((e) => e.label).join(', ')];
  }),
);

writeFileSync('docs/BALANCE.md', out.join('\n'));
console.log(`Zapisano docs/BALANCE.md (${out.length} wierszy)`);
