// Pomocnicy testów (nie jest plikiem testów — nie pasuje do wzorca *.test.ts).
import type { ActionMessage, GameController } from '../src/app/GameController.ts';

/**
 * Kolonizacja „od ręki” do testów, które sprawdzają co innego niż sam lot (v0.53: także we własnym układzie leci
 * statek kolonizacyjny; od v0.58 z floty). Dokłada statek do floty i paliwo (więc zapasy po wszystkim są jak przed),
 * wysyła statek tak, żeby doleciał dokładnie w `now`, i przełącza na nową kolonię (jak dawna natychmiastowa kolonizacja).
 */
export function colonizeNow(game: GameController, address: string, now = 0): ActionMessage {
  // v0.58: statek kolonizacyjny pochodzi z floty — pomocnik dokłada jeden statek i paliwo (jak dawniej koszt).
  const fleet = (game as unknown as { fleet: { docked: Record<string, number> } }).fleet;
  fleet.docked.colonyShip = (fleet.docked.colonyShip ?? 0) + 1;
  const fuel = game.colonyFuelTo(address);
  const before = game.economy;
  game.economy = { ...before, antimatter: before.antimatter + fuel };
  const sent = game.colonize(address, now - game.flightSeconds(Number(address.split(':')[1])) * 1000);
  if (!sent.ok) {
    game.economy = before;
    fleet.docked.colonyShip--;
    return sent;
  }
  game.tick(now);
  const index = game.planets().findIndex((p) => p.address === address);
  if (index < 0) return { ok: false, message: 'Statek nie doleciał.' };
  game.switchPlanet(index, now);
  return { ok: true, message: sent.message };
}
