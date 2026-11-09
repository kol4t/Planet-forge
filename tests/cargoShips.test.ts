import assert from 'node:assert/strict';
import test from 'node:test';
import { cargoCapacity, cargoFleetProblem, cargoFuelFactor, cargoTimeFactor, parseCargoFleet } from '../src/core/economy/cargoShips.ts';
import { BALANCE } from '../src/data/balance.ts';
import { GameController } from '../src/app/GameController.ts';

const fleet = (d: Partial<Record<string, number>>) => ({ docked: { transport: 0, colonyShip: 0, tug: 0, escort: 0, courier: 0, heavyTransport: 0, ...d }, queue: [] }) as never;

test('statki ładunkowe: kurier szybki i mały, ciężki duży i wolniejszy (decyzje właściciela)', () => {
  const cap = BALANCE.transport.capacity;
  assert.equal(cargoCapacity({ courier: 1 }, BALANCE), 1000);
  assert.equal(cargoCapacity({ heavyTransport: 1 }, BALANCE), cap * 2);
  assert.ok(Math.abs(cargoTimeFactor({ courier: 1 }, BALANCE) - 1 / 3) < 1e-9);
  assert.equal(cargoTimeFactor({ heavyTransport: 1 }, BALANCE), 1.5);
  assert.equal(cargoFuelFactor({ heavyTransport: 1 }, BALANCE), 1.5);
});

test('konwój: ładunek się sumuje, tempo najwolniejszego, tylko po badaniu i najwyżej 5', () => {
  const convoy = { transport: 2, courier: 1, heavyTransport: 1 };
  assert.equal(cargoCapacity(convoy, BALANCE), BALANCE.transport.capacity * (2 + 0.2 + 2));
  assert.equal(cargoTimeFactor(convoy, BALANCE), 1.5);
  const f = fleet({ transport: 3, courier: 2, heavyTransport: 2 });
  assert.match(cargoFleetProblem(convoy, f, BALANCE, false)!, /Konwoje/);
  assert.equal(cargoFleetProblem(convoy, f, BALANCE, true), null);
  assert.match(cargoFleetProblem({ transport: 3, courier: 2, heavyTransport: 1 }, f, BALANCE, true)!, /najwyżej 5/);
  assert.match(cargoFleetProblem({ courier: 3 }, f, BALANCE, true)!, /Za mało/);
  assert.equal(parseCargoFleet({ courier: 2, x: 5, heavyTransport: -1 })?.courier, 2);
  assert.equal(parseCargoFleet({}), null);
});

test('kurier w grze: budowa po badaniu stacji, lot szybszy niż transportowca', () => {
  const c = new GameController();
  assert.match(c.orderShip('courier').message, /Kurier/);
});
