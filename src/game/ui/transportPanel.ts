// Okno „Wyślij surowce” (v0.36): suwaki metalu i kryształów, ładowność, czas lotu.
// Wysyła z aktywnej planety do wybranej; v0.55 — także na stację macierzystą i ze stacji (wybór planety, `targets`).
// Wygląd: #text-panel w index.html.
import type { ActionMessage, TransportView } from '../../app/GameController.ts';
import type { Resources } from '../../core/types.ts';
import { fuelLabel } from '../../core/economy/fuel.ts';
import { formatDuration, formatInt } from './theme.ts';

export interface TransportPanelOptions {
  fromName: string;
  toName: string;
  stock: Resources;
  transport: TransportView;
  seconds: number;
  /** Paliwo (antymateria) za lot. */
  fuel: number;
  send: (cargo: Resources) => ActionMessage;
  /** Kilka możliwych celów (lot ze stacji): wybór z listy, każdy z własnym czasem, paliwem i wysyłką. */
  targets?: { name: string; seconds: number; fuel: number; send: (cargo: Resources) => ActionMessage }[];
  /** Ile każdego surowca zmieści cel (np. wolne miejsce na stacji); brak — bez limitu. */
  room?: Resources;
  title?: string;
  onSent: (message: string) => void;
}

export function openTransportPanel(options: TransportPanelOptions): () => void {
  const { transport, stock } = options;
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box tr-box" role="dialog" aria-modal="true" aria-labelledby="tr-title">
      <h2 id="tr-title"></h2>
      <label class="tr-row tr-target" hidden><span class="tr-label">Dokąd</span><select></select></label>
      <p class="tp-hint tr-route"></p>
      <label class="tr-row"><span class="tr-label">Metal</span><span class="tr-value" data-for="metal"></span>
        <input type="range" min="0" step="1" data-res="metal" /></label>
      <label class="tr-row"><span class="tr-label">Kryształy</span><span class="tr-value" data-for="crystal"></span>
        <input type="range" min="0" step="1" data-res="crystal" /></label>
      <div class="fb-kinds tr-quick">
        <button type="button" data-quick="0">Zeruj</button>
        <button type="button" data-quick="0.5">Połowa</button>
        <button type="button" data-quick="1">Ile się zmieści</button>
      </div>
      <p class="tp-hint tr-load"></p>
      <p class="tp-error" hidden></p>
      <div class="tp-actions">
        <button type="button" class="tp-secondary">Anuluj</button>
        <button type="button" class="tp-primary">Wyślij</button>
      </div>
    </div>`;
  const close = () => root.remove();
  const error = root.querySelector<HTMLElement>('.tp-error')!;
  const sendButton = root.querySelector<HTMLButtonElement>('.tp-primary')!;
  const sliders = {
    metal: root.querySelector<HTMLInputElement>('input[data-res="metal"]')!,
    crystal: root.querySelector<HTMLInputElement>('input[data-res="crystal"]')!,
  };
  const values = {
    metal: root.querySelector<HTMLElement>('[data-for="metal"]')!,
    crystal: root.querySelector<HTMLElement>('[data-for="crystal"]')!,
  };
  root.querySelector('#tr-title')!.textContent = options.title ?? 'Wyślij surowce';
  const targets = options.targets ?? [{ name: options.toName, seconds: options.seconds, fuel: options.fuel, send: options.send }];
  const select = root.querySelector<HTMLSelectElement>('.tr-target select')!;
  if (options.targets) {
    root.querySelector<HTMLElement>('.tr-target')!.hidden = false;
    select.innerHTML = targets.map((_, i) => `<option value="${i}"></option>`).join('');
    targets.forEach((t, i) => (select.options[i]!.textContent = t.name));
  }
  const target = () => targets[Number(select.value) || 0]!;
  const route = () => {
    const t = target();
    root.querySelector('.tr-route')!.textContent =
      `${options.fromName} → ${t.name} · lot ${formatDuration(t.seconds)} · ${fuelLabel(t.fuel)} · ` +
      `w drodze ${transport.active} z ${transport.maxActive} transportowców`;
  };
  select.addEventListener('change', route);
  route();

  const showError = (text: string) => {
    error.textContent = text;
    error.hidden = false;
  };

  const cargo = (): Resources => ({ metal: Number(sliders.metal.value), crystal: Number(sliders.crystal.value) });
  const update = (changed?: keyof Resources) => {
    // Suma nie może przekroczyć ładowności — przesunięcie jednego suwaka zmniejsza drugi.
    const c = cargo();
    if (changed && c.metal + c.crystal > transport.capacity) {
      const other: keyof Resources = changed === 'metal' ? 'crystal' : 'metal';
      sliders[other].value = String(Math.max(0, transport.capacity - c[changed]));
    }
    const now = cargo();
    values.metal.textContent = formatInt(now.metal);
    values.crystal.textContent = formatInt(now.crystal);
    root.querySelector('.tr-load')!.textContent = `Ładunek ${formatInt(now.metal + now.crystal)} z ${formatInt(transport.capacity)}`;
    sendButton.disabled = now.metal + now.crystal <= 0;
  };
  for (const id of ['metal', 'crystal'] as const) {
    sliders[id].max = String(Math.max(0, Math.min(Math.floor(stock[id]), transport.capacity, Math.floor(options.room?.[id] ?? Infinity))));
    sliders[id].value = '0';
    sliders[id].addEventListener('input', () => update(id));
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-quick]')) {
    b.addEventListener('click', () => {
      const share = Number(b.dataset.quick);
      // Po równo z obu surowców, w granicach zapasu i ładowności.
      const half = Math.floor(transport.capacity / 2);
      const avail = { metal: Math.min(Number(sliders.metal.max), Math.floor(stock.metal * share)), crystal: Math.min(Number(sliders.crystal.max), Math.floor(stock.crystal * share)) };
      let metal = Math.min(avail.metal, share === 0 ? 0 : half);
      let crystal = Math.min(avail.crystal, share === 0 ? 0 : half);
      if (share > 0) {
        const room = transport.capacity - metal - crystal;
        const moreMetal = Math.min(room, avail.metal - metal);
        metal += moreMetal;
        crystal += Math.min(room - moreMetal, avail.crystal - crystal);
      }
      sliders.metal.value = String(metal);
      sliders.crystal.value = String(crystal);
      update();
    });
  }

  root.querySelector('.tp-secondary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  sendButton.addEventListener('click', () => {
    const result = target().send(cargo());
    if (!result.ok) {
      showError(result.message);
      return;
    }
    close();
    options.onSent(result.message);
  });

  if (!transport.unlocked) {
    showError('Najpierw zbadaj „Transportowce” (Badania → Flota).');
    for (const s of Object.values(sliders)) s.disabled = true;
  } else if (transport.active >= transport.maxActive) {
    showError(`W drodze jest już ${transport.active} transportowców (limit ${transport.maxActive}).`);
  }
  update();
  document.body.append(root);
  return close;
}
