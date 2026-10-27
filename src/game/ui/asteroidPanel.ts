// Okno „Wydobycie w kosmosie” (v0.37, v0.37.1): stacja na pasie asteroid układu aktywnej planety
// (stan, urobek, koszt kolejnego poziomu) i holownik po kometę. Wygląd: #text-panel w index.html.
import type { ActionMessage, AsteroidView, GameController } from '../../app/GameController.ts';
import { formatDuration, formatInt, formatRate } from './theme.ts';

export interface AsteroidPanelOptions {
  planetName: string;
  view: () => AsteroidView;
  upgrade: () => ActionMessage;
  comet: () => ReturnType<GameController['cometView']>;
  launchComet: () => ActionMessage;
  onDone: (message: string) => void;
}

export function openAsteroidPanel(options: AsteroidPanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box" role="dialog" aria-modal="true" aria-labelledby="ap-title">
      <h2 id="ap-title">Wydobycie w kosmosie</h2>
      <h3 class="ap-head">Pas asteroid</h3>
      <p class="tp-hint ap-status"></p>
      <p class="tp-hint ap-next"></p>
      <p class="tp-error" hidden></p>
      <div class="tp-actions"><button type="button" class="tp-primary ap-belt"></button></div>
      <h3 class="ap-head">Kometa</h3>
      <p class="tp-hint ap-comet"></p>
      <p class="tp-error ap-comet-error" hidden></p>
      <div class="tp-actions"><button type="button" class="tp-primary ap-launch"></button></div>
      <div class="tp-actions"><button type="button" class="tp-secondary">Zamknij</button></div>
    </div>`;
  const close = () => root.remove();
  const status = root.querySelector<HTMLElement>('.ap-status')!;
  const next = root.querySelector<HTMLElement>('.ap-next')!;
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const action = root.querySelector<HTMLButtonElement>('.ap-belt')!;
  const cometText = root.querySelector<HTMLElement>('.ap-comet')!;
  const cometError = root.querySelector<HTMLElement>('.ap-comet-error')!;
  const launch = root.querySelector<HTMLButtonElement>('.ap-launch')!;
  const perHour = (perMinute: number) => formatInt(perMinute * 60);

  const render = () => {
    const v = options.view();
    let blocker: string | null = null;
    if (!v.unlocked) blocker = 'Najpierw zbadaj „Górnictwo asteroid” (Badania → Stacja i handel).';
    else if (!v.hasBelt) blocker = 'W układzie tej planety nie ma pasa asteroid. Pas ma mniej więcej co drugi układ — na mapie układu widać go jako pierścień okruchów.';
    else if (v.takenBy) blocker = `Na tym pasie stoi już stacja planety ${v.takenBy} — jeden pas, jedna stacja.`;
    if (v.target === 0) {
      status.textContent = `${options.planetName}: brak stacji. Stacja wydobywa metal i kryształy z pasa i wysyła je prosto do magazynu planety — bez zużywania jej złóż i bez energii.`;
    } else {
      const building = v.target > v.level ? ` · rozbudowa do poz. ${v.target}: ${formatDuration(v.secondsLeft)}` : '';
      status.textContent =
        `Stacja poz. ${v.level}${building}\n` +
        (v.level > 0 ? `Urobek: +${perHour(v.output.metal)} metalu/h, +${perHour(v.output.crystal)} kryształów/h (${formatRate(v.output.metal)}/min metalu).` : 'Pierwszy poziom jeszcze się buduje.');
    }
    const max = v.target >= v.maxLevel;
    const busy = v.target > v.level;
    if (max) next.textContent = `Najwyższy poziom (${v.maxLevel}).`;
    else {
      const n = v.target + 1;
      next.textContent =
        `Poziom ${n}: +${perHour(v.nextOutput.metal)} metalu/h, +${perHour(v.nextOutput.crystal)} kryształów/h\n` +
        `Koszt: ${formatInt(v.nextCost.metal)} metalu · ${formatInt(v.nextCost.crystal)} kryształów · ${formatDuration(v.nextSeconds)}`;
    }
    action.textContent = max ? 'Najwyższy poziom' : busy ? 'Trwa rozbudowa' : v.target === 0 ? 'Zbuduj stację' : `Rozbuduj do poz. ${v.target + 1}`;
    action.disabled = max || busy || blocker !== null;
    // Bez pasa w układzie: tylko wyjaśnienie (bez kosztów i przycisku stacji).
    next.hidden = !v.hasBelt;
    action.parentElement!.hidden = !v.hasBelt;
    if (!v.hasBelt) status.textContent = 'Stacja wydobywcza stoi na pasie asteroid w układzie Twojej planety i wysyła metal i kryształy do jej magazynu.';
    if (blocker) {
      error.textContent = blocker;
      error.hidden = false;
    }
    // Holownik po kometę: działa w każdym układzie (także bez pasa).
    const c = options.comet();
    const range = (id: 'metal' | 'crystal') => `${formatInt(c.cargoMin[id])}–${formatInt(c.cargoMax[id])}`;
    cometText.textContent = c.flying
      ? `Holownik w drodze — wróci za ${formatDuration(c.flying.secondsLeft)} z ${formatInt(c.flying.cargo.metal)} metalu i ${formatInt(c.flying.cargo.crystal)} kryształów.`
      : `Holownik przyciąga przelatującą kometę — w każdym układzie, także bez pasa. Lot ${Math.round(c.seconds / 60)} min, przywozi ${range('metal')} metalu i ${range('crystal')} kryształów.\nKoszt: ${formatInt(c.cost.metal)} metalu · ${formatInt(c.cost.crystal)} kryształów.`;
    launch.textContent = c.flying ? 'Holownik w drodze' : 'Wyślij holownik';
    launch.disabled = !!c.flying || !c.unlocked;
    if (!c.unlocked) {
      cometError.textContent = 'Najpierw zbadaj „Przechwyt komet” (Badania → Stacja i handel).';
      cometError.hidden = false;
    }
  };

  root.querySelector('.tp-secondary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  action.addEventListener('click', () => {
    const result = options.upgrade();
    if (!result.ok) {
      error.textContent = result.message;
      error.hidden = false;
      return;
    }
    close();
    options.onDone(result.message);
  });
  launch.addEventListener('click', () => {
    const result = options.launchComet();
    if (!result.ok) {
      cometError.textContent = result.message;
      cometError.hidden = false;
      return;
    }
    close();
    options.onDone(result.message);
  });
  render();
  document.body.append(root);
  return close;
}
