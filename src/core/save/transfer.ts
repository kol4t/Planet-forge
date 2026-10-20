// Przenoszenie zapisu jako tekst (np. z Safari do aplikacji na ekranie początkowym,
// która na iPadzie ma osobną pamięć). Czysty TypeScript — bez DOM.
import { deserialize, serialize, type SaveData } from './save.ts';

/** Prefiks rozpoznawczy eksportu: wersja formatu tekstowego. */
export const EXPORT_PREFIX = 'PF1:';

export type ImportResult = { ok: true; data: SaveData } | { ok: false; message: string };

/** Zapis → jedna linijka tekstu „PF1:…” (base64 z JSON-a), łatwa do skopiowania. */
export function exportSave(data: Omit<SaveData, 'saveVersion'>): string {
  return EXPORT_PREFIX + toBase64(serialize(data));
}

/**
 * Tekst wklejony przez gracza → zapis albo czytelny błąd po polsku.
 * Przyjmuje „PF1:…” (także z białymi znakami w środku, np. po zawinięciu w notatkach)
 * oraz surowy JSON zapisu.
 */
export function importSave(text: string, knownPlanet: (definitionId: string) => boolean, generatorVersion: number): ImportResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, message: 'Wklej tekst zapisu (zaczyna się od „PF1:”).' };

  let json: string;
  if (trimmed.startsWith(EXPORT_PREFIX)) {
    const decoded = fromBase64(trimmed.slice(EXPORT_PREFIX.length).replace(/\s+/g, ''));
    if (decoded === null) return { ok: false, message: 'Zapis jest niepełny lub uszkodzony — skopiuj go jeszcze raz w całości.' };
    json = decoded;
  } else if (trimmed.startsWith('{')) {
    json = trimmed;
  } else {
    return { ok: false, message: 'To nie wygląda na zapis Planet Forge — powinien zaczynać się od „PF1:”.' };
  }

  const data = deserialize(json);
  if (!data) return { ok: false, message: 'Zapis jest uszkodzony albo pochodzi z innej wersji gry.' };
  if (!knownPlanet(data.planet.definitionId)) {
    return { ok: false, message: 'Ten zapis zawiera nieznany typ planety — zaktualizuj grę i spróbuj ponownie.' };
  }
  if (data.planet.generatorVersion !== generatorVersion) {
    return { ok: false, message: 'Zapis pochodzi z innej wersji generatora planet i nie może zostać wczytany.' };
  }
  return { ok: true, data };
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(encoded: string): string | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
