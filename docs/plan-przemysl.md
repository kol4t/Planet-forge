# Przemysł — plan „Industrial Evolution” (v0.50) i audyt

Prompt właściciela (2026-10-27): budowle mają łączyć się w widoczne kompleksy, zajmować więcej pól i zmieniać wygląd planety. Zakres to kilka wersji — zgodnie z zasadą „małe, sprawdzalne kroki” robimy go etapami (v0.38 → … → v0.50), każdy z akceptacją.

## Audyt (stan v0.37.1)

- **Budowa i produkcja:** `core/economy/economy.ts` — poziomy budynków (`EconomyState.levels`), `productionRates` (wydobycie × bogactwo × środowisko × `siteFactor` × energia z pierwszeństwem), budowa z czasem i kolejką, burzenie.
- **Pola:** `core/colony/fieldGrid.ts` (siatka Woronoja z mapy powierzchni; ląd/woda/lód/lawa; sąsiedzi pól), `core/colony/plots.ts` — **jedno pole = grupa 3 poziomów jednego budynku**, przydział automatyczny i stały (`SlotSave.plots` + `plotsGrid`), teren pola → `siteFactor`.
- **Rozmieszczenie na sferze:** `planet-renderer/colony.ts` (`layoutFromPlots`: 3 budowle na pole, na lądzie pola), 3D `colonyMeshes.ts` (2 InstancedMesh na typ, wyrastanie, rusztowanie), 2D `CanvasPlanetFallback.drawStructures` (piksele 2×2), wybór dotknięciem `pick.ts`.
- **Zapis:** `core/save/empire.ts` — pola opcjonalne, migracja przez wartości domyślne; seed planety → ta sama siatka i te same miejsca.
- **UI:** „Produkcja” (karty + okno „Zarządzanie”), panel „Planeta”, okna HTML (`#text-panel`).
- **Ograniczenia:** jeden kontekst WebGL (iPad), domyślnie 2D (pikselowe), 60/53 kl./s w 3D na iPadzie właściciela — nowe efekty po jednym.

## Mapowanie pojęć promptu na grę

| Prompt | Gra |
|---|---|
| Wiertło poziomu 1–2 | 1–2 poziomy na polu (małe budowle) |
| Wiertło powierzchniowe (poziom 3) | **pełne pole** (3 poziomy) → jedno wiertło z szybem |
| Kompleks wiertniczy (3 wiertła poz. 3) | 3 sąsiednie pełne pola + wolne pole na szyb główny (decyzja gracza) |
| footprint | pola siatki: kompleks = 3 + 1 pola |
| mergeGroup / mergeRules | `data/complexes.ts` (`ComplexFamily`) + `core/colony/complexes.ts` |

## Etapy

1. **v0.38 — wiertła kryształu** ✔ (ta wersja): wiertło z szybem na pełnym polu (2D i 3D, obracająca się głowica), kompleks wiertniczy (podgląd, koszt, decyzja, rozłączenie), pole szybu liczone do zajętości, +30% wydobycia, zapis i rozpad kompleksu po zburzeniu, badanie „Wspólne szyby”.
1a. **v0.38.1–v0.38.2** ✔: karta budowli, obrys zajętości, dedykowany teren (kryształ — lód, metal — wzgórza/góry, elektrownia — równiny), wybór pola przez gracza, animacja łączenia.
2. ✔ **v0.39 — kopalnie metalu:** zakład metalurgiczny (pełne pola), wielka fabryka (rodzina w `COMPLEX_FAMILIES`, większy footprint), ekran fabryki z trybami (np. maksymalna produkcja / oszczędzanie energii — mierzalne przez `siteFactor` i energię).
3. ✔ **v0.40 — energetyka:** węzły i słupy Tesli (pełne pola elektrowni, kompleks z przesyłem), wyładowania lekkie (bez cząsteczek).
4. ✔ **v0.41 — poziomy wizualne:** progi 1–30 w konfiguracji (`visualTier`), moduły dokładane do modeli (platformy, hale, przewody).
5. ✔ **v0.42 — transformacja terenu** (dalej v0.43+: megakompleksy, energia gwiazdy): lokalne materiały wokół kompleksów (warstwa nad terenem, odtwarzana z zapisu), potem megakompleksy i energia gwiazdy (badania).
6. **v0.50 — wydanie zbiorcze:** raport, testy na iPadzie, porządki.

Liczby (premie, koszty, pola) są robocze — strojenie na końcu (decyzja właściciela).
