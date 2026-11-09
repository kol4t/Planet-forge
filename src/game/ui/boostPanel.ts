// Okno „Wzmocnienia budowli” (krok 3c planu stacji): wybór planety i budynku, lista wzmocnień doku (za antymaterię,
// część z ryzykiem), wzmocnienie kupca (lepsze, bez ryzyka — za antymaterię albo kredyty) i działające wzmocnienia
// oraz awarie. Wygląd: #text-panel.
import type { ActionMessage, BoostsView } from '../../app/GameController.ts';
import type { BoostDef } from '../../core/station/boosts.ts';
import type { BuildingId } from '../../core/types.ts';
import { formatDuration, formatInt } from './theme.ts';

export interface BoostPanelOptions {
  view: () => BoostsView;
  buy: (defId: string, address: string, building: BuildingId | null, from: 'dock' | 'merchant', pay: 'antimatter' | 'credits') => ActionMessage;
  initialAddress: string;
  onDone: (message: string) => void;
}

const SELECTED = ' style="background:#d8b463;color:#0b1416;border-color:#d8b463" aria-pressed="true"';
const H3 = 'style="margin:14px 0 6px;font-size:16px;color:#d8b463"';
const ROW_BTN = 'style="min-height:44px;min-width:96px;padding:0 12px;font-size:14px;border:1.5px solid #72c4b6;background:#1a2b2d;color:#72c4b6;border-radius:8px;align-self:center"';

const BUILDINGS: { id: BuildingId; name: string }[] = [
  { id: 'metalMine', name: 'Kopalnia metalu' },
  { id: 'crystalMine', name: 'Ekstraktor' },
  { id: 'powerPlant', name: 'Elektrownia' },
  { id: 'antimatterCollector', name: 'Kolektor' },
];

const RISK: Record<string, (amount: number) => string> = {
  outage: (h) => `awaria na ${h} h`,
  levels: (n) => `utrata 1–${n} poz.`,
  destroy: () => 'zniszczenie budynku',
  deplete: (f) => `−${Math.round(f * 100)}% złoża`,
};

const factor = (f: number) => `×${String(f).replace('.', ',')}`;

function describe(d: BoostDef): string {
  const risk = d.risk ? `ryzyko ${Math.round(d.risk.chance * 100)}%: ${RISK[d.risk.kind]!(d.risk.amount)}` : 'bez ryzyka';
  return `${d.name} — ${d.scope === 'planet' ? 'cała planeta' : d.minesOnly ? 'kopalnia' : 'budynek'}, wydobycie ${factor(d.factor)} przez ${d.hours} h; ${risk}`;
}

export function openBoostPanel(options: BoostPanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box tr-box" role="dialog" aria-modal="true" aria-labelledby="bp-title">
      <h2 id="bp-title">Wzmocnienia budowli</h2>
      <p class="tp-hint bp-info"></p>
      <label class="tr-row"><span class="tr-label">Planeta</span><select class="bp-planet"></select></label>
      <div class="fb-kinds bp-building" style="flex-wrap:wrap"></div>
      <div class="bp-list"></div>
      <h3 ${H3}>Kupiec</h3>
      <div class="bp-merchant"></div>
      <h3 ${H3}>Działają</h3>
      <div class="bp-active"></div>
      <p class="tp-error" hidden></p>
      <div class="tp-actions"><button type="button" class="tp-secondary">Zamknij</button></div>
    </div>`;
  const close = () => root.remove();
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const select = root.querySelector<HTMLSelectElement>('.bp-planet')!;
  let address = options.initialAddress;
  let building: BuildingId = 'metalMine';

  const act = (result: ActionMessage) => {
    if (!result.ok) {
      error.textContent = result.message;
      error.hidden = false;
      return;
    }
    error.hidden = true;
    options.onDone(result.message);
    render();
  };

  const row = (text: string, button: string) => `<div class="tr-row"><span>${text}</span>${button}</div>`;

  const render = () => {
    const v = options.view();
    if (!v.planets.some((p) => p.address === address)) address = v.planets[0]?.address ?? address;
    const planet = v.planets.find((p) => p.address === address);
    root.querySelector('.bp-info')!.textContent = v.dock
      ? `Antymateria: ${formatInt(v.antimatter)} · kredyty na stacji: ${formatInt(v.credits)}. Wzmocnienia się sumują (mnożą). Ryzyko rozstrzyga się po końcu działania — nagroda zawsze zostaje.`
      : 'Wzmocnienia sprzedaje dok handlowy — najpierw go zbuduj (Moduły stacji).';
    select.innerHTML = v.planets.map((p) => `<option value="${p.address}"${p.address === address ? ' selected' : ''}>${p.name}</option>`).join('');
    root.querySelector('.bp-building')!.innerHTML = BUILDINGS.map(
      (b) => `<button type="button" data-building="${b.id}"${b.id === building ? SELECTED : ''}${(planet?.levels[b.id] ?? 0) > 0 ? '' : ' disabled style="opacity:0.45"'}>${b.name}${(planet?.levels[b.id] ?? 0) > 0 ? ` ${planet!.levels[b.id]}` : ''}</button>`,
    ).join('');
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-building]')) b.addEventListener('click', () => ((building = b.dataset.building as BuildingId), render()));
    const name = BUILDINGS.find((b) => b.id === building)?.name ?? '';
    root.querySelector('.bp-list')!.innerHTML = v.defs
      .map((d) => row(`${describe(d)}${d.scope === 'building' ? ` → ${name}` : ''}`, `<button type="button" data-buy="${d.id}" ${ROW_BTN}${v.dock ? '' : ' disabled'}>${d.antimatter} AM</button>`))
      .join('');
    const m = v.merchant;
    root.querySelector('.bp-merchant')!.innerHTML = m
      ? row(
          `${describe(m.def)}${m.def.scope === 'building' ? ` → ${name}` : ''}`,
          m.sold
            ? `<button type="button" ${ROW_BTN} disabled style="opacity:0.45">Kupione</button>`
            : `<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button type="button" data-merchant="antimatter" ${ROW_BTN}>${m.def.antimatter} AM</button><button type="button" data-merchant="credits" ${ROW_BTN}>${formatInt(m.credits)} kr.</button></span>`,
        )
      : '<p class="tp-hint">Kupiec przy doku nie ma teraz wzmocnień (czasem przywozi lepsze, bez skutków ubocznych).</p>';
    root.querySelector('.bp-active')!.innerHTML =
      v.active.length > 0
        ? v.active
            .map((a) => `<p class="tp-hint" style="margin:0 0 6px">${a.outage ? '⚠ Awaria' : a.name}: ${a.planet}${a.building ? `, ${a.building}` : ' (cała planeta)'} — ${a.outage ? 'stoi' : factor(a.factor)}, jeszcze ${formatDuration(a.secondsLeft)}${a.risky ? ' · ryzyko po końcu' : ''}</p>`)
            .join('')
        : '<p class="tp-hint">Nic nie działa.</p>';
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-buy]')) {
      const def = v.defs.find((d) => d.id === b.dataset.buy)!;
      b.addEventListener('click', () => act(options.buy(def.id, address, def.scope === 'building' ? building : null, 'dock', 'antimatter')));
    }
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-merchant]'))
      b.addEventListener('click', () => act(options.buy(m!.def.id, address, m!.def.scope === 'building' ? building : null, 'merchant', b.dataset.merchant as 'antimatter' | 'credits')));
  };
  select.addEventListener('change', () => ((address = select.value), render()));
  root.querySelector('.tp-secondary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  render();
  document.body.append(root);
  return close;
}
