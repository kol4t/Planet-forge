// Okno „Dok handlowy” (etap 3a, krok 3b planu stacji): kredyty w magazynie stacji, stały rynek (sprzedaż za kredyty,
// kupno za kredyty — wymiana surowców idzie przez kredyty), kupiec przy doku (oferty, statek, zamówienie) i przyjęte
// zamówienie. Kurs zmienia się co 6 h, kupiec przylatuje co 6 h na 4 h. Wygląd: #text-panel.
import type { ActionMessage, TradeView } from '../../app/GameController.ts';
import type { TradeGood } from '../../core/station/trade.ts';
import { formatDuration, formatInt } from './theme.ts';

export interface TradePanelOptions {
  view: () => TradeView;
  sell: (good: TradeGood, amount: number) => ActionMessage;
  buy: (good: 'metal' | 'crystal', amount: number) => ActionMessage;
  deal: (index: number) => ActionMessage;
  ship: () => ActionMessage;
  accept: () => ActionMessage;
  deliver: () => ActionMessage;
  onDone: (message: string) => void;
  /** Otwiera okno „Wzmocnienia budowli” (krok 3c). */
  boosts?: () => void;
}

/** Wybrany przycisk — złote tło (przyciski wyboru w oknach HTML mają wspólny styl). */
const SELECTED = ' style="background:#d8b463;color:#0b1416;border-color:#d8b463" aria-pressed="true"';
const H3 = 'style="margin:14px 0 6px;font-size:16px;color:#d8b463"';
const ROW_BTN = 'style="min-height:44px;min-width:96px;padding:0 12px;font-size:14px;border:1.5px solid #72c4b6;background:#1a2b2d;color:#72c4b6;border-radius:8px;align-self:center"';

const NAMES: Record<TradeGood, string> = { metal: 'Metal', crystal: 'Kryształy', antimatter: 'Antymateria' };
const OF: Record<TradeGood, string> = { metal: 'metalu', crystal: 'kryształów', antimatter: 'antymaterii' };

const price = (v: number) => (v >= 10 ? formatInt(v) : v.toFixed(2).replace('.', ','));

export function openTradePanel(options: TradePanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box tr-box" role="dialog" aria-modal="true" aria-labelledby="td-title">
      <h2 id="td-title">Dok handlowy</h2>
      <p class="tp-hint td-info"></p>
      <div class="tp-actions"><button type="button" class="tp-secondary td-boosts">Wzmocnienia budowli (za antymaterię)</button></div>
      <h3 ${H3}>Rynek</h3>
      <div class="fb-kinds td-side"></div>
      <div class="fb-kinds td-good"></div>
      <label class="tr-row"><span class="tr-label">Ilość</span><span class="tr-value td-amount"></span>
        <input type="range" min="0" step="1" class="td-slider" /></label>
      <p class="tp-hint td-preview"></p>
      <div class="tp-actions"><button type="button" class="tp-primary td-go"></button></div>
      <h3 ${H3}>Kupiec</h3>
      <div class="td-merchant"></div>
      <div class="td-contract"></div>
      <p class="tp-error" hidden></p>
      <div class="tp-actions"><button type="button" class="tp-secondary">Zamknij</button></div>
    </div>`;
  const close = () => root.remove();
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const slider = root.querySelector<HTMLInputElement>('.td-slider')!;
  let side: 'sell' | 'buy' = 'sell';
  let good: TradeGood = 'metal';

  const act = (result: ActionMessage) => {
    if (!result.ok) {
      error.textContent = result.message;
      error.hidden = false;
      return;
    }
    error.hidden = true;
    options.onDone(result.message);
    slider.value = '0';
    render();
  };

  const unit = (v: TradeView) => (side === 'sell' ? v.sell[good] : v.buy[good as 'metal' | 'crystal']);
  const maxAmount = (v: TradeView) => {
    if (side === 'sell') return Math.floor(good === 'antimatter' ? v.wallet : v.stock[good]);
    const g = good as 'metal' | 'crystal';
    return Math.max(0, Math.floor(Math.min(v.credits / v.buy[g], v.capacity - v.stock[g])));
  };

  const render = () => {
    const v = options.view();
    if (side === 'buy' && good === 'antimatter') good = 'metal';
    if (side === 'sell' && good === 'antimatter' && !v.antimatterTrade) good = 'metal';
    root.querySelector('.td-info')!.textContent =
      v.level > 0
        ? `Kredyty na stacji: ${formatInt(v.credits)} · dok poz. ${v.level}, marża ${Math.round(v.spread * 100)}% · kursy zmienią się za ${formatDuration(v.nextChangeSeconds)} · magazyn stacji: ${formatInt(v.stock.metal)} metalu, ${formatInt(v.stock.crystal)} kryształów (miejsce ${formatInt(v.capacity)})` +
          (v.feesPerHour > 0 ? ` · opłaty za premię stacji: +${price(v.feesPerHour)} kredytów/h` : '')
        : 'Dok handlowy nie jest jeszcze zbudowany (Moduły stacji).';
    root.querySelector('.td-side')!.innerHTML = (['sell', 'buy'] as const)
      .map((s) => `<button type="button" data-side="${s}"${s === side ? SELECTED : ''}>${s === 'sell' ? 'Sprzedaję za kredyty' : 'Kupuję za kredyty'}</button>`)
      .join('');
    const goods: TradeGood[] = side === 'buy' ? ['metal', 'crystal'] : v.antimatterTrade ? ['metal', 'crystal', 'antimatter'] : ['metal', 'crystal'];
    root.querySelector('.td-good')!.innerHTML = goods.map((g) => `<button type="button" data-good="${g}"${g === good ? SELECTED : ''}>${NAMES[g]}</button>`).join('');
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-side]')) b.addEventListener('click', () => ((side = b.dataset.side as 'sell' | 'buy'), (slider.value = '0'), render()));
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-good]')) b.addEventListener('click', () => ((good = b.dataset.good as TradeGood), (slider.value = '0'), render()));
    slider.max = String(maxAmount(v));
    root.querySelector('.td-go')!.textContent = side === 'sell' ? 'Sprzedaj' : 'Kup';
    renderMerchant(v);
    preview();
  };

  const renderMerchant = (v: TradeView) => {
    const m = v.merchant;
    const box = root.querySelector('.td-merchant')!;
    if (v.level <= 0) {
      box.innerHTML = '<p class="tp-hint">Kupcy przylatują do zbudowanego doku co ok. 6 h i zostają 4 h.</p>';
    } else if (!m.present) {
      box.innerHTML = `<p class="tp-hint">Przy doku nie ma kupca. Następny przyleci za ${formatDuration(m.secondsLeft)} (zostanie 4 h).</p>`;
    } else {
      const offers = m.offers
        .map((o, i) => {
          const text = o.kind === 'sell' ? `Kupi ${formatInt(o.amount)} ${OF[o.good]} za ${formatInt(o.credits)} kredytów` : `Sprzeda ${formatInt(o.amount)} ${OF[o.good]} za ${formatInt(o.credits)} kredytów`;
          return `<div class="tr-row"><span>${text}</span><button type="button" data-deal="${i}" ${ROW_BTN}${o.used ? ' disabled' : ''}>${o.used ? 'Zrobione' : 'Przyjmij'}</button></div>`;
        })
        .join('');
      const ship = m.ship
        ? `<div class="tr-row"><span>Statek: ${m.ship.name} za ${formatInt(m.ship.credits)} kredytów</span><button type="button" data-ship ${ROW_BTN}${m.ship.sold ? ' disabled' : ''}>${m.ship.sold ? 'Kupiony' : 'Kup'}</button></div>`
        : '';
      const c = m.contract;
      const bonus = c.reward.bonus === 'speedup' ? ' + przyspieszenie badania stacji o 2 h' : c.reward.bonus === 'find' ? ' + znalezisko' : '';
      const contract = `<div class="tr-row"><span>Zamówienie: ${formatInt(c.amount)} ${OF[c.want]} w 12 h → ${formatInt(c.reward.credits)} kredytów, ${c.reward.antimatter} antymaterii${bonus}</span><button type="button" data-accept ${ROW_BTN}${m.contractTaken ? ' disabled' : ''}>${m.contractTaken ? 'Przyjęte' : 'Przyjmij'}</button></div>`;
      box.innerHTML = `<p class="tp-hint">${m.name} — odleci za ${formatDuration(m.secondsLeft)}. Ceny lepsze niż na rynku, każda oferta raz.</p>${offers}${ship}${contract}`;
    }
    const a = v.activeContract;
    root.querySelector('.td-contract')!.innerHTML = a
      ? `<div class="tr-row"><span>W toku: ${formatInt(a.amount)} ${OF[a.want]} dla „${a.from}” — zostało ${formatDuration(a.secondsLeft)}. Towar z magazynu stacji (jest ${formatInt(v.stock[a.want])}).</span><button type="button" data-deliver ${ROW_BTN}>Oddaj</button></div>`
      : '';
    for (const b of root.querySelectorAll<HTMLButtonElement>('.td-merchant button:disabled')) b.style.opacity = '0.45';
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-deal]')) b.addEventListener('click', () => act(options.deal(Number(b.dataset.deal))));
    root.querySelector('[data-ship]')?.addEventListener('click', () => act(options.ship()));
    root.querySelector('[data-accept]')?.addEventListener('click', () => act(options.accept()));
    root.querySelector('[data-deliver]')?.addEventListener('click', () => act(options.deliver()));
  };

  const preview = () => {
    const v = options.view();
    const amount = Number(slider.value);
    root.querySelector('.td-amount')!.textContent = formatInt(amount);
    const credits = side === 'sell' ? Math.floor(amount * unit(v)) : Math.ceil(amount * unit(v));
    const per = good === 'antimatter' ? `za 1 antymaterii: ${price(unit(v))} kr.` : `za 1000 ${OF[good]}: ${formatInt(1000 * unit(v))} kr.`;
    root.querySelector('.td-preview')!.textContent = side === 'sell' ? `Dostaniesz ${formatInt(credits)} kredytów (${per}).` : `Zapłacisz ${formatInt(credits)} kredytów (${per}).`;
  };
  slider.addEventListener('input', preview);
  root.querySelector('.td-boosts')!.addEventListener('click', () => {
    close();
    options.boosts?.();
  });
  root.querySelector('.td-go')!.addEventListener('click', () => {
    const amount = Number(slider.value);
    act(side === 'sell' ? options.sell(good, amount) : options.buy(good as 'metal' | 'crystal', amount));
  });
  root.querySelector('.tp-actions:last-child .tp-secondary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  render();
  document.body.append(root);
  return close;
}
