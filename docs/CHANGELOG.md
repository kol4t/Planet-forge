# Historia zmian (CHANGELOG)

Na podstawie historii git (`git log`): opisy commitów wersji, bez commitów technicznych („opublikowana”, poprawki dokumentacji). Szczegóły każdej wersji — `CLAUDE.md` (Stan obecny) i `README.md` (lista kontrolna).

## v0.81.0 — stacja kosmiczna, krok 3c: wzmocnienia budowli — robocza

Decyzje właściciela 2026-11-09 (`docs/plan-stacji.md`, etap 3):
- **Wzmocnienia za antymaterię** w doku handlowym (Handel → „Wzmocnienia budowli”): na jeden budynek wydobycia
  (kopalnia, Ekstraktor, elektrownia, kolektor) albo na całą planetę; bez limitu — mnożniki się mnożą.
- 7 wzmocnień (robocze): Stabilny wzmacniacz ×1,25 bez ryzyka; Przeciążenie ×1,8 (10% awarii na 4 h); Głębokie
  wydobycie ×2,5 (15%: −5% złoża); Rozruch krytyczny ×3 (12%: utrata 1–3 poz.); Zapłon antymaterii ×5 (8%:
  zniszczenie budynku); Fala wydobycia — planeta ×1,4 (10% awarii jednego budynku); Burza produkcyjna — planeta ×2
  (12%: jeden budynek traci 1–2 poz.). Im większe ryzyko, tym większa nagroda.
- Ryzyko losowane przy zakupie, skutek **po końcu działania** (nagroda zawsze zostaje). Budynek w budowie albo
  z megakonstruktem / megakompleksem — zamiast utraty poziomów lub zniszczenia awaria na 6 h.
- **Kupcy** czasem przywożą wersję lepszą (+20%) i bez skutków ubocznych — za antymaterię (×1,5) albo kredyty.
- `core/station/boosts.ts`, okno `game/ui/boostPanel.ts`, mnożnik w `balanceFor` (naliczanie dzielone na początku
  i końcu wzmocnienia), zapis `boosts` (opcjonalny), `station.merchant.boostSold`.

## v0.80.0 — stacja kosmiczna, krok 3b: kredyty i kupcy — 2026-11-09

Decyzje właściciela 2026-11-09 (`docs/plan-stacji.md`, etap 3):
- **Kredyty** (nazwa robocza) — waluta-przedmiot, nie konto: leżą w magazynie stacji, używają ich tylko stacje i kupcy
  (planety nie). 1 kredyt ≈ 10 metalu (robocze).
- **Rynek doku przez kredyty**: sprzedajesz metal / kryształy (z magazynu stacji) i antymaterię (po badaniu) za kredyty,
  kupujesz metal / kryształy za kredyty — dawna bezpośrednia wymiana metal ↔ kryształy znika (idzie przez kredyty).
- **Opłaty za premię stacji**: planety w zasięgu premii płacą stacji kredyty (12 / h × udział planety; planety niczego
  nie tracą — robocze).
- **Kupcy**: przylatują co 6 h i zostają 4 h (z czasu świata — także pod nieobecność). Każdy ma 2–3 oferty lepsze niż
  rynek (raz na wizytę), czasem statek na sprzedaż (transportowiec, eskorta, kurier) i zamówienie: dostarcz metal albo
  kryształy do magazynu stacji w 12 h → kredyty, antymateria, czasem przyspieszenie badania stacji o 2 h albo znalezisko.
  Większy dok — większe oferty.
- `core/station/merchants.ts` (`MERCHANTS`), okno doku rozbudowane (`game/ui/tradePanel.ts`), zapis `station.credits`,
  `station.feesAt`, `station.merchant` (opcjonalne).
- Do zrobienia później (decyzja właściciela): rozwinąć temat waluty (transport kredytów statkami, przechwytywanie przez
  piratów, kolejne stacje z własnym magazynem kredytów).

## v0.79.0 — stacja kosmiczna, krok 3a: dok handlowy i stały rynek — 2026-11-09

Decyzje właściciela 2026-11-09 (`docs/plan-stacji.md`, etap 3):
- Moduł **Dok handlowy** (gniazdo 3): po badaniu stacji „Dok handlowy”, poz. 1–5, płaci magazyn stacji; wyższy poziom —
  mniejsza marża (30% → 14%; badanie „Kursy wymiany” −5 pkt).
- **Stały rynek** (karta doku → „Handel”): metal ↔ kryształy z magazynu stacji; **sprzedaż antymaterii** za metal albo
  kryształy po badaniu „Handel antymaterią”. Kursy wahają się ±20% co 6 h (takie same dla wszystkich), wartości robocze:
  kryształ = 2 metalu, antymateria = 1500 metalu.
- `core/station/trade.ts` (`TRADE`), okno `game/ui/tradePanel.ts`, zapis `station.dock` (opcjonalny).
- Dalej: 3b — kupcy z lepszymi ofertami, statki na sprzedaż i zamówienia; 3c — wzmocnienia budowli za antymaterię.

## v0.78.0 — stacja kosmiczna, krok 2d-3: automatyka SI — 2026-11-09

Decyzje właściciela 2026-11-09 (przełączniki w „Badania stacji”, gdy nie jest wybrane badanie):
- **Automatyczne dostawy** (badanie „Automatyczne dostawy”): próg ustawiany przez gracza — 50 / 75 / 90% magazynu
  planety; nadwyżka ponad próg leci wolnym transportowcem na stację (najwyżej co 30 min z planety, ze wszystkich planet).
- **SI nocna** (badanie „SI nocna”): wybierasz kategorię — gdy laboratorium jest wolne, SI zaczyna najtańsze dostępne
  badanie tej kategorii, na które starcza magazynu stacji.
- **Kolejka stacji** (badanie „Kolejka stacji”): „Do kolejki stacji” na badaniu — startuje, gdy zwolni się laboratorium.
- **Autonomia stacji** (badanie „Autonomia stacji”): SI rozbudowuje magazyn orbitalny, gdy jest prawie pełny (z magazynu
  stacji), i Laboratorium orbitalne, gdy blokuje badania kategorii SI nocnej.
- **Poprawka:** badania stacji kończyły się dopiero po ponownym uruchomieniu gry (od v0.73) — teraz w trakcie gry.
- `core/station/stationAuto.ts`, zapis `station.auto`, `station.research.queued` (opcjonalne).

## v0.77.0 — stacja kosmiczna, krok 2d-2: nowe statki i konwoje — 2026-11-09

Decyzje właściciela 2026-11-09:
- **Kurier** (badanie stacji „Kurier”): 3× szybszy, 1000 ładunku, paliwo jak transportowiec; 1000 metalu / 1200 kryształów.
- **Ciężki transportowiec** (badanie „Ciężki transportowiec”): 2× ładunek (10 000), lot 1,5× dłuższy, 1,5× paliwa;
  4000 metalu / 2500 kryształów.
- **Konwoje** (badanie „Konwoje”): 2–5 statków w jednym locie — ładunek się sumuje, lot w tempie najwolniejszego,
  ryzyko piratów liczone raz, eskorta chroni cały konwój, paliwo za każdy statek.
- Okno transportu (planeta → planeta, na stację, ze stacji): wybór statków; stocznia w Imperium → Flota buduje nowe
  statki po badaniach. `core/economy/cargoShips.ts`, `BALANCE.fleet.cargo`, zapis `shipments[].ships` (opcjonalne).

## v0.76.0 — stacja kosmiczna, krok 2d-1: rdzeń i nowe pierścienie — 2026-11-09

Decyzje właściciela 2026-11-09:
- **Rozbudowa rdzenia** do poz. 2 i 3 w „Modułach” — po badaniach „Rdzeń drugiej / trzeciej generacji”; płaci
  **magazyn stacji** (robocze: 150 tys. / 200 tys. i 600 tys. / 800 tys., 2 h i 6 h). W trakcie stacja działa.
  Premia stacji rośnie z poziomem rdzenia (×1,25 / ×1,5).
- **Drugi i trzeci pierścień gniazd** (widać na stacji w 2D i 3D) z **drugimi i trzecimi egzemplarzami modułów**:
  magazyn II / III (pojemności się sumują), stocznia II / III (statki budują się naraz), laboratorium II / III
  (badania stacji naraz). Stocznie i laboratoria II / III mają jeden poziom — szybkość i pierścienie badań
  wyznaczają pierwsze.
- Panel „Moduły”: moduły „wkrótce” i gniazda nierozbudowanych pierścieni w jednej karcie „Kolejne moduły”.
- Zapis: `station.coreUpgrade`, `storage2/3`, `shipyard2/3`, `lab2/3`, `research.more` (opcjonalne).

## v0.75.0 — stacja kosmiczna, krok 2c: pełne drzewko badań stacji — 2026-11-09

Lista zaakceptowana przez właściciela 2026-11-09 (`docs/badania-stacji.md`):
- **90 badań stacji** — 6 kategorii po 15, **6 pierścieni** (Laboratorium orbitalne poz. 1 / 2 / 4 / 6 / 8 / 10),
  mosty między kategoriami; 27 badań ze szkicu z tymi samymi id (zapisy bez zmian).
- Działają od razu: wydobycie, energia, koszt i czas budowy, loty, ładowność, złoża, środowisko, ekspedycje, kolejka
  budowy, **paliwo lotów** (`BALANCE.fuelFactor`), **stocznia** (czas, kolejka), **eskorta**, **naprawy**, **straty od
  piratów**, **magazyn stacji**, **resztki złóż**, **siła premii stacji** (×1,25 / ×1,5), **dalekie układy** (premia do
  40 jedn., 10%). `withStationResearch` w `core/station/stationResearch.ts`.
- „🔓” (rdzeń 2. i 3. generacji, Kurier, Ciężki transportowiec, Konwoje, automatyka SI, kolejka stacji) i „→ etap N” —
  do zbadania, z opisem, co otworzą; mechaniki w kolejnych krokach.
- Galaktyki kategorii rozłożone po łuku (stały odstęp gwiazd), mosty obok badań.

## v0.74.0 — stacja kosmiczna, krok 2b: premia stacji — 2026-11-09

Decyzje właściciela 2026-11-09:
- **Premia stacji macierzystej** dla jej otoczenia: +5% wydobycia metalu i kryształów, −5% czasu budowy, −30% paliwa
  lotów **na stację**; loty **ze stacji** — zwykłe paliwo.
- **Zasięg** z badań stacji (Produkcja): „Premia stacji: planeta” → „Zasięg premii: układ” → „Zasięg premii: sąsiednie
  układy” (do 20 jednostek mapy). Premia słabnie: planeta pod stacją 100%, reszta układu 50%, sąsiednie układy 25%;
  siła rośnie z poziomem rdzenia.
- Badanie Floty „Start ze stacji”: loty ze stacji −25% czasu (statki startują od razu z pełną prędkością).
- Widać: panel „Planeta” (wiersz premii), karta rdzenia w „Modułach”, przerywany turkusowy pierścień przy planetach
  w zasięgu w widoku układu. Logika `core/station/stationAura.ts` (liczby robocze `STATION_AURA`); zapis bez zmian.

## v0.73.0 — stacja kosmiczna, etap 2a: badania stacji — 2026-11-09

Decyzje właściciela 2026-11-09 (`docs/plan-stacji.md`, etap 2):
- Moduł **Laboratorium orbitalne** (gniazdo 2): budowa i rozbudowa do poz. 10, płaci **magazyn stacji**.
- Osobne drzewko **badań stacji** (`data/stationResearch.ts`, szkic roboczy 27 badań): 6 kategorii — Produkcja, Flota,
  SI, Planetologia, Handel, Eksploracja — połączonych **mostami**; płaci magazyn stacji, kolejka osobna od planet
  (jedno badanie naraz), efekty działają na wszystkie planety imperium; część badań „przygotowuje” kolejne etapy.
- Ekran „Badania stacji” (`StationResearchScene`): wybór kategorii, galaktyka kategorii z mostami, szczegóły i start;
  wejście: „Badania” na dolnym pasku na ekranie stacji i przycisk na karcie laboratorium.
- Silnik `core/station/stationResearch.ts`, zapis `station.lab`, `station.research` (opcjonalne).

## v0.72.0 — stacja kosmiczna, etap 1: ekran stacji — 2026-11-09

Plan `docs/plan-stacji.md` (decyzje właściciela 2026-11-09: pierścień z osią, kolory jak interfejs, 2D i 3D od razu,
wejścia z widoku układu, listy „Planeta” i Imperium):
- Ekran stacji macierzystej zamiast planety: rdzeń SI Matki z osią i skrzydłami paneli, pierścień na 6 szprychach,
  moduły w 6 gniazdach (magazyn — kontenery rosnące z poziomem, stocznia — dok z kadłubem, budowa — złote rusztowanie,
  przyszłe moduły — blady szkielet). 2D pikselowo (`stationSprite.ts`), 3D low-poly (`stationScreenMesh.ts`), obrót
  palcem, przybliżenie, wybór modułu dotykiem (`stationScreenLayout.ts`).
- Panel „Moduły” zamiast „Produkcji”: rdzeń, magazyn orbitalny i stocznia (ulepszanie), laboratorium, dok handlowy,
  moduł mieszkalny i nasłuch „wkrótce” (etapy 2–6).
- Dok megakonstruktów (decyzja właściciela: osobny moduł, maks. 3 — metal, kryształy, 1 na przyszłość) jako „wkrótce”
  na osi pod rdzeniem; wchodzi w ostatnim etapie wątku stacji (etap 7).
- Model modułów `core/station/stationScreen.ts`, dane `data/stationModules.ts` (robocze); zapis bez zmian.

## v0.71.0 — porządki w interfejsie (po MVP) — 2026-11-09

Zgłoszenie właściciela ze zrzutami (7 punktów):
- Okno „Kompleks” (i inne okna HTML) chowa kartę budowli — okna nie nachodzą na siebie.
- Wejście w widok układu zamyka wybrany budynek (okienko „Budynek”, kartę, podświetlenie).
- Bez sąsiednich planet w tle widoku planety.
- „Mapa” → „Galaktyka” (przycisk i tytuł ekranu).
- Panel „Planeta”: lista planet imperium + krótki skrót aktywnej (pola, złoża) i „Szczegóły” / „Kosmos”; pełny opis
  po „Szczegóły”. ☰ otwiera od razu Ustawienia.
- SI Matka bez przycisku na dolnym pasku — ustawienia w Imperium → SI.

## MVP — 2026-11-09

- **MVP ogłoszone na v0.70.1** (decyzja właściciela). Podsumowanie: `docs/mvp.md` — pętla gry, tempo (ok. 30 / 37 dni),
  płynność na iPadzie, rzeczy odłożone na po MVP i otwarte decyzje. Gra bez zmian.

## v0.70.1 — płynność 2D na planecie lawowej — 2026-11-09

- Zgłoszenie właściciela: spadek klatek w 2D na planecie lawowej. Podczas obracania tarcza rysuje się w nieco niższej
  rozdzielczości (gdy pełna jest za wolna), po zatrzymaniu od razu ostra; żyły lawy liczone raz na piksel.

## v0.70.0 — strojenie ekonomii przed MVP — 2026-11-09

- Wyższe poziomy budynków budują się coraz dłużej (poz. 20 ok. 1 h, poz. 40 ok. 4,7 h) — rozbudowa planety ok. tygodnia
  zamiast 2 dni; cała pętla ok. miesiąca.
- Megakonstrukt pracuje ok. 6 dni; okno megakonstruktu metalu ostrzega przy wyczerpanym złożu.

## v0.69.5 — hotfix: przyczyna zamrożonego ekranu — 2026-11-05

- Stuknięcia w oknach (Zgłoś, Kompleks, Ustawienia…) nie „zużywają” już dotyku gry — po kilku takich stuknięciach gra
  przestawała reagować. Przyczyna była w poprawce przeklikiwania z v0.69.1; przeklikiwanie nadal nie wraca.

## v0.69.4 — hotfix: zamrożony ekran (druga runda) — 2026-11-05

- Gra zwalnia „zawieszone palce” (gdy iPad zgubi zdarzenie puszczenia palca, gra przestawała przyjmować dotyk).
- Wykrywacz: jeśli dotyk nie dociera do gry albo ekran czeka na okno, którego nie widać — gra sama się odblokowuje
  i zapisuje stan w diagnostyce („Dotyk: … — odblokowano”).

## v0.69.3 — hotfix: zamrożony ekran — 2026-11-05

- Błąd w jednej klatce nie zamraża już paneli (wcześniej planeta się kręciła, a nic nie dało się stuknąć); zamiast tego
  pasek „Coś poszło nie tak — dotknij, aby odświeżyć” i wpis w diagnostyce.
- Dodatkowe zabezpieczenia dotyku: ekran, który się nie otworzył, zgubiony palec, przerwana przebudowa paneli.
- Okno wiertnicy ostrzega przy wyczerpanym złożu kryształów.

## v0.69.2 — płynność: siatki pól z pamięci, osłona scen — 2026-11-05

- Siatka pól planety zapamiętywana w przeglądarce: szybszy start i zmiana planety bez przycięcia (od drugiego uruchomienia).
- Błąd w odświeżaniu paneli nie zatrzymuje gry po cichu — pasek z odświeżeniem i wpis w diagnostyce.

## v0.69.1 — zwarty lej Ekstraktora, okna bez przeklikiwania — 2026-11-03

- Ekstraktor kryształów zajmuje jeden okrągły obszar (bez „odnóg”), może wejść w wodę i lawę; od strony wody tama (3D).
- Dotknięcie w oknie (Ustawienia, diagnostyka, Kompleks…) nie „stuka” już w panel gry pod nim (np. nie zmienia planety).

## v0.69.0 — megakonstrukt kryształów: wiertnica i lej — 2026-11-03

- Wiertnica na linach nad lejem w obszarze Ekstraktora kryształów (poz. 40, „Megastruktury”, kompleks; 1 mln metalu /
  4 mln kryształów, budowa 1–2 h): +60% i znaleziska, zamiast megakompleksu kryształów.
- Lej rośnie z wydobyciem złoża (4 etapy, ostatni sięga jądra planety) i zostaje na zawsze — jego pól nie da się zabudować.
- Dużo kryształów w leju, znaleziska widoczne jako obiekty (3D i 2D).
- Wiertnicę można wyrzucić na orbitę i ściągnąć nad Ekstraktor innej planety (lej zostaje).

## v0.68.0 — kandydat MVP — 2026-11-02

- Przewodnik SI Matki: krok „Załóż drugą kolonię” teraz po megakonstrukcie (pierwsza planeta → konstrukt → kolonia).
- Testy: zapisy z 7 starych wersji (od v0.46) wczytują się poprawnie; cała pętla od zera przechodzi z przewodnikiem.
- Raport kandydata MVP i lista kontrolna płynności na iPada (`docs/kandydat-mvp.md`).

## v0.67.0 — pierwsze kroki: przewodnik SI Matki — 2026-11-02

- **Panel „SI Matka · krok X z 19”**: jedno bieżące zadanie, pasek postępu i podpowiedź, co dotknąć (zwijany; na telefonie domyślnie zwinięty).
- Kroki prowadzą przez całą pętlę: od pierwszych budynków przez widok układu, wielką fabrykę, stację macierzystą, kolonię i megakonstrukt aż do imperium gwiezdnego.
- Za każdy krok mała nagroda i wpis w Dzienniku. Istniejące gry zaczynają od pierwszego niewykonanego kroku (bez nagród za przeszłość).
- Ustawienia → „Przewodnik SI: włączony — wyłącz”. Zapisy zgodne.

## v0.66.0 — widok układu — 2026-11-02

- **Nowy widok układu:** ściśnij planetę dwoma palcami (albo „−” na minimum) — kamera odlatuje do układu: gwiazda, orbity, planety w ruchu, Twoja planeta w turkusowym pierścieniu.
- Dotknij swojej planety — płynny lot i zwykły widok planety (2D / 3D). Obca planeta, gwiazda, pas asteroid — okienko z danymi; wolna planeta — „Wyślij statek”.
- Pasek „Galaktyka › Układ › Planeta” i „Resetuj widok”. Mapa → „Pokaż układ” wlatuje do układu; dawny widok — „Tabela układu”.
- Planeta domyślnie się nie obraca (Ustawienia → „Obrót planety”).
- Lżej dla iPada: jeden kontekst grafiki 3D (było 3), planeta nie rysuje się, gdy widać układ, rzadziej, gdy stoi; szybsze powroty na planety. Zapisy zgodne.

## v0.65.0 — wstępna ekonomia — 2026-11-02

- **Megakonstrukt to główny cel planety:** złoża wystarczają na rozwój i ok. tydzień pracy jednego megakonstruktu.
- Planety mają **rodzaj złóż** (dużo metalu / dużo kryształów / po równo) — plakietka w Imperium.
- Poziomy budynków są dużo tańsze (koszt ×1,2 na poziom), wydobycie rośnie łagodniej; megakonstrukt kosztuje 4 mln metalu i 1 mln kryształów.
- **Kolejka budowy: 5 miejsc.** Elektrownia zajmuje mniej pól.
- Naprawione: kopalnia metalu nie staje przez budynek na polu przyszłej osady; budynek otoczony innymi przenosi się tam, gdzie się zmieści.
- Zmiana działa też w istniejących grach (większe złoża, tańsze poziomy).

## v0.64.0 — stacje kolonii — 2026-11-01

- Po zbudowaniu stacji macierzystej każda kolonia może mieć **stację kolonii** (Imperium → karta „Stacja kolonii”): 4000 metalu, 2500 kryształów, 15 min.
- Stacja kolonii to **przekaźnik**: loty między kolonią a stacją macierzystą są 2× krótsze i za połowę paliwa.
- Mały pierścień krąży nad kolonią (3D i 2D). Zapisy zgodne.

## v0.63.0 — imperium gwiezdne (zamknięcie pętli) — 2026-11-01

- Gdy masz **3 wyeksploatowane planety i gotową stację macierzystą**, pętla się zamyka (raz, także pod nieobecność).
- Nagroda: **do 10 planet** (wcześniej 5). Jednorazowa plansza SI Matki „Imperium gwiezdne”, wpis w dzienniku; w Imperium „imperium gwiezdne · wyeksploatowane N” — licznik liczy dalej. Zapisy zgodne.

## v0.62.0 — ryzyko misji i eskorta — 2026-11-01

- Loty **między układami** mogą zaatakować piraci (nazwa robocza). Ryzyko rośnie z odległością i przy gniazdach piratów blisko trasy; lot w jednym układzie jest bezpieczny.
- Skutek łagodny: transportowiec traci 20–50% ładunku i się spóźnia; statek kolonizacyjny, wysyłany konstrukt i megakonstrukt z orbity tylko się spóźniają.
- Każdy okręt eskorty zmniejsza ryzyko (3 okręty — prawie zero); uszkodzony wraca do floty po 30 min naprawy.
- Ryzyko w % widać przed wysłaniem (okno transportu, mapa, wysyłka konstruktu, „Ściągnij z orbity”); o ataku informuje dziennik. Zapisy zgodne.

## v0.61.0 — megakonstrukt na orbicie — 2026-11-01

- Megakonstrukt kopalni metalu można **wyrzucić na orbitę** (okno Kompleks): 30 min przygotowania bez premii, 10 antymaterii; „Anuluj start” zwraca paliwo. Na planecie zostają 4 osady z pustym placem.
- Konstrukt **czeka na orbicie** (widać go nad planetą; Imperium → Flota), aż ściągniesz go na planetę z kompletem osad (Kopalnia metalu poz. 40): „Ściągnij z orbity” — lot i paliwo zależne od odległości; po lądowaniu osady przechodzą w układ promienisty (+60%, znaleziska).
- Gdy planeta celu w czasie lotu przestanie się nadawać, konstrukt wraca na orbitę. Zapisy zgodne.

## v0.60.0 — megakonstrukt kopalni metalu — 2026-11-01

- Po komplecie 4 osad (Kopalnia metalu poz. 40), badaniu „Megastruktury” i z wielką fabryką na placu w środku można zbudować **megakonstrukt** (okno Kompleks → „Zbuduj megakonstrukt”): koszt 60 000 metalu i 40 000 kryształów, budowa 1–2 h — kopalnia pracuje, „Anuluj budowę” zwraca koszt.
- Po ukończeniu kompleks przechodzi w układ promienisty: konstrukt w środku, 4 fabryki na ramionach, po 3 pasy do konstruktu, kopalnie na końcach (24 pola); +60% wydobycia i znaleziska.
- Megakonstrukt zastępuje megakompleks kopalni metalu (włączony wcześniej działa do czasu konstruktu). Nie da się go wyłączyć ani wysłać — wyrzucenie na orbitę w następnym kroku.
- Etap kopalni od poz. 20 nazywa się „Kombinat metalowy” (robocze). Zapisy zgodne.

## v0.59.0 — kopalnia metalu jako osady — 2026-11-01

- Kopalnia metalu nie jest już rozlana na dziesiątki pól: osady (fabryka + 3 kopalnie, nowa osada co 10 poziomów) połączone drogami wokół pustego placu na przyszły megakonstrukt.
- Pola kopalni metalu: kopalnia 1, fabryka 2, najwyżej 20 (dawniej do 50) — zwolnione pola wracają do puli; inne budynki nie stają w dzielnicy kopalni.
- Z daleka widać fabryki, plac i drogi, kopalnie wyrastają przy przybliżeniu; dotknięcie dowolnego obiektu albo drogi otwiera kartę Kopalni metalu; w 2D — symbole.
- Rusztowanie budowy w miejscu następnej kopalni albo fabryki. Poziomy i postęp zapisów bez zmian.

## v0.58.0 — wstępna flota — 2026-11-01

- Statki budowane w **stoczni** (moduł stacji macierzystej, poziomy 1–10, kolejka do 5): transportowiec, statek kolonizacyjny, holownik, okręt eskorty.
- Lot zabiera statek z floty: transportowiec i holownik wracają po locie, statek kolonizacyjny zostaje na nowej kolonii (lot tylko za paliwo). Liczba transportowców = ile lotów naraz.
- Na start (także w starych zapisach): 3 transportowce, 1 statek kolonizacyjny, 1 holownik.
- **Eskorta** przy transporcie i wysyłce konstruktu (wybór − / +); ochrona w drodze — w następnym etapie.
- Nowa zakładka **„Flota”** w Imperium; stocznia widoczna przy pierścieniu stacji (3D i 2D).
- Poprawka: w oknie „Wyślij surowce” nie ma już pustego wyboru „Dokąd”. Zapisy zgodne.

## v0.57.0 — pola na oceanie i lawie — 2026-10-29

- Ocean i lawa mają własne pola — stoi na nich tylko megakonstrukt po transferze (zwykłe budynki dalej na lądzie i lodzie). Konstrukt zajmuje je, gdy na lądzie brakuje miejsca; budowle stoją na tafli.
- Budynki graczy zostają dokładnie tam, gdzie były; licznik POLA bez zmian. Linie pól morza widać tylko wokół zajętych pól.
- Zapisy zgodne.

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
