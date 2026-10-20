// Rejestracja service workera i wykrywanie nowej wersji gry.

/**
 * `onUpdate` dostaje funkcję `apply`, która przełącza na nową wersję i przeładowuje stronę
 * (wywołaj ją po dotknięciu „Odśwież”).
 */
export function registerServiceWorker(onUpdate: (apply: () => void) => void): void {
  if (!__PWA__) return;
  try {
    if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  } catch {
    return; // np. ramka bez dostępu do service workerów
  }
  let reloadRequested = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Przeładowanie tylko na życzenie gracza (pierwsza instalacja też zmienia kontroler).
    if (reloadRequested) location.reload();
  });

  const offer = (worker: ServiceWorker) => {
    onUpdate(() => {
      reloadRequested = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
  };

  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then((registration) => {
      // Nowa wersja już czeka (pobrana przy poprzednim uruchomieniu).
      if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
        });
      });
      // Aplikacja z ekranu początkowego rzadko sama sprawdza aktualizacje — pomagamy przy powrocie.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
      });
    })
    .catch((error) => console.warn('Service worker nie wystartował', error));
}
