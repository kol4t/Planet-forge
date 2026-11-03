// Okno „Kompleks” (v0.38, od v0.45 ulepszenie całego budynku): budynek sam rośnie w jeden kompleks (etapy z poziomu),
// a tu gracz uruchamia premię kompleksu i megakompleks — zysk, koszt, odwracalność. Wygląd: #text-panel w index.html.
import type { ActionMessage, ComplexView, MetalConstructView, OrbitView } from '../../app/GameController.ts';
import { fuelLabel } from '../../core/economy/fuel.ts';
import { formatDuration, formatInt, formatRate } from './theme.ts';

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
  /** Kopalnia metalu (etap 3 kompleksu): megakonstrukt zamiast megakompleksu. */
  construct?: { view: () => MetalConstructView; start: () => ActionMessage; cancel: () => ActionMessage };
  /** Megakonstrukt na orbicie (krok 3b): wyrzucenie tego konstruktu i ściągnięcie konstruktów z orbity tutaj. */
  orbit?: { view: () => OrbitView; launch: () => ActionMessage; cancel: () => ActionMessage; land: (index: number) => ActionMessage };
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
      <div class="cp-construct-box" hidden>
        <h3 class="ap-head">Megakonstrukt</h3>
        <p class="tp-hint cp-construct"></p>
        <div class="tp-actions"><button type="button" class="tp-primary cp-construct-go"></button></div>
        <p class="tp-hint cp-orbit" hidden></p>
        <div class="tp-actions cp-orbit-actions" hidden></div>
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
  // Megakonstrukt kopalni metalu (etap 3): budowa na placu, kopalnia pracuje; zastępuje megakompleks.
  if (options.construct) {
    megaBox.hidden = true;
    const box = q<HTMLElement>('.cp-construct-box');
    box.hidden = false;
    const cv = options.construct.view();
    const go = q<HTMLButtonElement>('.cp-construct-go');
    const costText = `${formatInt(cv.cost.metal)} metalu · ${formatInt(cv.cost.crystal)} kryształów`;
    const crystal = cv.kind === 'crystal';
    const crater = cv.crater
      ? `Lej: etap ${cv.crater.stage} z 4${cv.crater.stage === 4 ? ' — sięga jądra planety' : ''} · ${cv.crater.fields} pól zajętych na zawsze.`
      : '';
    q('.cp-construct').textContent = crystal
      ? cv.built
        ? `Działa: wiertnica wisi na linach nad lejem i drąży ku jądru. Premia +${cv.bonus}% całego budynku i znaleziska (pojawiają się w leju). Lej rośnie z wydobyciem złoża — co ćwierć drogi do wyczerpania o etap.\n${crater}`
        : cv.building
          ? `Wiertnica w budowie — gotowa za ${formatDuration(cv.building.secondsLeft)} (${Math.round(cv.building.progress * 100)}%). Ekstraktor pracuje; potem nad jego obszarem zacznie się lej.\n${crater}`
          : `Od Ekstraktora poz. 40 nad jego obszarem staje wiertnica na linach: +${cv.bonus}% całego budynku i znaleziska. Drąży lej, który rośnie z wydobyciem aż do jądra planety i zostaje na zawsze — jego pól nie da się zabudować.\n` +
            `Koszt: ${costText} · budowa ${formatDuration(cv.seconds)} (ekstraktor pracuje).` +
            (cv.crater?.left ? `\nZostał tu lej po poprzedniej wiertnicy (${crater.toLowerCase()}) — nowa wiertnica drąży go dalej.` : '') +
            (cv.legacyMega ? `\nDawny megakompleks działa do czasu zbudowania wiertnicy.` : '') +
            (cv.reason ? `\n${cv.reason}` : '')
      : cv.built
      ? `Działa: kompleks w układzie promienistym — 4 fabryki na ramionach, pasy do konstruktu. Premia +${cv.bonus}% całego budynku i znaleziska. Nie da się go przenieść inaczej niż przez orbitę (niżej).`
      : cv.building
        ? `W budowie na placu — gotowy za ${formatDuration(cv.building.secondsLeft)} (${Math.round(cv.building.progress * 100)}%). Kopalnia pracuje; po ukończeniu osady przejdą w układ promienisty.`
        : `Po komplecie 4 osad (poz. 40) na placu w środku powstaje megakonstrukt: +${cv.bonus}% całego budynku i znaleziska; osady przechodzą w układ promienisty.\n` +
          `Koszt: ${costText} · budowa ${formatDuration(cv.seconds)} (kopalnia pracuje).` +
          (cv.legacyMega ? `\nDawny megakompleks działa do czasu zbudowania konstruktu.` : '') +
          (cv.displaced > 0 ? `\nUwaga: ${cv.displaced} pól innych budynków leży na miejscu układu promienistego — po ukończeniu te budynki przeniosą się obok (poziom bez zmian).` : '') +
          (cv.reason ? `\n${cv.reason}` : '');
    // Orbita (krok 3b): wyrzucenie gotowego konstruktu, a na komplecie osad — ściągnięcie konstruktów z orbity.
    const orbit = options.orbit?.view();
    const orbitText = q<HTMLElement>('.cp-orbit');
    const orbitRow = q<HTMLElement>('.cp-orbit-actions');
    const armedButton = (label: string, style: string, run: () => ActionMessage) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = style;
      b.textContent = label;
      let armed = false;
      b.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          b.textContent = 'Na pewno?';
          return;
        }
        act(run)();
      });
      return b;
    };
    if (orbit && options.orbit) {
      const o = options.orbit;
      const lines: string[] = [];
      if (cv.built && orbit.launch.preparing) {
        lines.push(`Przygotowanie do startu na orbitę — ${formatDuration(orbit.launch.preparing.secondsLeft)}. ${crystal ? 'Wiertnica nie daje teraz premii; po starcie zostanie lej.' : 'Konstrukt nie daje teraz premii; po starcie zostaną osady.'}`);
        orbitRow.append(armedButton('Anuluj start', 'tp-secondary', o.cancel));
      } else if (cv.built) {
        lines.push(
          (crystal
            ? `Wyrzuć na orbitę: przygotowanie ${formatDuration(orbit.launch.prepareSeconds)} (bez premii), ${fuelLabel(orbit.launch.fuel)}. Na planecie zostanie lej (na zawsze); wiertnicę ściągniesz potem nad Ekstraktor poz. 40 innej planety.`
            : `Wyrzuć na orbitę: przygotowanie ${formatDuration(orbit.launch.prepareSeconds)} (bez premii), ${fuelLabel(orbit.launch.fuel)}. Na planecie zostaną 4 osady z pustym placem; konstrukt ściągniesz potem na inną planetę z kompletem osad.`) + (orbit.launch.reason ? `\n${orbit.launch.reason}` : ''),
        );
        const b = armedButton('Wyrzuć na orbitę', 'tp-secondary', o.launch);
        b.disabled = !!orbit.launch.reason;
        orbitRow.append(b);
      } else if (orbit.incoming) {
        lines.push(`${crystal ? 'Wiertnica' : 'Megakonstrukt'} z orbity ${orbit.incoming.originName} ląduje tutaj za ${formatDuration(orbit.incoming.secondsLeft)}.`);
      } else if (orbit.inOrbit.length > 0) {
        const what = crystal ? 'wiertnica kryształów' : 'megakonstrukt';
        if (orbit.landingReason) lines.push(`Na orbicie czeka ${what} (${orbit.inOrbit.length}). ${orbit.landingReason}`);
        else {
          lines.push(`Na orbicie czeka ${what} — możesz ${crystal ? 'ją' : 'go'} ściągnąć tutaj zamiast budować now${crystal ? 'ą' : 'y'}:`);
          for (const k of orbit.inOrbit.slice(0, 3)) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'tp-primary';
            b.textContent = `Ściągnij z orbity ${k.originName} · ${formatDuration(k.seconds)} · ${fuelLabel(k.fuel)} · ${k.risk}`;
            b.addEventListener('click', act(() => o.land(k.index)));
            orbitRow.append(b);
          }
        }
      }
      orbitText.textContent = lines.join('\n');
      orbitText.hidden = lines.length === 0;
      orbitRow.hidden = orbitRow.childElementCount === 0;
    }
    if (cv.built) go.hidden = true;
    else if (cv.building) {
      go.textContent = 'Anuluj budowę';
      go.className = 'tp-secondary cp-construct-go';
      let armed = false;
      go.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          go.textContent = 'Na pewno?';
          return;
        }
        act(options.construct!.cancel)();
      });
    } else {
      go.textContent = crystal ? 'Zbuduj wiertnicę' : 'Zbuduj megakonstrukt';
      go.disabled = !!cv.reason;
      go.addEventListener('click', act(options.construct.start));
    }
    // Wysyłka megakompleksu metalu tylko dla dawnego megakompleksu (konstrukt — wyrzucenie na orbitę, krok 3b).
    q<HTMLElement>('.cp-transfer-row').hidden = !cv.legacyMega;
  }
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
