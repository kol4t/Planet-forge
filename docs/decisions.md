# Decyzje projektowe

Krótki rejestr istotnych decyzji (najnowsze na górze).

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
