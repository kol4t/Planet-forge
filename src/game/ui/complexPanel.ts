// Okno „Kompleks” (v0.38): podgląd połączenia pełnych pól budynku w kompleks — które pola, ile pól zajmie,
// zysk wydobycia, koszt, odwracalność — i decyzja gracza. Wygląd: #text-panel w index.html.
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
      <h3 class="ap-head">Twoje kompleksy</h3>
      <p class="tp-hint cp-now"></p>
      <h3 class="ap-head">Następne połączenie</h3>
      <p class="tp-hint cp-next"></p>
      <p class="tp-error" hidden></p>
      <div class="tp-actions"><button type="button" class="tp-primary cp-merge"></button></div>
      <div class="tp-actions">
        <button type="button" class="tp-secondary cp-split">Rozłącz kompleks</button>
      </div>
      <div class="cp-mega-box" hidden>
        <h3 class="ap-head cp-mega-head"></h3>
        <p class="tp-hint cp-mega"></p>
        <div class="tp-actions">
          <button type="button" class="tp-primary cp-mega-merge">Połącz w megakompleks</button>
          <button type="button" class="tp-secondary cp-mega-split">Rozłącz</button>
        </div>
        <div class="tp-actions"><button type="button" class="tp-secondary cp-finds"></button></div>
      </div>
      <div class="tp-actions"><button type="button" class="tp-secondary cp-close">Zamknij</button></div>
    </div>`;
  const close = () => root.remove();
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const error = q<HTMLElement>('.tp-error');
  const merge = q<HTMLButtonElement>('.cp-merge');
  const split = q<HTMLButtonElement>('.cp-split');
  q('#cp-title').textContent = v.name;
  q('.cp-about').textContent =
    `${v.groups} sąsiednie pełne pola (po 3 poziomy) łączą się wokół wspólnej konstrukcji — ${v.hubName} na wolnym polu obok. ` +
    `Kompleks zajmuje ${v.groups + v.extraFields} pola zamiast ${v.groups}, a jego ${v.groups * 3} poziomów ${v.resource === 'energy' ? `daje o ${v.bonus}% więcej energii.` : `wydobywa o ${v.bonus}% więcej (zużycie energii bez zmian).`}`;
  q('.cp-now').textContent =
    v.count === 0 ? 'Jeszcze żadnego.' : `${v.count} · ${v.levelsIn} poziomów z premią +${v.bonus}%. Pola planety: ${v.fields.used} / ${v.fields.buildable} zajęte.`;
  const c = v.candidate;
  q('.cp-next').textContent = c
    ? `Gotowe do połączenia: ${v.groups} pola + ${v.hubName} (${v.extraFields} wolne pole).\n` +
      `Pola planety: ${v.fields.used} → ${v.fields.used + v.extraFields} / ${v.fields.buildable}.\n` +
      (v.resource === 'energy'
        ? `Energia: +${formatInt(c.gainPerMinute)}.\n`
        : `Wydobycie: +${formatRate(c.gainPerMinute)}/min (+${formatInt(c.gainPerMinute * 60)}/h).\n`) +
      `Koszt: ${formatInt(v.cost.metal)} metalu · ${formatInt(v.cost.crystal)} kryształów. Działa od razu.\n` +
      `Odwracalne: „Rozłącz” przywraca osobne pola (bez zwrotu kosztu). Zburzenie poziomu w kompleksie też go rozłącza.`
    : (v.reason ?? '');
  merge.textContent = 'Połącz w kompleks';
  merge.disabled = !c || !v.unlocked;
  split.disabled = v.count === 0;
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
  // Megakompleks (v0.43): sekcja widoczna, gdy stoi choć jeden kompleks rodziny.
  const mega = v.mega;
  const megaBox = q<HTMLElement>('.cp-mega-box');
  megaBox.hidden = v.count === 0;
  q('.cp-mega-head').textContent = mega.name;
  q('.cp-mega').textContent =
    `Dwa stykające się kompleksy łączą się w megakompleks: premia ich poziomów rośnie z +${v.bonus}% do +${mega.bonus}%, a głębokie wykopy co kilka godzin przynoszą rzadkie znaleziska.\n` +
    (mega.count > 0 ? `Stoi: ${mega.count}.\n` : '') +
    (!mega.unlocked
      ? `Najpierw zbadaj ${mega.research}.`
      : mega.candidate
        ? `Gotowe do połączenia: ${v.resource === 'energy' ? `energia +${formatInt(mega.candidate.gainPerMinute)}` : `wydobycie +${formatRate(mega.candidate.gainPerMinute)}/min`}.\n` +
          `Koszt: ${formatInt(mega.cost.metal)} metalu · ${formatInt(mega.cost.crystal)} kryształów. Działa od razu, odwracalne (bez zwrotu kosztu).`
        : (mega.reason ?? ''));
  const megaMerge = q<HTMLButtonElement>('.cp-mega-merge');
  const megaSplit = q<HTMLButtonElement>('.cp-mega-split');
  megaMerge.disabled = !mega.unlocked || !mega.candidate;
  megaSplit.disabled = mega.count === 0;
  megaMerge.addEventListener('click', act(options.mergeMega));
  const finds = q<HTMLButtonElement>('.cp-finds');
  finds.textContent = `Znaleziska (${options.finds()})`;
  finds.addEventListener('click', () => {
    close();
    options.openFinds();
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
  // Rozłączenie wymaga drugiego dotknięcia (premia przepada, koszt nie wraca).
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
