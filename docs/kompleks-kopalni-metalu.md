# Kompleks kopalni metalu

Plan przebudowy kopalni metalu w jeden zwarty kompleks (decyzja właściciela, 2026-11-01). Zakres: **tylko kopalnia
metalu** — inne budynki bez zmian. Nazwy „Fabryka” i „Megakonstrukt” są **robocze** (`status: 'robocza'`).

## Kontekst

Dziś każdy etap kopalni metalu dokłada na planecie zabudowę rozrzuconą po obszarze pól budynku (miejsca z pól obszaru,
`planet-renderer/colony.ts` → `colonyMeshes.ts`, rodzina `metalMine`) — wygląda chaotycznie. Docelowo:

- **Kopalnia** (poziomy 1–3) → ruda **drogami** do **Fabryki**.
- **Fabryka** zbiera rudę z ~3 kopalni (osada = fabryka + 3 kopalnie).
- **Megakonstrukt** zawsze w środku; każda z 4 fabryk łączy się z nim **3 równoległymi pasami** produkcyjnymi.
- Rozwój: kopalnie → fabryka → megakonstrukt. Megakonstrukt można zbudować po osiągnięciu wymaganej liczby pól;
  jego budowa (1–2 h) przebudowuje cały kompleks do układu promienistego.
- Kompleksu **nie da się przenieść**. Zajmuje określoną liczbę pól.
- W przyszłości ataki będą niszczyć kopalnie i fabryki (konstrukt bardzo wytrzymały), a gracz będzie je odbudowywał.

## Fazy wyglądu (dane — rysowanie w etapie 2)

- **`osady`** — wyznaczona dzielnica na lądzie, pusty plac w środku (miejsce na konstrukt), do 4 osad
  (fabryka + 3 kopalnie) luźno wokół placu.
- **`konstrukt`** — układ promienisty: konstrukt w środku, 4 fabryki na ramionach, po 3 pasy do środka, kopalnie
  na końcach ramion.

## Przełożenie poziomu (robocze, `BALANCE.metalComplex` w `src/data/balance.ts`)

| Poziom kopalni metalu | Co przybywa |
|---|---|
| 1–3 | osada 1: kopalnia 1 rośnie 1 → 3 |
| 4–9 | osada 1: kopalnie 2 i 3 (po 3 poziomy) |
| 10 | fabryka osady 1 + drogi kopalnia → fabryka |
| 11–20, 21–30, 31–40 | osady 2, 3, 4 tym samym rytmem |

Pola: kopalnia 1, fabryka 2 → komplet (4 osady) = **20 pól = próg megakonstruktu** (poz. 40); megakonstrukt 4 pola.
Wytrzymałość (robocza): kopalnia 100, fabryka 300, megakonstrukt 10 000.

## Model w kodzie (etap 1)

`src/core/colony/complexLayout.ts` — czysty TypeScript (bez three/phaser/DOM):

- `complexLayout(siatka pól, seed, poziom, faza, { center?, states? })` →
  `{ obiekty: { slotId, typ, poziom, stan, wytrzymalosc, pozycja }[], drogi[], pasy[] }` (+ środek, obrót, skala).
- **Stałe `slotId`**: `osadaN.kopalniaM`, `osadaN.fabryka`, `konstrukt`. Miejsce slotu zależy od środka, seeda, siatki
  i fazy — nie od poziomu, więc kolejne poziomy tylko dokładają obiekty.
- `stan`: `aktywny` | `zniszczony` | `w_odbudowie` — na razie zawsze `aktywny`.
- **Tylko ląd**: szablon (w jednostkach średniego promienia pola lądu) próbowany w 12 obrotach co 30°, potem zwężany
  (×0,85 … ×0,4); pasuje, gdy środki wszystkich miejsc są na lądzie i ≥ 90% ich otoczenia. Gdy nic nie pasuje —
  najlepszy wariant, a miejsca poza lądem dosunięte do najbliższego lądu.
- Deterministycznie: strumień `visual` seeda (`fork('metalComplex')`), bez `Math.random`.
- Środek dzielnicy (`chooseMetalCenter`): pole najbliżej środka obszaru pól kopalni metalu; bez obszaru — pole lądu
  z największą ilością lądu wokół (wzgórza i góry mają pierwszeństwo).
- Zapis `SlotSave.metalComplex` (`docs/SAVE_FORMAT.md`), migracja `ensureMetalComplex` w `syncPlots` (`GameController`).
- Testy: `tests/complexLayout.test.ts`.

**Na razie model nie wpływa na nic na ekranie ani na ekonomię** — `fieldsFor`, obszary pól i wygląd są jak w v0.57.

## Rozbieżności z obecną grą (do decyzji)

1. Pola: dziś kopalnia metalu zajmuje 1 → 50 pól (`src/data/footprint.ts`, etapy od poz. 1/6/12/20), model — 1 → 20 (+4).
2. Etapy wyglądu: dziś kopalnia → zakład → huta → megakompleks (progi 1/6/12/20); model — osady co 10 poziomów, konstrukt od poz. 40.
3. Megakompleks metalu (ulepszenie od poz. 20, `src/data/complexes.ts`) da się przenieść (transfer v0.56); kompleks — nie.
4. Obszar pól rośnie dziś od pola przy środku kolonii (`core/colony/plots.ts`); dzielnica kompleksu powinna być stała
   i zarezerwowana (środek z zapisu).

Propozycja na etap 2–3: pola kopalni metalu z `metalComplexFields`, obszar pól = pola dzielnicy, transfer kopalni metalu
wyłączony, megakompleks metalu zastąpiony budową megakonstruktu.

## Etap 2, część A — prototyp osad na planecie (2026-11-01, bez publikacji)

Decyzje właściciela do rozbieżności: (1) pola kopalni metalu z modelu (kopalnia 1, fabryka 2, maks. 20), pola zwolnione
w starych zapisach wracają do puli, dzielnica zarezerwowana (także plac); (2) osada co 10 poziomów zastępuje dawne progi
wyglądu 1/6/12/20, powyżej poz. 40 — 4 pełne osady; (3) megakompleks metalu (od poz. 20, przenośny) — logika bez zmian.

- **Wybór środka** (`chooseMetalCenter`): 24 kandydatów (pola lądu z największą ilością lądu wokół, wzgórza i góry
  wyżej) sprawdzanych pełnym dopasowaniem układu; wygrywa największa skala, potem ląd wokół miejsc. Pola innych budynków
  dzielnica omija. Zwężenie tylko w ostateczności, najwyżej do 70% (`METAL_SCALES` = 1 / 0,85 / 0,7). Na 30 planetach
  testowych: średnia skala 0,81 → 0,90, poniżej 0,7: 6 → 0, pełna skala na 18 z 30. Wybór raz na planetę: 60–300 ms
  (Node). Zapisany środek (z etapu 1) zostaje bez zmian.
- **Pola** (`metalComplexCells`): obszar kopalni = pola pod zbudowanymi obiektami (kolejność budowy; fabryka bierze pole
  pod sobą i najbliższe sąsiednie); rezerwa = plac (pole środka i pola w promieniu placu) + wszystkie miejsca i pola pod
  drogami rozpoczętych osad. Inne budynki nie stają na rezerwie (`reconcilePlots` z `fixed`), licznik POLA pomija rezerwę
  spoza obszaru (`fieldCapacity`). `fieldsFor('metalMine')` = `metalComplexFields` (0 → 20). Progi etapów (kompleks od
  poz. 12, megakompleks od 20) bez zmian.
- **Wygląd 3D** (`planet-renderer/metalComplexMeshes.ts` + `ColonyMeshes.addMetalComplex`): kopalnia = szyb z wieżą
  wyciągową i hałdą (model „Kopalnia”, 3 wielkości wg poziomu 1–3), fabryka = zakład z halą i kominem (ok. 2× kopalnia),
  plac = ośmiokątna rama fundamentu, drogi = ciemne wstęgi po powierzchni (6 odcinków na drogę, każdy na terenie w swoim
  środku). Instancje: dochodzą tylko plac i drogi (2 rysowania). Pod obiektami teren wyrównany płytą; pola kopalni nie
  mają już płyty gruntu kompleksu (naturalny teren między osadami).
- **Megakompleks metalu** — dziś rysowany jako główna konstrukcja „Megakompleks” (wieża centralna z czterema piecami)
  w środku obszaru pól i moduły na polach. W prototypie, gdy działa, stoi tymczasowo na placu (bez kolizji z osadami).
- **Budowa w toku**: rusztowanie w miejscu następnego obiektu (nowa albo rosnąca kopalnia, fabryka).
- 2D (fallback) — jeszcze po staremu (część B: symbole); kolizje obiektów tylko przy zwężeniu do 70% z dosuwaniem
  miejsc do lądu (3 przypadki na 4080 par w 30 planetach) — do poprawy w części B.

## Plan etapów

1. **Model w core** (ten etap): `complexLayout.ts`, dane, zapis i migracja, testy. Bez zmian na ekranie.
2. **Osady na planecie** — rysowanie kopalń, fabryk, placu i dróg z modelu (3D), LOD (z daleka uproszczone), fallback 2D.
3. **Budowa megakonstruktu** (1–2 h) i przebudowa układu z `osady` do `konstrukt` (faza w zapisie).
4. **Animacja przepływu** rudy na drogach i pasach.
5. Później: rozbudowa po konstrukcie z limitami, zniszczenia (`stan`, `wytrzymalosc`) i odbudowa.
