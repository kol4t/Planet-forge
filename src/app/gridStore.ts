// Pamięć siatek pól w przeglądarce (v0.69.2, audyt 2026-11 punkt 1): IndexedDB, bo siatka ma 2–3 MB, a `localStorage`
// (ok. 5 MB) trzyma zapis gry. Przy starcie gra czeka chwilę (najwyżej `PRELOAD_MS`) na siatki swoich planet, więc
// pierwsze wejście na planetę i przejście 2D↔3D nie liczą siatki od nowa. Każda nowo policzona siatka jest zapisywana
// w tle. Pamięć jest tylko przyspieszeniem: gdy jej brak (tryb prywatny, wyczyszczona), błędna albo z innej wersji —
// gra liczy siatkę jak wcześniej. Nic tu nie zmienia stanu gry.
import { fieldGridStoreKey, onFieldGridBuilt, primeFieldGrid } from '../core/colony/fieldGrid.ts';
import { packFieldGrid, unpackFieldGrid } from '../core/colony/fieldGridPack.ts';
import type { Planet } from '../core/types.ts';

const DB = 'planet-forge.grids';
const STORE = 'grids';
/** Najdłużej tyle start gry czeka na siatki z pamięci. */
const PRELOAD_MS = 2500;
/** Najwięcej przechowanych siatek (10 planet imperium + zapas); najstarsze usuwane. */
const MAX_STORED = 14;

let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

const done = <T>(request: IDBRequest<T>) =>
  new Promise<T | undefined>((resolve) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });

/** Wczytuje do pamięci gry siatki podanych planet, które są w przechowaniu. Zwraca liczbę wczytanych. */
export async function preloadGrids(planets: readonly Planet[]): Promise<number> {
  const work = (async () => {
    const db = await open();
    if (!db) return 0;
    let loaded = 0;
    for (const planet of planets) {
      try {
        const store = db.transaction(STORE, 'readonly').objectStore(STORE);
        const entry = (await done(store.get(fieldGridStoreKey(planet)))) as { packed?: unknown } | undefined;
        const grid = entry ? unpackFieldGrid(entry.packed) : null;
        if (grid) {
          primeFieldGrid(planet, grid);
          loaded++;
        }
      } catch {
        // Uszkodzony wpis — siatka policzy się sama.
      }
    }
    return loaded;
  })();
  const timeout = new Promise<number>((resolve) => setTimeout(() => resolve(0), PRELOAD_MS));
  return Promise.race([work, timeout]);
}

/** Zapis nowo policzonej siatki w tle (po chwili, żeby nie spowalniać klatki, w której siatka powstała). */
function store(planet: Planet, grid: Parameters<typeof packFieldGrid>[0]): void {
  setTimeout(async () => {
    try {
      const db = await open();
      if (!db) return;
      const tx = db.transaction(STORE, 'readwrite');
      const os = tx.objectStore(STORE);
      os.put({ packed: packFieldGrid(grid), at: Date.now() }, fieldGridStoreKey(planet));
      // Porządek: najwyżej MAX_STORED siatek (najstarsze wypadają).
      const keys = ((await done(os.getAllKeys())) ?? []) as string[];
      if (keys.length > MAX_STORED) {
        const ages = await Promise.all(keys.map(async (k) => ({ k, at: (((await done(os.get(k))) as { at?: number } | undefined)?.at ?? 0) })));
        for (const { k } of ages.sort((a, b) => a.at - b.at).slice(0, keys.length - MAX_STORED)) os.delete(k);
      }
    } catch {
      // Brak miejsca albo zablokowana pamięć — siatka zostanie policzona przy następnym starcie.
    }
  }, 300);
}

/** Od teraz każda nowo policzona siatka trafia do przechowania. */
export function storeNewGrids(): void {
  onFieldGridBuilt(store);
}
