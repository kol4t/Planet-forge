// Service worker: gra działa offline. Budowany osobno do dist/sw.js (scripts/build.ts).
// Strategia: cache-first z pamięcią podręczną nazwaną wersją buildu. Nowa wersja
// czeka (bez skipWaiting), aż gracz dotknie „Odśwież” — wtedy strona wysyła SKIP_WAITING.

declare const __BUILD_VERSION__: string;
declare const __PRECACHE__: string[];

// Minimalne typy (lib „webworker” kłóci się z „dom” w jednym tsconfig).
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith(response: Promise<Response>): void;
}
interface WorkerScope {
  location: Location;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

const sw = self as unknown as WorkerScope;
const CACHE_PREFIX = 'planet-forge-';
const CACHE = `${CACHE_PREFIX}${__BUILD_VERSION__}`;

sw.addEventListener('install', (event) => {
  // cache: 'reload' — omijamy pamięć HTTP przeglądarki, żeby nie zapisać starej wersji.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(__PRECACHE__.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void sw.skipWaiting();
});

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== sw.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;
      // Otwarcie gry (np. „/?source=pwa”) offline → strona startowa z pamięci.
      if (request.mode === 'navigate') {
        const shell = (await cache.match('./index.html')) ?? (await cache.match('./'));
        try {
          return await fetch(request);
        } catch {
          if (shell) return shell;
          throw new Error('offline');
        }
      }
      return fetch(request);
    }),
  );
});
