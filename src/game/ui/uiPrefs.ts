// Zapamiętany otwarty panel (na tym urządzeniu). Brak pamięci = otwarta „Produkcja”.
import type { PanelId, PanelState } from './layout.ts';

const KEY = 'planet-forge.ui.v2';
/** Stan zwijanych paneli sprzed v0.19 — rozwinięta produkcja zostaje otwarta. */
const OLD_KEY = 'planet-forge.ui.v1';
const PANELS: readonly PanelId[] = ['production', 'planet', 'ai', 'planets'];

export function loadPanels(): PanelState {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw != null) {
      const open = (JSON.parse(raw) as Partial<PanelState> | null)?.open;
      return { open: PANELS.includes(open as PanelId) ? (open as PanelId) : null };
    }
    const old = JSON.parse(globalThis.localStorage?.getItem(OLD_KEY) ?? 'null') as { productionOpen?: boolean } | null;
    return { open: old?.productionOpen === false ? null : 'production' };
  } catch {
    return { open: 'production' };
  }
}

export function savePanels(state: PanelState): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
  } catch {
    // brak pamięci (tryb prywatny) — stan obowiązuje do zamknięcia gry
  }
}
