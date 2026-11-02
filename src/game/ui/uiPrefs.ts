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

/** Przybliżenie, do którego kamera podjeżdża przy pokazaniu budynku (Ustawienia → Widok). */
export const FOCUS_ZOOMS = [1.5, 3] as const;
export type FocusZoom = (typeof FOCUS_ZOOMS)[number];
const FOCUS_KEY = 'planet-forge.focusZoom.v1';

export function loadFocusZoom(): FocusZoom {
  try {
    const value = Number(globalThis.localStorage?.getItem(FOCUS_KEY));
    return FOCUS_ZOOMS.find((z) => z === value) ?? FOCUS_ZOOMS[0];
  } catch {
    return FOCUS_ZOOMS[0];
  }
}

export function saveFocusZoom(zoom: FocusZoom): void {
  try {
    globalThis.localStorage?.setItem(FOCUS_KEY, String(zoom));
  } catch {
    // brak pamięci (tryb prywatny) — wybór obowiązuje do zamknięcia gry
  }
}

/** Panel przewodnika SI zwinięty (etap 11) — zapamiętany na urządzeniu. */
const GUIDE_KEY = 'planet-forge.guideCollapsed.v1';

/** `fallback` — gdy gracz jeszcze nie wybierał (małe ekrany: zwinięty, żeby nie zasłaniał planety). */
export function loadGuideCollapsed(fallback = false): boolean {
  try {
    const raw = globalThis.localStorage?.getItem(GUIDE_KEY);
    return raw === null || raw === undefined ? fallback : raw === '1';
  } catch {
    return fallback;
  }
}

export function saveGuideCollapsed(collapsed: boolean): void {
  try {
    globalThis.localStorage?.setItem(GUIDE_KEY, collapsed ? '1' : '0');
  } catch {
    // brak pamięci — wybór obowiązuje do zamknięcia gry
  }
}

/** Obrót planety sam z siebie (Ustawienia → Widok; widok układu, decyzja właściciela 2026-11-02): domyślnie wyłączony. */
const SPIN_KEY = 'planet-forge.autoSpin.v1';

export function loadAutoSpin(): boolean {
  try {
    return globalThis.localStorage?.getItem(SPIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveAutoSpin(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(SPIN_KEY, on ? '1' : '0');
  } catch {
    // brak pamięci (tryb prywatny) — wybór obowiązuje do zamknięcia gry
  }
}

/** Siatka pól na planecie (Ustawienia → Widok); domyślnie ukryta. */
const GRID_KEY = 'planet-forge.fieldGrid.v1';

export function loadGridVisible(): boolean {
  try {
    return globalThis.localStorage?.getItem(GRID_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveGridVisible(visible: boolean): void {
  try {
    globalThis.localStorage?.setItem(GRID_KEY, visible ? '1' : '0');
  } catch {
    // brak pamięci (tryb prywatny) — wybór obowiązuje do zamknięcia gry
  }
}
