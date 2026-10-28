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

**Uwaga do zakresu:** `CLAUDE.md` wyklucza „walkę / flotę” z MVP. Właściciel włącza teraz **wstępną flotę** — zakładam
flotę **cywilną, bez walki** (zgodnie z K-005), dopóki właściciel nie zdecyduje inaczej (pytanie 5).

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

### Blokujące (rdzeń pętli)
1. **Symulator pętli** — ile trwa każdy krok (rozwój → wyczerpanie → kolonia → 3 planety). Bez tego nie da się ustawić tempa.
2. **Antymateria jako paliwo lotów** (krok 8).
3. **Stacja kosmiczna z magazynem orbitalnym** + energia słoneczna (kroki 6–7).
4. **Wstępna flota** — widok i budowa statków cywilnych (krok 9).
5. **Zamknięcie pętli** — postęp „3 planety”, imperium gwiezdne (kroki 5, 11).
6. **Wstępna ekonomia** — strojenie liczb pod pętlę (krok 10; zgodnie z decyzją „balans na końcu” — to jest ten koniec).

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

## 6. Kolejne etapy (każdy = osobna sesja, gałąź `claude/…`, akceptacja przed `main`)

**🔒** = wymaga decyzji właściciela (pytania w punkcie 7) albo lore.

### Etap 1 — v0.52 „Symulator pętli” (bez zmian w grze)
- **Cel:** zmierzyć czas każdego kroku pętli MVP.
- **Zakres:** `scripts/simulate.ts` — „rozsądny gracz” zwykłymi akcjami kontrolera: rozwija planetę, kolonizuje, wozi surowce, aż wyczerpie złoża 3 planet; raport `docs/balans-symulacja.md` (czasy, przestoje > X h, co blokuje).
- **Nie ruszamy:** kodu gry i liczb w `src/data`.
- **Ryzyko:** strategia symulacji ≠ prawdziwy gracz — raport to wskazówka.
- **Na iPadzie:** nic się nie zmienia; czytasz raport.
- **Prompt:** „Etap 1 z docs/status.md: skrypt symulacji pętli MVP i raport docs/balans-symulacja.md. Bez zmian w grze i w src/data. Gałąź claude/…”

### Etap 2 — v0.53 „Antymateria jako paliwo” 🔒 (pytanie 4)
- **Cel:** każdy lot (transportowiec, statek kolonizacyjny, ekspedycja, holownik) kosztuje antymaterię zależnie od odległości.
- **Zakres:** koszt paliwa w `data/balance.ts`, sprawdzenie i odjęcie w `core` (czytelny błąd po polsku), koszt widoczny przed wysłaniem; „Ukończ teraz” bez zmian.
- **Nie ruszamy:** grafiki, zapisu (bez nowych pól).
- **Ryzyko:** gracz bez antymaterii utknie — minimalny przyrost pasywny zostaje.
- **Na iPadzie:** Mapa → wybierz planetę → Transport: widać „paliwo: X antymaterii”; po wysłaniu licznik antymaterii u góry maleje.
- **Prompt:** „Etap 2 z docs/status.md: antymateria jako paliwo lotów wg wybranego wariantu. Liczby robocze. Testy w core. Gałąź claude/…, v0.53.”

### Etap 3 — v0.54 „Stacja orbitalna z magazynem” 🔒 (pytanie 3)
- **Cel:** jedna stacja kosmiczna z magazynem orbitalnym i energią słoneczną.
- **Zakres:** zamiast zaślepki „Moduł orbitalny”: badanie → budowa stacji na orbicie; magazyn orbitalny (transportowce dowożą do niego surowce z planet), kolektor energii gwiazdy jako moduł stacji; nowe opcjonalne pole zapisu; stacja widoczna na orbicie w 3D i 2D.
- **Nie ruszamy:** budynków na planetach.
- **Ryzyko:** nowe pole zapisu — walidacja i opis w `SAVE_FORMAT.md`.
- **Na iPadzie:** Badania → „Moduł orbitalny” → zbuduj stację; wokół planety krąży stacja; wyślij transport „na stację” i zobacz stan magazynu orbitalnego.
- **Prompt:** „Etap 3 z docs/status.md: stacja orbitalna z magazynem wg wybranego wariantu. Najpierw plan i szkic wyglądu do akceptacji, potem kod. Gałąź claude/…, v0.54.”

### Etap 4 — v0.55 „Wstępna flota” 🔒 (pytanie 5)
- **Cel:** gracz widzi swoje statki i buduje je (np. w stoczni na stacji).
- **Zakres:** ekran / panel Floty: lista statków (w drodze, w doku), budowa transportowca i statku kolonizacyjnego za surowce; bez walki.
- **Nie ruszamy:** mapy i badań poza odblokowaniem.
- **Ryzyko:** rozrost interfejsu — jeden panel, zasada okien.
- **Na iPadzie:** dotknij **Flota** (albo Imperium → Flota) — lista statków; zbuduj transportowiec i wyślij go.
- **Prompt:** „Etap 4 z docs/status.md: wstępna flota cywilna (lista, budowa statków), bez walki. Plan do akceptacji. Gałąź claude/…, v0.55.”

### Etap 5 — v0.56 „Zamknięcie pętli: imperium gwiezdne” 🔒 (pytanie 2)
- **Cel:** gracz widzi postęp pętli i przeżywa jej zamknięcie.
- **Zakres:** licznik „planety wydobyte: X / 3” (karta Imperium), warunek zamknięcia (wydobyte złoża 3 planet + stacja), wpis w dzienniku, odblokowanie lotów między układami na antymaterii. Nazwa „imperium gwiezdne” robocza (O-002).
- **Nie ruszamy:** endgame'u.
- **Ryzyko:** warunek zbyt długi do przejścia — liczby z etapu 1.
- **Na iPadzie:** Imperium → widać postęp pętli; po spełnieniu warunku wpis w dzienniku i nowa możliwość na mapie.
- **Prompt:** „Etap 5 z docs/status.md: postęp i zamknięcie pętli MVP wg wybranego warunku. Gałąź claude/…, v0.56.”

### Etap 6 — v0.57 „Wstępna ekonomia”
- **Cel:** cała pętla przechodzi się w docelowym czasie bez martwych punktów.
- **Zakres:** strojenie `data/balance.ts` (złoża, koszty, czasy, paliwo) wg ponownej symulacji, tabela przed/po do akceptacji, `npm run balance-doc`.
- **Nie ruszamy:** mechanik.
- **Ryzyko:** zmiana tempa w trwających grach.
- **Na iPadzie:** na swojej planecie sprawdź czasy oczekiwania i czas do wyczerpania złoża na karcie budynku.
- **Prompt:** „Etap 6 z docs/status.md: strojenie liczb pod pętlę MVP wg symulatora. Tabela przed/po do akceptacji. Gałąź claude/…, v0.57.”

### Etap 7 — v0.58 „Pierwsze kroki”
- **Cel:** nowy gracz rozumie pętlę w 5 minut.
- **Zakres:** podpowiedzi SI Matki krok po kroku (pomijalne), opcjonalne pole zapisu.
- **Na iPadzie:** prywatna karta Safari → nowa gra → wykonuj podpowiedzi → „Pomiń”.
- **Prompt:** „Etap 7 z docs/status.md: pierwsze kroki przez SI Matkę. Teksty do akceptacji. Gałąź claude/…, v0.58.”

### Etap 8 — v0.59 „Płynność i zapis”
- **Cel:** najsłabsza sekunda ≥ 30 kl./s; zapisy z każdej wersji się wczytują.
- **Zakres:** Twój pomiar z Diagnostyki → jedna poprawka naraz; testy zapisów z historii git.
- **Na iPadzie:** Ustawienia → Diagnostyka, minuta obracania w 2D i 3D.
- **Prompt:** „Etap 8 z docs/status.md: płynność (mój pomiar: [wklej]) i testy zapisów. Gałąź claude/…, v0.59.”

### Etap 9 — v0.60 „Kandydat MVP”
- **Cel:** sprawdzić pętlę od zera do zamknięcia i wydać MVP.
- **Zakres:** audyt, drobne poprawki, lista kontrolna, `CLAUDE.md` i `README.md`.
- **Na iPadzie:** nowa gra od zera wg listy kontrolnej; (pełną pętlę skróci tryb testowy w podglądzie).
- **Prompt:** „Etap 9 z docs/status.md: audyt kandydata MVP wg tabeli pętli z punktu 4. Gałąź claude/…, v0.60.”

---

## 7. Decyzje, których potrzebuję od właściciela

1. **„Przeniesienie na inną planetę” — co to znaczy?**
   - **A (rekomendacja):** kolonizacja nowej planety + przewóz zapasów transportowcami (to już jest w grze); stara planeta zostaje z badaniami.
   - B: przeniesienie siedziby / części budynków na nową planetę (nowa mechanika).
2. **Warunek zamknięcia pętli:**
   - A: złoża metalu i kryształów **całkowicie** wyczerpane na 3 planetach.
   - **B (rekomendacja):** na 3 planetach wydobyto co najmniej 80% złóż (bez długiego „dobierania resztek”).
   - C: wystarczy 3 planety i zbudowana stacja, bez warunku złóż.
3. **Stacja kosmiczna:**
   - **A (rekomendacja):** jedna stacja imperium na orbicie planety macierzystej, rozbudowywana modułami (magazyn, kolektor słoneczny, kolektor antymaterii, stocznia).
   - B: osobna stacja przy każdej planecie.
4. **Antymateria jako paliwo:**
   - **A (rekomendacja):** każdy lot zużywa antymaterię — w układzie mało, między układami dużo.
   - B: tylko loty między układami; w układzie za darmo.
5. **Wstępna flota:**
   - **A (rekomendacja):** tylko statki cywilne (transport, kolonizacja, ekspedycje), bez walki — zgodnie z K-005.
   - B: także prosta obrona / walka.

## Lista kontrolna do Twojego sprawdzenia na iPadzie (v0.51.0)

Nie testowałem gry na iPadzie — to symulacje i testy automatyczne.

1. Gra startuje, pasek „Dostępna aktualizacja” znika po dotknięciu, Twoja planeta i postęp są na miejscu.
2. Wejdź w Ustawienia → Diagnostyka i przez minutę obracaj planetę w 2D, a potem w 3D. Zanotuj średnią i najsłabszą sekundę. To pomiar do etapu D.
3. Dotknij **Produkcja**, potem tytułu karty Elektrowni, Magazynu i Kopalni metalu. Planeta obraca się do budynku, a wygląd pasuje do etapu.
4. Ulepsz dowolny budynek, zamknij grę na kilka minut i otwórz ją ponownie. Budowa ukończona, produkcja naliczona.
5. Wejdź w Ustawienia → „Kopiuj zapis”. Tekst `PF2:` jest w schowku (zachowaj go jako kopię zapasową).
6. Otwórz **Mapa**, **Badania** i **Imperium**. Każdy ekran się otwiera i zamyka, nic się nie zawiesza.
7. Otwórz grę w prywatnej karcie Safari jako „nowy gracz”. Zanotuj, w którym momencie nie wiesz, co robić. To materiał do etapu A.
