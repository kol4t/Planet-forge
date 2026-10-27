# Planet Forge

Przeglądarkowa strategia science-fiction projektowana pod **iPada (Safari)**. Gracz trzyma w dłoni planetę — obraca ją
palcem, rozbudowuje kolonię (budynki rosną w kompleksy zajmujące pola), gospodaruje metalem, kryształami, energią
i antymaterią, bada galaktykę technologii, odkrywa mapę 100 układów, zakłada kolejne kolonie i przewozi surowce.
Wersja **0.46** (audyt; opublikowana 0.45). Interfejs po polsku.

## Jak zagrać

- **Gra online: https://kol4t.github.io/Planet-forge/** (publikowana automatycznie z gałęzi `main`).
- Na iPadzie: Safari → adres gry → „Udostępnij” → **„Do ekranu początkowego”**. Gra otwiera się z ikony na pełnym
  ekranie i działa offline. Nowa wersja → pasek „Dostępna aktualizacja” → „Odśwież”.
- Safari i aplikacja z ekranu początkowego mają **osobną pamięć**: postęp przenosisz w ☰ → Ustawienia → „Kopiuj zapis”
  / „Wczytaj zapis”.
- Planeta 2D jest domyślna; 3D — ☰ → Ustawienia → „Włącz 3D”.
- Błąd albo pomysł: ☰ → Ustawienia → **„Zgłoś / diagnostyka”** (instrukcja: `docs/zgloszenia.md`).

## Dla programisty / Claude Code

Wymagany Node.js ≥ 22.18.

```sh
npm install
npm run dev           # podgląd na http://localhost:5173 (buduje przy odświeżeniu)
npm run check         # typy + testy + build — po każdej zmianie kodu
npm run build         # dist/ — gra w jednym pliku + PWA (do wrzucenia na hosting https)
npm run atlas         # docs/atlas/ — profile powierzchni × metody terenu
npm run balance-doc   # docs/BALANCE.md — tabele wartości z kodu
node scripts/screens.ts <folder> [2d|3d]   # zrzuty ekranów w 7 rozmiarach (przy npm run dev)
```

Instrukcje i zasady: **`CLAUDE.md`**. Dokumentacja: **`docs/README.md`**.

## Lista kontrolna — test na iPadzie (aktualna, v0.46)

Krótka kontrola całości po każdej publikacji (ok. 10 minut). Dawne listy kolejnych wersji: `docs/lista-kontrolna-historia.md`.

**Start i planeta**
1. Gra startuje z ikony bez paska Safari; napis „Przygotowywanie ekspedycji…” znika, widać planetę, pasek zasobów u góry
   i dolny pasek przycisków na całą szerokość.
2. Przeciągnięcie palcem obraca planetę (z bezwładnością), dwa palce przybliżają; strona się nie przesuwa ani nie powiększa.
3. Przeciągnięcie zaczęte na panelu nie obraca planety.

**Produkcja i budowa**
4. Dolny pasek → **Produkcja**: 6 kart; tekst nie wychodzi poza kartę i nie chowa się pod przyciskiem; przycisk pokazuje
   „Ulepsz do N · czas”.
5. Ulepsz budynek: zasoby maleją, pasek postępu i odliczanie; „Anuluj” → „Na pewno?” → koszt wraca.
6. Przy ujemnej energii: czerwona linia „⚡ Brak energii…” w nagłówku Produkcji; dotknięcie jej (albo kolumny ENERGIA
   u góry) pokazuje wyjaśnienie, co zrobić.
7. Dotknij budynku na planecie (przy otwartej Produkcji): obok planety karta budowli z obrysem pól, karta budynku
   w Produkcji w złotej ramce, **bez** dodatkowego okienka „Budynek” i bez dymku SI na karcie. Zamknięcie Produkcji →
   pojawia się okienko „Budynek” z przyciskiem „Ulepsz”.
8. Otwarcie panelu Planeta lub SI zamyka kartę budowli (jeden panel naraz).

**Ekrany**
9. Badania, Mapa, Imperium otwierają się i zamykają „Zamknij”; w Badaniach widać wszystkie filtry ramion.
10. ☰ → lista planet → dotknięcie innej planety: „Ładowanie…”, potem nowa planeta; powrót działa.
11. ☰ → Ustawienia: wszystkie przyciski widać; „Zamknij” zamyka.

**Zapis i offline**
12. Zamknij grę na kilka minut i wróć: komunikat „Podczas nieobecności…”, postęp zachowany.
13. Ustawienia → „Kopiuj zapis” → „Wczytaj zapis” (wklej): gra wczytuje to samo imperium.

**Obrót urządzenia i płynność**
14. Obróć iPada pionowo ↔ poziomo: układ przebudowuje się, nic nie wychodzi poza ekran, pasek zasobów nie nachodzi na siebie.
15. Płynność: instrukcja pomiaru w `docs/PERFORMANCE.md` (Ustawienia → Zgłoś / diagnostyka → „Pokaż diagnostykę”).

## Licencja i treści

Nazwy, opisy i liczby w grze są robocze (lore powstaje osobno — `docs/lore/`, `docs/LORE_TOUCHPOINTS.md`).
