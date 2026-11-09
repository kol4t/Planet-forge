// Okno „Stacje wyspecjalizowane” (etap 4a planu stacji): limit z badań, statki konstrukcyjne, lista stacji
// (lot, urobek do magazynu stacji macierzystej, rozbudowa z magazynu stacji). Wygląd: #text-panel.
import type { ActionMessage, OutpostsView } from '../../app/GameController.ts';
import { formatDuration, formatInt } from './theme.ts';

export interface OutpostPanelOptions {
  view: () => OutpostsView;
  upgrade: (site: string) => ActionMessage;
  onDone: (message: string) => void;
}

const ROW_BTN = 'style="min-height:44px;min-width:96px;padding:0 12px;font-size:14px;border:1.5px solid #72c4b6;background:#1a2b2d;color:#72c4b6;border-radius:8px;align-self:center"';

export function openOutpostPanel(options: OutpostPanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box tr-box" role="dialog" aria-modal="true" aria-labelledby="op-title">
      <h2 id="op-title">Stacje wyspecjalizowane</h2>
      <p class="tp-hint op-info"></p>
      <div class="op-list"></div>
      <p class="tp-error" hidden></p>
      <div class="tp-actions"><button type="button" class="tp-secondary">Zamknij</button></div>
    </div>`;
  const close = () => root.remove();
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const render = () => {
    const v = options.view();
    root.querySelector('.op-info')!.textContent = !v.unlocked
      ? 'Zablokowane — badanie stacji „Wydobycie z kosmosu” (Badania stacji → Eksploracja).'
      : `Stacje: ${v.list.length} z ${v.limit} (kolejne miejsca z badań Eksploracji) · statki konstrukcyjne na stanie: ${v.ships}. ` +
        (v.miningUnlocked
          ? 'Nową stację górniczą zakładasz w widoku układu: stuknij pas asteroid → „Wyślij statek konstrukcyjny”. Urobek trafia do magazynu stacji macierzystej.'
          : 'Stację górniczą odblokowuje badanie „Stacja górnicza na pasie”.');
    root.querySelector('.op-list')!.innerHTML =
      v.list.length === 0
        ? '<p class="tp-hint">Nie masz jeszcze żadnej stacji wyspecjalizowanej.</p>'
        : v.list
            .map((o) => {
              const state = o.flying
                ? `statek leci — przylot za ${formatDuration(o.secondsLeft)}`
                : `poz. ${o.level}${o.upgrading ? ` → ${o.level + 1} za ${formatDuration(o.secondsLeft)}` : ''} · +${formatInt(o.output.metal)} metalu, +${formatInt(o.output.crystal)} kryształów na godzinę`;
              const button =
                !o.flying && !o.upgrading && o.nextCost
                  ? `<button type="button" data-up="${o.site}" ${ROW_BTN}>Poz. ${o.level + 1}</button>`
                  : '';
              const cost = button ? `<br>Rozbudowa (magazyn stacji): ${formatInt(o.nextCost!.metal)} · ${formatInt(o.nextCost!.crystal)}` : '';
              return `<div class="tr-row"><span><b>${o.name}</b><br>${state}${cost}</span>${button}</div>`;
            })
            .join('');
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-up]'))
      b.addEventListener('click', () => {
        const r = options.upgrade(b.dataset.up!);
        error.textContent = r.message;
        error.hidden = r.ok;
        if (r.ok) options.onDone(r.message);
        render();
      });
  };
  root.querySelector('.tp-secondary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  render();
  document.body.append(root);
  return close;
}
