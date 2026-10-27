// Karta budowli obok przybliżonej planety (v0.38.1, wg szkiców właściciela): nazwa, poziom i etap,
// parametry (produkcja, energia, zajętość pól, następny krok) i pasek „Rozwój” z etapami.
// Nie zasłania planety (bez cienia na cały ekran); gesty planety działają obok karty.
import type { BuildingCard } from '../../app/GameController.ts';

export interface CardPlacement {
  /** Prostokąt w pikselach CSS (lewy górny róg, szerokość, maks. wysokość). */
  x: number;
  y: number;
  w: number;
  maxH: number;
}

export class BuildingCardView {
  private readonly root = document.createElement('div');
  private key = '';
  private readonly onClose: () => void;

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.root.id = 'building-card';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Karta budowli');
  }

  show(card: BuildingCard, at: CardPlacement): void {
    Object.assign(this.root.style, { left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, maxHeight: `${at.maxH}px` });
    if (!this.root.isConnected) document.body.append(this.root);
    // Treść przebudowywana tylko po zmianie (karta odświeża się co sekundę).
    const key = JSON.stringify(card);
    if (key === this.key) return;
    this.key = key;
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
    const row = (label: string, value: string, tone = '') => `<div class="bc-row"><span>${label}</span><b class="${tone}">${esc(value)}</b></div>`;
    const stages = card.stages
      .map(
        (s) =>
          `<li class="bc-stage ${s.state}"><span class="bc-dot"></span><div><b>${esc(s.name)}</b><small>${esc(s.footprint)}</small>` +
          `${s.state === 'current' || s.state === 'next' ? `<p>${esc(s.description)}</p>` : ''}</div></li>`,
      )
      .join('');
    this.root.innerHTML =
      `<header><div><h2>${esc(card.name)}</h2><p class="bc-level">Poziom ${card.level}${card.stage ? ` · ${esc(card.stage)}` : ''}</p></div>` +
      `<button type="button" class="bc-close" aria-label="Zamknij">×</button></header>` +
      `<p class="bc-desc">${esc(card.description)}</p>` +
      `<section class="bc-params">` +
      (card.output ? row('Produkcja', card.output, 'teal') : '') +
      (card.energy ? row('Zużycie energii', card.energy, 'warn') : '') +
      row('Zajętość pól', `${card.fields} ${card.fields === 1 ? 'pole' : card.fields < 5 && card.fields > 1 ? 'pola' : 'pól'} · planeta ${card.planetFields.used}/${card.planetFields.buildable}`, 'teal') +
      (card.next ? `<div class="bc-next"><span>Następny krok</span>${esc(card.next)}</div>` : '') +
      `</section>` +
      (stages ? `<h3>Rozwój</h3><ol class="bc-stages">${stages}</ol>` : '');
    this.root.querySelector('.bc-close')!.addEventListener('click', () => this.onClose());
  }

  hide(): void {
    this.root.remove();
    this.key = '';
  }
}
