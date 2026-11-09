// Okno „Dok handlowy” (etap 3a planu stacji): stały rynek — wybór, co oddajesz (metal, kryształy, antymateria)
// i co dostajesz (metal, kryształy), suwak ilości, kurs i podgląd. Kurs zmienia się co 6 h. Wygląd: #text-panel.
import type { ActionMessage, TradeView } from '../../app/GameController.ts';
import type { TradeGood } from '../../core/station/trade.ts';
import { formatDuration, formatInt } from './theme.ts';

export interface TradePanelOptions {
  view: () => TradeView;
  trade: (give: TradeGood, amount: number, take: 'metal' | 'crystal') => ActionMessage;
  onDone: (message: string) => void;
}

/** Wybrany towar — złote tło (przyciski wyboru w oknach HTML mają wspólny styl). */
const SELECTED = ' style="background:#d8b463;color:#0b1416;border-color:#d8b463" aria-pressed="true"';

const NAMES: Record<TradeGood, string> = { metal: 'Metal', crystal: 'Kryształy', antimatter: 'Antymateria' };

export function openTradePanel(options: TradePanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box tr-box" role="dialog" aria-modal="true" aria-labelledby="td-title">
      <h2 id="td-title">Dok handlowy</h2>
      <p class="tp-hint td-info"></p>
      <p class="tp-hint td-rates"></p>
      <div class="tr-row"><span class="tr-label">Oddaję</span></div>
      <div class="fb-kinds td-give"></div>
      <div class="tr-row"><span class="tr-label">Dostaję</span></div>
      <div class="fb-kinds td-take"></div>
      <label class="tr-row"><span class="tr-label">Ilość</span><span class="tr-value td-amount"></span>
        <input type="range" min="0" step="1" class="td-slider" /></label>
      <p class="tp-hint td-preview"></p>
      <p class="tp-error" hidden></p>
      <div class="tp-actions">
        <button type="button" class="tp-secondary">Zamknij</button>
        <button type="button" class="tp-primary">Wymień</button>
      </div>
    </div>`;
  const close = () => root.remove();
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const slider = root.querySelector<HTMLInputElement>('.td-slider')!;
  let give: TradeGood = 'metal';
  let take: 'metal' | 'crystal' = 'crystal';

  const rate = (v: TradeView) =>
    give === 'metal' ? v.rates.metalToCrystal : give === 'crystal' ? v.rates.crystalToMetal : take === 'metal' ? v.rates.antimatterToMetal : v.rates.antimatterToCrystal;
  const have = (v: TradeView) => (give === 'antimatter' ? v.wallet : v.stock[give]);

  const render = () => {
    const v = options.view();
    if (give !== 'antimatter' && give === take) take = give === 'metal' ? 'crystal' : 'metal';
    root.querySelector('.td-info')!.textContent =
      v.level > 0
        ? `Dok poz. ${v.level} · marża ${Math.round(v.spread * 100)}% · kursy zmienią się za ${formatDuration(v.nextChangeSeconds)} · magazyn stacji: ${formatInt(v.stock.metal)} metalu, ${formatInt(v.stock.crystal)} kryształów (miejsce ${formatInt(v.capacity)})`
        : 'Dok handlowy nie jest jeszcze zbudowany (Moduły stacji).';
    root.querySelector('.td-rates')!.textContent =
      `Kursy: 1000 metalu → ${formatInt(1000 * v.rates.metalToCrystal)} kryształów · 1000 kryształów → ${formatInt(1000 * v.rates.crystalToMetal)} metalu` +
      (v.antimatterTrade ? ` · 1 antymaterii → ${formatInt(v.rates.antimatterToMetal)} metalu albo ${formatInt(v.rates.antimatterToCrystal)} kryształów` : ' · sprzedaż antymaterii — po badaniu „Handel antymaterią”');
    const gives: TradeGood[] = v.antimatterTrade ? ['metal', 'crystal', 'antimatter'] : ['metal', 'crystal'];
    const giveBox = root.querySelector('.td-give')!;
    giveBox.innerHTML = gives.map((g) => `<button type="button" data-give="${g}"${g === give ? SELECTED : ''}>${NAMES[g]}</button>`).join('');
    const takes: ('metal' | 'crystal')[] = (['metal', 'crystal'] as const).filter((t) => t !== give);
    root.querySelector('.td-take')!.innerHTML = takes.map((t) => `<button type="button" data-take="${t}"${t === take ? SELECTED : ''}>${NAMES[t]}</button>`).join('');
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-give]')) b.addEventListener('click', () => ((give = b.dataset.give as TradeGood), (slider.value = '0'), render()));
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-take]')) b.addEventListener('click', () => ((take = b.dataset.take as 'metal' | 'crystal'), render()));
    slider.max = String(give === 'antimatter' ? Math.floor(have(v)) : Math.floor(have(v)));
    preview();
  };
  const preview = () => {
    const v = options.view();
    const amount = Number(slider.value);
    root.querySelector('.td-amount')!.textContent = formatInt(amount);
    root.querySelector('.td-preview')!.textContent = `Dostaniesz ok. ${formatInt(Math.floor(amount * rate(v)))} ${take === 'metal' ? 'metalu' : 'kryształów'} (kurs ${rate(v) >= 1 ? formatInt(rate(v)) : rate(v).toFixed(3).replace('.', ',')}).`;
  };
  slider.addEventListener('input', preview);
  root.querySelector('.tp-secondary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  root.querySelector('.tp-actions .tp-primary')!.addEventListener('click', () => {
    const result = options.trade(give, Number(slider.value), take);
    if (!result.ok) {
      error.textContent = result.message;
      error.hidden = false;
      return;
    }
    error.hidden = true;
    options.onDone(result.message);
    slider.value = '0';
    render();
  });
  render();
  document.body.append(root);
  return close;
}
