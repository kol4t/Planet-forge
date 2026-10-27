// Ekran fabryki (v0.39, wg szkicu „Rodzina B — metal”): stan kompleksu, schemat sekcji i tryby pracy
// z mierzalnym skutkiem (wydobycie i energia liczone regułami gry). Wygląd: #text-panel + .fp-* w index.html.
import type { ActionMessage, FactoryView } from '../../app/GameController.ts';
import { formatInt, formatRate } from './theme.ts';

export interface FactoryPanelOptions {
  view: () => FactoryView | null;
  setMode: (index: number, mode: string) => ActionMessage;
  onChange: (message: string) => void;
}

export function openFactoryPanel(options: FactoryPanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  const close = () => root.remove();
  const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  // Różnica względem aktywnego trybu: „+12”, „−8,5”, „±0”.
  const signed = (v: number) => (Math.abs(v) < 0.05 ? '±0' : `${v > 0 ? '+' : '−'}${formatRate(Math.abs(v))}`);

  const render = () => {
    const v = options.view();
    if (!v || v.complexes.length === 0) {
      close();
      return;
    }
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const sections = v.complexes
      .map((c, n) => {
        const active = c.modes.find((m) => m.active)!;
        const modes = c.modes
          .map(
            (m) =>
              `<button type="button" class="fp-mode${m.active ? ' on' : ''}" data-index="${c.index}" data-mode="${m.id}">` +
              `<b>${esc(m.name)}${m.active ? ' · aktywny' : ''}</b><span>${esc(m.description)}</span>` +
              `<small>Metal ${signed(m.outputPerMinute - active.outputPerMinute)}/min · energia ${signed(m.energyUse - active.energyUse)}</small></button>`,
          )
          .join('');
        return (
          `<section class="fp-complex"><h3>${esc(v.name)}${v.complexes.length > 1 ? ` ${n + 1}` : ''}</h3>` +
          `<div class="fp-scheme">` +
          `<div><b>Wydobycie</b><span>3 zakłady · ${c.levels} poz.</span></div>` +
          `<div><b>Przetwarzanie</b><span>${esc(v.hubName)}</span></div>` +
          `<div><b>Transport</b><span>taśmociągi</span></div>` +
          `<div><b>Pola</b><span>${c.fields}</span></div></div>` +
          `<h4>Tryb pracy</h4><div class="fp-modes">${modes}</div></section>`
        );
      })
      .join('');
    root.innerHTML =
      `<div class="tp-box fb-box fp-box" role="dialog" aria-modal="true" aria-labelledby="fp-title">` +
      `<h2 id="fp-title">${esc(v.name)}</h2>` +
      `<div class="fp-stats">` +
      `<div><span>Metal (cała kopalnia)</span><b>+${formatRate(v.outputPerMinute)}</b></div>` +
      `<div><span>Energia dla kopalń</span><b class="${v.energyEfficiency < 1 ? 'warn' : ''}">${pct(v.energyEfficiency)}</b></div>` +
      `<div><span>Zużycie energii planety</span><b>${formatInt(v.energyUse)}</b></div>` +
      `<div><span>Premia fabryki</span><b>+${v.bonus}%</b></div></div>` +
      `<p class="tp-hint">Tryb działa na poziomy w fabryce. Gdy energii brakuje, kopalnie dostają jej mniej — „Oszczędzanie energii” może wtedy dać więcej metalu niż „Maksymalna produkcja”.</p>` +
      sections +
      `<p class="tp-error" hidden></p>` +
      `<div class="tp-actions"><button type="button" class="tp-secondary fp-close">Zamknij</button></div></div>`;
    root.querySelector('.fp-close')!.addEventListener('click', close);
    for (const b of root.querySelectorAll<HTMLButtonElement>('.fp-mode')) {
      b.addEventListener('click', () => {
        if (b.classList.contains('on')) return;
        const result = options.setMode(Number(b.dataset.index), b.dataset.mode!);
        if (!result.ok) {
          const error = root.querySelector<HTMLElement>('.tp-error')!;
          error.textContent = result.message;
          error.hidden = false;
          return;
        }
        options.onChange(result.message);
        render();
      });
    }
  };
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  render();
  document.body.append(root);
  return close;
}
