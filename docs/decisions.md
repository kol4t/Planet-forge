# Decyzje projektowe

Krótki rejestr istotnych decyzji (najnowsze na górze).

## 2026-10-24 — v0.26: pola planety (siatka do zabudowy)

Decyzje właściciela (pytania przed etapem): **każdy poziom budynku zajmuje jedno pole** (jak w OGame); **pole wybiera gra automatycznie**; **liczba pól DO ZABUDOWY narzucona seedem (30–200)** — siatka dopasowuje się tak, żeby na lądzie było dokładnie tyle pól, woda, lód i lawa leżą między nimi (pierwotnie 30–200 miało być całą siatką, ale wtedy planeta startowa miała tylko 40 pól lądu — właściciel zmienił decyzję); **siatka widoczna z przełącznika w Ustawieniach**.

- **Liczba pól** (`core/generation/fields.ts`, `gameplay.fields`): osobny strumień losowania `<typ>|<seed>|fields` (inne cechy planet bez zmian, `GENERATOR_VERSION` = 1). Większa planeta = więcej pól (±35), do tego rozrzut zbliżony do normalnego (suma 4 losowań, w dół 20, w górę 32), przycięty do 30–200. Mediana ok. 100; ≤ 40 pól ma ok. 0,6% planet, ≥ 180 — ok. 1%. Planeta startowa: zawsze 100 (`generation.fixedFields` w danych typu).
- **Siatka** (`core/colony/fieldGrid.ts`): komórki Woronoja wokół siatki Fibonacciego obróconej z seeda — na kuli głównie 5- i 6-kąty (samymi pięciokątami da się pokryć kulę tylko 12 polami). Rodzaj pola z terenu (większość z 7 próbek): ląd, woda (morze, jezioro), lód, lawa. Liczba wszystkich pól dobierana do udziału lądu (szybko — po środkach pól), tak by pól lądu było dokładnie `gameplay.fields`; nadmiarowe pola przybrzeżne stają się wodą. Rysowane są tylko pola lądu. `isBuildable` + `BuildRules` (woda/lód) — miejsce na przyszłe badanie. Liczona raz na planetę (pamięć 16 siatek; 50–300 ms w Node).
- **Gospodarka:** `upgradeBuilding(…, { fields })` — zajęte pola = suma poziomów; brak wolnego pola → „Brak wolnych pól…” (`no-fields`). SI Matka (także przy zamkniętej grze) nie proponuje budowy, gdy pól brak.
- **Przydział pól** (`core/colony/plots.ts`, `reconcilePlots`): pola przydzielone budowlom są zapisywane (`SlotSave.plots`, opcjonalne — starsze zapisy dostają przydział z poziomów) i **nigdy nie przestawiane**; nowa budowla dostaje wolne pole lądu najbliżej swojej dzielnicy, pierwsza danego typu — w swoim kierunku wokół środka kolonii (pole lądu z największą ilością lądu w okolicy). Budowa w toku już zajmuje swoje pole; anulowanie je zwalnia.
- **Widok:** budowla na środku każdego zajętego pola (2D i 3D) — bez dawnego limitu 10 budowli na typ i bez „rosnących” budowli; nowa budowla dalej „wyrasta”. Siatka pól: obrysy (turkus — wolny ląd, złoto — zajęte, szary — woda, lód, lawa), w 3D jedna siatka linii nad terenem (1 draw call, ukryta, gdy wyłączona). Panel „Planeta”: „POLA zajęte / lądu · wszystkich”.
- **Skutek dla istniejących planet:** przydział pól i limit dotyczą także starych zapisów. Planeta z większą liczbą poziomów niż pól zachowuje poziomy i produkcję (nic nie znika), ale nie da się jej dalej rozbudować; na planecie stoi tyle budowli, ile jest pól.
- **Następny krok (decyzje właściciela, v0.27):** wodę i życie mają od początku tylko planeta startowa i planety botów; nowe kolonie są jałowe i można je terraformować po odblokowaniu w badaniach — typ planety wynika ze strefy gwiazdy, liczba pól zostaje (zabudowanych pól nigdy nie zalewa). Lore: terraformowanie to otwarte O-305 — decyzję przenieść do Projektu lore.
- **Pomiar v0.25.2 (iPad, 3D, 42 s):** średnio 58 kl./s, najsłabsza sekunda 53, rozdzielczość 100%.

## 2026-10-24 — v0.25.2: płynność 3D na komputerze, wybór budowli przy każdym przybliżeniu

- **Płynność 3D na komputerze (zgłoszenie właściciela):** płótno 3D ma rozmiar całego okna, a na ekranach o zwykłej gęstości pikseli (komputer) było włączone wygładzanie krawędzi (MSAA) — na dużym monitorze to kilka milionów próbek na klatkę. Teraz MSAA tylko dla małych okien (< 1,3 mln pikseli). Do tego **automatyczna rozdzielczość** (`adaptiveResolution.ts`): gdy średnia klatka > 22 ms (okno 45 klatek), gęstość pikseli spada o 15% (do 60%); przy zapasie (< 15 ms przez 4 okna) wraca. Pojedyncze przerwy > 200 ms (karta w tle, przeliczenie planety) się nie liczą. Diagnostyka pokazuje „rozdzielczość N%”. iPad bez zmian (tam MSAA i tak było wyłączone).
- **Dotknięcie budowli przy każdym przybliżeniu** (wcześniej od 3×): kamera obraca się do trafionej budowli (konkretnej — `pickStructureHit` zwraca numer w dzielnicy), przybliża i otwiera okienko budynku. **Przybliżenie do budynku: 1,5× domyślnie, 3× jako opcja gracza** (decyzja właściciela; Ustawienia → „Widok”, zapamiętane na urządzeniu `planet-forge.focusZoom.v1`). Pokazany budynek wstrzymuje autoobrót (`PlanetDisplay.holdSpin`), dotyk planety albo „Resetuj widok” go zwalnia.
- **Dotknięcie karty w „Produkcji”** (poza przyciskami) pokazuje ten budynek na planecie z bliska; budynek na poz. 0 → komunikat.
- **Budowla w środku kadru:** `facingAngles` liczy obrót dokładnie z nachyleniem osi (3D) i z „podniesieniem” zależnym od przybliżenia (`focusLift`: przy 1× budowla nad środkiem tarczy, przy 3× prawie w środku). Autoobrót słabnie od 1× i wygasa od 2× (`DragRotator.spinFactor`) — oglądana budowla nie ucieka z kadru.
- Pomiar v0.25 (iPad, 3D, 5 s): średnio 58 kl./s, najsłabsza sekunda 49.

## 2026-10-24 — v0.25.1: przełączenie 2D ↔ 3D zachowuje przybliżenie

- Zgłoszenie właściciela: po zmianie grafiki planeta wracała do 1×. Do pamięci sesji (obok obrotu) trafia teraz także przybliżenie (`PlanetDisplay.zoomLevel()`), przywracane od razu (`setZoom(z, true)`); gesty sceny startują od tej wartości, więc szczypanie i przyciski liczą dalej od niej.
- Pomiar v0.25 (iPad, 3D, 5 s): średnio 58 kl./s, najsłabsza sekunda 49.

## 2026-10-24 — v0.25: lawa, kolory materiałów, światło, kamera (przebudowa generatora, etap 6)

- **Lawa bez „plam” (zgłoszenie właściciela):** morze lawy nie świeci już całą powierzchnią — to ciemna, zastygła skorupa z siecią żarzących się pęknięć (`createLavaVeins`: szerokie szczeliny + drobne pęknięcia z szumu grzbietowego). Ten sam wzór w 2D (piksel po pikselu), w 3D (tekstura morza 512 × 256: kolor + mapa świecenia, ok. 1 MB) i na lawie na lądzie. Jeziora lawy (kaldery) to skorupa z pęknięciami, pełny żar mają tylko strumienie przy źródłach; kolory nasycone, bez wybielania przez tonemapping. Naprawiony jasny pierścień wokół jezior lawy (brzeg jeziora rysował się jak woda; `InlandField.lavaLakes`).
- **Kolory lądu z materiałów profilu:** każde pasmo materiału ma kolor (`MaterialBand.color`, walidowany); 2D i 3D kolorują ląd pasmami z płynnym przejściem. Kolory przeniesione z dotychczasowej palety (wygląd zbliżony), pustynia ma osobny kolor piasku, lodowa — skały.
- **Światło z profilu także w 2D:** jasność nocy i siła światła gwiazdy z `style.ambient` / `style.sunIntensity` (jak w 3D).
- **Kamera:** płynne przybliżanie (`input/zoom.ts`: cel + wygładzanie, ~0,25 s; przy „Ogranicz ruch” od razu), zakres 0,8×–3,5× (lekkie oddalenie), wybór budowli dalej od 3×. Przyciski „+”, „−” i „Resetuj widok” (celownik) w prawym dolnym rogu wolnego miejsca (≥ 44 pt, nigdy na tarczy planety; gdy brak miejsca — telefon poziomo z otwartym panelem — chowają się, szczypanie działa). Komputer: klawisze + / − / 0. `PlanetDisplay.resetView()` — przybliżenie 1× i biegun u góry.
- **Spadek płynności v0.24 (najsłabsza sekunda 18 kl./s):** najpewniej jednorazowe przeliczenie planety (teren + hydrologia + ląd 3D + tekstura lawy, w Node 0,3–0,6 s). Przyspieszone: klucze wierzchołków lądu 3D liczbowe zamiast tekstowych (ląd 3D o 25–40% szybciej), pęknięcia lawy w teksturze liczone raz na teksel. Gra w trakcie zwykłej rozgrywki: średnio 57–60 kl./s.
- **Pomiar v0.24 (iPad, poziomo, 3D, 40 s):** średnio 57 kl./s, najsłabsza sekunda 18 (jednorazowe przycięcie — wyżej).
- `SURFACE_VERSION` bez zmian (4) — kształt terenu, woda i lawa się nie zmieniły, tylko wygląd.

## 2026-10-24 — v0.24: woda i lawa (przebudowa generatora, etap 5)

- **Hydrologia uproszczona, liczona raz** (`core/surface/hydrology.ts`, siatka detail 32): zalewanie od morza (priority-flood) wypełnia zagłębienia do najniższej przełęczy → jeziora z płaskim lustrem (min. głębokość i wielkość z profilu); kolejność zalewania wyznacza spływ do morza → rzeki tam, gdzie zlewnia przekracza próg. Rzeka zawsze płynie w dół (po powierzchni po zalaniu) i kończy się w morzu albo jeziorze.
- **Lawa** (profil z `liquid: 'lava'`): jeziora stają się jeziorami lawy (kaldery, stygnąca skorupa), a z najwyższych szczytów (do 6, odstęp ≥ 4 węzły) spływają strumienie najstromszym spadkiem — nigdy wyżej niż źródło, chłodniejsze dalej od źródła. Na planecie z lawą nie ma rzek wody; planeta jałowa (`none`) nie ma żadnej cieczy na lądzie. Morze lawy jak dotąd.
- **Profile stroją wodę** (`hydrology` w profilu): pustynia — rzadkie, głębokie jeziora i tylko duże rzeki; wulkaniczna — jeziora lawy tylko w wyraźnych kalderach.
- **Wyniki „pieczone”** do map sześciennych jak teren (`methods/baked.ts`, pole `inland` w `SurfaceField`). Koryta mają szerokość jednego węzła; interpolacja spłaszcza je, więc pola liniowe są wzmocnione ×1,8. Hydrologia liczona **leniwie** — miniatury i sąsiedzi na niebie jej nie używają (`discLook(planet, { inland: false })`), więc mapa układu nie zwalnia.
- **Model powierzchni:** nowe kody cieczy (dopisane): jezioro 3, rzeka 4, lawa 5; materiał `lava`. Walidacja: morze tylko poniżej poziomu morza, ląd/jeziora/rzeki/lawa powyżej.
- **Widok 2D:** jeziora (płytko przy brzegu, głębiej w środku), rzeki w kolorze płytkiej wody, lawa świeci także nocą. **3D:** jeziora jako płaskie lustro na poziomie przelewu (wierzchołki lądu podniesione do lustra — bez dodatkowej siatki i migotania), rzeki jako fasety w kolorze wody, lawa jako **jedna dodatkowa siatka** bez cieniowania tuż nad lądem (+1 draw call tylko na planetach z lawą), animowany jest tylko jej kolor.
- **Kolonia** nie stawia budowli w jeziorach, rzekach ani lawie (`isLand` z punktem); platformy na jeziorze stoją na lustrze. Gdy dzielnica jest otoczona wodą, po 300 próbach krąg poszukiwań się poszerza.
- **Koszt** (Node): pieczenie z hydrologią 20–250 ms na planetę (najdłużej erozja); rysowanie tarczy 2D (180 px) dalej szybsze niż teren sprzed v0.22: 20–27 ms wobec 33–36 ms na klatkę w Node. `SURFACE_VERSION` = 4.
- **Kolor terenu z materiałów** (piasek, bazalt, regolit) — przesunięty do etapu 6 (światło i kolory), żeby zmieniać wygląd jednym krokiem.
- **Pomiar v0.23 (iPad, pion, 3D, 60 s):** średnio 60 kl./s, najsłabsza sekunda 53.

## 2026-10-24 — v0.23: sześć profili powierzchni i atlas (przebudowa generatora, etap 4)

- **Profil powierzchni = dane** (`src/data/profiles/`, typ `SurfaceProfile` w `core/types.ts`): wygląd (paleta, morze, atmosfera, chmury, lód, styl 3D — przeniesione 1:1 z typów planet), dozwolone metody terenu z wagami, kombinacje niezgodne z powodem, rodzaj cieczy (dla etapu 5), oczekiwany udział lądu, pasma materiałów lądu. Profile to kategorie **techniczne** (CANON_STATUS R-003), nazwy robocze.
- **Typ planety wskazuje profil** (`surface: { profile }`); `visual` w definicji tylko nadpisuje wygląd profilu (`resolveLook`). Wszystkie losowania planety bez zmian — test regresji planety startowej przechodzi.
- **Metoda terenu losowana z wag profilu** w osobnym strumieniu (`<typ>|<seed>|surface-method`): preferowana 3, pozostałe 1 (ok. 60/20/20). Część planet dostaje inną metodę niż w v0.22; planeta startowa zostaje przy `tectonic`. `SURFACE_VERSION` = 3.
- **Niezgodne:** jałowy × erozja (bez wody i atmosfery doliny rzeczne byłyby fałszywym śladem) — nigdy nie losowana, w atlasie przekreślona.
- **Materiały z pasm profilu** (`classifyPoint`): nowe kody dopisane na końcu `MATERIALS` (piasek, skała, śnieg, popiół, bazalt, regolit). Renderery dalej kolorują według palety i wysokości — kolor z materiału przyjdzie razem z wodą i lawą (etap 5) albo światłem (etap 6).
- **`npm run atlas`** → `docs/atlas/atlas.png` (6 profili × 3 metody × 2 seedy, widok 2D) i `docs/atlas/metryki.md` (ląd, chaos, stromość, płaskie, igły, czas). Do oglądania na GitHubie.
- **Zmiana grafiki 2D ↔ 3D zachowuje obrót planety** (zgłoszenie właściciela): przy przełączeniu obrót trafia do pamięci sesji i jest przywracany po przeładowaniu (`PlanetDisplay.setOrientation`). Obie wersje liczą obrót tymi samymi wzorami (3D ma dodatkowo nachylenie osi planety).
- **Pomiar v0.22 (iPad, pion, 3D):** średnio 58 kl./s, najsłabsza sekunda 49 — bez zmian względem v0.21.

## 2026-10-22 — v0.22: trzy metody terenu (przebudowa generatora, etap 3)

- **Punkt odniesienia płynności (v0.21, iPad właściciela, 1080×778 @2, z ekranu początkowego):** 3D średnio 59 kl./s, najsłabsza sekunda 48 (pomiar 38 s); 2D średnio 58, najsłabsza sekunda 50–57 (pomiary 2–17 s). Po v0.22 porównujemy z tymi liczbami.
- **Metody** w `core/surface/methods/` z rejestrem `index.ts`: `tectonic` (płyty — ciągła wersja komórek Woronoja na sferze, zderzenia wypiętrzają pasma gór, rozejścia tworzą rowy), `erosion` (wyżyny z szumu + erozja hydrauliczna i termiczna na siatce detail 32, 20 iteracji, na końcu doliny wcinane wzdłuż sieci spływu), `fractured` (40–70 kraterów z wałem i płaskim dnem, uskoki i szczeliny wzdłuż wielkich kół, płaskowyże, ostre grzbiety). `legacy` zostaje (test regresji, odniesienie rozkładu wysokości, przyszłe „Laboratorium planet”).
- **Metoda preferowana typu** w `visual.terrainMethod` definicji (tabela § 3 planu generatora): umiarkowana, lodowa, oceaniczna — `tectonic`; pustynna — `erosion`; wulkaniczna, jałowa — `fractured`. Profile i wybór spośród kilku metod — etap 4.
- **„Pieczenie” zamiast liczenia w klatce:** kształt liczony raz na planetę do mapy sześciennej 6 × 48² (z ramką jednego teksela — bez szwów na krawędziach ścian), przy odczycie interpolacja + 3 oktawy detalu. Odczyt jest szybszy niż `legacy` (ważne dla widoku 2D, który liczy tarczę co klatkę). Pieczenie w Node: 20–150 ms; gotowe pola w pamięci podręcznej (24 ostatnie planety).
- **Metoda zmienia kształt, nie bilans lądu i wody:** wysokości są przeliczane (kwantyle 1%, poziom morza, 99%) do rozkładu terenu `legacy` tej samej planety. Udział lądu, zakres gór, paleta, promień, lód i zakresy `seaLevel` w danych typów działają bez zmian. Rozgrywka (`GENERATOR_VERSION` = 1) nietknięta.
- **`SURFACE_VERSION` = 2** — wszystkie planety, także zapisane, dostają nowy teren (wariant A).
- **Determinizm:** w metodach tylko + − × ÷ sqrt i stała kolejność (sortowanie z rozstrzyganiem remisów indeksem); kierunki losowe bez funkcji trygonometrycznych.
- **Obrót przez bieguny (zgłoszenie właściciela):** pochylenie palcem nie ma już limitu (było ±1,1 rad ≈ 63°, przez co bieguny nigdy nie trafiały na środek). Wartość `pitch` rośnie w sposób ciągły; za biegunem ruch w bok jest odwracany, żeby powierzchnia szła za palcem; autoobrót wraca do najbliższego „pionu”. Bez zmian w rendererach (2D, 3D, wybór budowli i tło liczą obrót tymi samymi wzorami).
- **Pomiar w pionie (v0.21, okno 810×1048, 3D):** średnio 59/58 kl./s, najsłabsza sekunda 49/54.
- **Metryki** (`core/surface/metrics.ts`: rozrzut, stromość, „chaos”, igły, udział płaskiego lądu) — testy pilnują, że metody się różnią i nie mają igieł; posłużą też `npm run atlas` w etapie 4.

## 2026-10-22 — v0.21: wysuwana lista planet z przycisku ☰ (szkic właściciela)

- **Okrągły przycisk ☰** (lewy dół) wysuwa panel „Planety” zamiast osobnego menu: lista planet imperium (miniatura, nazwa, adres, budowa z odliczaniem albo zapasy; aktywna — złota ramka, „Tu jesteś”). Dotknięcie innej planety przełącza na nią (panel zostaje otwarty). Gdy planet jest więcej, niż się mieści — „…i jeszcze N — wszystkie w „Imperium””.
- Pod listą **Ustawienia** i przyciski paska, które nie zmieściły się na wąskim ekranie (telefon). Pełny ekran „Imperium” (karty, usuwanie, dziennik, SI) zostaje na pasku.

## 2026-10-22 — v0.20: ulepszanie budynków dotknięciem na planecie (etap 2 z 2)

- **Dotknięcie budowli** (2D i 3D) otwiera okienko „Budynek” nad dolnym paskiem — ta sama karta co w „Produkcji” (poziom, efekt, koszt, „Ulepsz”; w trakcie budowy „Ukończ teraz” / „Anuluj”). Plac budowy też da się dotknąć. Dotknięcie obok budowli albo krzyżyk zamyka okienko.
- **Od przybliżenia 3×** (`PICK_ZOOM` = 80% drogi od 1× do 3,5×, decyzja właściciela). Przy mniejszym przybliżeniu dotknięcie budowli pokazuje podpowiedź „Przybliż planetę dwoma palcami…”.
- **Tap w `GestureTracker`:** jeden palec, przesunięcie ≤ 12 pt, ≤ 450 ms; szczypanie nigdy nie jest tapem.
- **Wybór w czystej matematyce** (`planet-renderer/pick.ts`): rzut budowli kolonii tym samym obrotem co renderery — 2D rzut prostokątny, 3D perspektywa kamery z nachyleniem osi i budowlami na tarasach. Promień trafienia 26 pt. `PlanetDisplay.pickStructure(x, y)` — nowa metoda interfejsu (Phaser dalej nie zna Three.js).
- Panel „Produkcja” zostaje drugą drogą (m.in. budynki na poziomie 0, których nie ma jeszcze na planecie).

## 2026-10-22 — v0.19: nowy układ ekranu (szkice właściciela, etap 1 z 2)

- **Układ ze szkiców:** pasek zasobów u góry, **dolny pasek** z przyciskami na całą szerokość, nad nim **wysuwany panel** (otwarty najwyżej jeden). Boczne panele (planeta po lewej, produkcja po prawej) usunięte.
- **Przyciski paska:** Produkcja, Planeta, SI → wysuwają panel (drugie dotknięcie zamyka); Badania, Mapa, Imperium → ekran pełnoekranowy. Po lewej okrągły przycisk **menu** (trzy kreski): wszystkie przyciski + Ustawienia. Na wąskim ekranie (telefon) przyciski, które się nie mieszczą, są tylko w menu.
- **Planeta ≤ 30% ekranu** (średnica ≤ 30% dłuższego boku, `PLANET_SCREEN_SHARE`); stoi pośrodku wolnego miejsca. Komputer i tablet (obie orientacje): panel po lewej, dosunięty do paska, tak wysoki jak treść — planeta przesuwa się w prawo. Telefon pionowo: panel na całą szerokość nad paskiem, planeta nad nim.
- **Panel SI:** stan SI Matki i samodzielność reguł (Podpowiada / Pyta / Samo); pełny opis zostaje w „Imperium” → „SI”.
- **Pamięć urządzenia:** nowy klucz `planet-forge.ui.v2` (`{ open }`); stary stan zwijanych paneli → rozwinięta produkcja = otwarta „Produkcja”.
- **Etap 2 (następny):** ulepszanie budynków dotknięciem budowli na planecie (2D i 3D), aktywne od przybliżenia ≥ 80% drogi do maksimum (decyzja właściciela: wariant „1b”); panel „Produkcja” zostaje drugą drogą (budynki na poziomie 0).

## 2026-10-21 — v0.18: wspólny model powierzchni i planety jałowe (przebudowa generatora, etap 2)

- **Decyzje właściciela:** (1) wariant A — po przebudowie wszystkie planety, także zapisane, dostają nowy teren; rozgrywka (promień, surowce, modyfikator) bez zmian. (2) roboczy typ „jałowa” na mapie galaktyki.
- **Teren w `core/surface`.** Siatka geodezyjna o tym samym podziale co `IcosahedronGeometry` (test sprawdza pokrycie wierzchołków), z sąsiadami i szybkim „najbliższym węzłem” (kubełki + zachłanny marsz po sąsiadach, test z pełnym przeszukaniem). Pole terenu jest ciągłe (2D, kolonia), a model na siatce (`buildSurface`) daje wysokość, ciecz (ocean / zamarznięte morze), materiał i statystyki; `validateSurface` sprawdza NaN, zakresy i spójność cieczy z poziomem morza. Algorytm v0.17 przeniesiony jako metoda `legacy` — test regresji porównuje wartości z v0.17 co do 12 cyfr, więc wygląd gry się nie zmienia.
- **Renderery bez zmian** — `planet-renderer/surface.ts` jest adapterem (`SurfaceSampler`). Na bogatszy model (jeziora, lawa) przejdą w etapie 5. Model na siatce nie jest jeszcze używany w grze (budowany w testach); użyją go etapy 3–5.
- **Wersje:** `GENERATOR_VERSION` = 1 na stałe (klucz strumienia rozgrywki i zapisu). `SURFACE_VERSION` (= 1) opisuje wygląd terenu; nie trafia do zapisu, bo zgodnie z wariantem A wygląd nie musi być zamrażany.
- **Typ „jałowa” (`barren`, robocza):** bez atmosfery i chmur, skały i pył, woda tylko w nielicznych najgłębszych kotlinach, małe szronowe czapy; więcej metalu, mniej kryształów (wartości robocze). Na mapie przez `GALAXY_RULES.laterTypes`: osobny strumień RNG na typ zamienia część planet (gorąca 30%, ciepła 10%, umiarkowana 4%, chłodna 15%, mroźna 35%) — **pozostałe planety mapy są identyczne jak przed v0.18** (test), miejsca startowe nigdy nie są zamieniane. Planety już skolonizowane zachowują typ z zapisu (mapa pokazuje planetę gracza). Statek lecący do planety, która stała się jałowa, założy kolonię jałową.

## 2026-10-21 — przebudowa generatora planet i UI: etap 1 (audyt, kontrakty)

- **Specyfikacja właściciela** zapisana w `docs/specyfikacja-generatora-i-ui.md`; audyt, kontrakty danych i plan 8 etapów (v0.18–v0.24) w `docs/generator-plan.md`. Kod gry bez zmian.
- **Kompozycja zamiast drugiego rejestru:** `PlanetDefinition` zostaje jedynym rejestrem typów; dostaje odwołanie do profilu powierzchni (`data/profiles/`) i dozwolonych metod terenu (`core/surface/methods/`). Teren staje się danymi w `core` (`SurfaceModel`), renderery czytają go przez dotychczasowy `SurfaceSampler` (adapter).
- **Wersje:** `GENERATOR_VERSION` = 1 na stałe dla strumienia `gameplay` (surowce i promień się nie zmienią); nowa `SURFACE_VERSION` dla wyglądu terenu. `restoreSlots` nie może już po cichu pomijać planet z inną wersją — poprawka w etapie 2.

## 2026-10-21 — v0.17: kosmos, który żyje (modernizacja wyglądu, etap 2)

- **Plan modernizacji** (prompt właściciela „Visual Upgrade 2.0”): etap 2 kosmos i światło (v0.17) → etap 3 kolonia (światła instalacji, wybór budowli dotykiem z panelem danych) → etap 4 interfejs (kompaktowy pasek zasobów z animacją przyrostu, mały panel planety, dolna nawigacja z ikonami, budowa i badania w wysuwanych panelach). Każdy etap osobno, do akceptacji.
- **Tło kosmosu wspólne dla 2D i 3D** (`planet-renderer/spaceBackground.ts`, rozmieszczenie w czystym `sky.ts`): osobna warstwa DOM pod przezroczystym płótnem planety. Płótna Canvas 2D rysowane raz (przy zmianie rozmiaru/planety) w rozdzielczości 1:1 z pikselami CSS (mało pamięci na Retinie), paralaksa = `transform` CSS (praca kompozytora). Brak dodatkowego kontekstu WebGL; gwiazdy z Three.js usunięte (mniej rysowania w 3D).
- **Paralaksa** zależy od prędkości obrotu (przesunięcie wraca do zera w ~1 s), nie od kąta — autoobrót nie „ucieka” z tłem. Odczyt przez `PlanetDisplay.orientation()`.
- **Odległe ciała = prawdziwe dane**: 1–2 najbliższe orbitalnie planety z układu aktywnej planety (mapa galaktyki), skaliste rysowane tym samym generatorem co mapa (seed = adres), gazowe olbrzymy z ich pasów i pierścieni. Kolor gwiazdy układu barwi jedną mgławicę. Nic nie jest wymyślone ani interaktywne na pokaz.
- **Światło 2D**: ostrzejszy terminator, noc 0,07 zamiast 0,18, cienka poświata przesunięta ku stronie dziennej; świecące morza (lawa, `ocean.emissive`) mają minimalną jasność także nocą (`discLook`).
- **„Ogranicz ruch”** respektowany w obu widokach (bez autoobrotu, paralaksy, migotania i spadających gwiazd). Losowość spadających gwiazd tylko wizualna (poza logiką gry).

## 2026-10-21 — v0.16: planeta 3D w stylu low-poly

- **Audyt (przyczyny „miękkiego” wyglądu):** kolory z interpolacji wierzchołków (rozmyte granice lądu i lodu), wygładzone normalne (brak czytelnej rzeźby), mocne światło otoczenia (jasna nocna strona), gruba atmosfera z mgiełką na całej tarczy (efekt „mleka”), lód morski chowany pod oceanem.
- **Ląd low-poly** (`planet-renderer/lowPoly.ts`, czysta matematyka): icosfera bez indeksów (`SURFACE_DETAIL` 40 ≈ 34 tys. faset), jeden kolor na fasetę, tarasy wysokości, przyciemnione strome ściany, drobna losowość jasności faset, `flatShading`. Zamarznięte morze = płaska tafla lodu tuż nad wodą. Budowle kolonii stoją na tej samej (tarasowanej) wysokości.
- **Światło:** tone mapping ACES, słabsze światło otoczenia (półkula), mocniejsze kierunkowe — ciemna noc z widocznym zarysem. Atmosfera: cieńsza, zanikająca na nocnej stronie, mniej mgiełki.
- **Ruch i tło:** autoobrót wraca płynnie (2 s narastania), gwiazdy w 2 warstwach z lekką paralaksą; „Ogranicz ruch” w systemie wyłącza autoobrót i paralaksę.
- **Styl w danych:** `visual.style` (tarasy, rzeźba, losowość faset, cień klifów, siła słońca i otoczenia, szerokość atmosfery) z domyślnymi `DEFAULT_SURFACE_STYLE`; planeta lodowa ma własne wartości. Pole tylko wizualne, nie losowane — seedy, `GENERATOR_VERSION` i zapis bez zmian.
- Widok 2D bez zmian (domyślny); jeden kontekst WebGL jak dotąd.

## 2026-10-20 — v0.15: badania przypisane do planety, limit SI, SI podczas nieobecności

- **Badania na planetę** (decyzja właściciela): każda planeta ma własne Laboratorium, kolejkę i listę zbadanych (`SlotSave.research`); efekty (`applyResearch`) działają tylko na niej — balans liczony osobno dla każdej planety. Trudniejsze badania dla całego imperium przyjdą ze **stacją badawczą** (etap „Stacja i handel”).
- **Odblokowania działają w całym imperium**, jeśli zbadała je którakolwiek planeta: statek kolonizacyjny, SI Matka/wykonawcze/Autonomia, dodatkowe miejsce na planetę. Antymateria zostaje wspólna.
- **Zapisy sprzed v0.15:** zbadane trafiają na wszystkie planety; trwające badanie — na planetę, która za nie zapłaciła (pole `research` imperium zostaje puste dla zgodności formatu).
- **Limit SI = Laboratorium** (decyzja właściciela): SI proponuje i buduje budynki najwyżej do poziomu Laboratorium tej planety; Laboratorium ulepsza tylko gracz (inaczej SI podnosiłaby sobie limit).
- **SI podczas nieobecności** (decyzja właściciela, budowy ~50% dłuższe): po badaniu „Autonomia” (ramię SI, pierścień 3) reguły „działa samo” budują przy zamkniętej grze — symulacja czasu w `core/ai/offline.ts` (w limicie nieobecności; tylko budowy, bez badań). Działa dla aktywnej planety przy wczytaniu i dla każdej planety przy przejściu na nią. Wpisy w dzienniku z czasem zdarzenia.
- **DNA** (pomysł właściciela, na później): generator planet, SI i badania oparte na „DNA”, z którego powstają stworzenia — do doprecyzowania i z Lore Bible.

## 2026-10-20 — v0.14: SI Matka (etap 1)

- **Koncepcja właściciela:** SI Matka proponuje, gracz decyduje; trzy poziomy samodzielności na regułę: podpowiada / pyta / działa samo (raport w dzienniku).
- **Reguły** (`core/ai/advisor.ts`, czyste funkcje): energia (brak albo za mały zapas na kolejną kopalnię) → magazyn (≥ 90%) → najtańsze badanie bez antymaterii → kopalnia surowca, którego jest mniej. Propozycja tylko, gdy da się ją wykonać teraz. Wykonanie zwykłymi akcjami gry (`upgradeBuilding`, `startResearch`).
- **Odblokowanie w badaniach** (ramię SI aktywne): „SI Matka” (pierścień 1) — propozycje; „SI wykonawcze” (pierścień 2) — poziom „działa samo” („Zawsze tak rób”). „Autonomia” (działanie podczas nieobecności) — `soon`. Bez SI wykonawczych reguła ustawiona na „działa samo” liczy się jak „pyta”.
- SI obserwuje **aktywną** planetę i działa tylko przy otwartej grze (jedno działanie na odświeżenie). „Nie” wycisza regułę na 10 min (tylko w tej sesji). Poziomy w zapisie: `EmpireSave.ai` (opcjonalne, domyślnie „pyta”).
- **UI:** dymek nad planetą (szeroki ekran — między panelami u góry; tablet pionowo — na dole; telefon — pod panelem planety); zakładka „SI” w „Imperium”.

## 2026-10-20 — v0.13: statek kolonizacyjny, ekran „Imperium”, dziennik ekspedycji

- **Kolonizacja innych układów** (decyzja właściciela: po badaniu i ze statkiem). Ramię Eksploracja jest aktywne; pierwsze badanie „Napęd międzygwiezdny” (efekt `unlock: colony-ship`) odblokowuje statek. Kolejne badania ramienia to `soon` (widoczne, niedostępne). Statek budowany i wysyłany jednym dotknięciem z mapy (koszt z aktywnej planety, `Balance.colonyShip` — robocze); czas lotu = podstawa + odległość między układami na mapie × współczynnik. Bez osobnego budynku Stoczni — wróci razem z flotą. Statki w drodze rezerwują miejsce w imperium, można je zawrócić (pełny zwrot). Przylot (też offline) zakłada nieaktywną kolonię. Zapis: `EmpireSave.missions` (opcjonalne).
- **Dziennik ekspedycji:** ostatnie 80 wpisów w zapisie (`EmpireSave.journal`, opcjonalne); wpisy z nadrabiania czasu dostają czas zdarzenia (np. chwila ukończenia budowy).
- **Ekran „Imperium”** (`game/scenes/EmpireScene.ts`) zastępuje okno „Twoje planety”: karty planet ze stanem liczonym „na teraz” (nieaktywne — jak przy przejściu, bez zmiany zapisu), statki w drodze, zakładka „Dziennik”; lista przewijana palcem.

## 2026-10-20 — v0.12: gazowe olbrzymy, pasy asteroid, komety, galaktyka spiralna

- **Gazowe olbrzymy** (prośba właściciela): część planet skalistych zamienia się w olbrzymy — rzadko blisko gwiazdy (6–10%), często daleko (40–50%); nigdy miejsca startowe. Osobny strumień RNG (`…|bodies`), więc planety skaliste, miejsca startowe i formy obce się nie zmieniają; `GALAXY_VERSION` bez zmian. Olbrzymów nie da się skolonizować (później: stacje wydobycia gazu). Wygląd: pikselowe pasy z palety ciepłej/zimnej, ~45% z pierścieniem — rysowane w widoku układu, bez zmian w rendererze planet. Twoja planeta pod adresem, który stał się olbrzymem (kolonia z v0.11), zostaje Twoja i wygląda jak dotąd.
- **Pas asteroid** za 3. albo 4. planetą (decyzja właściciela), ~60% układów, które mają planetę za pasem. Bez adresu; wydobycie — później.
- **Komety:** w widoku galaktyki maks. 3 naraz, przelot 12–20 s z warkoczem; tylko wygląd.
- **Galaktyka spiralna zamiast „shurikena”:** układy w zgrubieniu centralnym (~14%) i wzdłuż dwóch ramion spirali logarytmicznej (`SPIRAL`, `spiralPoint` w `core/galaxy`); tło rysowane raz do tekstury 1024 px (jądro, ~11 tys. gwiazd ramion, obłoki wodoru, pasy pyłu). Zmieniły się tylko położenia układów na mapie — numery, nazwy, gwiazdy i planety zostały. Nowe gry mogą startować w innym układzie niż w v0.11; zapisany układ startowy gracza się nie zmienia.

## 2026-10-20 — v0.11: mapa galaktyki, układy gwiezdne, adresy planet

- **Galaktyka = przyszły serwer.** Cała galaktyka powstaje deterministycznie z numeru (`core/galaxy/galaxy.ts`, `GALAXY_VERSION = 1`, dane `data/galaxy.ts` — robocze): 100 układów w spiralnym dysku z odstępami (miejsce na przyszłe stacje, porty handlowe, planety gildii). Na razie jedna galaktyka, gra bez serwera.
- **Adres planety** `galaktyka:układ:orbita` (np. `1:4:5`). Planety z galaktyki mają seed = adres, nazwę od układu („Wolf-122 f”), typ wynikający z gwiazdy i odległości (temperatura = √(jasność / orbita) → strefa gorąca…mroźna → wagi typów). `GENERATOR_VERSION` bez zmian — wygląd planety z seeda działa jak dotąd.
- **Układ:** 3–10 planet; miejsca startowe graczy: 2 przy ≤ 7 planetach, 3 przy większych (decyzja właściciela: przy 7 planetach maks. 2 graczy, zawsze min. 2). Bez serwera pozostałe miejsca startowe zajmują boty (na razie tylko oznaczenie na mapie). Reszta planet: wolne (do przejęcia) albo z formą obcą (~20%, przejęcie — wkrótce).
- **Gracz:** startuje na miejscu startowym w strefie umiarkowanej pierwszego układu z ≥ 5 wolnymi planetami. Kolonizacja wolnych planet własnego układu z mapy („Skolonizuj” zastępuje losowe „Nowa planeta”). Inne układy: po badaniu i ze statkiem kolonizacyjnym (decyzja właściciela — kolejne etapy).
- **Zgodność zapisów:** adres planety (`planet.address`) i miejsce startowe (`home`) to pola opcjonalne. Zapisy sprzed v0.11: pierwsza planeta trafia na miejsce startowe, kolejne na wolne planety układu startowego — z zachowaniem seeda, wyglądu i postępu.
- **Ekrany pełnoekranowe** (Badania, Mapa) mają wspólną podstawę `game/scenes/OverlayScene.ts` (tło, przesuwanie/przybliżanie, stuknięcie, panele, komunikaty).

## 2026-10-20 — strojenie balansu na koniec

- Ceny, czasy i koszty (budynki, badania, antymateria) właściciel ustawi pod koniec prac, przed MVP. Do tego czasu wszystkie liczby w `src/data` są robocze i nie są osobnym etapem.

## 2026-10-20 — v0.10: badania (etap 1 — silnik i galaktyka)

- **Gwiazdy mistrzowskie (decyzja właściciela: b).** Na krawędzi każdego ramienia jedna gwiazda mistrzowska; zbadać będzie można wszystkie, ale aktywne naraz maks. 2 (specjalizacje imperium). W tym etapie widoczne jako „wkrótce”.
- **Reguły (`core/research/research.ts`, dane `data/research.ts`, robocze).** Badania wspólne dla imperium (`EmpireSave.research`, pole opcjonalne — stare zapisy = nic nie zbadano; `EMPIRE_VERSION` bez zmian). Naraz jedno badanie, niezależnie od budowy. Koszt płaci aktywna planeta (metal, kryształy), od pierścienia 4 także antymateria ze wspólnego portfela; anulowanie zwraca wszystko (surowce do planety, która płaciła). Koszt × 2,6 na pierścień i × 1,03 za każde ukończone badanie. Czas 90 s × 2,2^(pierścień − 1), krótszy o 8% za każdy poziom Laboratorium ponad 1.
- **Laboratorium** (6. budynek, startuje od poz. 0, zużywa trochę energii). Liczy się najwyższe Laboratorium w imperium. Pierścienie 1–5 wymagają poz. 1, 2, 4, 6, 8.
- **Efekty jako zmiana balansu.** `applyResearch(BALANCE, zbadane)` daje nowy obiekt `Balance` (wydobycie, zużycie energii, czas i koszt budowy, magazyn, godziny offline, antymateria, „Ukończ teraz”, kary środowiska, miejsca na planety); gospodarka liczy dalej tymi samymi funkcjami. Procenty jednego rodzaju sumują się. Badanie ukończone w trakcie naliczania działa od chwili ukończenia (podział czasu jak przy budowie). Kary środowiska (efekty < 1) słabną z `environmentPenalty`; premie zostają.
- **Miejsca na planety z badań** (Osadnictwo: +1) trafiają do zapisu jako `unlockedSlots`, więc walidacja zapisu z 6 planetami przechodzi.
- **Ekran „Badania”** to osobna scena Phaser nad HUD-em (HUD planety ma wtedy wyłączony dotyk). Układ galaktyki to czysta matematyka (`game/ui/galaxy.ts`, testowana: gwiazdy nie nachodzą na siebie). Jeden palec przesuwa, dwa przybliżają (ten sam `GestureTracker`), stuknięcie zaznacza gwiazdę (cel ≥ 24 pt promienia). Nazwy gwiazd dopiero przy przybliżeniu.
- **Układ HUD:** 6 kart. Na szerokim ekranie karta, która nie mieści się w prawej kolumnie, trafia do osobnego panelu pod panelem planety (zamiast drugiej kolumny, która zmniejszała planetę). Panel planety ma przycisk „Badania” (tryb boczny); na telefonie wejście przez kartę Laboratorium.
- **Mosty między ramionami** — w kolejnym kroku.

## 2026-10-20 — plan: badania jako galaktyka (ustalenia przed v0.10)

- **Drzewko badań w kształcie galaktyki:** jądro w centrum, 6 spiralnych ramion (kategorii), im dalej od centrum, tym droższe badania; mosty między ramionami. Badania globalne dla całego imperium, własna kolejka (niezależna od budów), koszt w metalu i kryształach, dalsze pierścienie także w antymaterii. Nazwy i liczby robocze.
- **Ramiona (decyzja właściciela):** Produktywność (wydobycie, energetyka, inżynieria, logistyka **i antymateria**), Planetologia, Eksploracja (dawne Astronautyka + Archeologia; treść o cywilizacjach dopiero z Lore Bible), Stacja i handel (stacja od modułu orbitalnego do sztucznej planety, rynek kupców sterowanych przez grę, szlaki handlowe), SI (SI Matka proponuje, SI wykonawcze wykonują; 3 poziomy samodzielności: proponuje / pyta / działa samo), Flota.
- **Flota:** najpierw cywilna (transport, ekspedycje), walka w kolejnym etapie — świadome rozszerzenie zakresu MVP przez właściciela.
- **Laboratorium:** nowy budynek; jego poziom ogranicza, jak daleko od centrum galaktyki można badać.
- **Kolejność etapów:** (1) silnik badań + ekran galaktyki (aktywne Produktywność i Planetologia), (2) SI, (3) Stacja i handel, (4) Eksploracja, (5) Flota.
- Gwiazdy mistrzowskie: maks. 2 aktywne naraz (decyzja: b, zob. v0.10).

## 2026-10-20 — v0.9: zwijane panele, mniejsze UI, skalowanie komputer/tablet/telefon

- **Poprawki właściciela (zrzuty z zaznaczeniami):** UI „trochę za duże”; planeta ma dominować; panel planety z minimalizacją (żółte), budynki w zwijanym panelu „Produkcja” z przyciskiem w prawym górnym rogu (czerwone). Pionowo: panel planety **nad** planetą, „Produkcja” **pod** nią; poziomo: po bokach. Start z rozwiniętymi panelami, stan zapamiętany na urządzeniu (`game/ui/uiPrefs.ts`, `planet-forge.ui.v1`). Zwijanie wyłącznie przyciskami (gest na planecie nic nie zamyka).
- **Układ (`game/ui/layout.ts`)** liczy prostokąty z rozmiaru ekranu i stanu paneli; planeta zajmuje wolne miejsce między panelami i płynnie (0,32 s) rośnie po ich zwinięciu. Zwinięty panel planety: nazwa, typ, seed, klasa + „Planety”/„Ustawienia”. Zwinięta „Produkcja”: zakładka z ikoną menu i paskiem postępu trwającej budowy. Wszystkie 5 budynków w jednym panelu (koniec osobnej karty Kolektora pod panelem planety).
- **Poprawka właściciela (B):** panele po bokach planety także na tablecie w pionie (jak w poziomie). Na wąskim ekranie planeta ma stały rozmiar (mieści się obok jednego panelu), a otwarty panel „odsuwa” scenę: prawy (Produkcja) → planeta w lewo, lewy (panel planety) → w prawo, oba → planeta pośrodku, częściowo pod panelami. Telefon w pionie zostaje w układzie góra/dół (za wąski na boki). `Layout.mode`: `'sides' | 'stacked'`.
- **Skalowanie:** jeden układ dla komputera, tabletu i telefonu; `u = clamp(min(szer., wys.) / 880, 0,8, 1,1)` — na iPadzie ok. 14% mniej niż w v0.8. Boczne panele tylko na ekranach szerokich i ≥ 500 pt wysokich (telefon poziomo → układ góra/dół). Przy ciasnym miejscu karty układają się w więcej kolumn. Przyciski zawsze ≥ 44 pt. Komputer: kółko myszy przybliża planetę. Testy układu: 8 rozmiarów ekranu × 4 stany paneli.

## 2026-10-20 — v0.8: przybliżanie dwoma palcami, miniatury planet, krawędź lodu

- **Pomiar przed decyzją:** iPad właściciela (10,2", iPadOS 26) w 2D: średnio 60 kl./s, najsłabsza sekunda 53 → jest zapas na przybliżanie i animowane miniatury.
- **Przybliżanie (1×–3,5×):** logika gestów w `src/game/ui/gestures.ts` (czysta, testowana): jeden palec obraca, drugi palec przełącza na szczypanie, palec pozostały po szczypaniu nic nie robi do podniesienia. `PlanetDisplay.setZoom()`: w 2D tarcza rośnie wokół środka (pod panelami), rozdzielczość bufora rośnie maks. do 1,6× (koszt ~2,6×), a od 1,25× piksele są ostre (bez wygładzania — styl pixel-art); w 3D kamera się przybliża. Ruch palca obraca planetę wolniej przy zbliżeniu (teren „pod palcem”).
- **Miniatury w „Twoje planety”:** `PlanetThumbnail` (planet-renderer) rysuje tarczę 36 × 36 px tym samym kodem co planeta 2D (`discRenderer.ts`, wydzielony z widoku 2D); UI wstawia ją jako teksturę Canvas z filtrem NEAREST i obraca ~12 kl./s tylko przy otwartym oknie.
- **Krawędź lodu:** płynne przejście lodu nad morzem dawało w 2D rozmyte pionowe „zacieki”, a czapa kończyła się prostą linią. Teraz granica jest nieregularna (drobny szum) i wyraźna; zamarznięte morze jest nieco ciemniejsze od lodu na lądzie. Zmiana tylko wizualna (`surface.color` dostaje pełną pozycję punktu) — seedy, planety i zapisy bez zmian; ikony aplikacji odświeżone przy buildzie.

## 2026-10-20 — v0.7: planeta 2D domyślnie, kilka planet, licznik płynności

- **2D domyślnie (decyzja właściciela).** Pikselowa planeta 2D z obrotem palcem to główny wygląd gry; model 3D jest opcją w Ustawieniach → Grafika („Włącz 3D” / „Wróć do 2D”). Tryb zapisany w `bootGuard` (`'2d' | '3d'`, stare „auto” = 2D). Nieudany start w 3D przełącza na stałe na 2D. Budowle w 2D to kwadraty 2 × 2 piksele planety, wyrównane do jej siatki; plac budowy — złota ramka wypełniana od dołu wraz z postępem.
- **Kilka planet (imperium).** Zapis `planet-forge.empire.v1` (`src/core/save/empire.ts`): lista miejsc (`kind: 'planet'` — miejsce na przyszłe księżyce, stacje itd.), aktywne miejsce, liczba odblokowanych miejsc i wspólny portfel antymaterii. Miejsca: `planetSlots.base` = 5 na start, `max` = 10 (odblokowanie przez przyszłe akcje/lokacje — interpretacja prośby właściciela, do potwierdzenia). Stary zapis jednej planety jest przenoszony automatycznie (stary klucz zostaje jako kopia).
- **Nieaktywne planety dalej „żyją”:** przy przejściu na planetę nadrabia ona czas jak po nieobecności (maks. 8 h), także kończąc budowy. Przyrost pasywny antymaterii liczy się raz (na aktywnej planecie — nadrabianie używa balansu z `passivePerHour: 0`), a kolektory każdej planety dokładają do wspólnego portfela. Nowa planeta nie dostaje zapasu startowego antymaterii.
- **„Nowa planeta”** już nie kasuje postępu: trafia na wolne miejsce w oknie „Twoje planety” (przycisk „Planety” w panelu planety). Usuwanie: tylko nieaktywnej planety, drugim dotknięciem („Na pewno?”).
- **Eksport „PF2:”** obejmuje całe imperium; „PF1:” (jedna planeta) nadal się wczytuje i staje się imperium z jednym miejscem.
- **Poprawka bezpiecznika:** odświeżenie, schowanie albo zamknięcie gry przed upływem 8 s liczyło się jako awaria (u właściciela przełączyło to grę w „tryb bezpieczny 2D”). Teraz `pagehide` i schowanie karty oznaczają start jako zamknięty przez gracza; awarią jest tylko zniknięcie gry bez tych zdarzeń.
- **Licznik płynności** (`src/app/fpsMeter.ts`): klatki na sekundę z ostatniej minuty (średnia i najsłabsza sekunda), przerwy w tle pomijane; w Ustawienia → Diagnostyka.

## 2026-10-20 — v0.6.1: awaria startu z ekranu początkowego (hotfix)

- **Objaw (iPad, właściciel):** gra uruchomiona z ikony wczytuje się, po czym iPad się restartuje; raz biały ekran. W artefakcie (mniejsze okno wewnątrz claude.ai) gra działała.
- **Najbardziej prawdopodobna przyczyna:** pamięć grafiki. Gra tworzyła dwa pełnoekranowe konteksty WebGL (Phaser w trybie AUTO + Three.js), planetę w 2× Retina z wygładzaniem krawędzi (MSAA) i panele w 2× (do 3×). Na pełnym ekranie iPada to kilkaset MB buforów. Nie dało się tego odtworzyć bez iPada — poprawki zmniejszają ryzyko, a bezpiecznik chroni przed pętlą awarii.
- **Zmiany:** Phaser rysuje w Canvas 2D (jedyny kontekst WebGL ma planeta); planeta bez MSAA na ekranach Retina; bufor planety ograniczony do ~2,4 mln pikseli (`renderPixelRatio`); panele maks. 2×; `powerPreference: 'default'`; ochrona przed zerowym rozmiarem okna tuż po starcie z ikony.
- **Bezpiecznik startu (`src/app/bootGuard.ts`):** kroki startu zapisywane w `localStorage`. Gdy poprzednie uruchomienie nie dotrwało do 8 s widocznej pracy, następne startuje w trybie bezpiecznym (planeta 2D), od razu włącza czekającą nową wersję gry (może zawierać poprawkę) i pokazuje komunikat. Ustawienia → „Grafika”: przełącznik 3D / tryb 2D i „Diagnostyka” (kroki ostatniej awarii, model przeglądarki, ekran — bez danych osobowych) do skopiowania.
- **Hotfix do `main` bez czekania na akceptację:** opublikowana gra nie uruchamiała się u właściciela, a sprawdzenie poprawki wymaga publikacji. Wyjątek dopisany do zasad w `CLAUDE.md`.

## 2026-10-20 — hosting: GitHub Pages (decyzja właściciela)

- Gra jest publikowana pod `https://kol4t.github.io/Planet-forge/` przez GitHub Actions (`.github/workflows/pages.yml`): każde wypchnięcie do `main` → `npm ci` → `npm run check` (typy, testy, build) → publikacja folderu `dist/`. Gdy testy nie przejdą, nic się nie publikuje.
- `main` = wersja grana przez właściciela. Nowe etapy powstają na gałęziach `claude/…` i trafiają do `main` po akceptacji.
- Pole „Custom domain” w ustawieniach Pages zostaje **puste** (służy tylko do własnej, kupionej domeny).

## 2026-10-20 — v0.6: PWA, offline, przenoszenie zapisu

- **Build tworzy folder, nie jeden plik.** `scripts/build.ts` (TypeScript uruchamiany wprost przez Node ≥ 22.18, jak testy) zapisuje do `dist/`: `index.html` (gra — kod nadal wklejony w HTML, więc sama strona wciąż działa także jako pojedynczy plik), `manifest.webmanifest`, `sw.js`, `icons/apple-touch-icon.png` (180), `icons/icon-192.png`, `icons/icon-512.png`. Wszystkie ścieżki są względne (`./`), więc gra działa także w podfolderze (np. `…github.io/Planet-forge/`). Na hosting trafia **cały** folder `dist/`.
- **Ikony bez zewnętrznych usług.** `scripts/icons.ts` renderuje planetę startową (ta sama matematyka powierzchni co gra) z poświatą i złotą orbitą na pełnym ciemnym tle; `scripts/png.ts` koduje PNG wbudowanym `zlib`. Planeta mieści się w bezpiecznym kole ikon maskowalnych, więc 512 px służy jako `any` i `maskable`. Render jest deterministyczny.
- **Service worker: cache-first z wersją.** Wersja = skrót SHA-256 wszystkich plików buildu (ten sam kod → ta sama wersja, bez fałszywych aktualizacji). Instalacja zapisuje komplet plików; nowa wersja **czeka** (bez automatycznego `skipWaiting`), a gra pokazuje „Dostępna aktualizacja” z przyciskiem „Odśwież” — zapis gry, `SKIP_WAITING`, przeładowanie, usunięcie starej pamięci. Aplikacja sprawdza aktualizację przy każdym powrocie na ekran. W `npm run dev` service worker jest wyłączony (`__PWA__ = false`), żeby nie podsuwał starych wersji.
- **iOS.** `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent` (gra pod paskiem statusu; HUD omija go przez dotychczasowy `env(safe-area-inset-*)`), `apple-mobile-web-app-title`, `apple-touch-icon`, `viewport-fit=cover`.
- **Przenoszenie zapisu.** Na iPadzie Safari i aplikacja z ekranu początkowego mają osobny `localStorage`. Okno „Ustawienia” ma „Kopiuj zapis” (tekst `PF1:` + base64 z JSON-a zapisu, do schowka; gdy schowek odmówi — tekst do ręcznego skopiowania) i „Wczytaj zapis” (walidacja jak przy zwykłym odczycie + znany typ planety + zgodny `GENERATOR_VERSION`; błędy po polsku). Import zastępuje postęp; czas od eksportu liczy się jak nieobecność (maks. 8 h). „Nowa planeta…” przeniesiona do ustawień (rzadka, niszcząca akcja).
- **Wyjątek od „Phaser = UI”:** pole do wklejania zapisu jest elementem HTML (`src/game/ui/textPanel.ts`) — Phaser nie ma natywnego pola tekstowego, a iPad potrzebuje prawdziwego `<textarea>` (klawiatura, „Wklej”, zaznaczanie).

## 2026-10-20 — v0.5: antymateria

- **Źródła (decyzja właściciela: A + C).** Przyrost pasywny 1/h (także offline, w tym samym limicie 8 h co produkcja) oraz budynek Kolektor antymaterii (`produces: 'antimatter'`, wydobycie liczone na godzinę, startuje od poz. 0, zużywa dużo energii i — jak kopalnie — słabnie przy jej braku). Brak limitu magazynu dla antymaterii. Zapas startowy 5 (także dla zapisów sprzed v0.5).
- **Wydawanie:** „Ukończ teraz” powyżej poz. 5 kosztuje 1 antymaterię za każde rozpoczęte 15 minut pozostałej budowy (decyzja właściciela, „na razie”). Przycisk jest zawsze widoczny w trakcie budowy; gdy antymaterii brakuje, jest wyszarzony, a dotknięcie wyjaśnia, ile brakuje.
- **Bez płatności.** Zakup za prawdziwe pieniądze wymaga backendu (inaczej każdy mógłby dopisać sobie antymaterię w przeglądarce) — poza zakresem MVP.
- **Układ 5 kart:** `computeLayout` zwraca prostokąty kart. W poziomie karty, które nie mieszczą się w prawej kolumnie, trafiają pod panel planety; w pionie równa siatka (np. 3 + 2, niepełny wiersz wyśrodkowany); na telefonie skrócone etykiety zasobów i bez notatek „+X/min”.
- Nazwy i liczby (Kolektor, 0,6/h, koszty) są robocze.

## 2026-10-20 — v0.4: magazyn i „Ukończ teraz”

- **Magazyn** jest zwykłym budynkiem (`produces: 'storage'`), startuje na poziomie 1. Pojemność (osobno dla metalu i kryształów) = `storage.base × storage.growth^(poz − 1)` = 1000 × 1,6^(poz − 1), wartości robocze. Pełny magazyn zatrzymuje wydobycie; zasoby ponad pojemność (np. zwrot przy anulowaniu, stare zapisy z dużymi zapasami) nie przepadają, tylko przestają rosnąć. Ukończenie rozbudowy podnosi limit dokładnie w chwili ukończenia (ten sam podział czasu co dla innych budów).
- **Zgodność zapisów:** brak poziomu budynku w zapisie (Magazyn w zapisach sprzed v0.4) = poziom startowy. `SAVE_VERSION` bez zmian. Dzielnica Magazynu w kolonii jest losowana jako ostatnia, więc rozmieszczenie istniejących budowli się nie zmienia.
- **„Ukończ teraz”** za darmo do poziomu `freeFinishMaxLevel` (5, decyzja właściciela) — ułatwia start. Powyżej przycisk jest ukryty. Waluta premium „antymateria” (nazwa od właściciela) nie jest jeszcze zaimplementowana: najpierw decyzja, skąd się ją zdobywa (płatności za prawdziwe pieniądze są poza zakresem MVP — wymagają backendu).
- **Układ:** 4 karty — kolumna (iPad poziomo), wiersz (iPad pionowo), siatka 2×2 (telefon). Podczas budowy do poz. 5 przyciski „Ukończ teraz” i „Anuluj” stoją obok siebie.

## 2026-10-20 — v0.3: czas budowy

- **Reguły.** Ulepszenie trwa `buildSecondsPerLevel × docelowy poziom` (30 s × poziom — wartość robocza w `balance.ts`). Naraz jedna budowa (`EconomyState.construction`). Koszt pobierany na starcie; anulowanie zwraca go w całości (decyzja właściciela). Budynek w budowie produkuje na starym poziomie aż do ukończenia.
- **Ukończenie w `advance`.** Gdy budowa kończy się w naliczanym przedziale, `advance` dzieli czas: produkcja do chwili ukończenia na starym poziomie, potem na nowym. Limit offline (8 h) obejmuje oba odcinki łącznie. Dzięki temu budowa kończy się także przy zamkniętej karcie, a wynik nie zależy od częstotliwości odświeżania.
- **Zapis.** Pole `construction` jest opcjonalne — zapisy z v0.1–0.2 wczytują się bez budowy; `SAVE_VERSION` bez zmian. Niespójna budowa (zły poziom, nieznany budynek) odrzuca cały zapis, jak inne błędy.
- **UI.** Anulowanie wymaga drugiego dotknięcia w ciągu 3 s (przycisk zmienia się na „Na pewno anulować?”), żeby przypadkowy dotyk nie przerwał budowy. Pozostałe przyciski pokazują „Trwa inna budowa”; dotknięcie wyjaśnia powód komunikatem.
- **Wizualia.** Rusztowanie = jeden dodatkowy mesh (wireframe zarysu budynku), który rośnie w pionie wraz z postępem i pulsuje; w widoku 2D pierścień domykający się z postępem.

## 2026-10-20 — v0.2

- **Źródła odtworzone z artefaktu.** Repozytorium zawierało tylko README; kod v0.1 istniał wyłącznie jako zbudowany plik w artefakcie „Planet Forge”. Źródła TypeScript zostały odtworzone z tego pliku według architektury z `CLAUDE.md`. Generator, ekonomia i format zapisu są identyczne z v0.1 (sprawdzone porównaniem wyników dla wielu seedów) — stare zapisy i planety graczy się nie zmieniają. `docs/technical-brief.md` nie był dostępny i nie został odtworzony.
- **Typy planet (robocze).** Na prośbę właściciela dodano 4 typy obok Kepler-186 f: pustynny, lodowy, oceaniczny, wulkaniczny. Wszystkie mają `status: 'robocza'` — nazwy, opisy i liczby czekają na Lore Bible. Typ nowej planety wynika z seeda (`pickDefinition`, losowanie ważone); planeta startowa pozostaje Kepler-186 f. Typy bez stałej nazwy dostają nazwę katalogową z seeda (osobny strumień RNG `name`).
- **Wygląd z danych.** Definicja może opisać ocean (`ocean`: krycie, połysk, świecenie — lawa), chmury (`clouds`: próg, krycie, kolor) i czapy lodowe (`polarCap`). Wartości domyślne = wygląd v0.1. Nowe losowania w strumieniu `visual` są dopisane na końcu, więc nie zmieniają starych planet; `GENERATOR_VERSION` pozostaje 1.
- **Kolonia na powierzchni.** Poziom budynku = liczba budowli tego typu (maks. 10, potem budowle rosną do +60%). Rozmieszczenie jest deterministyczne z seeda (`colony.ts`, strumień `colony`), na lądzie z dala od biegunów; na planetach oceanicznych część budowli może stać na platformach. Renderowanie: 2 × `InstancedMesh` na typ budynku (6 draw calli łącznie, niezależnie od poziomów). Widok 2D rysuje budowle jako punkty.
- **Pokazanie ulepszenia.** Po udanym ulepszeniu `PlanetDisplay.showBuilding()` płynnie obraca planetę do nowej budowli (dotyk przerywa obrót), a budowla wyrasta z krótką animacją.
- **Atmosfera bez „aureoli”.** Poprzedni shader liczył fresnel na tylnej ściance sfery 1.14 z mieszaniem addytywnym — dawał jasny pierścień z ostrą zewnętrzną krawędzią. Teraz jasność zależy od odległości promienia widzenia od powierzchni (zanika do zera na brzegu, sfera 1.075), plus delikatna mgiełka na tarczy; obie słabną po nocnej stronie.
- **Narzędzia.** Bez frameworków: TypeScript + esbuild (jeden plik `dist/index.html`), testy `node:test` uruchamiane bezpośrednio na plikach `.ts` (Node ≥ 22.18). Wersje bibliotek jak w v0.1: Phaser 3.90.0, three r185.
