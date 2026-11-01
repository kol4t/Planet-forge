// Plansza „Imperium gwiezdne” (etap 8, decyzja właściciela): jednorazowe okno SI Matki po zamknięciu pętli —
// krótki tekst i lista odblokowań. Teksty robocze (lore: O-002 — nazwa „imperium”). Wygląd: #text-panel w index.html.

export interface StellarBoardOptions {
  /** Nazwy wyeksploatowanych planet (pierwsze trzy zamykają pętlę). */
  planets: string[];
  /** Miejsca na planety po odblokowaniu. */
  slots: number;
  onClose: () => void;
}

export function openStellarBoard(options: StellarBoardOptions): () => void {
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box fb-box" role="dialog" aria-modal="true" aria-labelledby="st-title">
      <p class="tp-hint" style="margin:0 0 4px;letter-spacing:.12em;text-transform:uppercase;font-size:12px">SI Matka · rozdział zamknięty</p>
      <h2 id="st-title">Imperium gwiezdne</h2>
      <p class="tp-hint st-text"></p>
      <ul class="tp-hint st-list" style="padding-left:20px;margin:0 0 8px"></ul>
      <p class="tp-hint st-next"></p>
      <div class="tp-actions"><button type="button" class="tp-primary">Dalej</button></div>
    </div>`;
  const names = options.planets.slice(0, 3).join(', ');
  root.querySelector('.st-text')!.textContent =
    `Trzy światy — ${names} — oddały większość swoich złóż, a stacja macierzysta łączy je w jedno imperium. ` +
    'Ten rozdział jest zamknięty. Czas sięgnąć dalej.';
  const list = root.querySelector('.st-list')!;
  for (const line of [
    `Miejsca na planety: teraz ${options.slots} — możesz zakładać kolejne kolonie.`,
    'Stacja macierzysta pozostaje węzłem imperium: magazyn orbitalny, stocznia i transport.',
    'Licznik wyeksploatowanych planet liczy dalej — widać go w „Imperium”.',
  ]) {
    const li = document.createElement('li');
    li.textContent = line;
    list.append(li);
  }
  root.querySelector('.st-next')!.textContent = 'Wpis o zamknięciu pętli jest w Dzienniku (Imperium → Dziennik).';
  const close = () => {
    root.remove();
    options.onClose();
  };
  root.querySelector('.tp-primary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.body.append(root);
  return close;
}
