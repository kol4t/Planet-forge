// Nawigacja widoku (plan „widok układu”, etap C): pasek ścieżki „Galaktyka › Układ › Planeta” z „Resetuj widok”
// oraz okienko informacji o obiekcie, który nie jest planetą gracza (tylko dane, które gra już ma — bez nowych
// funkcji). Elementy HTML (cele dotyku ≥ 44 pt), nazwy poziomów robocze (O-301, O-002). Wygląd: style w index.html.

export interface NavCrumb {
  label: string;
  /** null — bieżący poziom (nie do dotknięcia). */
  onTap: (() => void) | null;
}

export class SystemNav {
  private readonly root = document.createElement('nav');

  constructor(parent: HTMLElement) {
    this.root.className = 'system-nav';
    this.root.setAttribute('aria-label', 'Nawigacja widoku');
    this.root.hidden = true;
    parent.append(this.root);
  }

  /** Ścieżka i przycisk „Resetuj widok” (gdy `onReset`). `x`, `y` — lewy górny róg (piksele CSS). */
  show(crumbs: NavCrumb[], onReset: (() => void) | null, x: number, y: number, maxWidth: number): void {
    this.root.replaceChildren();
    crumbs.forEach((c, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'sn-sep';
        sep.textContent = '›';
        this.root.append(sep);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.label;
      if (c.onTap) b.addEventListener('click', c.onTap);
      else {
        b.disabled = true;
        b.className = 'sn-current';
      }
      this.root.append(b);
    });
    if (onReset) {
      const r = document.createElement('button');
      r.type = 'button';
      r.className = 'sn-reset';
      r.textContent = 'Resetuj widok';
      r.addEventListener('click', onReset);
      this.root.append(r);
    }
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
    this.root.style.maxWidth = `${maxWidth}px`;
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  dispose(): void {
    this.root.remove();
  }
}

export interface ObjectInfo {
  title: string;
  lines: string[];
  actions: { label: string; primary?: boolean; run: () => void }[];
}

/** Okienko informacji o obiekcie (HTML, zamykane dotknięciem tła albo „Zamknij”). */
export function openObjectInfo(info: ObjectInfo, onClose: () => void): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box" role="dialog" aria-modal="true" aria-labelledby="oi-title">
      <h2 id="oi-title"></h2>
      <ul class="tp-hint oi-lines" style="padding-left:20px;margin:0 0 8px"></ul>
      <div class="tp-actions"></div>
    </div>`;
  root.querySelector('h2')!.textContent = info.title;
  const list = root.querySelector('.oi-lines')!;
  for (const line of info.lines) {
    const li = document.createElement('li');
    li.textContent = line;
    list.append(li);
  }
  const close = () => {
    root.remove();
    onClose();
  };
  const actions = root.querySelector('.tp-actions')!;
  for (const a of [...info.actions, { label: 'Zamknij', primary: false, run: () => {} }]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = a.primary ? 'tp-primary' : 'tp-secondary';
    b.textContent = a.label;
    b.addEventListener('click', () => {
      close();
      a.run();
    });
    actions.append(b);
  }
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.body.append(root);
  return close;
}
