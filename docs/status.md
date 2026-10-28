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

## 4. Definicja grywalnego MVP — **decyzja właściciela (2026-10-28)**

> MVP = model eksploatacji planety, wstępna flota, wstępna ekonomia i pętla rozgrywki (bez endgame'u):
> **planeta → rozwój planety → wyczerpanie surowców → transport / przeniesienie na inną planetę → po wydobyciu złóż
> z 3 planet pętla zamyka się stworzeniem stacji kosmicznej / floty / imperium gwiezdnego** z magazynem na orbicie,
> pozyskiwaniem energii słonecznej i antymaterii. Antymateria = główne paliwo podróży między układami.

Wcześniejsza propozycja (7 kryteriów, m.in. samouczek i lore) jest zastąpiona tą definicją. Samouczek, płynność iPada
i odporność zapisu zostają jako warunki jakości (punkt 5, „ważne”), nie jako rdzeń MVP.

**Uwaga do zakresu:** `CLAUDE.md` wykluczał flotę i walkę z MVP. Właściciel włącza **wstępną flotę z obroną** — szczegóły i zastrzeżenia w punkcie 6.

### Pętla MVP krok po kroku — co jest w kodzie

| Krok pętli | Stan | Co jest (kod / test) | Czego brakuje |
|---|---|---|---|
| 1. **Planeta** — start, pola, złoża | ✅ | planeta z seeda, pola, złoża skończone `depositTotal` (2 mln metalu i 1,2 mln kryształów na 100 pól × bogactwo planety) — `core/economy/economy.ts`, testy `deposits`, `fields` | — |
| 2. **Rozwój planety** | ✅ | 6 budynków do poz. 40, etapy 1/6/12/20, kompleksy, badania — testy `economy`, `complexes`, `research` | tempo nie sprawdzone symulacją |
| 3. **Wyczerpanie surowców** | ✅ mechanika · 🟡 tempo | kopalnia na wyczerpanym złożu stoi i nie bierze energii; alert „złoże wyczerpane”, czas do wyczerpania na karcie; burzenie poziomów — `economy.ts`, `empireCards.ts`, `PlanetScene.ts` | nie wiadomo, **po ilu dniach** gry złoże się kończy (brak symulacji) |
| 4. **Transport / przeniesienie** | 🟡 | transportowce: metal + kryształy, 5000 na lot, 3 naraz — `core/economy/transport.ts`; statek kolonizacyjny — `GameController`, test `controller`; holownik po kometę, stacja na pasie asteroid | „przeniesienie” (np. budynków lub siedziby) nie istnieje — **do wyjaśnienia** (pytanie 1); loty **nie zużywają antymaterii** |
| 5. **Warunek „3 planety wydobyte”** | ❌ | — (gra liczy złoża każdej planety, ale nic na tym nie buduje) | licznik postępu pętli i warunek zamknięcia |
| 6. **Stacja kosmiczna z magazynem na orbicie** | ❌ | jest tylko zaślepka badania „Moduł orbitalny (wkrótce)” (`station-orbit` w `data/research.ts`) i osobne rzeczy na orbicie: kolektor energii gwiazdy (`starEnergy.ts`), stacja asteroidowa | stacja, magazyn orbitalny wspólny dla imperium, wygląd w 2D/3D |
| 7. **Energia słoneczna na orbicie** | 🟡 | kolektor energii gwiazdy zasila planety gracza w układzie (v0.44) — test `controller` | powiązanie ze stacją |
| 8. **Antymateria — paliwo podróży** | ❌ | antymateria jest (Kolektor, +1/h, „Ukończ teraz”), ale żaden lot jej nie zużywa | koszt paliwa lotów (w układzie / między układami) |
| 9. **Wstępna flota** | 🟡 | statki istnieją jako akcje (transportowiec, kolonizacyjny, holownik, ekspedycja), ramię badań „Flota cywilna” | widok floty (lista statków), budowa statków (np. na stacji), bez walki |
| 10. **Wstępna ekonomia** | 🟡 | wszystkie liczby robocze (`data/balance.ts`), tabela `docs/BALANCE.md` | sprawdzenie, czy cała pętla da się przejść w rozsądnym czasie (symulacja + strojenie) |
| 11. **Imperium gwiezdne** — zamknięcie pętli | ❌ | — | moment „pętla zamknięta”: wpis w dzienniku, odblokowanie lotów międzyukładowych na antymaterii |

---

## 5. Co jeszcze do MVP

### Blokujące (rdzeń pętli) — kolejność i wersje w punkcie 7
1. Symulator pętli (tempo każdego kroku).
2. Antymateria jako paliwo lotów.
3. Status „wyeksploatowana” (80%) i licznik pętli 0/3.
4. Stacja macierzysta z magazynem orbitalnym i energią słoneczną.
5. Transfer megakonstruktu na inną kolonię.
6. Wstępna flota (budowa statków, eskorta) i ryzyko misji.
7. Zamknięcie pętli — imperium gwiezdne.
8. Wstępna ekonomia (strojenie całej pętli).

### Ważne (jakość)
7. **Pierwsze kroki** — SI Matka prowadzi nowego gracza przez pętlę (dziś brak samouczka).
8. **Płynność iPada** — nowy pomiar po v0.51; v0.46 miał najsłabszą sekundę 24 (2D) i 15 kl./s (3D).
9. **Odporność zapisu** — nowe pola (stacja, paliwo, postęp pętli) opcjonalne; test zapisów z różnych wersji.

### Miłe do posiadania
10. Ikony na dolnym pasku, podział `PlanetScene.ts`.
11. Nazwy a lore (Imperium, obcy, boty — O-002, O-301, O-304).
12. Poprawa wyglądu Ekstraktora kryształów (po szkicu właściciela).

### Po MVP
Endgame; walka; dalsze moduły stacji (dok handlowy, czerpanie gazu); księżyc; gwiazdy mistrzowskie; ekran SI; DNA;
Laboratorium planet (etap 8 generatora); backend / konta / multiplayer.

---

## 6. Decyzje właściciela do pętli MVP (2026-10-28)

1. **Przeniesienie = A + B.**
   - **A:** gracz zakłada nowe kolonie i przewozi surowce (już w grze).
   - **B (nowe):** gotowy **megakonstrukt** można wysłać na inną kolonię:
     - przygotowanie terenu i rozłożenie konstruktu do lotu trwa ok. **30 min**;
     - potem leci **misja transportowa konstruktu**, której czas zależy od odległości (ta sama planeta → układ → inny układ);
     - na celu konstrukt staje jako gotowy megakompleks.
   - Misję **mogą przejąć albo zniszczyć inni gracze** — patrz uwaga o zakresie.
2. **Zamknięcie pętli = 80% złóż na 3 planetach** — rozwinięcie niżej.
3. **Stacja macierzysta** (siedziba SI Matki, stacja główna) jako osobny obiekt w kosmosie. Do tego **mniejsze stacje**, które łączą się z macierzystą.
4. **Antymateria = paliwo każdego lotu:** w układzie mało, między układami dużo.
5. **Flota również bojowa (wariant B):** obrona i walka, nie tylko statki cywilne.

### Uwagi do zakresu (do świadomej akceptacji)
- **„Inni gracze przejmą lub zniszczą misję”** wymaga serwera i gry wieloosobowej, a one są poza MVP (`CLAUDE.md`, O-001).
  - **Propozycja na MVP:** zagrożenie dla misji stwarza **komputer** — istniejące w galaktyce „boty” (dziś tylko znaczniki) albo zdarzenia w drodze.
  - Ryzyko zależy od trasy i eskorty. Ta sama mechanika (misja z ryzykiem, eskorta) przyda się później do prawdziwych graczy.
- **Walka (5 B)** to zmiana wobec dotychczasowego zakresu i kanonu K-005: konflikt zbrojny ma być „rzadki i kosztowny, wyjątkiem”.
  - **Propozycja na MVP:** walka tylko wokół misji — **eskorta i obrona konwojów oraz stacji**. Bez podbijania planet i bez bitew flot jako celu gry.
  - Do potwierdzenia w Projekcie lore (K-005, O-205).

### Rozwinięcie: zamknięcie pętli przy 80% złóż
- **Wyeksploatowana planeta:** gdy na kolonii wydobyto **≥ 80% złoża metalu i ≥ 80% złoża kryształów** (z `depositTotal`), planeta dostaje status „wyeksploatowana”.
  - Plakietka pojawia się na karcie Imperium.
  - Wpis w dzienniku: „Złoża na … w większości wydobyte”.
- **Resztki (20%) dalej się wydobywa, ale trudniej:** kopalnie na wyeksploatowanej planecie mają np. **−50% wydajności** (liczba robocza).
  - To naturalny powód, żeby ruszyć dalej: przenieść megakonstrukt albo założyć nową kolonię.
  - Gra nie wymaga „dobierania resztek”.
- **Licznik pętli** na karcie Imperium: „Wyeksploatowane planety: 1 / 3”.
  - Liczą się tylko planety gracza.
  - Ta sama planeta liczy się raz, nawet po przeniesieniu konstruktu.
- **Zamknięcie pętli:** 3 wyeksploatowane planety + zbudowana **stacja macierzysta** → etap **„imperium gwiezdne”** (nazwa robocza, O-002). Wtedy:
  - otwiera się **magazyn orbitalny** stacji — wspólny dla imperium, bez limitu planet;
  - odblokowują się **loty między układami na antymaterii** (dalsze układy, przenoszenie konstruktów daleko);
  - stacja dostaje moduły energii słonecznej i antymaterii jako główne źródło paliwa;
  - w dzienniku pojawia się wpis zamykający rozdział — początek tego, co później będzie endgame'em.
- **Dlaczego 80%:** ostatnie procenty złoża trwałyby najdłużej i dawały najmniej. Próg 80% skraca pętlę i daje graczowi wybór, kiedy się przenieść. Wartość jest robocza — dostroi ją symulator (etap 1).

### Otwarte pytania (dopytam przy właściwym etapie, nie teraz)
- Czy przeniesiony megakonstrukt potrzebuje na celu wolnego miejsca (pól) jak przy budowie?
- Co zostaje na starej planecie po wysłaniu konstruktu — puste pola czy poziom niższy?
- Ile mniejszych stacji można mieć i co one robią (np. przy każdej kolonii: magazyn lokalny, przekaźnik)?

---

## 7. Kolejne etapy (każdy = osobna sesja, gałąź `claude/…`, akceptacja przed `main`)

| # | Wersja | Etap | Cel w jednym zdaniu | Zależy od |
|---|---|---|---|---|
| 1 | v0.52 | ✅ **Symulator pętli** (bez zmian w grze; wyniki — punkt 8) | zmierzyć, ile dni trwa rozwój i wyeksploatowanie 3 planet | — |
| 2 | v0.53 | ✅ **Antymateria jako paliwo** (gałąź `claude/paliwo-antymateria`) | każdy lot kosztuje antymaterię zależnie od odległości | 1 (liczby) |
| 3 | v0.54 | ✅ **Wyeksploatowanie i licznik pętli** | status „wyeksploatowana” przy 80%, spadek wydajności resztek, licznik 0/3 | 1 |
| 4 | v0.55 | ✅ **Stacja macierzysta** (gałąź `claude/stacja-macierzysta`) | stacja główna z SI Matką na orbicie, magazyn orbitalny jako węzeł transportu, wygląd „Pierścień”, karta w Imperium (panele słoneczne na razie tylko wygląd) | — |
| 5 | v0.56 | ✅ **Transfer megakonstruktu** (gałąź `claude/transfer-megakonstruktu`) | przygotowanie 30 min (budynek nie pracuje), lot zależny od odległości, koszt paliwo + surowce, konstrukt staje na celu (ląd i lód), puste pola na starej planecie | 2 |
| 5b | v0.57 | **Pola na oceanie i lawie** (decyzja właściciela) | nowe pola na wodzie i lawie tylko dla megakonstruktów (i przyszłych platform przybrzeżnych), bez przestawiania budynków, pomiar płynności | 5 |
| 6 | v0.58 | **Wstępna flota** | widok floty, budowa statków (stocznia na stacji): transportowce, kolonizacyjne, eskorta | 4 |
| 7 | v0.59 | **Ryzyko misji i obrona** 🔒 lore K-005 | misje mogą zostać przechwycone przez boty / zdarzenia; eskorta i obrona zmniejszają ryzyko | 5, 6 |
| 8 | v0.60 | **Zamknięcie pętli: imperium gwiezdne** | 3 wyeksploatowane planety + stacja → magazyn orbitalny dla imperium, loty międzyukładowe | 3, 4 |
| 9 | v0.61 | **Mniejsze stacje** | stacje przy koloniach łączące się z macierzystą | 4 |
| 10 | v0.62 | **Wstępna ekonomia** | strojenie całej pętli wg ponownej symulacji | wszystkie |
| 11 | v0.63 | **Pierwsze kroki** | SI Matka prowadzi nowego gracza przez pętlę | 10 |
| 12 | v0.64 | **Płynność, zapis, kandydat MVP** | pomiar iPada, testy zapisów, audyt pętli od zera | wszystkie |

**Każdy etap zaczyna się od planu i szkicu do akceptacji, dopiero potem kod.** Wszystkie nowe pola zapisu są opcjonalne.

**Jak sprawdzisz efekt:** po każdym etapie dostaniesz zrzuty i krótką listę kroków dotykowych, np. przy etapie 5:
1. Karta megakompleksu → „Wyślij konstrukt”.
2. Wybierz kolonię.
3. Obserwuj odliczanie przygotowania i lotu.
4. Sprawdź, czy konstrukt stoi na nowej planecie.

**Prompt na każdą sesję:**
> „Etap N z docs/status.md (punkt 7). Najpierw plan i szkic do akceptacji, potem kod. Gałąź claude/…, wersja z tabeli.”

---

## 8. Wyniki etapu 1 — symulator pętli (2026-10-28)

Skrypt `npm run simulate` (`scripts/simulate.ts`) gra za „rozsądnego gracza” zwykłymi akcjami gry (jak przyciski), bez zmian w grze.
Pełne dane i osie czasu: `docs/balans-symulacja.md`. Wynik jest powtarzalny (dwa uruchomienia dają identyczny raport).

| Profil gracza | Strategia | Pętla zamknięta (3 planety ≥ 80%) | 1. planeta ≥ 80% |
|---|---|---|---|
| Aktywny (co 15 min, 16 h na dobę) | nowa kolonia przy 50% ostatniej | **4,3 dnia** | 1,5 dnia |
| Aktywny | kolonizuje, gdy tylko może | **1,5 dnia** | 1,3 dnia |
| Okazjonalny (co 3 h, 15 h na dobę) | nowa kolonia przy 50% ostatniej | **26 dni** | 9,5 dnia |
| Okazjonalny | kolonizuje, gdy tylko może | **9,5 dnia** | 9,3 dnia |

**Wnioski (do etapów 3, 5 i 6 — liczb teraz nie zmieniam, decyzja „balans na końcu”):**
1. **Pętla jest za szybka dla aktywnego gracza.**
   - Kopalnie dochodzą do poz. ~20 w ok. dobę aktywnej gry.
   - Planeta (ok. 2,2–3,5 mln metalu i 0,9–2 mln kryształów) wyczerpuje się wtedy w ok. dobę.
   - Etapy wyglądu budynków (6 / 12 / 20) mijają w godzinach.
2. **Pętla nie wymusza ani statków, ani antymaterii.**
   - Kolonie we własnym układzie są darmowe i natychmiastowe, więc 3 planety zdobywa się bez lotu.
   - Antymateria tylko się zbiera (na koniec 41–607 sztuk bez użycia).
   - Etapy 2 (paliwo) i 5 (transfer megakonstruktu) mają to zmienić. Do decyzji: czy kolonizacja we własnym układzie ma kosztować (statek, antymateria).
3. **„Chciwy” gracz wygrywa z pętlą.** Kolonizowanie wszystkiego od razu zamyka pętlę 3–3,5× szybciej. Nic nie zachęca do kolejności „wyczerp → przenieś się”.
4. **Martwy punkt (realny w grze):**
   - Na małej kolonii brakuje pól na większy Magazyn, magazyn się zapełnia i **wydobycie staje na zawsze**.
   - Ratują tylko transportowce, a te są dopiero po badaniu.
   - Bez nich symulacja utknęła na 118 dni.
   - Kandydat do etapu 3 / 6: np. ostrzeżenie SI albo automatyczny wywóz.
5. **Okazjonalny gracz jest ok. 6× wolniejszy.**
   - Kolejka ma 1 miejsce, więc przez większość czasu planeta czeka na wizytę gracza.
   - Do rozważenia przy ekonomii (etap 6): dłuższa kolejka albo dłuższe, mniej liczne budowy.

**Po etapie 2 (paliwo, kolonizacja statkiem także w układzie) — ponowna symulacja:**

| Profil | Strategia | Pętla zamknięta (przed → po) | Loty wstrzymane — brak paliwa | Antymateria na koniec |
|---|---|---|---|---|
| Aktywny | pętla | 4,3 → **4,5 dnia** | **213** | 0 |
| Aktywny | chciwy | 1,5 → **2,0 dnia** | 23 | 5 |
| Okazjonalny | pętla | 26 → **26,4 dnia** | 0 | 480 |
| Okazjonalny | chciwy | 9,5 → **10,5 dnia** | 0 | 204 |

- **Aktywny gracz** naprawdę odczuwa paliwo: wiele lotów (głównie transporty nadwyżek) czeka na antymaterię.
- **Okazjonalny gracz** zbiera antymaterii dość.
- **Długość pętli prawie się nie zmienia**, bo wyznacza ją tempo wydobycia. To zadanie dla etapów 3 (spadek wydajności po 80%) i 6 (ekonomia).

**Ograniczenia symulacji:**
- Gracz w symulacji nie używa „Ukończ teraz”, kompleksów, specjalizacji, asteroid, komet ani ekspedycji.
- Buduje według prostych reguł, a magazyn rozbudowuje chętniej niż człowiek.
- To wskazówka, nie pomiar prawdziwych graczy.

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
