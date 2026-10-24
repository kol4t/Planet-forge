// Zgłoszenia od testerów (v0.26.5): błąd albo sugestia trafia jako „issue” do repozytorium gry na GitHubie.
// Bez serwera: gra otwiera stronę nowego zgłoszenia z wypełnionym formularzem (.github/ISSUE_TEMPLATE),
// tester tylko zatwierdza (potrzebne darmowe konto GitHub). Bez konta — „Kopiuj” i wysłanie tekstu właścicielowi.
// Dziennik błędów: ostatnie błędy JavaScript z przeglądarki (bez danych osobowych) dołączane do zgłoszenia.

/** Strona nowego zgłoszenia w repozytorium gry. */
export const ISSUES_URL = 'https://github.com/kol4t/Planet-forge/issues/new';

export type FeedbackKind = 'bug' | 'idea';

export interface FeedbackDraft {
  kind: FeedbackKind;
  title: string;
  description: string;
  /** Wersja, urządzenie, płynność, planeta, ostatnie błędy. */
  diagnostics?: string;
  /** Zapis gry „PF2:…” (pozwala odtworzyć błąd na tej samej planecie). */
  save?: string;
}

/** Szablony zgłoszeń (pliki w .github/ISSUE_TEMPLATE) — pola formularza wypełniane z adresu. */
export const FEEDBACK_TEMPLATES: Record<FeedbackKind, { file: string; prefix: string; label: string }> = {
  bug: { file: 'blad.yml', prefix: '[Błąd] ', label: 'Błąd' },
  idea: { file: 'sugestia.yml', prefix: '[Sugestia] ', label: 'Sugestia, propozycja zmiany' },
};

/** Najdłuższy adres (GitHub odrzuca zbyt długie — zostawiamy zapas). */
export const MAX_URL_LENGTH = 7000;

export interface IssueLink {
  url: string;
  /** Co nie zmieściło się w adresie (trzeba wkleić ręcznie). */
  dropped: ('save' | 'diagnostics')[];
}

/**
 * Adres nowego zgłoszenia z wypełnionym formularzem. Gdy jest za długi, najpierw wypada zapis gry,
 * potem diagnostyka jest skracana — opis gracza zostaje zawsze.
 */
export function issueLink(draft: FeedbackDraft, maxLength = MAX_URL_LENGTH): IssueLink {
  const template = FEEDBACK_TEMPLATES[draft.kind];
  const title = template.prefix + (draft.title.trim() || (draft.kind === 'bug' ? 'Błąd w grze' : 'Propozycja zmiany'));
  const build = (diagnostics: string | undefined, save: string | undefined) => {
    const params = new URLSearchParams({ template: template.file, title, opis: draft.description.trim() });
    if (diagnostics) params.set('diagnostyka', diagnostics);
    if (save) params.set('zapis', save);
    return `${ISSUES_URL}?${params.toString()}`;
  };
  const dropped: IssueLink['dropped'] = [];
  let url = build(draft.diagnostics, draft.save);
  if (url.length > maxLength && draft.save) {
    dropped.push('save');
    url = build(draft.diagnostics, undefined);
  }
  if (url.length > maxLength && draft.diagnostics) {
    dropped.push('diagnostics');
    let text = draft.diagnostics;
    while (text.length > 0 && url.length > maxLength) {
      text = text.slice(0, Math.floor(text.length * 0.8));
      url = build(`${text}\n…(skrócone)`, undefined);
    }
  }
  return { url, dropped };
}

/** Całe zgłoszenie jako tekst (do skopiowania i wysłania właścicielowi bez konta GitHub). */
export function reportText(draft: FeedbackDraft): string {
  const template = FEEDBACK_TEMPLATES[draft.kind];
  return [
    `Planet Forge — ${template.label.toLowerCase()}`,
    `Tytuł: ${draft.title.trim() || '—'}`,
    '',
    draft.description.trim() || '—',
    ...(draft.diagnostics ? ['', '— Diagnostyka —', draft.diagnostics] : []),
    ...(draft.save ? ['', '— Zapis gry —', draft.save] : []),
  ].join('\n');
}

// ——— dziennik błędów ———

export const ERROR_LOG_KEY = 'planet-forge.errors.v1';
/** Ile ostatnich różnych błędów pamiętamy. */
export const ERROR_LOG_SIZE = 10;

export interface ErrorEntry {
  /** Ostatnie wystąpienie (ms). */
  at: number;
  message: string;
  /** Plik:wiersz albo „promise”. */
  where: string;
  version: string;
  /** Ile razy wystąpił. */
  count: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ErrorLog {
  record(message: string, where: string, at?: number): void;
  list(): ErrorEntry[];
  clear(): void;
  /** Tekst do diagnostyki. */
  describe(): string;
}

/** Dziennik ostatnich błędów w pamięci przeglądarki (przetrwa zamknięcie gry, np. po awarii). */
export function createErrorLog(storage: StorageLike | null, version: string): ErrorLog {
  const read = (): ErrorEntry[] => {
    try {
      const data = JSON.parse(storage?.getItem(ERROR_LOG_KEY) ?? '[]') as unknown;
      return Array.isArray(data)
        ? data.filter((e): e is ErrorEntry => !!e && typeof e.message === 'string' && typeof e.at === 'number').slice(-ERROR_LOG_SIZE)
        : [];
    } catch {
      return [];
    }
  };
  const write = (entries: ErrorEntry[]) => {
    try {
      storage?.setItem(ERROR_LOG_KEY, JSON.stringify(entries));
    } catch {
      // brak pamięci (tryb prywatny) — dziennik działa tylko do zamknięcia gry
    }
  };
  let entries = read();
  return {
    record(message, where, at = Date.now()) {
      const text = String(message).slice(0, 300);
      const same = entries.find((e) => e.message === text && e.where === where && e.version === version);
      if (same) {
        same.count += 1;
        same.at = at;
        entries = [...entries.filter((e) => e !== same), same];
      } else {
        entries = [...entries, { at, message: text, where: where.slice(0, 120), version, count: 1 }].slice(-ERROR_LOG_SIZE);
      }
      write(entries);
    },
    list: () => [...entries],
    clear() {
      entries = [];
      try {
        storage?.removeItem(ERROR_LOG_KEY);
      } catch {
        // jak wyżej
      }
    },
    describe() {
      if (entries.length === 0) return 'ostatnie błędy: brak';
      return [
        `ostatnie błędy (${entries.length}):`,
        ...[...entries].reverse().map((e) => `- ${new Date(e.at).toISOString()} v${e.version}${e.count > 1 ? ` ×${e.count}` : ''}: ${e.message} (${e.where})`),
      ].join('\n');
    },
  };
}
