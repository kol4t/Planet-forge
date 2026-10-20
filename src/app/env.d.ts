// Stałe wstawiane przez esbuild podczas budowania (scripts/build.ts).

/** Czy rejestrować service worker (tylko build produkcyjny, nie podgląd `npm run dev`). */
declare const __PWA__: boolean;
/** Wersja gry z package.json, np. „0.6.0”. */
declare const __APP_VERSION__: string;
