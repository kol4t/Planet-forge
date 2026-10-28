// Pomocnicy testów (nie jest plikiem testów — nie pasuje do wzorca *.test.ts).
import type { ActionMessage, GameController } from '../src/app/GameController.ts';

/**
 * Kolonizacja „od ręki” do testów, które sprawdzają co innego niż sam lot (v0.53: także we własnym układzie leci
 * statek kolonizacyjny za surowce i paliwo). Dokłada aktywnej planecie dokładnie koszt i paliwo (więc zapasy
 * po wszystkim są jak przed), wysyła statek tak, żeby doleciał dokładnie w `now`, i przełącza na nową kolonię
 * (jak dawna natychmiastowa kolonizacja).
 */
export function colonizeNow(game: GameController, address: string, now = 0): ActionMessage {
  const cost = game.colonyShipCost;
  const fuel = game.colonyFuelTo(address);
  const before = game.economy;
  const storage = before.levels.storage ?? 1;
  // Magazyn na tyle duży, żeby zmieścić koszt statku (przywracany zaraz po wysłaniu).
  game.economy = {
    ...before,
    levels: { ...before.levels, storage: Math.max(storage, 4) },
    stock: { metal: before.stock.metal + cost.metal, crystal: before.stock.crystal + cost.crystal },
    antimatter: before.antimatter + fuel,
  };
  const sent = game.colonize(address, now - game.flightSeconds(Number(address.split(':')[1])) * 1000);
  game.economy = { ...game.economy, levels: { ...game.economy.levels, storage } };
  if (!sent.ok) {
    game.economy = before;
    return sent;
  }
  game.tick(now);
  const index = game.planets().findIndex((p) => p.address === address);
  if (index < 0) return { ok: false, message: 'Statek nie doleciał.' };
  game.switchPlanet(index, now);
  return { ok: true, message: sent.message };
}
