// Panel z polem tekstowym (HTML) — Phaser nie ma natywnego pola do wklejania tekstu,
// a iPad potrzebuje prawdziwego <textarea> (klawiatura, „Wklej”, zaznaczanie).
// Wygląd: style #text-panel w index.html (kolory z theme).

export interface TextPanelOptions {
  title: string;
  hint: string;
  /** Tekst startowy (tryb kopiowania). */
  text?: string;
  readOnly?: boolean;
  confirmLabel?: string;
  /** Zwraca komunikat błędu (panel zostaje otwarty) albo null (panel się zamyka). */
  onConfirm?: (text: string) => string | null;
  onClose?: () => void;
}

export function openTextPanel(options: TextPanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box" role="dialog" aria-modal="true" aria-labelledby="tp-title">
      <h2 id="tp-title"></h2>
      <p class="tp-hint"></p>
      <textarea id="tp-text" rows="6" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
      <p class="tp-error" role="alert" hidden></p>
      <div class="tp-actions">
        <button type="button" class="tp-secondary">Zamknij</button>
      </div>
    </div>`;
  root.querySelector('h2')!.textContent = options.title;
  root.querySelector('.tp-hint')!.textContent = options.hint;
  const area = root.querySelector('textarea')!;
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const actions = root.querySelector('.tp-actions')!;
  area.value = options.text ?? '';
  area.readOnly = options.readOnly ?? false;

  const close = () => {
    root.remove();
    options.onClose?.();
  };
  root.querySelector('.tp-secondary')!.addEventListener('click', close);
  if (options.onConfirm) {
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'tp-primary';
    confirm.textContent = options.confirmLabel ?? 'OK';
    confirm.addEventListener('click', () => {
      const message = options.onConfirm!(area.value);
      if (message === null) {
        close();
        return;
      }
      error.textContent = message;
      error.hidden = false;
    });
    actions.append(confirm);
  }
  // Zamknięcie dotknięciem tła.
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.body.append(root);
  if (area.readOnly) {
    area.focus();
    area.select();
  }
  return close;
}
