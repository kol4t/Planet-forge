// Okno „Pas asteroid” (v0.37): stacja wydobywcza w układzie aktywnej planety — stan, urobek,
// koszt kolejnego poziomu i przycisk budowy. Wygląd: #text-panel w index.html.
import type { ActionMessage, AsteroidView } from '../../app/GameController.ts';
import { formatDuration, formatInt, formatRate } from './theme.ts';

export interface AsteroidPanelOptions {
  planetName: string;
  view: () => AsteroidView;
  upgrade: () => ActionMessage;
  onDone: (message: string) => void;
}

export function openAsteroidPanel(options: AsteroidPanelOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box" role="dialog" aria-modal="true" aria-labelledby="ap-title">
      <h2 id="ap-title">Pas asteroid</h2>
      <p class="tp-hint ap-status"></p>
      <p class="tp-hint ap-next"></p>
      <p class="tp-error" hidden></p>
      <div class="tp-actions">
        <button type="button" class="tp-secondary">Zamknij</button>
        <button type="button" class="tp-primary"></button>
      </div>
    </div>`;
  const close = () => root.remove();
  const status = root.querySelector<HTMLElement>('.ap-status')!;
  const next = root.querySelector<HTMLElement>('.ap-next')!;
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const action = root.querySelector<HTMLButtonElement>('.tp-primary')!;
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
    if (blocker) {
      error.textContent = blocker;
      error.hidden = false;
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
  render();
  document.body.append(root);
  return close;
}
