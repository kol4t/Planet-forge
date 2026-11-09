// Okno „Wyślij surowce” (v0.36): suwaki metalu i kryształów, ładowność, czas lotu.
// Wysyła z aktywnej planety do wybranej; v0.55 — także na stację macierzystą i ze stacji (wybór planety, `targets`).
// Wygląd: #text-panel w index.html.
import type { ActionMessage, TransportView } from '../../app/GameController.ts';
import type { CargoFleet, CargoShip, Resources } from '../../core/types.ts';
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
  /** Wysyłka z liczbą okrętów eskorty (v0.58) i składem statków (krok 2d-2; brak — jeden transportowiec). */
  send: (cargo: Resources, escort: number, ships?: CargoFleet) => ActionMessage;
  /** Statki ładunkowe do wyboru (krok 2d-2): na stanie, ładowność, tempo, paliwo; konwój po badaniu. */
  cargo?: { ships: { type: CargoShip; name: string; docked: number; capacity: number; time: number; fuel: number }[]; convoy: boolean; convoyMax: number };
  /** Opis ryzyka piratów na trasie z daną eskortą (etap 7), np. „ryzyko piratów 15%”. */
  risk?: (escort: number) => string;
  /** Kilka możliwych celów (lot ze stacji): wybór z listy, każdy z własnym czasem, paliwem i wysyłką. */
  targets?: { name: string; seconds: number; fuel: number; send: (cargo: Resources, escort: number, ships?: CargoFleet) => ActionMessage; risk?: (escort: number) => string }[];
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
      <p class="tp-hint tr-risk" hidden></p>
      <label class="tr-row"><span class="tr-label">Metal</span><span class="tr-value" data-for="metal"></span>
        <input type="range" min="0" step="1" data-res="metal" /></label>
      <label class="tr-row"><span class="tr-label">Kryształy</span><span class="tr-value" data-for="crystal"></span>
        <input type="range" min="0" step="1" data-res="crystal" /></label>
      <div class="tr-ships" hidden></div>
      <div class="tr-row tr-escort" hidden><span class="tr-label">Eskorta (okręty)</span><span class="tr-value tr-escort-value">0</span>
        <div class="fb-kinds" style="grid-column: 1 / -1"><button type="button" data-escort="-1">−</button><button type="button" data-escort="1">+</button></div></div>
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
  const targets = options.targets ?? [{ name: options.toName, seconds: options.seconds, fuel: options.fuel, send: options.send, risk: options.risk }];
  const select = root.querySelector<HTMLSelectElement>('.tr-target select')!;
  if (options.targets) {
    root.querySelector<HTMLElement>('.tr-target')!.hidden = false;
    select.innerHTML = targets.map((_, i) => `<option value="${i}"></option>`).join('');
    targets.forEach((t, i) => (select.options[i]!.textContent = t.name));
  }
  const target = () => targets[Number(select.value) || 0]!;
  // Skład lotu (krok 2d-2): jeden statek wybranego typu albo konwój (po badaniu „Konwoje”).
  const kinds = (options.cargo?.ships ?? []).filter((k) => k.type === 'transport' || k.docked > 0);
  const fleet: CargoFleet = { transport: 1 };
  const count = () => kinds.reduce((n, k) => n + (fleet[k.type] ?? 0), 0);
  const capacity = (): number => (options.cargo ? kinds.reduce((n, k) => n + (fleet[k.type] ?? 0) * k.capacity, 0) : transport.capacity);
  const timeFactor = () => Math.max(1e-6, ...kinds.filter((k) => (fleet[k.type] ?? 0) > 0).map((k) => k.time), kinds.length ? 0 : 1);
  const fuelFactor = () => Math.max(1, kinds.reduce((n, k) => n + (fleet[k.type] ?? 0) * k.fuel, 0));
  const route = () => {
    const t = target();
    const seconds = options.cargo ? t.seconds * timeFactor() : t.seconds;
    const fuel = options.cargo ? Math.round(t.fuel * fuelFactor() * 10) / 10 : t.fuel;
    root.querySelector('.tr-route')!.textContent =
      `${options.fromName} → ${t.name} · lot ${formatDuration(seconds)} · ${fuelLabel(fuel)} · ` +
        `transportowce: w drodze ${transport.active}, wolne ${transport.maxActive - transport.active}`;
  };
  // Ryzyko piratów (etap 7): odświeżane przy zmianie celu i eskorty.
  let escort = 0;
  const riskLine = root.querySelector<HTMLElement>('.tr-risk')!;
  const risk = () => {
    const text = target().risk?.(escort);
    riskLine.hidden = !text;
    if (!text) return;
    const safe = /bez ryzyka/.test(text);
    riskLine.textContent =
      text[0]!.toUpperCase() + text.slice(1) +
      (safe ? '.' : transport.escorts > 0 ? ' — każdy okręt eskorty zmniejsza ryzyko.' : ' — eskorta zmniejsza ryzyko (okręty buduje stocznia: Imperium → Flota).');
  };
  select.addEventListener('change', () => {
    route();
    risk();
  });
  route();
  risk();

  const showError = (text: string) => {
    error.textContent = text;
    error.hidden = false;
  };

  // Eskorta (v0.58): ile okrętów leci z transportem — od etapu 7 zmniejsza ryzyko przechwycenia.
  if (transport.escorts > 0) {
    root.querySelector<HTMLElement>('.tr-escort')!.hidden = false;
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-escort]')) {
      b.addEventListener('click', () => {
        escort = Math.max(0, Math.min(transport.escorts, escort + Number(b.dataset.escort)));
        root.querySelector('.tr-escort-value')!.textContent = `${escort} z ${transport.escorts}`;
        risk();
      });
    }
    root.querySelector('.tr-escort-value')!.textContent = `0 z ${transport.escorts}`;
  }

  // Wybór statków (pokazany, gdy jest coś poza transportowcem albo konwoje).
  const shipsBox = root.querySelector<HTMLElement>('.tr-ships')!;
  const renderShips = () => {
    shipsBox.innerHTML = kinds
      .map(
        (k) =>
          `<div class="tr-row"><span class="tr-label">${k.name}</span><span class="tr-value">${fleet[k.type] ?? 0} z ${k.docked}</span>` +
          `<div class="fb-kinds" style="grid-column: 1 / -1"><button type="button" data-ship="${k.type}" data-d="-1">−</button><button type="button" data-ship="${k.type}" data-d="1">+</button></div></div>`,
      )
      .join('') + `<p class="tp-hint">${options.cargo!.convoy ? `Konwój: do ${options.cargo!.convoyMax} statków — ładunek się sumuje, lot w tempie najwolniejszego, ryzyko liczone raz.` : 'Jeden statek na lot (konwoje — badanie stacji „Konwoje”).'}</p>`;
    for (const b of shipsBox.querySelectorAll<HTMLButtonElement>('[data-ship]')) {
      b.addEventListener('click', () => {
        const type = b.dataset.ship as CargoShip;
        const d = Number(b.dataset.d);
        if (!options.cargo!.convoy) {
          // Bez konwojów: jeden statek — „+” przełącza na ten typ.
          if (d > 0) for (const k of kinds) fleet[k.type] = k.type === type ? 1 : 0;
        } else {
          const k = kinds.find((x) => x.type === type)!;
          const next = Math.max(0, Math.min(k.docked, (fleet[type] ?? 0) + d));
          if (d > 0 && count() >= options.cargo!.convoyMax) return;
          if (d < 0 && count() <= 1) return;
          fleet[type] = next;
        }
        renderShips();
        limits();
        route();
      });
    }
  };
  const limits = () => {
    for (const id of ['metal', 'crystal'] as const) {
      sliders[id].max = String(Math.max(0, Math.min(Math.floor(stock[id]), capacity(), Math.floor(options.room?.[id] ?? Infinity))));
      if (Number(sliders[id].value) > Number(sliders[id].max)) sliders[id].value = sliders[id].max;
    }
    update();
  };
  if (options.cargo && (kinds.length > 1 || options.cargo.convoy)) {
    shipsBox.hidden = false;
    renderShips();
  }

  const cargo = (): Resources => ({ metal: Number(sliders.metal.value), crystal: Number(sliders.crystal.value) });
  const update = (changed?: keyof Resources) => {
    // Suma nie może przekroczyć ładowności — przesunięcie jednego suwaka zmniejsza drugi.
    const c = cargo();
    if (changed && c.metal + c.crystal > capacity()) {
      const other: keyof Resources = changed === 'metal' ? 'crystal' : 'metal';
      sliders[other].value = String(Math.max(0, capacity() - c[changed]));
    }
    const now = cargo();
    values.metal.textContent = formatInt(now.metal);
    values.crystal.textContent = formatInt(now.crystal);
    root.querySelector('.tr-load')!.textContent = `Ładunek ${formatInt(now.metal + now.crystal)} z ${formatInt(capacity())}`;
    sendButton.disabled = now.metal + now.crystal <= 0;
  };
  for (const id of ['metal', 'crystal'] as const) {
    sliders[id].max = String(Math.max(0, Math.min(Math.floor(stock[id]), capacity(), Math.floor(options.room?.[id] ?? Infinity))));
    sliders[id].value = '0';
    sliders[id].addEventListener('input', () => update(id));
  }
  for (const b of root.querySelectorAll<HTMLButtonElement>('[data-quick]')) {
    b.addEventListener('click', () => {
      const share = Number(b.dataset.quick);
      // Po równo z obu surowców, w granicach zapasu i ładowności.
      const half = Math.floor(capacity() / 2);
      const avail = { metal: Math.min(Number(sliders.metal.max), Math.floor(stock.metal * share)), crystal: Math.min(Number(sliders.crystal.max), Math.floor(stock.crystal * share)) };
      let metal = Math.min(avail.metal, share === 0 ? 0 : half);
      let crystal = Math.min(avail.crystal, share === 0 ? 0 : half);
      if (share > 0) {
        const room = capacity() - metal - crystal;
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
    const result = target().send(cargo(), escort, options.cargo ? { ...fleet } : undefined);
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
  } else if (transport.active >= transport.maxActive && !kinds.some((k) => k.type !== 'transport' && k.docked > 0)) {
    showError(
      transport.maxActive === 0
        ? 'Brak transportowca we flocie — zbuduj go w stoczni (Imperium → Flota).'
        : `Wszystkie transportowce są w drodze (${transport.active}) — zbuduj kolejny (Imperium → Flota) albo poczekaj na powrót.`,
    );
  }
  update();
  document.body.append(root);
  return close;
}
