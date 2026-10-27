# Wydajność — raport audytu v0.46

> **Uwaga:** wszystkie pomiary poniżej zrobiono w **przeglądarce bezgłowej (Chromium + Playwright) albo w Node na komputerze**.
> To **symulacja, NIE pomiar na iPadzie**. Liczby służą do porównania wersji „przed” i „po” między sobą.
> Prawdziwą płynność na iPadzie mierzy właściciel — instrukcja na końcu.

Wersje: **przed** = v0.45 (z poprawkami logiki fazy 1, interfejs bez zmian; build `2d5a667`), **po** = v0.46 (gałąź `claude/audyt-v046`).
Skrypty: `scripts/perf.ts` (przeglądarka), `scripts/perf-generation.ts` (Node).

## Podsumowanie

| Pomiar | Przed | Po | Uwagi |
|---|---:|---:|---|
| Rozmiar `dist/index.html` | 2 206 326 B (616 KB gzip) | 2 210 398 B (618 KB gzip) | +4 KB: nowe teksty i obsługa okien |
| Start gry do gotowych paneli, 2D (CPU 4× wolniej) | 4,0 s | 3,9 s | w granicach rozrzutu |
| Start gry do gotowych paneli, 3D (CPU 4× wolniej) | 5,8 s | 6,0 s | w granicach rozrzutu |
| Siatka pól — średnio (24 kombinacje typ × metoda) | 214 ms | 189 ms | **−12%**, wynik identyczny co do bitu |
| Siatka pól — najgorszy przypadek (lodowa, tectonic) | 315 ms | 272 ms | −14% |
| Planeta gotowa (dane + teren + woda/lawa + siatka), średnio | 261 ms | 236 ms | −10% |
| Klatki 2D, bez panelu (CPU 4× wolniej, @2x) | 8 / s | 8 / s | ograniczone programowym rysowaniem przeglądarki (patrz niżej) |
| Klatki 2D, przybliżenie ~2,7× | 6 / s | 6 / s | j.w. |
| Klatki 2D, panel „Produkcja” | 8 / s | 8 / s | j.w. |
| Klatki 3D, bez panelu / przybliżenie / panel | 3 / 2 / 3 | 3 / 2 / 3 | 3D rysowane programowo (SwiftShader) — bez znaczenia dla iPada |
| Grafika 3D: rysowania (draw calls) / trójkąty | 43 / 104 688 | 43 / 104 688 | bez zmian w rendererze |
| Pamięć JS: start → po 10 → po 20 zmianach planety (2D) | — | 31,4 → 38,1 → 38,3 MB | wzrost po 10 = pamięć podręczna siatek 3 planet; po 20 stabilnie → **brak wycieku** |
| Pamięć JS j.w. (3D) | — | 33,6 → 41,0 → 41,2 MB | brak wycieku |
| Geometrie / tekstury 3D: start → po 10 → po 20 zmianach | — | 43/2 → 43/2 → 43/2 | **brak wycieku** w Three.js |
| Przełączanie 2D ↔ 3D | — | — | przeładowuje stronę (cała pamięć zwalniana) — wyciek niemożliwy |
| Naliczenie 8 h nieobecności przy starcie (aktywna planeta) | 3 ms | 2 ms | Node |
| Przejście na 4 nieaktywne planety (każda nadrabia 8 h) | 5 ms | 4 ms | ~1 ms na planetę (bez siatki — ta liczy się po pokazaniu „Ładowanie…”) |
| Zestawienie „Imperium” (5 planet) | 2 ms | 1 ms | Node |
| Rozmiar zapisu (5 planet, dziennik) | 3,2 KB | 3,2 KB | tekst `PF2:` — 4,4 KB |

„Przed” dla pamięci i grafiki 3D nie mierzono osobno: pomiar wymaga dostępu `window.__planetForge`, dodanego w v0.46
tylko w podglądzie (`npm run dev`). Renderer i zarządzanie pamięcią planety nie zmieniły się w audycie.

## Co zabiera czas

- **Klatka 2D w przeglądarce bezgłowej:** profil 5 s (bez spowolnienia) — kod gry (JavaScript) ok. 0,3 s, reszta to
  rysowanie na ekran w przeglądarce (`(program)`, programowe łączenie warstw bez karty graficznej). Na iPadzie robi to
  karta graficzna — stąd 58–60 kl./s zmierzone przez właściciela (v0.21) przy 8 kl./s w symulacji.
- **Zmiana planety:** najdroższa jest siatka pól (150–300 ms na komputerze, iPad zapewne 2–4× dłużej) i pieczenie terenu
  (20–100 ms, metoda „erosion” najwolniejsza). Dlatego zmiana planety najpierw pokazuje „Ładowanie: …” (v0.30).
- **Generowanie danych planety** (`generatePlanet`): poniżej 1 ms.

## Co poprawiono (bez zmiany wyglądu i zasad gry)

- `core/colony/fieldGrid.ts`:
  - sąsiedzi punktów mapy liczeni na jednej tablicy liczb (zamiast tablicy trójek);
  - pary sąsiadów bez zbioru wszystkich par (sprawdzenie 6 pozycji);
  - rogi granic pól z kluczem liczbowym zamiast napisu;
  - kopiec w algorytmie Dijkstry na tablicach typowanych, bez tworzenia pary przy każdym zdjęciu.
- Wynik siatki sprawdzony hashem SHA-256 dla 12 planet wszystkich typów — identyczny przed i po
  (zapisy, przydział pól i obszary budynków bez zmian).

## Wąskie gardła zostawione (do decyzji / na później)

- Phaser rysuje panele w Canvas 2D **w każdej klatce**, także gdy nic się nie zmienia. Rysowanie tylko po zmianie
  zmniejszyłoby pracę procesora iPada (bateria), ale to większa zmiana — wpis w `docs/KNOWN_ISSUES.md`.
- Siatka pól: dalsze przyspieszenie wymagałoby innego algorytmu (np. mniej iteracji Lloyda) — zmieniłoby kształt
  pól i przydział budynków w zapisach, więc nie robiono tego bez decyzji.

## Szczegóły — generowanie planety (mediana z 3, ms, Node na komputerze)

| Typ | Metoda | Siatka pól przed | Siatka pól po | Razem przed | Razem po |
|---|---|---:|---:|---:|---:|
| kepler-186f | legacy | 278 | 272 | 279 | 272 |
| kepler-186f | tectonic | 174 | 154 | 228 | 207 |
| kepler-186f | erosion | 165 | 162 | 286 | 284 |
| kepler-186f | fractured | 171 | 166 | 213 | 209 |
| arid | legacy | 256 | 219 | 256 | 219 |
| arid | tectonic | 212 | 180 | 252 | 218 |
| arid | erosion | 211 | 185 | 340 | 313 |
| arid | fractured | 220 | 177 | 254 | 215 |
| ice | legacy | 258 | 231 | 259 | 231 |
| ice | tectonic | 315 | 261 | 360 | 318 |
| ice | erosion | 217 | 182 | 326 | 289 |
| ice | fractured | 245 | 193 | 283 | 224 |
| ocean | legacy | 186 | 163 | 187 | 163 |
| ocean | tectonic | 195 | 158 | 242 | 203 |
| ocean | erosion | 184 | 148 | 287 | 247 |
| ocean | fractured | 247 | 196 | 285 | 231 |
| volcanic | legacy | 211 | 213 | 211 | 213 |
| volcanic | tectonic | 170 | 157 | 221 | 205 |
| volcanic | erosion | 171 | 174 | 278 | 290 |
| volcanic | fractured | 181 | 166 | 215 | 198 |
| barren | legacy | 240 | 217 | 240 | 217 |
| barren | tectonic | 205 | 186 | 232 | 209 |
| barren | erosion | 217 | 183 | 313 | 274 |
| barren | fractured | 203 | 192 | 218 | 212 |

„Razem” = dane planety + teren (pieczenie mapy sześciennej) + woda/lawa (hydrologia) + siatka pól.

## Jak powtórzyć pomiary

```sh
npm run dev                                   # podgląd na :5173 (dla --deep)
node scripts/perf-generation.ts 3             # generowanie, offline, zapis (Node)
npm run build && (cd dist && npx http-server -p 5175)   # zbudowana gra
node scripts/perf.ts http://localhost:5175 "nazwa"       # start i klatki
node scripts/perf.ts http://localhost:5173 "nazwa" --deep # + grafika 3D i pamięć (tylko podgląd)
```

## Pomiar właściciela na iPadzie (v0.46, 2026-10-27)

| Grafika | Średnio | Najsłabsza sekunda | Grafika 3D | Planeta |
|---|---:|---:|---|---|
| 2D | 54 kl./s | 24 kl./s (pomiar 39 s) | — | pustynna, 46 pól |
| 3D (100%) | 56 kl./s | 15 kl./s (pomiar 29 s) | 28 rysowań, 68 105 trójkątów, 44 geometrie, 4 tekstury | wulkaniczna, 92 pola |

Średnia na poziomie v0.21 (58–59). Najsłabsze sekundy przypadają najpewniej na start i ładowanie planety (krótki pomiar).
Liczby geometrii i tekstur nie rosły — brak oznak wycieku.

## Pomiar na iPadzie — instrukcja dla właściciela

Tego nie zastąpi żadna symulacja. Zajmuje ok. 5 minut.

1. Otwórz grę z ekranu początkowego (ikona Planet Forge). Odczekaj 10 s po starcie.
2. **Obracaj planetę palcem przez ok. 30 s**, potem przybliż dwoma palcami i obracaj kolejne 30 s.
3. Otwórz **Produkcję** i poobracaj planetę obok panelu ok. 30 s.
4. Dotknij **☰ → Ustawienia → Zgłoś / diagnostyka → „Pokaż diagnostykę”**.
5. Zanotuj (albo zrób zrzut ekranu) wiersze:
   - **„płynność (ostatnia minuta)”** — średnia i najsłabsza sekunda (kl./s);
   - **„grafika teraz”** — 2D albo 3D (i rozdzielczość w 3D);
   - **„grafika 3D”** (tylko w 3D) — rysowania, trójkąty, geometrie, tekstury;
   - **„planety”** i **„pola”**.
6. Przełącz na 3D (Ustawienia → Włącz 3D), powtórz kroki 1–5.
7. Wynik wklej w zgłoszeniu (Ustawienia → Zgłoś / diagnostyka → Kopiuj) albo w `docs/decisions.md`
   (tabela pomiarów, jak w v0.21: 3D 59/48 kl./s, 2D 58/50).

Dobrze: średnio ≥ 50 kl./s, najsłabsza sekunda ≥ 40. Jeśli „grafika 3D” pokazuje rosnące liczby geometrii lub tekstur
po kilku zmianach planety — to wyciek, zgłoś go.
