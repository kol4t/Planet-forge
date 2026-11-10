// Okno „Przenieś stację macierzystą” (krok 4c planu stacji): cel (z widoku układu albo Twoja planeta z listy),
// czas rozkładania i lotu, paliwo, eskorta z ryzykiem piratów; w czasie przenosin — stan i „Odwołaj” przed startem.
import type { ActionMessage, StationMoveInfo } from '../../app/GameController.ts';
import { formatDuration } from './theme.ts';

export interface StationMovePanelOptions {
  /** Cel wybrany w widoku układu (null — wybór z listy Twoich planet). */
  target: { address: string; at?: 'belt' } | null;
  planets: () => { address: string; name: string }[];
  info: (address: string, at?: 'belt') => StationMoveInfo;
  status: () => { to: string; packing: boolean; secondsLeft: number; escort: number } | null;
  move: (address: string, at: 'belt' | undefined, escort: number) => ActionMessage;
  cancel: () => ActionMessage;
  onDone: (message: string) => void;
}

const SELECTED = ' style="background:#d8b463;color:#0b1416;border-color:#d8b463" aria-pressed="true"';

export function openStationMovePanel(options: StationMovePanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box tr-box" role="dialog" aria-modal="true" aria-labelledby="sm-title">
      <h2 id="sm-title">Przenieś stację macierzystą</h2>
      <div class="sm-body"></div>
      <p class="tp-error" hidden></p>
      <div class="tp-actions"><button type="button" class="tp-secondary sm-close">Zamknij</button><button type="button" class="tp-primary sm-go"></button></div>
    </div>`;
  const close = () => root.remove();
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const go = root.querySelector<HTMLButtonElement>('.sm-go')!;
  let target = options.target ?? (options.planets()[0] ? { address: options.planets()[0]!.address } : null);
  let escort = 0;

  const render = () => {
    const body = root.querySelector('.sm-body')!;
    const st = options.status();
    if (st) {
      body.innerHTML = `<p class="tp-hint">${st.packing ? `Stacja się rozkłada — start za ${formatDuration(st.secondsLeft)}` : `Stacja leci — przylot za ${formatDuration(st.secondsLeft)}`}. Cel: ${st.to}${st.escort ? ` · eskorta: ${st.escort}` : ''}. W drodze wszystko działa (badania, stocznia, dok, premia w starym miejscu).</p>`;
      go.textContent = 'Odwołaj przenosiny';
      go.hidden = !st.packing;
      return;
    }
    go.hidden = false;
    go.textContent = 'Przenieś stację';
    if (!target) {
      body.innerHTML = '<p class="tp-hint">Wybierz cel w widoku układu: stuknij planetę, gazowego olbrzyma albo pas asteroid.</p>';
      go.hidden = true;
      return;
    }
    const info = options.info(target.address, target.at);
    escort = Math.min(escort, info.escortMax);
    const select = options.target
      ? ''
      : `<label class="tr-row"><span class="tr-label">Nad Twoją planetę</span><select class="sm-planet">${options
          .planets()
          .map((p) => `<option value="${p.address}"${p.address === target!.address ? ' selected' : ''}>${p.name}</option>`)
          .join('')}</select></label><p class="tp-hint">Inne miejsca (obce planety, olbrzymy, pas) — stuknij je w widoku układu.</p>`;
    const escorts = Array.from({ length: info.escortMax + 1 }, (_, n) => `<button type="button" data-escort="${n}"${n === escort ? SELECTED : ''}>${n}</button>`).join('');
    body.innerHTML = `${select}
      <p class="tp-hint">${info.from} → <b>${info.name}</b></p>
      <p class="tp-hint">Rozkładanie ${formatDuration(info.prepareSeconds)}, lot ${formatDuration(info.seconds)} · paliwo: ${info.fuel} antymaterii · ${info.risk[escort] ?? ''}. Napad piratów opóźnia lot i zabiera część magazynu stacji (metal, kryształy, kredyty). W drodze stacja działa.</p>
      ${info.escortMax > 0 ? `<div class="tr-row"><span class="tr-label">Eskorta</span></div><div class="fb-kinds">${escorts}</div>` : ''}
      ${info.reason ? `<p class="tp-hint" style="color:#e0a35a">${info.reason}</p>` : ''}`;
    go.disabled = !!info.reason;
    root.querySelector<HTMLSelectElement>('.sm-planet')?.addEventListener('change', (e) => ((target = { address: (e.target as HTMLSelectElement).value }), render()));
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-escort]')) b.addEventListener('click', () => ((escort = Number(b.dataset.escort)), render()));
  };
  go.addEventListener('click', () => {
    const r = options.status() ? options.cancel() : target ? options.move(target.address, target.at, escort) : { ok: false, message: 'Wybierz cel.' };
    error.textContent = r.message;
    error.hidden = r.ok;
    if (r.ok) {
      options.onDone(r.message);
      render();
    }
  });
  root.querySelector('.sm-close')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  render();
  document.body.append(root);
  return close;
}
