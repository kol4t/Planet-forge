// Okno „Diagnostyka i zgłoszenia” (HTML — iPad potrzebuje prawdziwych pól tekstowych i klawiatury).
// Dwie rubryki: błąd i sugestia (propozycja zmiany). „Wyślij na GitHub” otwiera gotowe zgłoszenie
// w repozytorium gry (app/feedback.ts), „Kopiuj” — cały tekst dla osób bez konta GitHub.
// Szkic zgłoszenia zostaje w pamięci przeglądarki (np. po powrocie z GitHuba), dopóki gracz go nie wyczyści.
// Wygląd: style #text-panel i .fb-* w index.html.
import { issueLink, reportText, type FeedbackDraft, type FeedbackKind } from '../../app/feedback.ts';

export interface FeedbackPanelOptions {
  /** Diagnostyka (wersja, urządzenie, płynność, planeta, ostatnie błędy) — liczona przy otwarciu. */
  diagnostics: () => string;
  /** Zapis gry „PF2:…”. */
  save: () => string;
  /** Otwarcie adresu (domyślnie nowa karta). Zwraca false, gdy przeglądarka zablokowała okno. */
  open?: (url: string) => boolean;
  /** Kopiowanie do schowka (domyślnie navigator.clipboard). */
  copy?: (text: string) => Promise<void>;
}

const DRAFT_KEY = 'planet-forge.feedbackDraft.v1';

interface StoredDraft {
  kind: FeedbackKind;
  title: string;
  description: string;
}

const PLACEHOLDERS: Record<FeedbackKind, { title: string; description: string }> = {
  bug: {
    title: 'Krótko: co nie działa (np. „Budowle na wodzie”)',
    description: 'Co robiłeś, co się stało i czego się spodziewałeś. Im dokładniej, tym łatwiej naprawić.',
  },
  idea: {
    title: 'Krótko: co zmienić (np. „Szybsze kopalnie na wzgórzach”)',
    description: 'Co proponujesz i dlaczego — co by to dało w grze.',
  },
};

function loadDraft(): StoredDraft {
  try {
    const data = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as Partial<StoredDraft> | null;
    if (data && (data.kind === 'bug' || data.kind === 'idea')) {
      return { kind: data.kind, title: String(data.title ?? ''), description: String(data.description ?? '') };
    }
  } catch {
    // brak pamięci — pusty szkic
  }
  return { kind: 'bug', title: '', description: '' };
}

function saveDraft(draft: StoredDraft | null): void {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // jak wyżej
  }
}

export function openFeedbackPanel(options: FeedbackPanelOptions): () => void {
  const diagnostics = options.diagnostics();
  const draft = loadDraft();
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box" role="dialog" aria-modal="true" aria-labelledby="fb-title">
      <h2 id="fb-title">Diagnostyka i zgłoszenia</h2>
      <div class="fb-kinds" role="radiogroup" aria-label="Rodzaj zgłoszenia">
        <button type="button" data-kind="bug" role="radio">Błąd</button>
        <button type="button" data-kind="idea" role="radio">Sugestia, propozycja zmiany</button>
      </div>
      <input class="fb-title" type="text" maxlength="120" autocomplete="off" />
      <textarea class="fb-text" rows="5"></textarea>
      <label class="fb-check"><input type="checkbox" class="fb-diag" /> Dołącz diagnostykę (wersja, urządzenie, płynność, planeta, ostatnie błędy)</label>
      <label class="fb-check"><input type="checkbox" class="fb-save" /> Dołącz zapis gry (pozwala odtworzyć błąd na tej samej planecie)</label>
      <details class="fb-details"><summary>Pokaż diagnostykę</summary><textarea class="fb-diag-text" rows="6" readonly></textarea></details>
      <p class="tp-hint fb-note">„Wyślij” otwiera zgłoszenie w repozytorium gry na GitHubie (potrzebne darmowe konto) — tam tylko zatwierdź „Create” i ewentualnie dołącz zrzut ekranu. Bez konta: „Kopiuj” i wyślij tekst właścicielowi gry.</p>
      <p class="tp-error" role="alert" hidden></p>
      <div class="tp-actions">
        <button type="button" class="tp-secondary fb-close">Zamknij</button>
        <button type="button" class="tp-secondary fb-copy">Kopiuj</button>
        <button type="button" class="tp-primary fb-send">Wyślij na GitHub</button>
      </div>
      <button type="button" class="fb-clear">Wyczyść zgłoszenie</button>
    </div>`;
  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const title = $<HTMLInputElement>('.fb-title');
  const text = $<HTMLTextAreaElement>('.fb-text');
  const withDiag = $<HTMLInputElement>('.fb-diag');
  const withSave = $<HTMLInputElement>('.fb-save');
  const message = $<HTMLElement>('.tp-error');
  $<HTMLTextAreaElement>('.fb-diag-text').value = diagnostics;
  let kind: FeedbackKind = draft.kind;
  title.value = draft.title;
  text.value = draft.description;

  const setKind = (next: FeedbackKind) => {
    kind = next;
    root.querySelectorAll<HTMLButtonElement>('.fb-kinds button').forEach((b) => {
      const on = b.dataset.kind === kind;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    title.placeholder = PLACEHOLDERS[kind].title;
    text.placeholder = PLACEHOLDERS[kind].description;
    // Przy błędzie diagnostyka i zapis pomagają najbardziej; przy sugestii zapis zwykle zbędny.
    withDiag.checked = true;
    withSave.checked = kind === 'bug';
    remember();
  };
  const current = (): FeedbackDraft => ({
    kind,
    title: title.value,
    description: text.value,
    ...(withDiag.checked ? { diagnostics } : {}),
    ...(withSave.checked ? { save: options.save() } : {}),
  });
  const remember = () => saveDraft({ kind, title: title.value, description: text.value });
  const show = (text: string, ok = false) => {
    message.textContent = text;
    message.hidden = false;
    message.classList.toggle('ok', ok);
  };
  const close = () => root.remove();

  root.querySelectorAll<HTMLButtonElement>('.fb-kinds button').forEach((b) =>
    b.addEventListener('click', () => setKind(b.dataset.kind === 'idea' ? 'idea' : 'bug')),
  );
  title.addEventListener('input', remember);
  text.addEventListener('input', remember);
  $('.fb-close').addEventListener('click', close);
  $('.fb-clear').addEventListener('click', () => {
    title.value = '';
    text.value = '';
    saveDraft(null);
    message.hidden = true;
  });
  $('.fb-copy').addEventListener('click', () => {
    const report = reportText(current());
    const copy = options.copy ?? ((t: string) => navigator.clipboard.writeText(t));
    copy(report)
      .then(() => show('Skopiowane — wklej i wyślij właścicielowi gry.', true))
      .catch(() => {
        // Schowek niedostępny: tekst do ręcznego zaznaczenia w polu diagnostyki.
        const details = $<HTMLDetailsElement>('.fb-details');
        const area = $<HTMLTextAreaElement>('.fb-diag-text');
        area.value = report;
        details.open = true;
        area.focus();
        area.select();
        show('Nie udało się skopiować automatycznie — zaznacz tekst poniżej i skopiuj.');
      });
  });
  $('.fb-send').addEventListener('click', () => {
    if (text.value.trim().length < 5) {
      show(kind === 'bug' ? 'Opisz krótko, co się stało.' : 'Opisz krótko, co proponujesz.');
      text.focus();
      return;
    }
    const link = issueLink(current());
    // Bez „noopener” w parametrach (wtedy window.open zawsze zwraca null) — odcinamy opener ręcznie.
    const open =
      options.open ??
      ((url: string) => {
        const win = window.open(url, '_blank');
        if (win) win.opener = null;
        return win !== null;
      });
    const notes = [
      ...(link.dropped.includes('save') ? ['zapis gry się nie zmieścił — wklej go w zgłoszeniu (Ustawienia → Kopiuj zapis)'] : []),
      ...(link.dropped.includes('diagnostics') ? ['diagnostyka została skrócona'] : []),
    ];
    if (open(link.url)) {
      show(`Otwarto zgłoszenie na GitHubie — zatwierdź je tam przyciskiem „Create”.${notes.length ? ` Uwaga: ${notes.join('; ')}.` : ''}`, true);
    } else {
      // Przeglądarka zablokowała nowe okno — zwykły link do dotknięcia.
      message.hidden = false;
      message.classList.add('ok');
      message.textContent = '';
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Dotknij tutaj, aby otworzyć zgłoszenie na GitHubie.';
      message.append(a);
    }
  });
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  setKind(kind);
  document.body.append(root);
  return close;
}
