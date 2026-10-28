# Historia zmian (CHANGELOG)

Na podstawie historii git (`git log`): opisy commitów wersji, bez commitów technicznych („opublikowana”, poprawki dokumentacji). Szczegóły każdej wersji — `CLAUDE.md` (Stan obecny) i `README.md` (lista kontrolna).

## v0.56.0 — transfer megakonstruktu — 2026-10-28

- Megakompleks można wysłać na inną swoją planetę: okno Kompleks → „Wyślij konstrukt…” (wybór planety, czas lotu, paliwo, koszt, pola, ostrzeżenie o energii na celu).
- 30 min rozkładania do lotu — budynek nie pracuje, nie da się go ulepszyć ani zburzyć; „Anuluj wysyłkę” zwraca koszt i paliwo.
- Koszt: 5× paliwo transportowca na trasie + 10% kosztu ostatniego poziomu. Lot 2× wolniej niż transportowiec.
- Na starej planecie zostają puste pola; na celu konstrukt staje z tym samym poziomem i megakompleksem (cel musi mieć wolne pola — ląd albo lód). Imperium pokazuje rozkładanie i lot.
- Poprawka: wczytanie zapisu `PF2:` przywraca stację macierzystą i licznik wyeksploatowanych planet. Zapisy zgodne.

## v0.55.0 — stacja macierzysta — 2026-10-28

- Badanie „Moduł orbitalny” (Stacja i handel) odblokowuje **stację macierzystą**: jedna na imperium, budowana nad aktywną planetą (8000 metalu, 5000 kryształów, 10 min), z rdzeniem SI Matki.
- **Magazyn orbitalny** (poz. 1–10, od 50 000 metalu i 50 000 kryształów) jako węzeł transportu: „Na stację” z aktywnej planety i „Ze stacji” na wybraną planetę, każdy lot za paliwo z antymaterii; miejsce liczy też ładunki w drodze.
- Wygląd „Pierścień”: obracający się pierścień, turkusowy rdzeń, moduły magazynu (więcej z poziomem), złote panele; w budowie niedomknięty — 3D i 2D.
- Karta stacji na końcu listy w Imperium. Liczby robocze (`BALANCE.homeStation`). Zapisy zgodne (nowe pola opcjonalne).

## v0.54.0 — wyeksploatowanie planet i licznik pętli — 2026-10-28

- Po wydobyciu 80% złoża metalu albo kryształów kopalnia wydobywa resztki o połowę wolniej (energia bez zmian); karta złóż pokazuje „resztki — wydobycie wolniejsze”, czas do wyczerpania uwzględnia zwolnienie.
- Planeta z oboma złożami ≥ 80% jest **wyeksploatowana**: plakietka na karcie Imperium, wpis w dzienniku, licznik „wyeksploatowane X/3” w nagłówku Imperium (każda planeta liczy się raz, zapamiętane w zapisie).
- Liczby robocze (`BALANCE.exploitation`). Zapisy zgodne.

## v0.53.0 — plan MVP, symulator pętli i antymateria jako paliwo — 2026-10-28

- Plan do MVP według definicji właściciela (pętla: planeta → wyczerpanie złóż → transport / przeniesienie → 3 planety → stacja macierzysta, flota, imperium gwiezdne) — `docs/status.md`.
- Symulator pętli `npm run simulate` (bez zmian w grze): „rozsądny gracz” gra zwykłymi akcjami; raport `docs/balans-symulacja.md`. Wnioski: pętla za szybka dla aktywnego gracza, martwy punkt „pełny magazyn bez pól”, gracz okazjonalny ok. 6× wolniejszy.
- **Antymateria = paliwo każdego lotu:** transportowiec 1 w układzie (między układami 2 + 1 na 20 jedn.), statek kolonizacyjny 3 (3 + 1 na 15 jedn.), ekspedycja 1, holownik 1. Koszt widać przed wysłaniem; bez paliwa lot nie startuje; zawrócenie zwraca paliwo.
- **Kolonizacja we własnym układzie statkiem:** 2500 metalu, 1800 kryształów, 3 antymaterii, lot 2 min — kolonia po przylocie.
- Zapisy zgodne (nowe pole opcjonalne).

## v0.51.0 — Magazyn jako port, Kopalnia metalu jako ciężki przemysł — 2026-10-28

- Magazyn i Kopalnia metalu wyraźnie się różnią (zrzut właściciela: wyglądały prawie tak samo).
- **Magazyn = port kontenerowy:** ciemny niebiesko-szary asfalt z białymi liniami (nie zlewa się z lodem), kolorowe kontenery w rzędach, turkusowe suwnice bramowe i żuraw, białe silosy, magazyn wysokiego składowania na etapie 4; bez złota, ognia i taśmociągów.
- **Kopalnia metalu = ciężki przemysł:** ciemne żelazo, rdzawe dachy, okopcone płyty, rdzawe hałdy rudy, dym nad kominami, żar pieców, rdzawo-brązowy grunt i taśmociągi; bez złotych dachów.
- 3D i 2D. Pojemność, wydobycie, koszty, pola i zapisy bez zmian.

## v0.50.0 — Elektrownia: wiatr, fuzja, atom, antymateria — 2026-10-28

- Elektrownia ma cztery sposoby pozyskiwania energii (wygląd i nazwy etapów, decyzja właściciela): poz. 1 **Farma wiatrowa** (wiatraki na naturalnym terenie, wirniki obracają się), poz. 6 **Generator fuzyjny** (świecący pierścień plazmy w cewkach, krążące skupiska plazmy), poz. 12 **Elektrownia jądrowa** (kopuła reaktora, chłodnie z parą, niebieska poświata basenu), poz. 20 **Reaktor antymaterii** (kula antymaterii w obracających się pierścieniach pułapki, zbiorniki z fioletowymi rurami).
- Moduły na polach dopasowane do etapu (wiatraki, małe pierścienie plazmy, chłodnie, zbiorniki antymaterii); 2D — pikselowe odpowiedniki i nowe wzory gruntu.
- Produkcja energii, koszty, pola i zapisy bez zmian. Zużycie antymaterii przez megakonstrukty — propozycja na później.

## v0.49.0 — wielka odkrywka z wiszącym ekstraktorem — 2026-10-28

- Ekstraktor kryształów na etapach Odkrywka (poz. 12–19) i Megaodkrywka (poz. 20+): cały obszar zajętych pól to jedna tarasowa dziura wykopana w terenie planety — krawędź dokładnie na obrysie pól, warstwy (półka + pochyłe zbocze) wzdłuż obrysu, w głębi coraz bardziej okrągłe; 5 / 7 warstw (robocze, `src/data/openPit.ts`); szyb odwiertu w środku dna; jeziorka w obszarze są częścią dziury, tafla oceanu wycięta wzdłuż krawędzi.
- Ekstraktor wisi nad szybem na 4 / 5 linach-rurach z kotwami na krawędzi; po rurach płynie turkusowy błysk (tylko materiał). +1 rysowanie.
- Linie siatki pól nad wyrobiskiem niewidoczne; „pokaż budynek” obraca do ekstraktora.
- 2D: koncentryczne warstwy, czarny szyb, ekstraktor w środku dziury. Szyb wiertniczy (poz. 1–11) bez zmian.
- `SURFACE_VERSION` = 5 (decyzja właściciela). Mechanika, koszty, pola i zapisy bez zmian.

## v0.48.0 — odwiert planetarny i odsłonięte jądro — 2026-10-28

- Ekstraktor kryształów w 3D: równa niecka (szkic właściciela) przechodzi w prawdziwą studnię w głąb planety — 8 etapów z poziomu (1 / 3 / 6 / 9 / 12 / 16 / 22 / 30, robocze), ściany z warstwami geologicznymi (skorupa, głębsza skorupa, płaszcz, strefa gorąca), świecące pęknięcia i rozgrzane dno, na etapie 8 jaskinia płaszcza i jądro w środku planety.
- Ląd z wnętrza otworu ukryty (przypięty do krawędzi), studnia jako osobna, lokalna bryła; kolory wg typu planety (`src/data/drill.ts`); światło jądra wpieczone w ściany.
- Główna konstrukcja kryształów obok otworu, taśmy omijają otwór; krater w barwach skorupy planety. +2 rysowania.
- 2D, mechanika, koszty, pola i zapisy bez zmian.

## v0.47.4 — grafika 3D, magazyn, kolektor, laboratorium i wyrobisko — 2026-10-27

- Magazyn (skład → magazyn → terminal z żurawiem → megaskład z wieżą silosów), kolektor antymaterii (pułapka → kolektor → pole pułapek → megakolektor), laboratorium (pracownia → laboratorium z anteną → instytut → kampus) w 3D według standardu modelu; wszystkie budynki w `FAMILIES`.
- Wyrobisko kryształów jako prawdziwa dziura: głębsza z każdym poziomem (do 0,14 promienia planety), więcej tarasów, skalne ściany ciemniejsze z głębokością; może zejść poniżej poziomu morza (tafla oceanu nad nią wycięta).
- Moduły na polach bez części obracanej (mniej rysowań: 47 w najbardziej rozbudowanej kolonii).
- 2D, mechanika, pola i zapisy bez zmian.

## v0.47.3 — grafika 3D, elektrownia i fundamenty — 2026-10-27

- Elektrownia w 3D (poz. 1 / 6 / 12 / 20): chłodnia i hala turbin → węzeł energetyczny → wielka elektrownia z kopułą reaktora → megasieć z wieżą Tesli; pola paneli słonecznych i stacje przesyłowe, węzły Tesli po usprawnieniu.
- Budowle nie nachodzą na teren ani na siebie: wielkość z wolnego, suchego miejsca własnego obszaru, teren pod budowlami wyrównany (fundamenty).
- Puste części modeli bez rysowania: 52 → 37 rysowań w najbardziej rozbudowanej kolonii.
- 2D, mechanika, pola i zapisy bez zmian.

## v0.47.2 — grafika 3D, rodzina kryształowa — 2026-10-27

- Kopalnia kryształów w 3D według standardu modelu, sylwetki na poz. 1 / 6 / 12 / 20: wiertło z wieżą wiertniczą → szyb wiertniczy ze świecącą kolumną → odkrywka ze stacją i słupem kryształu na dnie → megaodkrywka z gromadą kryształów i suwnicą.
- Stanowiska i przetwórnie na krawędzi wyrobiska, małe wiertnie na tarasach, taśmy wokół wyrobiska; rozmieszczenie wspólne z metalem (`FAMILIES`); +4 rysowania.
- 2D, mechanika, pola i zapisy bez zmian.

## v0.47.1 — grafika 3D, prototyp B (rodzina metalowa) — 2026-10-27

- Kopalnia metalu w 3D według standardu modelu (platforma, bryła, detal, światło), wielkość z promienia pola.
- Cztery sylwetki razem z etapami gry (poz. 1 / 6 / 12 / 20): kopalnia z wieżą wyciągową → zakład przetwórczy → huta z piecami i kominami → megakompleks z wieżą centralną i suwnicą.
- Moduły na pozostałych polach (hale ze zbiornikami, place z hałdami) i taśmociągi do głównej konstrukcji; +4–5 rysowań.
- 2D, mechanika, pola i zapisy bez zmian.

## v0.47.0 — grafika 3D, prototyp A (planeta) — 2026-10-27

- 3D bez „szachownicy”: normalne faset przechylone ku górze (`facetNormals`), kolor fasety ze średniej wierzchołków i wygładzonej wysokości, jasność płatami zamiast losowo, przyciemnienie tylko na uskokach tarasów (maks. 25%).
- Grunt kompleksów w 3D jako spokojna płyta w kolorze budynku (odkrywka z tarasami i ciemnym dnem).
- Chmury znikają przy przybliżeniu (1,4×–2,2×), gładka tafla oceanu, słabe światło wypełniające po nocnej stronie.
- Audyt grafiki: `docs/audyt-grafiki-v047.md`. 2D, mechanika i zapisy bez zmian.

## v0.46 — audyt projektu — 2026-10-27

- Zapis: uszkodzony zapis nie przepada (kopia `planet-forge.empire.broken`, komunikat, kopia w zgłoszeniu); komunikat o nieudanym zapisie (pełna pamięć / tryb prywatny).
- Ekonomia: limit 8 h nieobecności liczony raz dla całego naliczenia (wcześniej mógł się podwoić); start budowy z kolejki sprawdza wolne pola.
- Interfejs: zasada okien (jeden panel albo wybrany budynek; Produkcja + karta budowli bez okienka „Budynek”; dymek SI chowa się), karty Produkcji bez ucinania tekstu (czas budowy na przycisku), dolny pasek na całą szerokość, wyjaśnienie niedoboru energii (dotknięcie ENERGII i linia w Produkcji), telefon poziomo (przewijane okna, panel Planeta w dwóch kolumnach, komunikaty w granicach ekranu), filtry Badań w kilku wierszach, dopiski paska zasobów nie nachodzą na siebie, polski zapis liczb na karcie budynku, okna HTML przewijają się.
- Wydajność: siatka pól ok. 12% szybciej (wynik identyczny), statystyki grafiki 3D w Diagnostyce, raport `docs/PERFORMANCE.md`.
- Narzędzia: Playwright jako devDependency, `scripts/screens.ts`, `scripts/perf.ts`, `scripts/perf-generation.ts`, `npm run balance-doc`.
- Dokumentacja: `docs/` — ARCHITECTURE, MECHANICS, BALANCE, RENDERING, UI, SAVE_FORMAT, TESTING, PERFORMANCE, CHANGELOG, KNOWN_ISSUES, LORE_TOUCHPOINTS.

## v0.45 — 2026-10-27

- budynek = jeden spójny kompleks — pola z etapów, wzrost od kotwicy, blokada braku miejsca, migracja zapisu, grunt i zabudowa kompleksu w 2D/3D
- budynek rośnie w jeden kompleks — wygląd huty i odkrywki, 3D wyciszony grunt, podgląd etapów (docs/atlas), dokumentacja i analiza limitów pól
- decyzja właściciela — limity pól wariant B (stałe rozmiary, specjalizacja planet)

## v0.44 — 2026-10-27

- energia gwiazdy — kolektor na orbicie zasila planety układu, badanie, okno „Kosmos”, satelita 2D/3D

## v0.43.1 — 2026-10-27

- znaleziska megakompleksów — co 4–8 h (też offline), premie dla imperium, okno „Znaleziska”, dziennik

## v0.43 — 2026-10-27

- megakompleks — dwa stykające się kompleksy, premia +60%, główny przewód, okno i badanie „Megastruktury”

## v0.41.1 — 2026-10-27

- SI nie wznawia badania anulowanego przez gracza (czeka na ręczny wybór)

## v0.42 — 2026-10-27

- przemieniony teren wokół kompleksów — kryształowe wychodnie, żużel, naelektryzowane płyty (2D i 3D)

## v0.41 — 2026-10-27

- poziomy wizualne — moduły konstrukcji co 5 poziomów (2D i 3D), wygląd w karcie budowli

## v0.40 — 2026-10-27

- sieć Tesli — węzły elektrowni, wieża przesyłowa, wyładowania (2D i 3D), badanie „Przesył bezprzewodowy”

## v0.39 — 2026-10-27

- wielka fabryka metalu — zakłady, hala główna, ekran fabryki z trybami pracy; poprawka zapisu premii kompleksu

## v0.38.2 — 2026-10-27

- dedykowany teren budynków, wybór pola przez gracza, animacja łączenia w kompleks

## v0.38.1 — 2026-10-27

- karta budowli obok planety, obrys zajętości pól, bogatszy model wiertła (szkice właściciela)

## v0.38 — 2026-10-27

- przemysł, krok 1 — wiertła kryształu z szybem i kompleks wiertniczy (audyt i plan v0.50)

## v0.37.1 — 2026-10-27

- Przechwyt komet — holownik po kometę w każdym układzie, okno „Wydobycie w kosmosie”

## v0.37 — 2026-10-27

- Górnictwo asteroid — ramię Stacja i handel, stacja wydobywcza na pasie w układzie z planetą

## v0.36.1 — 2026-10-26

- czytelne połączenia w Badaniach — łuki po spirali, mosty jako zaczepy, przygaszanie po zaznaczeniu

## v0.36 — 2026-10-26

- Transportowce — ramię Flota, przesyłanie metalu i kryształów między planetami

## v0.35 — 2026-10-26

- Planetologia w trzech ścieżkach (budowa na lodzie, większe złoża), mosty między ramionami badań, burzenie poziomów budynków

## v0.34.5 — 2026-10-26

- wyszukiwarka i filtry mapy galaktyki (zbadane, rzadkie, w zasięgu)

## v0.34.4 — 2026-10-26

- rzadkie obiekty — pulsary i czarne dziury, Astrofizyka ekstremalna, premie z danych naukowych; raport końcowy

## v0.34.3 — 2026-10-26

- ekspedycje — wyprawy do sygnałów, raporty, wiedza rośnie; badania Eksploracji
- poprawka typów w teście ekspedycji

## v0.34.2 — 2026-10-26

- wiedza o galaktyce — sygnały, wykryte, rozpoznane i zbadane układy

## v0.34.1 — 2026-10-26

- realistyczniejsza galaktyka, znacznik i strzałka Twojego układu, „Mój układ”, kamera zachowana

## v0.34 — 2026-10-26

- wspólny czas świata, ruch planet z czasu, widok układu pod kątem

## v0.33 — 2026-10-26

- Mapa jako atlas złóż — strefy temperatury, tabela złóż, filtry, legenda gwiazd

## v0.32.3 — 2026-10-26

- specjalizacje kolonii zależne od gwiazdy i strefy orbity, zmiana po badaniu (1 h)

## v0.32.2 — 2026-10-26

- kolejka budowy — 1 miejsce, kolejne z badań SI, koszt przy starcie

## v0.32.1 — 2026-10-26

- „Imperium” — sytuacja imperium, sortowanie, energia

## v0.32 — 2026-10-26

- nowy wygląd ekranu „Imperium”

## v0.31.2 — 2026-10-26

- badania — czytelność, panel-karta, wymagania, filtry ramion, centrowanie

## v0.31.1 — 2026-10-26

- łagodniejsza siatka pól

## v0.31 — 2026-10-26

- nowy wygląd ekranu „Badania”

## v0.30.1 — 2026-10-26

- lepiej widoczna siatka pól

## v0.30 — 2026-10-26

- zgłoszenie #1 — mniej zacięć przy starcie i zmianie planety

## v0.29 — 2026-10-26

- mikroanimacje interfejsu

## v0.28 — 2026-10-24

- informacja geologiczna na mapie

## v0.27 — 2026-10-24

- skończone złoża metalu i kryształów

## v0.26.5 — 2026-10-24

- zgłoszenia testerów — błędy i sugestie jako GitHub Issues z diagnostyką

## v0.26.4 — 2026-10-24

- siatka pól z mapy powierzchni — pola tylko na lądzie i lodzie, granice wzdłuż brzegów

## v0.26.3 — 2026-10-24

- ląd w 3D nad wodą, dokładniejsze pola, kryształy najpierw na lodzie

## v0.26.2 — 2026-10-24

- budowle na suchym lądzie, zwarte grupy, na wyspie przy jej środku
- pola planety w pasku zasobów i na liście planet

## v0.26.1 — 2026-10-24

- grupy budowli (3 poziomy na pole), okno „Zarządzanie”, teren pod budynki

## v0.26 — 2026-10-24

- pola planety — siatka do zabudowy, każdy poziom zajmuje pole lądu, automatyczny i stały przydział pól
- liczba pól do zabudowy narzucona seedem — siatka dopasowana do lądu, rysowane tylko pola lądu

## v0.25.2 — 2026-10-24

- płynność 3D na komputerze (MSAA tylko w małych oknach, automatyczna rozdzielczość), wybór budowli przy każdym przybliżeniu, karta w Produkcji pokazuje budynek
- przybliżenie do budynku 1,5× domyślnie, 3× jako opcja w Ustawieniach; pokazany budynek wstrzymuje autoobrót

## v0.25.1 — 2026-10-24

- przełączenie grafiki 2D ↔ 3D zachowuje przybliżenie planety

## v0.25 — 2026-10-24

- lawa jako skorupa z pęknięciami, kolory z materiałów, światło z profilu w 2D, płynna kamera z przyciskami

## v0.24 — 2026-10-24

- woda i lawa — jeziora z płaskim lustrem, rzeki do morza, lawa w kalderach i strumieniach

## v0.23 — 2026-10-24

- sześć profili powierzchni, metoda terenu z wag profilu, npm run atlas

## v0.22 — 2026-10-22

- trzy metody terenu — płyty tektoniczne, erozja, kratery i uskoki

## v0.21 — 2026-10-22

- wysuwana lista planet z przycisku menu

## v0.20 — 2026-10-22

- ulepszanie budynków dotknięciem budowli na planecie

## v0.19 — 2026-10-22

- nowy układ ekranu — dolny pasek z przyciskami i wysuwany panel

## v0.18 — 2026-10-21

- wspólny model powierzchni w core/surface i roboczy typ planety jałowej

## v0.17 — 2026-10-21

- kosmos, który żyje — tło z głębią i lepsze światło

## v0.16 — 2026-10-21

- planeta 3D w stylu low-poly

## v0.15 — 2026-10-20

- badania przypisane do planety, limit SI = Laboratorium, SI przy zamkniętej grze

## v0.14 — 2026-10-20

- SI Matka — propozycje działań, zgoda gracza, działanie samodzielne

## v0.13 — 2026-10-20

- statek kolonizacyjny, ekran Imperium i dziennik ekspedycji

## v0.12 — 2026-10-20

- galaktyka spiralna, komety, gazowe olbrzymy i pasy asteroid

## v0.11 — 2026-10-20

- mapa galaktyki — układy gwiezdne, adresy planet, kolonizacja z mapy

## v0.10 — 2026-10-20

- badania — Laboratorium, silnik badań i ekran galaktyki

## v0.9 — 2026-10-20

- zwijane panele, mniejsze UI, skalowanie komputer/tablet/telefon
- na tablecie w pionie panele po bokach, otwarty panel odsuwa scenę

## v0.8 — 2026-10-20

- przybliżanie dwoma palcami, animowane miniatury planet, krawędź lodu

## v0.7 — 2026-10-20

- planeta 2D domyślnie, kilka planet (imperium), licznik płynności

## v0.6.1 — 2026-10-20

- mniej pamięci grafiki i bezpiecznik startu

## v0.6 — 2026-10-20

- PWA — pełny ekran z ikony, offline, aktualizacje, przenoszenie zapisu

## v0.5 — 2026-10-20

- antymateria (1/h + Kolektor) i płatne „Ukończ teraz” powyżej poz. 5

## v0.4 — 2026-10-20

- Magazyn (limit pojemności) i darmowe „Ukończ teraz” do poz. 5

## v0.3 — 2026-10-20

- czas budowy z paskiem postępu, anulowaniem i rusztowaniem

## v0.2 — 2026-10-20

- źródła gry, 5 typów planet, kolonia na powierzchni, poprawka atmosfery

## v0.1 — 2026-10-20

- Pierwsza wersja (Initial commit): jedna planeta 3D z seeda, obrót palcem, metal, kryształy, energia, trzy budynki, zapis w przeglądarce.
