# Planet Forge — stan projektu i plan do grywalnego MVP

Stan na **2026-10-28**, gra **v0.51.0** (opublikowana, gałąź `main`). Raport powstał w sesji bez zmian w kodzie gry.

**Na czym się opiera:**
- historia 30 ostatnich commitów i przegląd `src/`, `tests/`, `scripts/`;
- uruchomione `npm run check`: typy bez błędów, **326 testów, 326 zaliczonych, 0 błędów**, gra się zbudowała;
- `CLAUDE.md`, `README.md`, `docs/decisions.md`, `docs/generator-plan.md`, `docs/KNOWN_ISSUES.md`, `docs/PERFORMANCE.md` i kopia lore w `docs/lore/`.

Tam, gdzie coś jest tylko opisane, a nie znalazłem tego w kodzie, piszę to wprost.

Oznaczenia: **✅ działa** · **🟡 działa częściowo** · **📄 tylko w dokumentacji** · **❌ brak**.

---

## 1. Co już działa

### Planeta i grafika
- ✅ **Planeta 2D** (domyślna, pikselowa tarcza) i **3D** (opcja w Ustawieniach, z bezpiecznikiem startu). Kod: `planet-renderer/CanvasPlanetFallback.ts`, `PlanetView.ts`, `app/bootGuard.ts`. Testy: `bootGuard`, `adaptiveResolution`, `lowPoly`, `sky`.
- ✅ **Obrót palcem z bezwładnością, przybliżenie, stuknięcie wybiera budynek.** Kod: `planet-renderer/input/`, `pick.ts`. Testy: `dragRotator`, `gestures`, `pick`.
- ✅ **Generator planet z seeda:**
  - 6 typów roboczych, 6 profili powierzchni, metody terenu, woda, jeziora, rzeki, lawa;
  - kod: `core/surface/`, `core/generation/`, `data/planets.ts`, `data/profiles/`;
  - testy: `surface`, `terrainMethods`, `hydrology`, `profiles`, `generation`.
- ✅ **Budynki w 3D z etapami wyglądu (poz. 1 / 6 / 12 / 20)** dla wszystkich 6 budynków (`colonyMeshes.ts`, rodziny `FAMILIES`). Ostatnie zmiany:
  - Elektrownia: wiatr → fuzja → atom → antymateria (v0.50);
  - Magazyn jako port, Kopalnia jako ciężki przemysł (v0.51).
- 🟡 **Ekstraktor kryształów** — działa (odwiert v0.48, wielka odkrywka v0.49), ale **właściciel nie akceptuje wyglądu**. Jest zapisany „do poprawy później” w `CLAUDE.md` i `KNOWN_ISSUES.md`.

### Gospodarka i budynki
- ✅ **Surowce:**
  - metal, kryształy, energia, antymateria;
  - niedobór energii obniża wydajność;
  - magazyn ogranicza zapasy;
  - złoża są skończone.
  - Kod: `core/economy/economy.ts`, `geology.ts`, `data/balance.ts`. Testy: `economy` (21), `deposits`, `geology`.
- ✅ **6 budynków do poz. 40, burzenie, pola i obszar budynku** (spójny kawałek pól, dedykowany teren). Kod: `core/colony/plots.ts`, `core/economy/footprint.ts`. Testy: `fields`, `colony`, `complexes`.
- ✅ **Przemysł:** kompleks (+30%), megakompleks (+60%), znaleziska, specjalizacje kolonii. Kod: `core/colony/complexes.ts`, `core/economy/finds.ts`, `specialization.ts`. Testy: `complexes`, `specialization`.
- 🟡 **Antymateria:**
  - dziś służy tylko do „Ukończ teraz” (powyżej poz. 5) i jest produkowana przez Kolektor (+1/h bez budynku);
  - zużycie przez reaktor i megakonstrukty to **tylko propozycja** w `docs/decisions.md`, w kodzie jej nie ma.

### Czas budowy
- ✅ Budowa trwa (30 s × poziom), jedna naraz, kolejka (1 miejsce + badanie SI), „Ukończ teraz”, anulowanie ze zwrotem.
- ✅ Nadrabianie nieobecności (maks. 8 h).
- Kod: `core/economy/economy.ts`, `app/GameController.ts`. Testy: `economy`, `queue`, `controller`.

### Imperium i mapa galaktyki
- ✅ **Do 5 planet** (badanie dodaje miejsca do 10), przełączanie, nieaktywne planety nadrabiają czas, ekran Imperium. Testy: `controller`, `planetSwitch`, `empireCards`.
- ✅ **Galaktyka 100 układów:**
  - orbity w czasie, wiedza o układach, wyszukiwarka;
  - kolonizacja statkiem, ekspedycje, rzadkie obiekty;
  - kod: `core/galaxy/`;
  - testy: `galaxy`, `orbits`, `discovery`, `expeditions`, `rareObjects`, `galaxyIndex`, `systemTable`, `mapCamera`.
- ✅ **Transportowce, stacja na pasie asteroid, holownik po kometę, kolektor energii gwiazdy.** Kod: `core/economy/transport.ts`, `asteroids.ts`, `comets.ts`, `starEnergy.ts`. Testy: `transport`, `asteroids`, `controller`.
- 📄 **Boty i formy obce** — w kodzie tylko jako znacznik zajętej planety (`occupant: 'alien'`, bot w miejscu startowym). Nie mają żadnego zachowania; komentarz w kodzie mówi „w przyszłości prawdziwy gracz z serwera”.

### Badania
- ✅ Galaktyka badań z 6 ramionami (ok. 20 węzłów w `data/research.ts`), badania przypisane do planety, odblokowania, Laboratorium ogranicza pierścień. Testy: `research` (12), `researchView`, `planetology`.

### SI Matka
- ✅ 4 reguły (Energia, Magazyn, Badania, Kopalnie), poziomy Podpowiada / Pyta / Samo, Autonomia pod nieobecność. Kod: `core/ai/advisor.ts`, `offline.ts`. Testy: `advisor` (8).
- 🟡 SI pilnuje gospodarki, ale **nie prowadzi nowego gracza** (nie tłumaczy gry ani nie stawia celów).

### Dziennik
- ✅ Dziennik ekspedycji w zapisie (`journal` w `core/save/empire.ts`, ograniczona liczba wpisów). Wpisy: budowy, kolonie, działania SI. Pokazywany na ekranie Imperium.
- 🟡 To lista zdarzeń, a nie opowieść. Treści fabularnych (źródła, zapisy dawnej cywilizacji — K-008) jeszcze nie ma.

### Interfejs
- ✅ Pasek zasobów, dolny pasek (☰ + 6 sekcji), jeden wysuwany panel, karta budowli, skalowanie komputer / tablet / telefon, cele dotykowe ≥ 44 pt. Testy: `layout` (10), `gestures`, `motion`.
- 🟡 Ikon na dolnym pasku jeszcze nie ma. `PlanetScene.ts` ma 2310 wierszy (plan: podział na mniejsze pliki).
- ❌ **Samouczek i pierwsze kroki** — w kodzie nie ma nic takiego (szukałem: samouczek, tutorial, onboarding, pierwsze kroki).

### PWA i zapis
- ✅ Zapis w przeglądarce (co 10 s, po akcji, przy schowaniu), eksport i import `PF2:`, migracje starych zapisów.
- ✅ Uszkodzony zapis trafia do kopii z komunikatem; nieudany zapis daje komunikat.
- ✅ Testy: `save`, `transfer`, `controller` (w tym zapisy z v0.1–0.6 i uszkodzone).
- ✅ PWA: offline i pasek „Dostępna aktualizacja” (`app/pwa.ts`, `serviceWorker.ts`, test `build`). Zgłoszenia przez GitHub Issue (test `feedback`).

### Testy
- ✅ **326 testów zaliczonych** (node:test) plus skrypty: zrzuty ekranów, pomiary w przeglądarce bezgłowej, atlas, tabela balansu.
- 📄 `CLAUDE.md` wspomina „skrypty audytu (symulacja losowa)”. **Takiego skryptu nie ma w `scripts/`.** Jest tylko symulacja SI pod nieobecność w teście `advisor`. Nie ma symulacji całej rozgrywki.

---

## 2. Przebudowa generatora (`docs/generator-plan.md`, etapy 1–8)

| Etap | Co | Stan | Wersja |
|---|---|---|---|
| 1 | Audyt i kontrakty danych | ✅ | v0.17 |
| 2 | Wspólny model powierzchni | ✅ | v0.18 |
| 3 | Trzy metody terenu | ✅ | v0.22 |
| 4 | Sześć profili, atlas | ✅ | v0.23 |
| 5 | Woda i lawa (jeziora, rzeki) | ✅ | v0.24 |
| 6 | Światło, atmosfera, kamera, zoom | ✅ | v0.25 |
| 7 | Przebudowa UI | 🟡 | dolny pasek i panel od v0.19, zasada okien v0.46 |
| 8 | Laboratorium planet i walidacja | ❌ | — |

- **Etap 7.** Nie istnieją pliki z planu: `resourceBar.ts`, `navBar.ts`, `planetPanel.ts`, `contextPanel.ts`. Ich zadania wykonuje dziś duży `PlanetScene.ts`. Brakuje ikon na dolnym pasku.
- **Etap 8.** Nie ma `PlanetLabScene.ts` ani raportu końcowego przebudowy.
- **Uwaga:** w `CLAUDE.md` ten etap nazywa się „Laboratorium planet”, a w grze istnieje budynek „Laboratorium”. To dwie różne rzeczy.

---

## 3. Czego brakuje i co jest niespójne

### Rozbieżności kod ↔ dokumentacja
- `CLAUDE.md` pisze „Ostatni pomiar na iPadzie: v0.21”, a `docs/PERFORMANCE.md` ma pomiar właściciela **z v0.46**:
  - 2D: średnio 54 kl./s, najsłabsza sekunda 24;
  - 3D: średnio 56 kl./s, najsłabsza sekunda 15.
- `CLAUDE.md` wspomina „symulację losową”, której nie ma w `scripts/` (patrz wyżej).
- `KNOWN_ISSUES.md` ma nagłówek „Stan: v0.46”, choć dopisywano do niego później.
- Lista „Najbliższe etapy” w `CLAUDE.md` zaczyna się od „Test v0.46 na iPadzie” i „Raport v0.50”. Te numery są już nieaktualne: v0.50 to Elektrownia, a nie raport przemysłu.

### Rozbieżności gra ↔ lore
Kopia lore w `docs/lore/` jest z **2026-10-22**, a gra rozwija się od tamtej pory. Wszystkie nazwy w grze są robocze; żadnej nie traktuję jako kanonu.

| Nazwa w grze | Gdzie (pliki) | Lore |
|---|---|---|
| **Imperium** (ekran, pasek, „Twoje imperium”) | `game/scenes/EmpireScene.ts`, `PlanetScene.ts`, `app/GameController.ts` (klucz zapisu `empire.v1` zostaje) | O-002, możliwa kolizja z K-001 pkt 3 |
| **Forma obca** | `core/galaxy/galaxy.ts`, `data/galaxy.ts`, `game/scenes/MapScene.ts` | obcych nie ma w kanonie; sprawdzić filtrem K-011 |
| **Boty / „inny gracz”** | `core/galaxy/galaxy.ts`, `MapScene.ts` | O-301, O-001 (gra wieloosobowa poza MVP) |
| **Flota cywilna** (ramię badań, transportowce) | `data/research.ts` (w opisie „bez walki”) | K-005, O-205 |
| **Antymateria** (waluta, Kolektor, **Reaktor antymaterii** od v0.50) | `data/balance.ts`, `data/footprint.ts`, `core/economy/economy.ts`, `colonyMeshes.ts` | O-304, O-003, C-002 — kopia lore pisze, że antymaterii „nie ma w kodzie”, a jest od v0.5 |
| **Typy planet** (umiarkowana Kepler-186 f, pustynna, lodowa, oceaniczna, wulkaniczna, jałowa) | `data/planets.ts` (`status: 'robocza'`) | O-004, R-002, R-003 |
| **Galaktyka 100 układów, rodzaje gwiazd, napęd międzygwiezdny** | `data/galaxy.ts`, `data/research.ts` | O-301, O-302 |
| **Etapy budynków** (np. Farma wiatrowa → Reaktor antymaterii, Megaodkrywka) | `data/footprint.ts` | robocze; opisane w `nazwy-w-grze.md` |
| **Znaleziska** megakompleksów | `data/finds.ts` | K-008, K-011, K-012 — do weryfikacji |
| „W klimacie OGame” | `CLAUDE.md` | O-206 |

Szczegóły i pełną listę ma `docs/lore/nazwy-w-grze.md` (zaktualizowany o nowe etapy Elektrowni). Kopii lore w `docs/lore/` nie poprawiam bez decyzji właściciela.

---

## 4. Definicja grywalnego MVP — **PROPOZYCJA do zatwierdzenia przez właściciela**

| # | Kryterium (sprawdzalne) | Stan | Dlaczego |
|---|---|---|---|
| 1 | Nowy gracz w ciągu **5 minut** wie, co robić: rozumie zasoby, buduje pierwsze budynki i wie, po co | ❌ nie | Brak samouczka i pierwszych kroków. SI Matka podpowiada tylko gospodarkę i zakłada, że gracz zna grę. |
| 2 | Jest **pętla celów na kilka dni gry**: widać, co odblokuje się dalej, i czuć postęp | 🟡 częściowo | Są etapy budynków, badania, kolonizacja i przemysł. Brakuje jednak widocznej listy celów. `CLAUDE.md` wyklucza „zadania i osiągnięcia” bez decyzji właściciela. |
| 3 | **Balans nie psuje gry**: brak martwych punktów (czekania wiele godzin bez wyboru) i nadużyć | ❌ nie sprawdzono | Wartości są robocze z decyzji właściciela, a strojenie odłożono na koniec. Nie ma symulacji całej rozgrywki, która wykryłaby martwe punkty. |
| 4 | **Płynność na iPadzie**: 2D i 3D średnio ≥ 50 kl./s, najsłabsza sekunda ≥ 30 kl./s przy typowej kolonii | 🟡 częściowo | Pomiar z v0.46: średnia dobra (54 / 56), ale najsłabsza sekunda 24 (2D) i 15 (3D). Po v0.47–v0.51 (nowe modele, odkrywka) nie było nowego pomiaru na iPadzie. |
| 5 | **Zapis odporny** na błędy i aktualizacje: stary zapis z każdej wersji się wczytuje, uszkodzony nie kasuje gry, eksport działa | ✅ w większości | Są testy migracji (v0.1–0.6, kilka planet, inna siatka pól), kopia uszkodzonego zapisu i eksport `PF2:`. Brakuje testu „zapis z każdej opublikowanej wersji”. |
| 6 | **Brak błędów blokujących**: 0 otwartych zgłoszeń `bug`, żadna akcja nie zawiesza gry | ✅ na dziś | 0 otwartych zgłoszeń na GitHubie (sprawdzone 2026-10-28), 326 testów zaliczonych. Brakuje świeżego testu na iPadzie. |
| 7 | **Nazwy w grze nie kłócą się z kanonem** lore (filtr K-011) | 🟡 częściowo | Wszystko jest oznaczone jako robocze, ale O-002 (Imperium), obcy i boty są nierozstrzygnięte. |

---

## 5. Co jeszcze do MVP

### Blokujące
1. **Pierwsze kroki dla nowego gracza** (kryterium 1).
2. **Symulacja rozgrywki i strojenie balansu** (kryterium 3). Najpierw narzędzie pomiarowe, potem liczby, zgodnie z decyzją „balans na końcu, przed MVP”.
3. **Pomiar płynności na iPadzie po v0.51** i ewentualna poprawa najsłabszych sekund (kryterium 4).

### Ważne
4. **Widoczne cele / kamienie milowe** (kryterium 2). Wymaga decyzji właściciela, bo `CLAUDE.md` wyklucza „zadania i osiągnięcia”.
5. **Nazwy a lore** (kryterium 7): Imperium, obcy, boty. Wymaga decyzji w Projekcie lore.
6. **Test wczytania zapisów z różnych wersji** (kryterium 5).

### Miłe do posiadania (nadal przed MVP, jeśli starczy czasu)
7. Ikony na dolnym pasku i podział `PlanetScene.ts`.
8. Poprawa wyglądu Ekstraktora kryształów (najpierw szkic właściciela).
9. Antymateria zużywana przez reaktor i megakonstrukty (pomysł właściciela). Wymaga decyzji i liczb.

### Po MVP (świadomie poza zakresem)
- Laboratorium planet (etap 8 generatora) i dalsza przebudowa generatora.
- Księżyc i lokacje wokół planety, gwiazdy mistrzowskie, osobny ekran SI.
- DNA i stworzenia, Stocznia, flota i walka.
- Treści fabularne: anomalie, dawna cywilizacja.
- Backend, konta, multiplayer, synchronizacja, płatności — nie są częścią MVP.

---

## 6. Kolejne etapy (każdy = osobna sesja, gałąź `claude/…`, akceptacja przed `main`)

Etapy wymagające decyzji właściciela albo lore oznaczam **🔒**.

### Etap A — v0.52 „Pierwsze kroki” 🔒 (forma do wyboru — pytanie 2)
- **Cel:** nowy gracz w 5 minut rozumie zasoby i buduje pierwsze budynki.
- **Zakres:** krótkie podpowiedzi SI Matki krok po kroku przy pierwszej grze, pomijalne, z zapamiętaniem postępu w zapisie (nowe pole opcjonalne); teksty robocze w ramie dziennika (K-008).
- **Nie ruszamy:** balansu, budynków, grafiki.
- **Ryzyko:** natrętność podpowiedzi; zgodność ze starymi zapisami (stary gracz nie może zobaczyć samouczka).
- **Sprawdzenie na iPadzie:**
  1. Otwórz grę w prywatnej karcie Safari (w grze nie ma dziś przycisku „Nowa gra”).
  2. Wykonuj kolejne podpowiedzi.
  3. Dotknij „Pomiń”.
  4. Zamknij i otwórz grę — podpowiedzi nie wracają.
- **Prompt:** „Etap A z docs/status.md: pierwsze kroki dla nowego gracza wg wybranej formy. Najpierw pokaż plan i teksty do akceptacji, potem kod. Nowe pole zapisu opcjonalne, stare zapisy bez samouczka. npm run check, gałąź claude/…, wersja v0.52.”

### Etap B — v0.53 „Symulator rozgrywki” (bez zmian w grze)
- **Cel:** zmierzyć, ile trwają kolejne etapy gry i gdzie gracz czeka bez wyboru.
- **Zakres:** skrypt `scripts/simulate.ts` gra przez kilka dni czasu gry (zwykłe akcje kontrolera, strategia „rozsądny gracz”) i zapisuje raport `docs/balans-symulacja.md`: czasy do poz. 6 / 12 / 20, przerwy dłuższe niż X h, zasób, który blokuje.
- **Nie ruszamy:** liczb w `src/data`.
- **Ryzyko:** strategia symulacji ≠ prawdziwy gracz (raport to wskazówka).
- **Sprawdzenie na iPadzie:** brak zmian w grze — czytasz raport w repozytorium.
- **Prompt:** „Etap B z docs/status.md: skrypt symulacji rozgrywki i raport docs/balans-symulacja.md. Bez zmian w kodzie gry i w src/data. Gałąź claude/…, v0.53 (tylko skrypt i dokument).”

### Etap C — v0.54 „Strojenie ekonomii” 🔒 (decyzja: liczby z raportu B)
- **Cel:** usunąć martwe punkty i nadużycia wskazane przez symulator.
- **Zakres:** wartości w `src/data/balance.ts` i powiązanych plikach, ponowna symulacja przed i po, `npm run balance-doc`.
- **Nie ruszamy:** mechaniki i zapisu (stare zapisy zachowują poziomy).
- **Ryzyko:** gracze w trakcie gry odczują zmianę tempa.
- **Sprawdzenie na iPadzie:** na swojej planecie sprawdź czasy oczekiwania przy kolejnych ulepszeniach i porównaj z tabelą w raporcie.
- **Prompt:** „Etap C z docs/status.md: strojenie liczb wg raportu docs/balans-symulacja.md. Pokaż tabelę zmian przed/po do akceptacji, potem wdroż. Gałąź claude/…, v0.54.”

### Etap D — v0.55 „Płynność iPada”
- **Cel:** najsłabsza sekunda ≥ 30 kl./s w 2D i 3D.
- **Zakres:** najpierw Twój pomiar (instrukcja w `docs/PERFORMANCE.md`), potem jedna poprawka naraz, np. rysowanie paneli tylko po zmianie (KNOWN_ISSUES pkt 3), wspólne materiały, mniej rysowań.
- **Nie ruszamy:** wyglądu budynków ani zasad gry.
- **Ryzyko:** regresja interfejsu przy przebudowie rysowania paneli.
- **Sprawdzenie na iPadzie:**
  1. Ustawienia → Diagnostyka.
  2. Minuta obracania planety z otwartą Produkcją.
  3. Zanotuj średnią i najsłabszą sekundę.
- **Prompt:** „Etap D z docs/status.md: płynność iPada. Oto mój pomiar z Diagnostyki: [wklej]. Znajdź najdroższą część i popraw jedną rzecz naraz, z pomiarem przed/po. Gałąź claude/…, v0.55.”

### Etap E — v0.56 „Odporność zapisu”
- **Cel:** zapis z każdej opublikowanej wersji wczytuje się bez utraty postępu.
- **Zakres:** zestaw przykładowych zapisów z wersji v0.1 → v0.51 w `tests/`, test wczytania każdego, kopia zapasowa przed migracją.
- **Nie ruszamy:** formatu zapisu (tylko testy i ewentualne poprawki migracji).
- **Ryzyko:** brak prawdziwych starych zapisów — trzeba je odtworzyć z historii git.
- **Sprawdzenie na iPadzie:** Ustawienia → „Kopiuj zapis”, aktualizacja, gra wczytuje Twoją planetę bez zmian.
- **Prompt:** „Etap E z docs/status.md: testy wczytania zapisów ze wszystkich wersji i kopia przed migracją. Bez zmiany formatu. Gałąź claude/…, v0.56.”

### Etap F — v0.57 „Cele i kamienie milowe” 🔒 (pytanie 3 — `CLAUDE.md` wyklucza „zadania i osiągnięcia”)
- **Cel:** gracz zawsze widzi 1–3 najbliższe cele i co dadzą.
- **Zakres (wariant lekki):** cele wynikające z gry (następny etap budynku, badanie, kolonia) w dzienniku lub na karcie Imperium, bez nagród, punktów i powiadomień.
- **Nie ruszamy:** balansu ani grafiki.
- **Ryzyko:** dodanie mechaniki spoza zakresu.
- **Sprawdzenie na iPadzie:** dotknij **Imperium** — widać najbliższe cele; po osiągnięciu jednego pojawia się kolejny.
- **Prompt:** „Etap F z docs/status.md, wariant [wybrany]: najbliższe cele gracza. Najpierw plan do akceptacji. Gałąź claude/…, v0.57.”

### Etap G — v0.58 „Nazwy a lore” 🔒 (O-002 Imperium, obcy, boty, O-304 antymateria, O-301 galaktyka)
- **Cel:** nazwy widoczne dla gracza zgodne z kanonem albo jasno robocze.
- **Zakres:** zmiana tylko tekstów (identyfikatory i klucze zapisu zostają), aktualizacja `docs/lore/` nową kopią z Projektu.
- **Nie ruszamy:** mechaniki.
- **Ryzyko:** decyzje lore mogą nie zapaść na czas — wtedy etap czeka.
- **Sprawdzenie na iPadzie:** przejdź przez pasek dolny, mapę i badania; sprawdź nowe nazwy.
- **Prompt:** „Etap G z docs/status.md: wklejam nową kopię lore [pliki]. Porównaj nazwy w grze z kanonem i zaproponuj zmiany tekstów (bez identyfikatorów i kluczy zapisu). Gałąź claude/…, v0.58.”

### Etap H — v0.59 „Interfejs: ikony i porządek”
- **Cel:** ikony na dolnym pasku, `PlanetScene.ts` podzielony na mniejsze pliki (etap 7 generatora).
- **Nie ruszamy:** układu ekranów ani zasad gry.
- **Ryzyko:** regresje interfejsu — testy układu i zrzuty przed i po.
- **Sprawdzenie na iPadzie:** każdy przycisk dolnego paska ma ikonę i działa; panele otwierają się jak dawniej.
- **Prompt:** „Etap H z docs/status.md: ikony dolnego paska i podział PlanetScene.ts bez zmian zachowania. Zrzuty przed/po. Gałąź claude/…, v0.59.”

### Etap I — v0.60 „Kandydat MVP”
- **Cel:** sprawdzić wszystkie kryteria z punktu 4 i wypuścić wersję MVP.
- **Zakres:** audyt, poprawki drobnych błędów, lista kontrolna, aktualizacja `CLAUDE.md` i `README.md`.
- **Nie ruszamy:** żadnych nowych funkcji.
- **Ryzyko:** odkrycie braków wymagających kolejnego etapu.
- **Sprawdzenie na iPadzie:** pełna lista kontrolna (niżej) plus nowa gra od zera przez 30 minut.
- **Prompt:** „Etap I z docs/status.md: audyt kandydata MVP wg kryteriów z punktu 4. Raport spełnione/nie, poprawki tylko drobne. Gałąź claude/…, v0.60.”

---

## 7. Decyzje, których potrzebuję od właściciela

1. **Czy przyjmujesz definicję MVP z punktu 4?**
   - **A (rekomendacja):** tak, 7 kryteriów jak wyżej.
   - B: tak, ale bez kryterium 7 (lore) — nazwy rozstrzygniemy po MVP.
   - C: chcę zmienić kryteria (napisz które).
2. **Forma pierwszych kroków (etap A):**
   - **A (rekomendacja):** podpowiedzi SI Matki w dymku, krok po kroku, z „Pomiń”. Pasuje do istniejącej SI i ramy dziennika.
   - B: osobny ekran samouczka z obrazkami przed pierwszą grą.
   - C: tylko przycisk „?” z opisem zasad, bez prowadzenia.
3. **Cele gracza (etap F), mimo że `CLAUDE.md` wyklucza „zadania i osiągnięcia”:**
   - **A (rekomendacja):** lekkie „najbliższe cele” wynikające z gry, bez nagród i punktów.
   - B: pełne zadania z nagrodami (większa zmiana zakresu).
   - C: bez celów w MVP — wystarczy SI Matka.
4. **Kolejność pierwszych etapów:**
   - **A (rekomendacja):** B → C → A (najpierw symulator i balans, potem pierwsze kroki dopasowane do strojonej gry).
   - B: A → B → C (najpierw nowy gracz).
   - C: D najpierw (płynność iPada), jeśli Twój nowy pomiar pokaże problem.
5. **Nazwa „Imperium” (O-002):**
   - **A (rekomendacja):** zostaje do decyzji w Projekcie lore (etap G).
   - B: od razu robocza zmiana tekstu (np. „Kolonie”) — klucz zapisu bez zmian.

---

## Lista kontrolna do Twojego sprawdzenia na iPadzie (v0.51.0)

Nie testowałem gry na iPadzie — to symulacje i testy automatyczne.

1. Gra startuje, pasek „Dostępna aktualizacja” znika po dotknięciu, Twoja planeta i postęp są na miejscu.
2. Wejdź w Ustawienia → Diagnostyka i przez minutę obracaj planetę w 2D, a potem w 3D. Zanotuj średnią i najsłabszą sekundę. To pomiar do etapu D.
3. Dotknij **Produkcja**, potem tytułu karty Elektrowni, Magazynu i Kopalni metalu. Planeta obraca się do budynku, a wygląd pasuje do etapu.
4. Ulepsz dowolny budynek, zamknij grę na kilka minut i otwórz ją ponownie. Budowa ukończona, produkcja naliczona.
5. Wejdź w Ustawienia → „Kopiuj zapis”. Tekst `PF2:` jest w schowku (zachowaj go jako kopię zapasową).
6. Otwórz **Mapa**, **Badania** i **Imperium**. Każdy ekran się otwiera i zamyka, nic się nie zawiesza.
7. Otwórz grę w prywatnej karcie Safari jako „nowy gracz”. Zanotuj, w którym momencie nie wiesz, co robić. To materiał do etapu A.
