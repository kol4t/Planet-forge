# Znane ograniczenia i „Do decyzji”

Stan: v0.46 (audyt). Naprawione w audycie — `docs/CHANGELOG.md` (v0.46). Tu: co zostaje i czego audyt sam nie rozstrzygał.

## Do decyzji właściciela

1. **„W klimacie OGame”** w opisie gry (`CLAUDE.md`) — lore (K-005, O-206) proponuje doprecyzować, np. „ekonomia i
   rozbudowa w klimacie OGame”. Nie zmieniano.
2. **Nazwa „Imperium”** — możliwa kolizja z kanonem (ludzkość jako niedobitek, K-001 pkt 3, O-002). Decyzja należy do
   Projektu lore; w kodzie zmienia się tylko teksty (klucz zapisu zostaje).
3. **Rysowanie paneli tylko po zmianie** (zamiast w każdej klatce) — mniej pracy procesora i baterii iPada, ale większa
   przebudowa `PlanetScene`. Warto, jeśli pomiar na iPadzie (instrukcja w `docs/PERFORMANCE.md`) pokaże spadki płynności.
4. **Szybsza siatka pól innym algorytmem** (np. mniej iteracji wyrównywania) — zmieniłaby kształt pól i przydział
   budynków w istniejących zapisach (migracja przez `FIELD_GRID_VERSION`). Bez decyzji nie robiono.
5. **Telefon pionowo** — panel zajmuje większość ekranu, planeta jest mała, dymek SI chowa się przy otwartym panelu.
   Czy telefon ma być pełnoprawnym celem (wtedy osobny układ, np. panel jako wysuwany arkusz do połowy), czy wystarczy
   „da się grać”?
6. **Wielkość pól wg typu planety** (wariant B z v0.45: lodowe ~300 pól, złoża kryształu itd.) — przy strojeniu
   ekonomii przed MVP.
7. **Ikona „maskable”** (Android/Chrome przycina ikonę w kółko) — dziś ta sama co zwykła; osobna z marginesem?
8. **Rozbieżności lore ↔ gra** (antymateria, kilka planet, galaktyka — `docs/LORE_TOUCHPOINTS.md`) — aktualizacja
   kopii lore z Projektu na claude.ai.

## Znane ograniczenia (świadome, drobne)

- **Odwiert (v0.48, tylko 3D)**: światło jądra jest wpieczone w kolory ścian (nie ma prawdziwego źródła światła — koszt
  na iPadzie); w 2D bez otworu (tarcza
  pokazuje odkrywkę wzorem gruntu); krater wysokiego etapu zajmuje dużą część kompleksu (wcześniejsze moduły z jego
  wnętrza znikają).
- **Wielka odkrywka (v0.49)**: linie siatki pól nad dziurą (i nad niecką szybu) są niewidoczne — zostaje obrys krawędzi; tarasy mają szczegół ścianek lądu (~0,027 rad), więc z bliska półki są lekko kanciaste (low-poly);
  Megaodkrywka zajmuje tyle pól, co etap (do ~40% planety startowej), więc liny bywają bardzo długie; w 2D bez lin.

- **Kilka budów ukończonych pod nieobecność** (kolejka): komunikat „Podczas nieobecności” i dziennik wymieniają tylko
  pierwszą. Poziomy i zasoby są liczone poprawnie.
- **Pomiary wydajności z audytu to symulacja** (przeglądarka bezgłowa, CPU spowolniony 4×, 3D programowo) — nie
  zastępują iPada. Płynność 2D w symulacji ogranicza programowe łączenie warstw, nie kod gry.
- **Przewijanie okna Ustawień palcem** (telefon poziomo): przeciągnięcie zaczęte na przycisku może go nacisnąć —
  zaczynaj przeciąganie na tekście.
- **Karta budowli na iPadzie pionowo** zasłania górną część planety (mało miejsca obok panelu); zamyka ją ✕ albo
  dotknięcie planety obok budowli.
- **Filtry Badań na telefonie** w dwóch wierszach zasłaniają górny pasek mapy badań (mapę można przesunąć).
- **Wyjątki od zasad architektury** (opisane w `docs/ARCHITECTURE.md`): `PlanetThumbnail` używany przez ekrany
  bezpośrednio, `localStorage` w `core/save/empire.ts`, `Math.random` w spadających gwiazdach tła.
- **Dostęp `window.__planetForge`** istnieje tylko w podglądzie `npm run dev` (do skryptów pomiarowych), nie w grze.
- **Testy nie obejmują** scen Phaser, okien HTML, rysowania pikseli i service workera w działaniu (`docs/TESTING.md`).
- **Liczby 4-cyfrowe bez spacji** („4378”), od 10 000 ze spacją („17 515”) — zgodnie z polską normą typograficzną.
- Zrzuty audytu robiono w 2D (grafika domyślna); 3D sprawdzono pomiarami (rysowania, pamięć) i jednym zestawem zrzutów
  iPada poziomo.
