# v0.47 — audyt grafiki 3D (etap 0.47.01)

Stan: 2026-10-27, wersja 0.46 (opublikowana), gałąź `claude/grafika-v047`. Zakres: wyłącznie diagnoza i plan — bez zmian
w kodzie gry. Prompt właściciela: „PLANET FORGE v0.47 — VISUAL QUALITY OVERHAUL” (pierwsze zadanie: audyt i plan prototypu).

## Stan wyjściowy

- `npm run check`: 298 testów, wszystkie przechodzą; build 2,21 MB (618 KB gzip).
- **Pomiar właściciela na iPadzie (v0.46, z ekranu początkowego, okno 1080×778 @2):**

| Grafika | Średnio | Najsłabsza sekunda | Grafika 3D | Planeta |
|---|---:|---:|---|---|
| 2D | 54 kl./s | 24 kl./s (pomiar 39 s) | — | Wolf-122 d, pustynna, 46 pól |
| 3D (rozdzielczość 100%) | 56 kl./s | 15 kl./s (pomiar 29 s) | 28 rysowań, 68 105 trójkątów, 44 geometrie, 4 tekstury | TOI-496 c, wulkaniczna, 92 pola |

  Średnia jest dobra (w v0.21: 58–59). Najsłabsze sekundy (15–24) to najpewniej chwile ładowania: liczenie siatki pól
  i terenu przy zmianie planety (pomiar trwał krótko, 29–39 s, czyli objął start). Budżet dla v0.47: **trójkąty ≤ ~100 tys.,
  rysowania ≤ ~40** (dziś 28 / 68 tys.), bez nowych dużych tekstur.
- Zrzuty 3D sześciu typów planet (1× i ~2,7×) w przeglądarce bezgłowej — przesłane właścicielowi (symulacja, nie iPad).

## Funkcje, których nie wolno zepsuć

Obrót, przybliżenie i stuknięcie (wybór budynku, wybór pola), obrys pól i zajętości, karta budowli, „Pokaż budynek”,
wyrastanie zabudowy i rusztowanie budowy, odkrywka (obniżenie terenu), satelita kolektora, lawa (świecenie, pulsowanie),
jeziora i zamarznięte morze, siatka pól (Ustawienia), „Ogranicz ruch”, bezpiecznik startu i fallback 2D, przełączanie
2D ↔ 3D z zachowaniem widoku, determinizm z seeda, `SURFACE_VERSION` / `FIELD_GRID_VERSION` / zapisy, wydajność iPada.

## Jak dziś powstaje planeta 3D (`src/planet-renderer/PlanetView.ts`, `lowPoly.ts`)

- Ląd: `IcosahedronGeometry(1, 40)` — ok. 33,6 tys. trójkątów o różnych kształtach, każdy z własnymi wierzchołkami
  i **jednym kolorem** (`flatShading`). Wysokość z `core/surface` → tarasy (`terrace`, 4–6 poziomów) → promień.
- Kolor trójkąta: `sampler.color` w środku trójkąta × przyciemnienie stromizny (`cliffShade`) × **losowy rozrzut
  jasności** (`facetJitter`, ±2–3%).
- Woda: osobna kula `IcosahedronGeometry(1.001, 18)` z `flatShading`, półprzezroczysta. Lawa: osobna siatka nad lądem.
- Chmury: kula 1,03 z teksturą 512×256. Atmosfera: dwie warstwy z shaderem (`atmosphere.ts`).
- Światło: jedno kierunkowe (gwiazda, z przodu po lewej) + półkuliste 0,12; ACES, ekspozycja 1,15.
- Kolonia (v0.45): grunt kompleksu wpisany w kolory trójkątów lądu (`paintLand` + `complexGround`), odkrywka obniża
  wierzchołki; zabudowa z `InstancedMesh` (`colonyMeshes.ts`: wiertła, hale, węzły Tesli z v0.38–v0.40, rozmiar
  0,06–0,1 promienia), obrys obszaru liniami `LineSegments2` uniesionymi nad terenem.

## Problemy, przyczyny i proponowane zmiany

| # | Problem (widoczny na zrzutach) | Przyczyna | Plik | Proponowana zmiana | Ryzyko |
|---|---|---|---|---|---|
| 1 | **„Szachownica” trójkątów** na lądzie (najmocniej: pustynna, jałowa, umiarkowana) | `facetJitter` losuje jasność KAŻDEGO trójkąta; trójkąty ikosfery mają różne kształty, więc szum nie układa się w formy terenu | `lowPoly.ts`, profile (`style.facetJitter` 0,04–0,06) | rozrzut jasności z szumu o niskiej częstotliwości (płaty wielkości kilku trójkątów) albo wyłączony; zostaje cieniowanie faset od światła | małe — tylko kolor |
| 2 | **Czarne trójkąty** na zboczach (jałowa, wulkaniczna) — wyglądają jak dziury | `cliffShade` (do 45%) liczone ze stromizny pojedynczego trójkąta; na rampach tarasów stromizna skacze między sąsiadami | `lowPoly.ts` | przyciemnienie tylko na prawdziwych uskokach (zmiana poziomu tarasu), łagodniejsze (≤ 25%), kolor skały zamiast czerni | małe |
| 3 | **Postrzępione granice biomów** (ząbki z pojedynczych trójkątów) | kolor wybierany osobno dla każdego trójkąta w jego środku; granica pasma przechodzi przez trójkąty losowo | `lowPoly.ts` | kolor z „większości” trzech wierzchołków + wygładzenie pasm (ten sam kolor dla całego płata tarasu) | małe |
| 4 | **Grunt kompleksów jako szum** (szare plamy zamiast kwartałów) | wzór zabudowy (działka ~0,0105 rad) jest ~3× drobniejszy niż trójkąt siatki (~0,03 rad) — próbkowanie w środku trójkąta daje aliasing | `complexLook.ts`, `PlanetView.paintLand` | w 3D grunt z większych kwartałów (≥ wielkość trójkąta): beton/żużel/lód odkrywki + kilka wyraźnych pasów; szczegół przenosi zabudowa 3D | średnie — wygląd kompleksu w 3D (2D bez zmian) |
| 5 | **Chmury zasłaniają przybliżenie** (lodowa przy ~2,7×: tylko mgła) | kula chmur 1,03 nie znika przy zbliżaniu kamery; tekstura 512×256 rozmyta z bliska | `PlanetView.ts` (`loop`, chmury) | przezroczystość chmur maleje z przybliżeniem (np. od 1,4× do 0 przy 2,2×) | małe |
| 6 | **„Sześciokąty” na oceanie** (oceaniczna: widoczne płaskie ścianki tafli) | woda to osobna ikosfera o szczegółowości 18 z `flatShading` i odbiciem światła | `PlanetView.ts` (ocean) | gładkie cieniowanie tafli (bez `flatShading`) i słabszy połysk; liczba trójkątów bez zmian | małe |
| 7 | **Budynki jak znaczniki** — małe bryły bez fundamentów, nieczytelne z daleka | kształty z v0.38–v0.40 w skali 0,06–0,1; brak podstawy/platformy; ten sam zestaw dla wszystkich etapów (różni się tylko liczba i skala) | `colonyMeshes.ts` | standard modelu: platforma + bryła + detal + światło, osadzenie na lokalnej normalnej, wyraźne sylwetki etapów (patrz prototyp B) | średnie — rysowania i trójkąty (budżet niżej) |
| 8 | **Rozwój etapów słabo widoczny** w 3D | etap zmienia głównie liczbę miejsc zabudowy i rozmiar głównej konstrukcji | `colonyMeshes.ts` (`plan`) | inna sylwetka na każdym etapie (kopalnia → zakład → huta → megakompleks) | średnie |
| 9 | **Noc za ciemna / dzień płaski** w części ujęć | jedno światło + półkuliste 0,12; brak delikatnego światła odbitego od strony przeciwnej | `PlanetView.ts` | słabe światło wypełniające (rim) od tyłu i lekko jaśniejsze półkuliste; budynki z delikatną emisją okien tylko nocą | małe — wydajność bez zmian |
| 10 | **Tarasy jak „wokselowe” bloki** (wulkaniczna, jałowa z bliska) | 4–6 tarasów + krótkie rampy + trójkąty ~0,03 rad — uskoki schodkowe z widocznymi zębami | `lowPoly.ts` (`terrace`), profile | mniej, łagodniejszych tarasów na profilach skalistych; zęby na uskokach znikną częściowo przez #2 i #3 | średnie — wygląd terenu (`SURFACE_VERSION` bez zmian, to tylko renderer) |
| 11 | Linie pól/obrysu uniesione nad teren (+0,009 promienia) — przy pochyleniu „wiszą” | zapas przeciw zanurzaniu w płaskich ściankach | `PlanetView.buildFieldLines`, `buildOutlines` | linie dokładnie na powierzchni z małym przesunięciem głębi (`polygonOffset`/depth bias) zamiast uniesienia | średnie — z-fighting do sprawdzenia |

Uwaga: **2D jest grafiką domyślną** (decyzja właściciela). Problemy 1–11 dotyczą 3D; 2D ma własne (pikselowa tarcza)
i nie jest celem pierwszego prototypu.

## Kolejność zmian (plan v0.47 — 14 podetapów właściciela, dopasowany do kodu)

| Podetap | Co konkretnie w kodzie | Problemy |
|---|---|---|
| 0.47.01 audyt | ten dokument | — |
| 0.47.02–03 geometria i low-poly | `lowPoly.ts`: koniec losowego szumu faset, kolor z wierzchołków, łagodniejsze uskoki i tarasy | 1, 2, 3, 10 |
| 0.47.04 biomy i woda | gładka tafla oceanu, przejścia pasm, wybrzeża | 6, 3 |
| 0.47.05 światło | rim + półkuliste, chmury znikające przy zbliżeniu | 5, 9 |
| 0.47.06 kontury | linie na powierzchni, hierarchia (siatka pól < obrys kompleksów < zaznaczenie) | 11 |
| 0.47.07–09 modele, kompleksy, etapy | prototyp rodziny metalowej, potem pozostałe | 4, 7, 8 |
| 0.47.10–13 | interakcje, UI, animacje, wydajność | — |
| 0.47.14 | regresja, zrzuty przed/po, publikacja | — |

## Prototyp A — planeta (pierwszy krok, propozycja)

Zakres: tylko `lowPoly.ts`, `PlanetView.ts` (chmury, ocean, światło) i parametry `style` w profilach. Bez zmian
w `core/`, zapisach, siatce pól i mechanikach.

1. Rozrzut jasności faset: z szumu przestrzennego (płaty), siła 0 → do ustalenia na zrzutach.
2. Przyciemnienie tylko na uskokach tarasów, maks. ~25%, w kolorze ciemniejszej skały.
3. Kolor trójkąta z większości kolorów trzech wierzchołków (granice biomów idą wzdłuż krawędzi trójkątów).
4. Chmury: przezroczystość zależna od przybliżenia.
5. Ocean: gładkie cieniowanie, słabszy połysk.
6. Światło wypełniające od tyłu (bez cieni, bez nowych tekstur).

Weryfikacja: zrzuty 6 typów × 1× / ~2,7× przed i po (ten sam zapis), `npm run check`, rysowania i trójkąty
(oczekiwane: bez zmian ±2 rysowania), pomiar właściciela na iPadzie.

## Prototyp B — rodzina metalowa (po akceptacji A)

Standard modelu (wspólny dla wszystkich budynków): **platforma** (fundament dopasowany do terenu) → **bryła** (sylwetka
etapu) → **detal** (kominy, zbiorniki, taśmy) → **światło** (okna pieców — tylko po nocnej stronie). Instancing jak dziś
(jeden `InstancedMesh` na kształt), modele proceduralne z prostych brył three — bez zewnętrznych zasobów.

Etapy dla kopalni metalu — **do decyzji właściciela, które poziomy** (patrz niżej):

| Etap (dziś w grze) | Poziomy | Pola | Sylwetka |
|---|---|---|---|
| Kopalnia | 1–5 | 1–3 | szyb z wieżą wyciągową, mała hałda, 1–2 pojazdy |
| Zakład przetwórczy | 6–11 | 6–10 | hala + zbiorniki + taśmociąg do szybu |
| Huta | 12–19 | 16–22 | piece z kominami, linie produkcyjne, światło pieców |
| Megakompleks metalowy | 20+ | 40–50 | dominująca konstrukcja centralna, połączona logistyka |

Budżet: +≤ 8 rysowań, +≤ 25 tys. trójkątów przy pełnej kolonii.

## Do decyzji właściciela przed prototypem B

1. **Progi etapów wyglądu:** Twoja tabela mówi o poziomach 2 / 4 / 8 / 16, a w grze etapy (pola, nazwy, karta budowli)
   zaczynają się od poziomów 1 / 6 / 12 / 20. Rekomendacja: **wygląd zmienia się razem z etapami gry** (1 / 6 / 12 / 20) —
   wtedy wzrost pól, nazwa etapu i nowa sylwetka pojawiają się w tej samej chwili, a mechanika zostaje bez zmian.
   Alternatywa: osobne progi wyglądu 2 / 4 / 8 / 16 (wygląd i pola zmieniałyby się w różnych chwilach).
2. **Czy po v0.47 3D ma być domyślne?** Dziś domyślne jest 2D (decyzja z v0.7), a v0.47 poprawia głównie 3D.
   Pomiar na iPadzie (56 kl./s w 3D) na to pozwala, ale to Twoja decyzja — do podjęcia po zobaczeniu prototypów.

## Wynik prototypu A (0.47.02–0.47.05, tylko 3D)

Zmienione: `planet-renderer/lowPoly.ts`, `planet-renderer/PlanetView.ts` (+ test w `tests/lowPoly.test.ts`). Bez zmian:
`core/`, dane, zapisy, siatka pól, 2D, liczba siatek i trójkątów.

| # | Co zrobiono | Efekt na zrzutach |
|---|---|---|
| 1, 2 | **Normalne faset przechylone w połowie ku górze** (`facetNormals`, zamiast `flatShading`) — główna przyczyna szachownicy: wysokość terenu zmienia się co wierzchołek, więc czyste normalne skakały w losowe strony | koniec szachownicy światła i czarnych ścian tarasów (jałowa, wulkaniczna) |
| 1 | rozrzut jasności z gładkiego szumu (płaty) zamiast losowo co trójkąt | spokojniejsze płaszczyzny |
| 2 | przyciemnienie tylko na uskokach tarasów, maks. 25% | ściany widoczne, nie czarne |
| 3 | kolor fasety = średnia z wierzchołków, a kolor wierzchołka z wysokości wygładzonej (7 próbek w promieniu ~1 trójkąta) | koniec mozaiki pasm piasek/skała (pustynna) |
| 4 | grunt kompleksów w 3D: płyta w kolorze budynku, lekko inna na każdym polu; odkrywka z tarasami i ciemnym dnem (bez świecących pojedynczych ścianek) | koniec szachownicy w obszarach budynków; szczegóły — prototyp B (zabudowa) |
| 5 | chmury wygasają od 1,4× do 2,2× przybliżenia | przybliżenie pokazuje teren i kolonię |
| 6 | gładka tafla oceanu (normalne kuli), mniejszy połysk | koniec „sześciokątów” |
| 9 | słabe chłodne światło wypełniające z naprzeciwka gwiazdy | nocna strona zachowuje kształt |

Nie ruszone w A: tarasy (#10 — po usunięciu czarnych ścian wyglądają akceptowalnie), linie pól (#11 — podetap 0.47.06),
zabudowa (#7, #8 — prototyp B). Rysowania i trójkąty: te same siatki (nowe światło nie dodaje rysowań) — pomiar na iPadzie
u właściciela (Diagnostyka → „grafika 3D”).
