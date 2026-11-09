# Badania stacji — propozycja do poprawek (krok 2c)

Stan: 2026-11-09. Decyzje właściciela: **ok. 90 badań** (15 na kategorię, **6 pierścieni**), propozycja Claude,
właściciel skreśla, zmienia i dopisuje; badania mogą dawać **nowe moduły i poziomy rdzenia, nowe statki i automatykę
SI** (nie tylko procenty). Nazwy i liczby są **robocze** (lore — `docs/lore/nazwy-w-grze.md`; strojenie na końcu).

**Jak poprawiać:** napisz po prostu np. „Flota: usuń Kurier, dodaj Statek zwiadowczy”, „SI 3: zamień na …”,
„premia Produkcji za słaba”. Pogrubione id są już w grze (szkic z v0.73) — zostają, żeby zapisy się nie rozjechały.

Oznaczenia efektów:
- **%** — premia liczbowa, działa od razu po wprowadzeniu listy;
- **🔓 nowa rzecz** — nowy moduł / poziom rdzenia / statek / automatyka SI; wymaga osobnej mechaniki (proponuję wprowadzać
  je w kolejnych krokach; do tego czasu badanie można zbadać, a efekt pojawi się z mechaniką);
- **→ etap N** — przygotowuje etap planu stacji (dok handlowy 3, kosmos 4, załoga 5, obcy 6, dok megakonstruktów 7);
- **most · X** — badanie wymaga badania z kategorii X.

Pierścienie (Laboratorium orbitalne): 1 → poz. 1, 2 → poz. 2, 3 → poz. 4, 4 → poz. 6, 5 → poz. 8, 6 → poz. 10.

## Produkcja (15)

| Pierścień | Badanie | Efekt | Wymaga |
|---|---|---|---|
| 1 | **Sieć zasilania stacji** | badania stacji −5% czasu | — |
| 2 | **Premia stacji: planeta** | premia stacji: planeta pod stacją | Sieć zasilania |
| 2 | **Wydobycie imperium** | +3% metalu i kryształów (całe imperium) | Sieć zasilania |
| 2 | Skrzydła słoneczne II | +3% energii (całe imperium) | Sieć zasilania |
| 3 | **Zasięg premii: układ** | premia stacji: cały układ (50%) | Premia: planeta |
| 3 | **Rafinacja orbitalna** | +4% metalu i kryształów | Wydobycie imperium, most · SI (SI logistyki) |
| 3 | Siła premii I | premia stacji ×1,25 | Premia: planeta |
| 3 | Odlewnia orbitalna | −5% kosztu budowy (całe imperium) | Wydobycie imperium |
| 4 | **Zasięg premii: sąsiednie układy** | premia stacji: sąsiednie układy (25%) | Zasięg: układ, most · Eksploracja (Teleskop) |
| 4 | Rafinacja głęboka | +5% metalu i kryształów | Rafinacja orbitalna |
| 4 | Ekipy orbitalne | −5% czasu budowy (całe imperium) | Odlewnia, most · SI (Węzeł SI) |
| 5 | Siła premii II | premia stacji ×1,5 | Siła I, most · SI (Rdzeń 2. generacji) |
| 5 | Reaktor stacji | +5% energii (całe imperium) | Skrzydła II, Rafinacja głęboka |
| 6 | Zasięg premii: dalekie układy | premia stacji do 40 jedn. mapy (10%) | Zasięg: sąsiednie, most · Eksploracja (Teleskop głęboki) |
| 6 | Fundament sztucznej planety | → cel stacji macierzystej („sztuczna planeta”, później) | Reaktor, most · SI (Rdzeń 3. generacji) |

## Flota (15)

| Pierścień | Badanie | Efekt | Wymaga |
|---|---|---|---|
| 1 | **Dok remontowy** | −5% czasu lotów | — |
| 2 | **Start ze stacji** | loty ze stacji −25% czasu | Dok remontowy |
| 2 | **Napęd stacyjny** | −10% czasu lotów | Dok remontowy |
| 2 | Kurier | 🔓 nowy statek: szybki, mały ładunek | Dok remontowy |
| 3 | **Ładownie modułowe** | +20% ładowności transportowców | Napęd, most · Handel (Rejestr kupców) |
| 3 | Ogniwa paliwowe | −10% paliwa wszystkich lotów | Start ze stacji |
| 3 | Eskorta pancerna | każdy okręt eskorty −10% ryzyka więcej | Dok remontowy, Napęd |
| 4 | Ciężki transportowiec | 🔓 nowy statek: 2× ładunek, wolniejszy | Ładownie |
| 4 | **Statek konstrukcyjny** | 🔓 → etap 4 (nowe stacje) | Ładownie |
| 4 | Doki seryjne | −20% czasu budowy statków | Eskorta pancerna, most · Produkcja (Odlewnia) |
| 5 | Korytarze lotów | −15% czasu lotów między układami | Ogniwa, most · Eksploracja (Teleskop) |
| 5 | Silniki stacji | 🔓 → etap 4 (przeniesienie stacji macierzystej) | Statek konstrukcyjny |
| 5 | Konwoje | 🔓 kilka transportowców w jednym locie, jedno ryzyko | Ciężki transportowiec, most · SI (SI logistyki) |
| 6 | Hangar floty | +2 miejsca kolejki stoczni | Doki seryjne, most · SI (Rdzeń 2. generacji) |
| 6 | Holownik megakonstruktów | 🔓 → etap 7 | Silniki stacji, most · Planetologia (Cumowanie) |

## SI (15)

| Pierścień | Badanie | Efekt | Wymaga |
|---|---|---|---|
| 1 | **Węzeł SI Matki** | badania stacji −5% czasu | — |
| 2 | **SI logistyki** | +10% ładowności | Węzeł SI |
| 2 | **SI badawcza** | badania stacji −10% czasu | Węzeł SI |
| 2 | Kolejka stacji | 🔓 +1 badanie w kolejce stacji | Węzeł SI |
| 3 | **Rdzeń drugiej generacji** | 🔓 rdzeń poz. 2: drugi pierścień gniazd, premia stacji ×1,25 | SI badawcza, most · Produkcja (Sieć zasilania) |
| 3 | Automatyczne dostawy | 🔓 SI sama wysyła nadwyżki planet na stację | SI logistyki |
| 3 | SI nocna | 🔓 SI sama wybiera kolejne badania stacji | SI badawcza, Kolejka stacji |
| 4 | Doradca złóż | 🔓 SI wskazuje najlepsze planety do kolonizacji | SI logistyki, most · Planetologia (Skan orbitalny) |
| 4 | SI budowniczy | +1 miejsce kolejki budowy (każda planeta) | Rdzeń 2. generacji |
| 4 | SI floty | naprawy eskorty −50% czasu | Automatyczne dostawy, most · Flota (Dok remontowy) |
| 5 | Rdzeń trzeciej generacji | 🔓 rdzeń poz. 3: trzeci pierścień gniazd, premia ×1,5 | Rdzeń 2. generacji, SI nocna |
| 5 | SI kupiec | 🔓 → etap 3 (automatyczne kontrakty) | Doradca złóż, most · Handel (Kontrakty) |
| 5 | Autonomia stacji | 🔓 SI prowadzi stację pod nieobecność (moduły, dostawy) | SI nocna, SI budowniczy |
| 6 | Macierz SI | badania stacji −20% czasu | Rdzeń 3. generacji |
| 6 | SI tłumacz | → etap 6 (spotkania) | Macierz SI, most · Eksploracja (Nasłuch) |

## Planetologia (15)

| Pierścień | Badanie | Efekt | Wymaga |
|---|---|---|---|
| 1 | **Skan orbitalny** | +3% złóż planet | — |
| 2 | **Mapy złóż układu** | +5% złóż planet | Skan orbitalny |
| 2 | Prognozy z orbity | +5% środowiska | Skan orbitalny |
| 2 | Lód z orbity | +3% kryształów (całe imperium) | Skan orbitalny |
| 3 | **Stabilizacja klimatu z orbity** | +10% środowiska | Mapy złóż |
| 3 | **Cumowanie megakonstruktów** | → etap 7 (dok megakonstruktów) | Mapy złóż, most · Produkcja (Sieć zasilania) |
| 3 | Skan głęboki | +5% złóż | Mapy złóż |
| 4 | Resztki złóż | wydobycie resztek (≥ 80% złoża) +25% | Skan głęboki |
| 4 | Terraformacja z orbity I | +10% środowiska | Stabilizacja klimatu |
| 4 | Wybór kolonii | jakość danych ekspedycji + | Skan głęboki, most · Eksploracja (Teleskop) |
| 5 | Próbki jądra | znaleziska megakonstruktów częściej | Resztki złóż, Cumowanie |
| 5 | Terraformacja z orbity II | +15% środowiska | Terraformacja I |
| 5 | Trzecie miejsce w doku | 🔓 → etap 7 (3. miejsce cumowania) | Cumowanie, most · SI (Rdzeń 2. generacji) |
| 6 | Serce świata | +10% złóż | Próbki jądra |
| 6 | Kuźnia planet | → sztuczna planeta (później) | Terraformacja II, most · Produkcja (Fundament) |

## Handel (15)

| Pierścień | Badanie | Efekt | Wymaga |
|---|---|---|---|
| 1 | **Rejestr kupców** | → etap 3 (kupcy) | — |
| 2 | **Dok handlowy** | 🔓 → etap 3 (moduł handlowy) | Rejestr kupców |
| 2 | Obserwacja rynku | → etap 3 (kursy widoczne z wyprzedzeniem) | Rejestr kupców |
| 2 | Standard kontenerów | +10% ładowności | Rejestr kupców |
| 3 | **Kursy wymiany** | → etap 3 (lepsze kursy) | Dok handlowy |
| 3 | **Kontrakty długie** | → etap 3 (kontrakty z większą nagrodą) | Dok handlowy, most · Produkcja (Wydobycie imperium) |
| 3 | Magazyn handlowy | +25% pojemności magazynu stacji | Dok handlowy |
| 4 | Szlaki handlowe | → szlaki między stacjami (później) | Kursy, most · Flota (Napęd) |
| 4 | Pośrednicy | → etap 3 (kupcy częściej) | Kontrakty |
| 4 | Ubezpieczenie ładunków | straty transportu od piratów −50% | Kontrakty, most · Flota (Eskorta pancerna) |
| 5 | Gildie | → kontrakty specjalne (później) | Pośrednicy, Szlaki |
| 5 | Handel antymaterią | → etap 3 (zakup antymaterii u kupców) | Kursy, Magazyn handlowy |
| 5 | Magazyn handlowy II | +50% pojemności magazynu stacji | Magazyn handlowy |
| 6 | Węzeł handlowy | → kupcy z sąsiednich układów | Gildie, most · Produkcja (Zasięg: sąsiednie) |
| 6 | Kredyt kupiecki | → moduły na kredyt (później) | Handel antymaterią |

## Eksploracja (15)

| Pierścień | Badanie | Efekt | Wymaga |
|---|---|---|---|
| 1 | **Teleskop stacji** | zasięg ekspedycji +2 | — |
| 2 | **Wydobycie z kosmosu** | → etap 4 | Teleskop, most · Flota (Napęd) |
| 2 | **Moduł mieszkalny** | 🔓 → etap 5 (załoga) | Teleskop, most · SI (Węzeł SI) |
| 2 | Hangar sond | ekspedycje szybsze | Teleskop |
| 3 | **Nasłuch** | 🔓 → etap 6 | Wydobycie z kosmosu, most · Planetologia (Skan orbitalny) |
| 3 | Czerpanie gazu | → etap 4 (stacje przy gazowych olbrzymach) | Wydobycie z kosmosu |
| 3 | Kwatery załogi | → etap 5 (więcej miejsc) | Moduł mieszkalny |
| 3 | Teleskop głębokiego kosmosu | zasięg sygnałów i ekspedycji + | Hangar sond |
| 4 | Stacja górnicza na pasie | → etap 4 | Wydobycie z kosmosu |
| 4 | Morale załogi | → etap 5 | Kwatery |
| 4 | Rozpoznawanie sygnałów | → etap 6 | Nasłuch |
| 5 | Wraki i znaleziska | → etap 6 | Rozpoznawanie sygnałów, Stacja górnicza |
| 5 | Podtrzymanie życia | → etap 5 (zapasy załogi −20%) | Morale, most · Planetologia (Prognozy) |
| 6 | Pierwszy kontakt | → etap 6 (robocze — do Projektu lore) | Wraki, most · SI (SI tłumacz) |
| 6 | Placówka między układami | → etap 4 | Stacja górnicza, most · Flota (Silniki stacji) |

## Propozycja wdrożenia

1. **2c-1:** wprowadzam całą listę do gry: wszystkie **%** działają od razu, pierścienie 5–6, galaktyki kategorii
   dopasowane do 15 badań; badania 🔓 i „→ etap” można badać, a w opisie widać, co otworzą.
2. **2c-2 (po akceptacji):** nowe rzeczy z badań — kolejno: poziomy rdzenia (drugi i trzeci pierścień gniazd),
   nowe statki (Kurier, Ciężki transportowiec), automatyka SI (dostawy, SI nocna, autonomia).
