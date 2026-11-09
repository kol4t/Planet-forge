import assert from 'node:assert/strict';
import test from 'node:test';
import { driftFactor, marketSpread, TRADE } from '../src/core/station/trade.ts';
import { auraFees, buyPrice, contractOpen, marketBuy, marketSell, merchantAt, merchantVisit, MERCHANTS, parseMerchantSave, sellPrice } from '../src/core/station/merchants.ts';
import { parseHomeStation } from '../src/core/economy/homeStation.ts';
import { GameController } from '../src/app/GameController.ts';

const ctx = { level: 1, stock: { metal: 10_000, crystal: 10_000 }, wallet: 50, credits: 0, capacity: 1e6, antimatterTrade: false, ratesResearch: false, at: 0 };

test('rynek: marża maleje z poziomem doku i po badaniu, kurs waha się co 6 h w granicach', () => {
  assert.ok(marketSpread(5, false) < marketSpread(1, false));
  assert.ok(marketSpread(1, true) < marketSpread(1, false));
  assert.ok(marketSpread(99, true) >= TRADE.spread.min);
  for (let p = 0; p < 50; p++) {
    const f = driftFactor('crystal', p * TRADE.periodMs);
    assert.ok(f >= 1 - TRADE.drift - 1e-9 && f <= 1 + TRADE.drift + 1e-9);
  }
  assert.equal(driftFactor('crystal', 1), driftFactor('crystal', TRADE.periodMs - 1), 'stały w okresie');
  // Sprzedaż i kupno przez kredyty zawsze tracą (marża).
  assert.ok(sellPrice('metal', 0, 1, false) < buyPrice('metal', 0, 1, false));
  assert.ok(sellPrice('crystal', 0, 5, true) < buyPrice('crystal', 0, 5, true));
});

test('kredyty (3b): sprzedaż i kupno na rynku — dok, towar, antymateria po badaniu, kredyty, miejsce', () => {
  assert.ok(!marketSell({ ...ctx, level: 0 }, 'metal', 100).ok);
  const sold = marketSell(ctx, 'metal', 1000);
  assert.ok(sold.ok && sold.credits > 0 && sold.credits < 1000 / MERCHANTS.creditValue);
  assert.ok(!marketSell(ctx, 'metal', 20_000).ok, 'brak towaru');
  assert.match((marketSell(ctx, 'antimatter', 1) as { message: string }).message, /Handel antymaterią/);
  assert.ok(marketSell({ ...ctx, antimatterTrade: true }, 'antimatter', 1).ok);
  assert.match((marketBuy(ctx, 'crystal', 100) as { message: string }).message, /kredytów/);
  const bought = marketBuy({ ...ctx, credits: 1000 }, 'crystal', 100);
  assert.ok(bought.ok && bought.credits > 0);
  assert.ok(!marketBuy({ ...ctx, credits: 1e6, capacity: 10_050 }, 'crystal', 100).ok, 'magazyn stacji pełny');
});

test('kupcy: wizyta co 6 h na 4 h, oferty deterministyczne i lepsze niż rynek, zamówienie z nagrodą', () => {
  const h = 3600_000;
  assert.ok(merchantAt(0).present);
  assert.ok(merchantAt(3.9 * h).present);
  assert.ok(!merchantAt(4.1 * h).present);
  assert.equal(merchantAt(4.1 * h).nextAt, 6 * h);
  assert.deepEqual(merchantVisit(7, 1), merchantVisit(7, 1));
  for (let i = 0; i < 40; i++) {
    const v = merchantVisit(i, 1);
    assert.ok(v.offers.length >= 2 && v.offers.length <= 3);
    for (const o of v.offers) {
      const market = o.kind === 'sell' ? sellPrice(o.good, v.arrivesAt, 5, true) : o.good === 'antimatter' ? Infinity : buyPrice(o.good, v.arrivesAt, 5, true);
      const unit = o.credits / o.amount;
      assert.ok(o.kind === 'sell' ? unit > market : unit < market, `oferta ${i} lepsza niż najlepszy rynek`);
    }
    assert.ok(v.contract.reward.credits > 0 && v.contract.reward.antimatter > 0);
  }
  assert.ok(merchantVisit(3, 5).contract.amount > merchantVisit(3, 1).contract.amount, 'większy dok — większe zamówienia');
  assert.equal(auraFees([1, 0.5], 2 * h), 1.5 * MERCHANTS.feePerHour * 2);
  assert.ok(contractOpen({ visit: 0, used: [], contract: { visit: 0, acceptedAt: 0, contract: merchantVisit(0, 1).contract } }, MERCHANTS.contractMs - 1));
  assert.ok(!contractOpen({ visit: 0, used: [], contract: { visit: 0, acceptedAt: 0, contract: merchantVisit(0, 1).contract } }, MERCHANTS.contractMs));
});

test('kupcy: odczyt z zapisu z walidacją; kredyty w zapisie stacji', () => {
  assert.equal(parseMerchantSave(null), null);
  assert.equal(parseMerchantSave({ visit: 'x' }), null);
  assert.deepEqual(parseMerchantSave({ visit: 3, used: [0, 9, -1, 'a'], contract: { visit: 1 } }), { visit: 3, used: [0] });
  const station = parseHomeStation({ address: '1:1:1', core: { level: 1, readyAt: 0 }, storage: { level: 1, readyAt: 0 }, stock: { metal: 0, crystal: 0 }, credits: 120, feesAt: 5, merchant: { visit: 2, used: [1], shipSold: true } });
  assert.equal(station?.credits, 120);
  assert.equal(station?.feesAt, 5);
  assert.deepEqual(station?.merchant, { visit: 2, used: [1], shipSold: true });
  assert.equal(parseHomeStation({ address: '1:1:1', core: { level: 1, readyAt: 0 }, storage: { level: 1, readyAt: 0 }, stock: { metal: 0, crystal: 0 }, credits: -5 })?.credits, undefined);
});

function withDock(now: number): GameController {
  const c = new GameController(now);
  (c as unknown as { station: unknown }).station = {
    address: c.address,
    core: { level: 1, readyAt: 0 },
    storage: { level: 5, readyAt: 0 },
    dock: { level: 1, readyAt: 0 },
    stock: { metal: 500_000, crystal: 500_000 },
    research: { done: ['st-merchants', 'st-trade-dock'], current: null },
  };
  return c;
}

test('dok handlowy w grze: sprzedaż za kredyty, kupno za kredyty, oferta kupca raz, statek, zamówienie', () => {
  const now = 1000;
  const c = withDock(now);
  const before = c.tradeView(now);
  assert.equal(before.credits, 0);
  assert.ok(c.sellForCredits('metal', 100_000, now).ok);
  const sold = c.tradeView(now);
  assert.equal(sold.stock.metal, before.stock.metal - 100_000);
  assert.ok(sold.credits > 0);
  assert.ok(c.buyWithCredits('crystal', 1000, now).ok);
  assert.ok(c.tradeView(now).credits < sold.credits);
  assert.equal(c.tradeView(now).stock.crystal, before.stock.crystal + 1000);
  // Kupiec: oferta tylko raz.
  const m = c.tradeView(now).merchant;
  assert.ok(m.present);
  (c as unknown as { station: { credits: number } }).station.credits = 1e6;
  const r = c.merchantDeal(0, now);
  assert.ok(r.ok, r.message);
  assert.ok(c.tradeView(now).merchant.offers[0]!.used);
  assert.match(c.merchantDeal(0, now).message, /wykorzystana/);
  // Zamówienie: przyjęcie, wykonanie, nagroda.
  assert.ok(c.acceptContract(now).ok);
  assert.match(c.acceptContract(now).message, /przyjęte/);
  const want = c.tradeView(now).activeContract!;
  const credits = c.tradeView(now).credits;
  const am = c.economy.antimatter;
  const d = c.deliverContract(now);
  assert.ok(d.ok, d.message);
  assert.ok(c.tradeView(now).credits >= credits + want.reward.credits);
  assert.equal(c.economy.antimatter, am + want.reward.antimatter);
  assert.equal(c.tradeView(now).activeContract, null);
  // Poza wizytą kupca nie ma.
  const away = 5 * 3600_000;
  assert.match(c.merchantDeal(1, away).message, /nie ma/i);
});

test('kupcy w grze: statek trafia do floty; zamówienie wygasa; opłaty za premię stacji rosną z czasem', () => {
  let index = 0;
  while (!merchantVisit(index, 1).ship) index++;
  const at = index * MERCHANTS.periodMs + 1000;
  const c = withDock(at);
  (c as unknown as { station: { credits: number } }).station.credits = 1e6;
  const type = merchantVisit(index, 1).ship!.type;
  const docked = c.fleetView(at).ships.find((s) => s.type === type)!.docked;
  assert.ok(c.merchantShip(at).ok);
  assert.equal(c.fleetView(at).ships.find((s) => s.type === type)!.docked, docked + 1);
  assert.match(c.merchantShip(at).message, /już kupiony/);
  assert.ok(c.acceptContract(at).ok);
  c.tick(at + MERCHANTS.contractMs + 1);
  assert.equal(c.tradeView(at + MERCHANTS.contractMs + 1).activeContract, null, 'wygasło');
  // Opłaty: z premią stacji (badanie zasięgu) kredyty rosną w takcie.
  const f = withDock(at);
  (f as unknown as { station: { research: { done: string[] } } }).station.research.done.push('st-aura-planet');
  f.tick(at);
  const c0 = f.tradeView(at).credits;
  f.tick(at + 3 * 3600_000);
  const v = f.tradeView(at + 3 * 3600_000);
  assert.ok(v.feesPerHour > 0);
  assert.ok(v.credits > c0, 'opłaty naliczone');
});
