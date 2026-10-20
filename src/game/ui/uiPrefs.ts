// Zapamiętany stan paneli (na tym urządzeniu). Brak pamięci = panele rozwinięte.
import { OPEN_PANELS, type PanelState } from './layout.ts';

const KEY = 'planet-forge.ui.v1';

export function loadPanels(): PanelState {
  try {
    const data = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? 'null') as Partial<PanelState> | null;
    return {
      infoOpen: data?.infoOpen !== false,
      productionOpen: data?.productionOpen !== false,
    };
  } catch {
    return { ...OPEN_PANELS };
  }
}

export function savePanels(state: PanelState): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(state));
  } catch {
    // brak pamięci (tryb prywatny) — stan obowiązuje do zamknięcia gry
  }
}
