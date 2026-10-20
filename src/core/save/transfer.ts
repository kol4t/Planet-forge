// Przenoszenie zapisu jako tekst (np. z Safari do aplikacji na ekranie początkowym,
// która na iPadzie ma osobną pamięć). Czysty TypeScript — bez DOM.
import { deserializeEmpire, empireFromLegacy, serializeEmpire, type EmpireSave } from './empire.ts';
import { deserialize } from './save.ts';

/** Prefiks rozpoznawczy eksportu: PF2 = imperium (kilka planet). PF1 (jedna planeta) nadal się wczytuje. */
export const EXPORT_PREFIX = 'PF2:';
const LEGACY_PREFIX = 'PF1:';

export type ImportResult = { ok: true; data: EmpireSave } | { ok: false; message: string };

/** Zapis → jedna linijka tekstu „PF2:…” (base64 z JSON-a), łatwa do skopiowania. */
export function exportSave(empire: Omit<EmpireSave, 'saveVersion'>): string {
  return EXPORT_PREFIX + toBase64(serializeEmpire(empire));
}

/**
 * Tekst wklejony przez gracza → zapis albo czytelny błąd po polsku.
 * Przyjmuje „PF2:…” i starsze „PF1:…” (także z białymi znakami w środku, np. po zawinięciu
 * w notatkach) oraz surowy JSON zapisu.
 */
export function importSave(text: string, knownPlanet: (definitionId: string) => boolean, generatorVersion: number): ImportResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, message: 'Wklej tekst zapisu (zaczyna się od „PF2:”).' };

  let json: string;
  const prefix = [EXPORT_PREFIX, LEGACY_PREFIX].find((p) => trimmed.startsWith(p));
  if (prefix) {
    const decoded = fromBase64(trimmed.slice(prefix.length).replace(/\s+/g, ''));
    if (decoded === null) return { ok: false, message: 'Zapis jest niepełny lub uszkodzony — skopiuj go jeszcze raz w całości.' };
    json = decoded;
  } else if (trimmed.startsWith('{')) {
    json = trimmed;
  } else {
    return { ok: false, message: 'To nie wygląda na zapis Planet Forge — powinien zaczynać się od „PF2:”.' };
  }

  const legacy = deserialize(json);
  const empire = deserializeEmpire(json) ?? (legacy ? empireFromLegacy(legacy) : null);
  if (!empire) return { ok: false, message: 'Zapis jest uszkodzony albo pochodzi z innej wersji gry.' };
  for (const slot of empire.slots) {
    if (!knownPlanet(slot.planet.definitionId)) {
      return { ok: false, message: 'Ten zapis zawiera nieznany typ planety — zaktualizuj grę i spróbuj ponownie.' };
    }
    if (slot.planet.generatorVersion !== generatorVersion) {
      return { ok: false, message: 'Zapis pochodzi z innej wersji generatora planet i nie może zostać wczytany.' };
    }
  }
  return { ok: true, data: empire };
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
