// Okno „Znaleziska” (v0.43.1): zbiór znalezisk megakompleksów z premiami i terminy następnych.
// Wygląd: #text-panel w index.html (klasy .fd-*).
import type { GameController } from '../../app/GameController.ts';
import { formatDuration } from './theme.ts';

export function openFindsPanel(view: () => ReturnType<GameController['findsView']>): () => void {
  const v = view();
  const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  const root = document.createElement('div');
  root.id = 'text-panel';
  const items = v.items
    .map((i) =>
      i.count > 0
        ? `<li class="fd-item"><div class="fd-top"><b>${esc(i.name)}</b><span class="fd-count">${i.count}/${i.max}</span></div>` +
          `<small>${esc(i.rarity)} · ${esc(i.effect)} za sztukę</small><p>${esc(i.description)}</p></li>`
        : `<li class="fd-item fd-unknown"><div class="fd-top"><b>Nieznane znalezisko</b><span class="fd-count">0/${i.max}</span></div><small>${esc(i.rarity)}</small></li>`,
    )
    .join('');
  const upcoming =
    v.upcoming.length > 0
      ? v.upcoming.map((u) => `${esc(u.name)} (${esc(u.planet)}): następne za ${formatDuration(u.secondsLeft)}`).join('<br>')
      : 'Brak megakompleksów — znaleziska przynoszą tylko głębokie wykopy megakompleksów.';
  root.innerHTML = `
    <div class="tp-box fb-box" role="dialog" aria-modal="true" aria-labelledby="fd-title">
      <h2 id="fd-title">Znaleziska · ${v.total}</h2>
      <p class="tp-hint">Megakompleksy co kilka godzin wydobywają coś niezwykłego — także gdy gra jest zamknięta. Każda sztuka daje stałą premię całemu imperium.</p>
      <p class="tp-hint fd-next">${upcoming}</p>
      <ul class="fd-list">${items}</ul>
      <div class="tp-actions"><button type="button" class="tp-secondary">Zamknij</button></div>
    </div>`;
  const close = () => root.remove();
  root.querySelector('.tp-secondary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.body.append(root);
  return close;
}
