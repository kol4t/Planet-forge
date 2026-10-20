# Decyzje projektowe

Krótki rejestr istotnych decyzji (najnowsze na górze).

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
