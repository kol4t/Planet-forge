// Okno „Wyślij konstrukt” (v0.56, decyzja właściciela): megakompleks rozkładany do lotu ~30 min (nie pracuje), potem
// lot na wybraną kolonię za paliwo i surowce; na celu staje z tym samym poziomem. W czasie rozkładania — stan
// i „Anuluj wysyłkę” (zwrot kosztu i paliwa). Wygląd: #text-panel w index.html.
import type { ActionMessage, TransferView } from '../../app/GameController.ts';
import { fuelLabel } from '../../core/economy/fuel.ts';
import { formatDuration, formatInt } from './theme.ts';

export interface ConstructTransferOptions {
  name: string;
  view: () => TransferView;
  send: (to: string, escort: number) => ActionMessage;
  cancel: () => ActionMessage;
  onDone: (message: string) => void;
}

export function openConstructTransferPanel(options: ConstructTransferOptions): () => void {
  const v = options.view();
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box tr-box" role="dialog" aria-modal="true" aria-labelledby="ct-title">
      <h2 id="ct-title"></h2>
      <p class="tp-hint ct-about"></p>
      <label class="tr-row ct-target"><span class="tr-label">Dokąd</span><select></select></label>
      <p class="tp-hint ct-route"></p>
      <p class="tp-hint ct-energy"></p>
      <div class="tr-row ct-escort" hidden><span class="tr-label">Eskorta (okręty)</span><span class="tr-value ct-escort-value"></span>
        <div class="fb-kinds" style="grid-column: 1 / -1"><button type="button" data-escort="-1">−</button><button type="button" data-escort="1">+</button></div></div>
      <p class="tp-error" hidden></p>
      <div class="tp-actions">
        <button type="button" class="tp-secondary ct-close">Zamknij</button>
        <button type="button" class="tp-primary ct-send">Wyślij konstrukt</button>
      </div>
    </div>`;
  const close = () => root.remove();
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const error = q<HTMLElement>('.tp-error');
  const send = q<HTMLButtonElement>('.ct-send');
  const select = q<HTMLSelectElement>('.ct-target select');
  const showError = (text: string) => {
    error.textContent = text;
    error.hidden = false;
  };
  q('#ct-title').textContent = `Wyślij konstrukt — ${options.name}`;
  const cost = `${formatInt(v.cost.metal)} metalu · ${formatInt(v.cost.crystal)} kryształów`;
  q('.ct-about').textContent =
    `${options.name} (poz. ${v.level}) zostanie rozłożony do lotu — przez ${formatDuration(v.prepareSeconds)} nie pracuje, ` +
    `potem leci na wybraną kolonię i staje tam z tym samym poziomem i megakompleksem. Tutaj zostaną puste pola. ` +
    `Koszt rozłożenia: ${cost} (od razu). Anulowanie przed odlotem zwraca koszt i paliwo.`;

  if (v.packing) {
    // Trwa rozkładanie: tylko stan i anulowanie (drugie dotknięcie potwierdza).
    q<HTMLElement>('.ct-target').hidden = true;
    q('.ct-route').textContent = `Rozkładanie do lotu na ${v.packing.toName} — odlot za ${formatDuration(v.packing.secondsLeft)}.`;
    send.textContent = 'Anuluj wysyłkę';
    let armed = false;
    send.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        send.textContent = 'Na pewno?';
        return;
      }
      const result = options.cancel();
      if (!result.ok) return showError(result.message);
      close();
      options.onDone(result.message);
    });
  } else {
    select.innerHTML = v.targets.map((_, i) => `<option value="${i}"></option>`).join('');
    v.targets.forEach((t, i) => {
      select.options[i]!.textContent = `${t.name} — ${t.available >= t.needed ? 'zmieści się' : 'za mało miejsca'}`;
    });
    const target = () => v.targets[Number(select.value) || 0];
    const route = () => {
      const t = target();
      error.hidden = true;
      if (!t) {
        q('.ct-route').textContent = '';
        send.disabled = true;
        return;
      }
      q('.ct-route').textContent =
        `Lot ${formatDuration(t.seconds)} · ${fuelLabel(t.fuel)} · pola: potrzeba ${t.needed} obok siebie, wolnych ${t.available}` +
        (t.replaces > 0 ? ` · zastąpi budynek poz. ${t.replaces}` : '');
      // Konstrukt zużywa dużo energii — ostrzeżenie, gdy na celu jej zabraknie (wysłać i tak można).
      const energy = q<HTMLElement>('.ct-energy');
      energy.className = t.energy < 1 ? 'tp-error ct-energy' : 'tp-hint ct-energy';
      energy.textContent =
        t.energy < 1
          ? `Uwaga: na ${t.name} zabraknie energii — po lądowaniu ${Math.round(t.energy * 100)}% potrzeb. Najpierw rozbuduj tam Elektrownię.`
          : `Energia na ${t.name} po lądowaniu wystarczy.`;
      send.disabled = !!v.reason;
      if (v.reason) showError(v.reason);
      else if (t.available < t.needed) showError(`Na ${t.name} brakuje miejsca — zwolnij pola (np. zburz budynek) albo wybierz inną planetę.`);
    };
    select.addEventListener('change', route);
    route();
    // Eskorta (v0.58) leci z konstruktem; ochrona działa od etapu ryzyka misji.
    let escort = 0;
    if (v.escorts > 0) {
      q<HTMLElement>('.ct-escort').hidden = false;
      const show = () => (q('.ct-escort-value').textContent = `${escort} z ${v.escorts}`);
      for (const b of root.querySelectorAll<HTMLButtonElement>('[data-escort]')) {
        b.addEventListener('click', () => {
          escort = Math.max(0, Math.min(v.escorts, escort + Number(b.dataset.escort)));
          show();
        });
      }
      show();
    }
    send.addEventListener('click', () => {
      const t = target();
      if (!t) return;
      const result = options.send(t.address, escort);
      if (!result.ok) return showError(result.message);
      close();
      options.onDone(result.message);
    });
  }
  q('.ct-close').addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.body.append(root);
  return close;
}
