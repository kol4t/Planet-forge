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

## Wynik prototypu B — rodzina metalowa (0.47.07–0.47.09, tylko 3D)

Decyzja właściciela: **wygląd zmienia się razem z etapami gry, poz. 1 / 6 / 12 / 20.** Zmienione:
`planet-renderer/colonyMeshes.ts`, `planet-renderer/colony.ts` (`ComplexSpot.r` — promień pola), test w `tests/colony.test.ts`.
Bez zmian: mechanika, pola, zapisy, 2D, pozostałe rodziny budynków.

**Standard modelu** (do przeniesienia na inne rodziny): PLATFORMA (płyta wpuszczona w teren) → BRYŁA (sylwetka etapu) →
DETAL (kominy, zbiorniki, taśmy, dźwigi) → ŚWIATŁO (okna pieców, wyloty kominów — pulsują; „Ogranicz ruch” — stałe).
Wielkość z promienia pola (nie stała): główna konstrukcja 1,7 / 2,2 / 2,8 / 3,6 promienia pola, moduły ≈ 2/3 pola.

| Etap (poz.) | Główna konstrukcja | Pozostałe pola |
|---|---|---|
| Kopalnia (1–5) | szyb z wieżą wyciągową, budynek maszyny z dźwigiem, hałda, dwa pojazdy | place z hałdami rudy |
| Zakład przetwórczy (6–11) | dwie hale, zbiorniki, komin, mała wieża szybu z taśmociągiem do hali | na przemian hale ze zbiornikami i place; **taśmociągi** do centrum |
| Huta (12–19) | dwa wielkie piece ze złotymi pierścieniami, trzy kominy, odlewnia, kadzie, kanał z metalem (światło) | głównie hale, co trzecie pole plac; taśmociągi |
| Megakompleks (20+) | dwupoziomowa platforma, dominująca wieża centralna, cztery piece z kominami i łącznikami, obracająca się suwnica | jak huta |

Taśmociągi: każdy moduł łączy się z najbliższym już postawionym bliżej środka (drzewo transportu do głównej konstrukcji),
deterministycznie z układu pól; bez taśmy przez uskok terenu. Moduły nie stoją na polach zasłoniętych główną konstrukcją.

Koszt grafiki (przeglądarka, planeta startowa z pełną kolonią): kopalnia metalu poz. 3 — 39 → **43 rysowania**, 88,5 → 88,6 tys.
trójkątów; poz. 25 — 43 → **48 rysowań**, 114,8 → **111,9 tys.** trójkątów. W budżecie (+≤ 8 rysowań).

Znane: moduł przy brzegu jeziora może częściowo wystawać nad wodę (stoi na najbliższym suchym punkcie pola);
modele zastąpiły hale i fabrykę z v0.39 (`createFactory`, `createFoundry` — usunięte).

## Wynik — rodzina kryształowa (ten sam standard, tylko 3D)

Zmienione: `planet-renderer/colonyMeshes.ts` — rozmieszczenie metalu uogólnione do „rodzin” (`FAMILIES`: główna konstrukcja
etapu, jej wielkość, moduł na polu, pola pominięte, układ taśm); kryształy dostały własne modele. Bez zmian: mechanika,
pola, zapisy, 2D, teren wyrobiska (tarasy z v0.40), pozostałe budynki. Stare modele `createRig`, `createHub` — usunięte.

| Etap (poz.) | Główna konstrukcja | Pozostałe pola |
|---|---|---|
| Wiertło (1–5) | ażurowa wieża wiertnicza nad otworem (obracająca się głowica), szopa sprężarki, świecące kryształy | stanowiska na krawędzi (płyta, mała wieża, szopa, kryształy) |
| Szyb wiertniczy (6–11) | pierścień platformy wokół otwartego szybu, dwie wieże, świecąca kolumna kryształu, belka nad szybem | stanowiska; taśmy między nimi |
| Odkrywka (12–19) | stacja na dnie wyrobiska: wysoki słup kryształu, krąg kruszarek, rampa, obracający się pierścień | na krawędzi na przemian stanowiska i przetwórnie (zbiorniki z lodu, hala ze świecącym oknem); co trzecie pole na tarasach — mała wiertnia; taśmy wokół wyrobiska |
| Megaodkrywka (20+) | gromada pięciu wielkich kryształów na dnie, dwie wysokie wieże i obracająca się suwnica z pierścieniem | jak odkrywka |

Wielkość głównej konstrukcji: 1,6 / 2,0 / 2,7 / 3,4 promienia pola. Taśmy kryształów łączą tylko moduły (nie biegną przez
wyrobisko do dna).

Koszt grafiki (przeglądarka, planeta startowa, metal i kryształy na tym samym poziomie, reszta kolonii jak w prototypie B):
poz. 3 — 39 → **43 rysowania**, 83,2 → 83,3 tys. trójkątów; poz. 25 — 48 → **52 rysowania**, 122,3 → **124,4 tys.** trójkątów.
Na iPadzie v0.46 zmierzono 28 rysowań przy 56 kl./s — zapas jest, ale każda kolejna rodzina dodaje ~4 rysowania;
przy reszcie rodzin trzeba będzie łączyć części modeli (np. światło i obrót w jednej siatce).

## Wynik — rodzina energetyczna (ten sam standard, tylko 3D)

Zmienione: `planet-renderer/colonyMeshes.ts` — elektrownia w `FAMILIES` (bez taśmociągów), nowe modele; stary hub
`createTeslaTower` usunięty (węzeł Tesli zostaje jako moduł po usprawnieniu). Bez zmian: mechanika, pola, zapisy, 2D.

| Etap (poz.) | Główna konstrukcja | Pozostałe pola |
|---|---|---|
| Elektrownia (1–5) | chłodnia kominowa (ciepły blask na krawędzi), hala turbin z wentylatorem, transformator | pola paneli słonecznych (trzy rzędy w złotych ramach) |
| Węzeł energetyczny (6–11) | dwie chłodnie, długa hala generatorów, plac transformatorów ze słupem | na przemian panele i stacje przesyłowe (słup, rozdzielnia) |
| Wielka elektrownia (12–19) | kopuła reaktora ze świecącym pasem i obracającym się pierścieniem, trzy chłodnie, hala turbin | głównie panele, co trzecie pole stacja |
| Megasieć (20+) | dwupoziomowa platforma, wieża przesyłowa Tesli (dwa pierścienie, kula światła), cztery chłodnie | jak wyżej |

Po usprawnieniu „Sieć Tesli” co czwarte pole dostaje węzeł Tesli. Wielkość głównej konstrukcji: 1,6 / 2,1 / 2,7 / 3,4 promienia pola.

**Oszczędność rysowań:** puste części modeli (np. model bez obracającej się części) były rysowane mimo 0 wierzchołków —
teraz są ukryte. Koszt (przeglądarka, planeta startowa, metal, kryształy i elektrownia na tym samym poziomie):
poz. 3 — 39 (v0.47.2) → **30 rysowań**; poz. 25 — 52 → **37 rysowań**; trójkąty bez zmian (~75 / ~125 tys.).

## Poprawka — budowle nachodziły na teren (zgłoszenie właściciela)

Objaw: moduły i główne konstrukcje wystawały poza obrys obszaru, nad jeziora i na sąsiedni teren; na stokach teren
przebijał płyty albo płyty wisiały. Przyczyna: wielkość budowli liczona tylko z promienia pola, bez sprawdzenia terenu.

- `colony.ts`: `ComplexSpot.free` i `ColonyComplex.free` — wolny promień: jak daleko od miejsca (12 kierunków, krok
  0,008 rad) teren jest suchym lądem **własnego obszaru** i bez uskoku większego niż +0,025 / −0,035. Liczony tylko w 3D
  (`layoutFromPlots(…, true)`), ok. 50 ms na komputerze przy zmianie układu (trzy duże kompleksy); 2D bez kosztu.
- `colonyMeshes.ts`: moduł nie większy niż wolne miejsce (za ciasno — pole bez modułu), główna konstrukcja tak samo,
  ale nie mniejsza niż połowa docelowej (czytelność).
- `PlanetView.ts` — **fundamenty**: teren pod każdą budowlą (w jej zasięgu, w jej obszarze, poza jeziorami) wyrównany
  do wysokości podstawy. Decyzja zależy tylko od położenia wierzchołka, więc ścianki zostają szczelne.
- Test: punkty w promieniu `free` leżą na suchym lądzie własnego obszaru; 2D ma ten sam układ bez pomiaru.

Koszt grafiki bez zmian (30 / 37 rysowań).

Uzupełnienie po zrzucie z iPada (LHS-258 c, lodowa, v0.47.2): płyty nachodziły też **na siebie** (główna konstrukcja na
moduły). Teraz każda nowa płyta dostaje najwyżej tyle miejsca, ile zostało do już postawionych (odstęp 0,004 rad) —
zmniejsza się albo pole zostaje puste. Wolne miejsce głównej konstrukcji liczone bez kryterium uskoku (szeroki
fundament i tak wyrównuje pod nią teren) — tylko granica obszaru i woda. Gdy środek obszaru leży blisko jego skraju,
główna konstrukcja bywa mniejsza (najmniej połowa docelowej).

## Wynik — magazyn, kolektor antymaterii, laboratorium (ten sam standard, tylko 3D)

Wszystkie sześć budynków ma już modele według standardu (`FAMILIES` obejmuje każdy budynek); stare małe modele
(`small()`, `plan()`) usunięte. Nazwy etapów — `src/data/footprint.ts` (robocze).

| Budynek | Etapy (poz. 1 / 6 / 12 / 20) | Moduły na polach |
|---|---|---|
| Magazyn | skład (silosy, szopa, kontenery) → magazyn (długa hala, trzy silosy) → terminal (dwie hale, silosy, kontenery, żuraw wieżowy z obracającym się wysięgnikiem) → megaskład (wieża z koroną sześciu silosów i złotą kopułą, hale, place) | place kontenerów i silosy, taśmy do centrum |
| Kolektor antymaterii | pułapka (iglica z kulą w wirującym pierścieniu) → kolektor (wyższa iglica, dwa pierścienie, trzy maszty) → pole pułapek (kopuła zabezpieczenia ze świecącym pasem w kręgu sześciu masztów) → megakolektor (wysoka iglica z trzema pierścieniami, cztery maszty) | maszty pułapek, od pola pułapek co trzecie — cewka |
| Laboratorium | pracownia (budynek, kopuła obserwatorium, antena) → laboratorium (dwa budynki, kopuła, obracająca się czasza) → instytut (wieża z pasami świateł, dwie kopuły, pierścień) → kampus (wysoka wieża z kopułą i dwoma pierścieniami, cztery skrzydła) | budynki badawcze (turkusowe dachy), od laboratorium co trzecie — antena |

Moduły na polach nie mają już części obracanej (pierścienie, czasze i pręty — nieruchome w bryle): mniej rysowań.
Koszt (przeglądarka, planeta startowa, wszystkie sześć budynków na tym samym poziomie): poz. 3 — 30 → **37 rysowań**,
poz. 25 — 37 → **47 rysowań**, trójkąty 140,4 → **145,5 tys.** (większość to teren). W budżecie (~48).

## Wyrobisko kryształów — prawdziwa dziura (prośba właściciela)

„Budynki mają naruszać strukturę planety w głąb; przy ekstraktorze kryształów ma być widoczna dziura, im wyższy poziom,
tym głębsza.” Zmiany (tylko 3D, `complexLook.ts`, `PlanetView.ts`):

- Głębokość z **poziomu**, nie z etapu: `pitDepthMax(level)` = 0,016 + 0,004 × poziom, najwyżej 0,14 promienia planety
  (poz. 1 ≈ 0,02, poz. 10 ≈ 0,06, poz. 20 ≈ 0,1, poz. 30 ≈ 0,136); tarasów 3 → 9 (co 4 poziomy) — `pitSink3d`.
- Dziura może zejść **poniżej poziomu morza** (najniżej promień 0,82): tafla oceanu i morza lawy jest nad wyrobiskiem
  wycięta w shaderze (`cutOcean` — jeden warunek, bez dodatkowych rysowań).
- Ściany: skała ciemniejsza z głębokością, tarasy na przemian jaśniejsze (warstwy), dno ciemne; budowle w wyrobisku
  stoją na nowym dnie (fundamenty nie podnoszą ich do poziomu morza).
- Test: dno najgłębsze w środku, głębiej z każdym progiem poziomu, 0 poza wyrobiskiem, na wysokim poziomie ≥ 0,1.
- 2D bez zmian (wzór gruntu z tarasami jak dotąd).

Poprawka po szkicu właściciela (v0.47.4 na iPadzie: wgłębienie „nienaturalne” przy wzgórzu — schodki obniżały teren
razem z jego nierównościami). Teraz **równa niecka**: kulisty profil `√(1 − s²)` (płaskie dno, strome ściany przy
krawędzi), liczony od wysokości środka kompleksu, nie od lokalnego terenu; głębokość 0,023 + 0,007 × poziom, najwyżej
0,24 promienia (poz. 31+); najniżej promień 0,74. Obniżany jest **cały teren w zasięgu niecki** (także jeziorka i pola
spoza obszaru — bez „wysp”), obrysy wewnątrz niecki pominięte. Wewnątrz niecki bez modułów (strome ściany) — na dnie
tylko główna konstrukcja; budowle stoją na nowym dnie (`pitSink` liczy różnicę terenu i dna).

## v0.48 — odwiert planetarny i odsłonięte jądro (prompt właściciela)

Audyt: ląd = jedna siatka (dwudziestościan, ~34 tys. trójkątów, każdy z własnymi wierzchołkami), ocean = osobna kula
(1,001), wnętrze planety puste (przez otwór byłoby widać kosmos), budowle i obrysy w grupie obracającej się z planetą.
Decyzja i jej uzasadnienie — `docs/decisions.md` (2026-10-27, v0.48).

| Etap (od poz.) | Wygląd |
|---|---|
| 1 (1) | płytki krater, urządzenia wiertnicze na powierzchni |
| 2 (3) – 3 (6) | otwór studni w dnie krateru, płytko; grube warstwy skorupy |
| 4 (9) | wyraźna studnia (dno ~0,8 promienia), półka na granicy warstw |
| 5 (12) | głębiej; pierwsze świecące pęknięcia (oznaki ciepła) |
| 6 (16) | płaszcz w ścianach, poświata przy dnie |
| 7 (22) | rozgrzane, świecące dno z odłamkami; więcej pęknięć |
| 8 (30) | szeroki otwór, jaskinia płaszcza (kula od środka) i świecące jądro w środku planety (promień 0,3) |

- Pliki: `src/data/drill.ts` (etapy, kolory wg typu planety), `src/planet-renderer/drill.ts` (czysta geometria),
  `PlanetView.ts` (otwór w lądzie, siatki odwiertu, krater w barwach skorupy, klucz przebudowy z etapem odwiertu),
  `colonyMeshes.ts` (główna konstrukcja obok otworu, taśmy nie przechodzą nad otworem), `complexLook.ts` (głębokość
  krateru z etapu odwiertu). Testy: `tests/drill.test.ts` (etapy, głębokość, ściany pod krawędzią, okrąg przypięcia,
  jądro w środku, ≥ 3 warstwy, deterministyczność, wygląd dla każdego typu planety).
- Koszt (przeglądarka, wszystkie budynki poz. 25 / 30): **49 rysowań** (było 47), trójkąty ~127 tys. (było ~145 tys. —
  bez modułów we wnętrzu krateru). Siatki odwiertu tworzone tylko przy zmianie etapu.
- Ograniczenia — `docs/KNOWN_ISSUES.md`.
