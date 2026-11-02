// Panel przewodnika SI Matki „Kolejny krok” (etap 11): jedno bieżące zadanie, pasek postępu, podpowiedź (zwijana).
// Element HTML pod paskiem nawigacji; cel dotyku (zwiń / rozwiń) ≥ 44 pt. Teksty kroków — `data/guide.ts` (robocze).

export interface GuidePanelData {
  index: number;
  total: number;
  title: string;
  hint: string;
  progress: number;
  label: string;
  finished: boolean;
}

export class GuidePanel {
  private readonly root = document.createElement('section');
  private collapsed: boolean;
  private readonly onToggle: (collapsed: boolean) => void;
  private key = '';

  constructor(parent: HTMLElement, collapsed: boolean, onToggle: (collapsed: boolean) => void) {
    this.collapsed = collapsed;
    this.onToggle = onToggle;
    this.root.className = 'guide-panel';
    this.root.setAttribute('aria-label', 'Przewodnik SI Matki');
    this.root.hidden = true;
    parent.append(this.root);
  }

  /** Pokazanie (albo odświeżenie) w lewym górnym rogu `x`, `y` (piksele CSS), szerokość do `maxWidth`. */
  show(data: GuidePanelData, x: number, y: number, maxWidth: number): void {
    const key = `${data.index}|${data.title}|${data.label}|${Math.round(data.progress * 100)}|${this.collapsed}|${x}|${y}|${maxWidth}`;
    this.root.hidden = false;
    if (key === this.key) return;
    this.key = key;
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
    this.root.style.width = `${Math.min(340, maxWidth)}px`;
    this.root.replaceChildren();
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'gp-head';
    head.setAttribute('aria-expanded', String(!this.collapsed));
    head.textContent = data.finished ? 'SI Matka · przewodnik ukończony' : `SI Matka · krok ${data.index + 1} z ${data.total} ${this.collapsed ? '▸' : '▾'}`;
    head.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.key = '';
      this.onToggle(this.collapsed);
      this.show(data, x, y, maxWidth);
    });
    this.root.append(head);
    const title = document.createElement('p');
    title.className = 'gp-title';
    title.textContent = data.title;
    this.root.append(title);
    if (!data.finished) {
      const bar = document.createElement('div');
      bar.className = 'gp-bar';
      const fill = document.createElement('div');
      fill.style.width = `${Math.round(data.progress * 100)}%`;
      bar.append(fill);
      this.root.append(bar);
      if (data.label) {
        const label = document.createElement('span');
        label.className = 'gp-label';
        label.textContent = data.label;
        this.root.append(label);
      }
    }
    if (!this.collapsed) {
      const hint = document.createElement('p');
      hint.className = 'gp-hint';
      hint.textContent = data.hint;
      this.root.append(hint);
    }
  }

  hide(): void {
    this.root.hidden = true;
  }

  dispose(): void {
    this.root.remove();
  }
}
