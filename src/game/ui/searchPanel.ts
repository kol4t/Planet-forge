// Okno „Szukaj układu” (v0.34.5): prawdziwe pole tekstowe HTML (klawiatura iPada), filtry i lista
// znanych układów. Dotknięcie wyniku zamyka okno i przenosi mapę do układu. Wygląd: #text-panel w index.html.
import { DISCOVERY_LABELS } from '../../core/galaxy/discovery.ts';
import { GALAXY_FILTERS, galaxyFilterCount, searchSystems, type GalaxyFilter, type KnownSystem } from '../../core/galaxy/galaxyIndex.ts';

export interface SearchPanelOptions {
  systems: readonly KnownSystem[];
  filter: GalaxyFilter;
  onPick: (index: number) => void;
  onFilter: (filter: GalaxyFilter) => void;
}

export function openSearchPanel(options: SearchPanelOptions): () => void {
  let filter = options.filter;
  const root = document.createElement('div');
  root.id = 'text-panel';
  root.innerHTML = `
    <div class="tp-box sp-box" role="dialog" aria-modal="true" aria-labelledby="sp-title">
      <h2 id="sp-title">Szukaj układu</h2>
      <input class="fb-title sp-query" type="search" placeholder="Nazwa albo numer, np. Wolf albo 1:42" autocomplete="off" autocapitalize="off" spellcheck="false" />
      <div class="fb-kinds sp-filters"></div>
      <div class="sp-list" role="list"></div>
      <div class="tp-actions"><button type="button" class="tp-secondary">Zamknij</button></div>
    </div>`;
  const query = root.querySelector<HTMLInputElement>('.sp-query')!;
  const filters = root.querySelector('.sp-filters')!;
  const list = root.querySelector('.sp-list')!;
  const close = () => root.remove();
  root.querySelector('.tp-secondary')!.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });

  const render = () => {
    filters.replaceChildren(
      ...GALAXY_FILTERS.map((f) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = f.id === 'all' ? f.label : `${f.label} ${galaxyFilterCount(options.systems, f.id)}`;
        if (f.id === filter) b.classList.add('on');
        b.addEventListener('click', () => {
          filter = f.id;
          options.onFilter(filter);
          render();
        });
        return b;
      }),
    );
    const found = searchSystems(options.systems, query.value, filter);
    if (found.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tp-hint';
      empty.textContent = 'Nic nie pasuje. Nowe układy odkrywają ekspedycje.';
      list.replaceChildren(empty);
      return;
    }
    list.replaceChildren(
      ...found.map((s) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'sp-row';
        row.setAttribute('role', 'listitem');
        const name = document.createElement('span');
        name.className = 'sp-name';
        name.textContent = s.level >= 2 ? `${s.name} (1:${s.index})` : s.name;
        const info = document.createElement('span');
        info.className = 'sp-info';
        const parts = [s.own ? 'Twój' : DISCOVERY_LABELS[s.level], `${s.distance} jedn.`];
        if (s.rare) parts.push('rzadki');
        if (s.reachable) parts.push('w zasięgu ekspedycji');
        info.textContent = parts.join(' · ');
        row.append(name, info);
        row.addEventListener('click', () => {
          close();
          options.onPick(s.index);
        });
        return row;
      }),
    );
  };
  query.addEventListener('input', render);
  render();
  document.body.append(root);
  // Bez automatycznej klawiatury na iPadzie (zasłoniłaby listę) — pole dostaje fokus dopiero po dotknięciu.
  return close;
}
