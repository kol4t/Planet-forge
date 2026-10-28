// Okno „Kompleks” (v0.38, od v0.45 ulepszenie całego budynku): budynek sam rośnie w jeden kompleks (etapy z poziomu),
// a tu gracz uruchamia premię kompleksu i megakompleks — zysk, koszt, odwracalność. Wygląd: #text-panel w index.html.
import type { ActionMessage, ComplexView } from '../../app/GameController.ts';
import { formatInt, formatRate } from './theme.ts';

export interface ComplexPanelOptions {
  view: () => ComplexView;
  merge: () => ActionMessage;
  split: () => ActionMessage;
  /** Megakompleks (v0.43). */
  mergeMega: () => ActionMessage;
  splitMega: () => ActionMessage;
  /** Znaleziska (v0.43.1): liczba zebranych i otwarcie okna. */
  finds: () => number;
  openFinds: () => void;
  /** Wysyłka megakonstruktu na inną kolonię (v0.56): stan w jednym wierszu (null — nic się nie dzieje) i okno. */
  transferNote: () => string | null;
  openTransfer: () => void;
  onDone: (message: string) => void;
}

export function openComplexPanel(options: ComplexPanelOptions): () => void {
  const v = options.view();
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box" role="dialog" aria-modal="true" aria-labelledby="cp-title">
      <h2 id="cp-title"></h2>
      <p class="tp-hint cp-about"></p>
      <h3 class="ap-head">Stan</h3>
      <p class="tp-hint cp-now"></p>
      <p class="tp-hint cp-next"></p>
      <p class="tp-error" hidden></p>
      <div class="tp-actions">
        <button type="button" class="tp-primary cp-merge">Uruchom kompleks</button>
        <button type="button" class="tp-secondary cp-split">Wyłącz</button>
      </div>
      <div class="cp-mega-box" hidden>
        <h3 class="ap-head cp-mega-head"></h3>
        <p class="tp-hint cp-mega"></p>
        <div class="tp-actions">
          <button type="button" class="tp-primary cp-mega-merge">Uruchom megakompleks</button>
          <button type="button" class="tp-secondary cp-mega-split">Wyłącz</button>
        </div>
        <div class="tp-actions"><button type="button" class="tp-secondary cp-finds"></button></div>
        <p class="tp-hint cp-transfer" hidden></p>
        <div class="tp-actions cp-transfer-row" hidden><button type="button" class="tp-primary cp-transfer-open">Wyślij konstrukt…</button></div>
      </div>
      <div class="tp-actions"><button type="button" class="tp-secondary cp-close">Zamknij</button></div>
    </div>`;
  const close = () => root.remove();
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const error = q<HTMLElement>('.tp-error');
  const merge = q<HTMLButtonElement>('.cp-merge');
  const split = q<HTMLButtonElement>('.cp-split');
  q('#cp-title').textContent = v.name;
  const gain = (g: number) => (v.resource === 'energy' ? `energia +${formatInt(g)}` : `wydobycie +${formatRate(g)}/min (+${formatInt(g * 60)}/h)`);
  q('.cp-about').textContent =
    `Budynek sam rośnie w jeden kompleks — z poziomem przybywa pól i zabudowy (teraz: ${v.stage || 'brak'}, ${v.buildingFields} pól). ` +
    `${v.name} to usprawnienie całego budynku: ${v.resource === 'energy' ? `+${v.bonus}% energii` : `+${v.bonus}% wydobycia`}, dostępne od etapu „${v.needStage}” (poz. ${v.needLevel}).`;
  q('.cp-now').textContent = v.active
    ? `${v.name} działa: +${v.bonus}% całego budynku. Pola planety: ${v.fields.used} / ${v.fields.buildable} zajęte.`
    : `${v.name} nie działa. Pola planety: ${v.fields.used} / ${v.fields.buildable} zajęte.`;
  const c = v.candidate;
  q('.cp-next').textContent = c
    ? `Gotowe: ${gain(c.gainPerMinute)}.\nKoszt: ${formatInt(v.cost.metal)} metalu · ${formatInt(v.cost.crystal)} kryształów. Działa od razu, bez nowych pól.\n` +
      `Odwracalne: „Wyłącz” (bez zwrotu kosztu).`
    : v.active
      ? ''
      : (v.reason ?? '');
  merge.disabled = !c || !v.unlocked;
  split.disabled = !v.active;
  if (!v.unlocked) {
    error.textContent = `Najpierw zbadaj ${v.research}.`;
    error.hidden = false;
  }
  const act = (run: () => ActionMessage) => () => {
    const result = run();
    if (!result.ok) {
      error.textContent = result.message;
      error.hidden = false;
      return;
    }
    close();
    options.onDone(result.message);
  };
  merge.addEventListener('click', act(options.merge));
  // Megakompleks (v0.43): sekcja widoczna, gdy działa kompleks.
  const mega = v.mega;
  const megaBox = q<HTMLElement>('.cp-mega-box');
  megaBox.hidden = !v.active;
  q('.cp-mega-head').textContent = mega.name;
  q('.cp-mega').textContent =
    `Na najwyższym etapie budynku: premia rośnie z +${v.bonus}% do +${mega.bonus}%, a głębokie wykopy co kilka godzin przynoszą rzadkie znaleziska.\n` +
    (mega.active
      ? 'Działa.'
      : !mega.unlocked
        ? `Najpierw zbadaj ${mega.research}.`
        : mega.candidate
          ? `Gotowe: ${gain(mega.candidate.gainPerMinute)}.\nKoszt: ${formatInt(mega.cost.metal)} metalu · ${formatInt(mega.cost.crystal)} kryształów. Działa od razu, odwracalne (bez zwrotu kosztu).`
          : (mega.reason ?? ''));
  const megaMerge = q<HTMLButtonElement>('.cp-mega-merge');
  const megaSplit = q<HTMLButtonElement>('.cp-mega-split');
  megaMerge.disabled = !mega.unlocked || !mega.candidate;
  megaSplit.disabled = !mega.active;
  megaMerge.addEventListener('click', act(options.mergeMega));
  const finds = q<HTMLButtonElement>('.cp-finds');
  finds.textContent = `Znaleziska (${options.finds()})`;
  finds.addEventListener('click', () => {
    close();
    options.openFinds();
  });
  // Transfer megakonstruktu (v0.56): przy działającym megakompleksie.
  const note = options.transferNote();
  q<HTMLElement>('.cp-transfer-row').hidden = !mega.active;
  q<HTMLElement>('.cp-transfer').hidden = !mega.active || !note;
  q('.cp-transfer').textContent = note ?? '';
  q('.cp-transfer-open').textContent = note ? 'Wysyłka konstruktu…' : 'Wyślij konstrukt…';
  q('.cp-transfer-open').addEventListener('click', () => {
    close();
    options.openTransfer();
  });
  let megaArmed = false;
  megaSplit.addEventListener('click', () => {
    if (!megaArmed) {
      megaArmed = true;
      megaSplit.textContent = 'Na pewno?';
      return;
    }
    act(options.splitMega)();
  });
  // Wyłączenie wymaga drugiego dotknięcia (premia przepada, koszt nie wraca).
  let armed = false;
  split.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      split.textContent = 'Na pewno?';
      return;
    }
    act(options.split)();
  });
  q('.cp-close').addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.body.append(root);
  return close;
}
