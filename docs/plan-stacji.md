# Plan: stacja kosmiczna jako główny obiekt dalszej gry

Stan: 2026-11-09, po MVP (v0.71.0). Decyzje właściciela z dwóch rund pytań (2026-11-09). Liczby i nazwy w tym planie
są **robocze** — stroimy je na końcu, nazwy dotykające lore oznaczamy `status: 'robocza'` i zgłaszamy do Projektu lore.
Antymaterii w megakonstruktach na razie nie ruszamy (decyzja właściciela).

## 1. Decyzje właściciela

| Temat | Decyzja |
|---|---|
| Jak gracz obcuje ze stacją | **Własny ekran stacji** — jak planeta: osobny widok w ścieżce „Galaktyka › Układ › Stacja”, moduły do stuknięcia, własna lista modułów do budowy |
| Ile stacji | **Macierzysta + wyspecjalizowane** — jedna stacja macierzysta (serce imperium, z czasem aż do „sztucznej planety”) i mniejsze stacje w konkretnych miejscach |
| Wygląd | **Rośnie z modułami** — każdy moduł dokłada widoczną część (ramiona, pierścienie, doki, panele); 2D pikselowo, 3D low-poly |
| Zadania na początek | **Stacja badawcza, dok handlowy, wydobycie z kosmosu, załoga i życie stacji, kontakt z obcymi formami życia** (kosmici, roboty, potwory) |
| Załoga | **Nowy zasób** — ludzie z planet, przewożeni na stację; moduły potrzebują załogi, załoga — miejsca i zapasów; morale wpływa na wydajność |
| Obcy | **Sygnały i spotkania** — stacja nasłuchuje kosmosu; sygnały, wraki, dryfujące maszyny, żywe istoty; każde spotkanie to krótki wpis z wyborem i skutkiem |
| Nowe stacje | **Do wyboru gracza:** statek konstrukcyjny (zalążek nowej stacji w wybranym miejscu) **albo** przeniesienie całej stacji macierzystej |
| Etap 2 (stacja badawcza) | Osobne, większe drzewko stacji: wybór kategorii Produkcja / Flota / SI / Planetologia / Handel / Eksploracja, kategorie połączone mostami; płaci magazyn stacji; kolejka osobna od planet; premia stacji działa na otoczenie, badania zwiększają zasięg (planeta → układ → dalej); lista badań do ustalenia |
| Kolejność | 1) ekran i moduły, 2) stacja badawcza, 3) dok handlowy, 4) wydobycie z kosmosu i nowe stacje, 5) załoga, 6) kontakt z obcymi, 7) dok megakonstruktów (maks. 3: metal, kryształy, 1 na przyszłość) |

## 2. Co już jest (punkt wyjścia)

- **Stacja macierzysta** (v0.55): rdzeń SI Matki, magazyn orbitalny poz. 1–10 (węzeł transportu „Na stację / Ze stacji”),
  wygląd „Pierścień” na orbicie planety, karta w Imperium (`core/economy/homeStation.ts`, zapis `station`).
- **Stocznia** (v0.58) — moduł stacji macierzystej; transportowiec, statek kolonizacyjny, holownik, okręt eskorty.
- **Stacje kolonii** (v0.64) — przekaźniki przy koloniach (loty 2× szybciej, pół paliwa).
- **Stacja na pasie asteroid** i **holownik po kometę** (v0.37), **kolektor energii gwiazdy** (v0.44) — z panelu „Kosmos”.
- **Megakonstrukty na orbicie** (v0.61, v0.69) — czekają w kosmosie.
- **Ramię badań „Stacja i handel”** — „Moduł orbitalny”, „Górnictwo asteroid” i dalsze.
- Widok układu z gazowymi olbrzymami i pasami (v0.66) — gotowe miejsca na nowe stacje.

## 3. Model stacji (wspólny dla wszystkich etapów)

- **Stacja = miejsce w imperium** obok planet (`SlotSave.kind: 'station'` było przewidziane od v0.11). Ma adres w układzie
  (orbita planety, gazowy olbrzym, pas, punkt między planetami), własny ekran i własną listę modułów.
- **Moduły** zamiast budynków. Moduł ma poziom, koszt, czas budowy, potrzebę energii, a od etapu 5 — załogi.
  Moduły stoją w **gniazdach** wokół rdzenia (pierścień wewnętrzny → ramiona → pierścień zewnętrzny); liczba gniazd rośnie
  z poziomem rdzenia — to stacyjny odpowiednik pól planety.
- **Rdzeń** (dzisiejszy rdzeń SI Matki) — poziom rdzenia odblokowuje kolejne pierścienie gniazd i wielkość stacji.
- **Energia stacji** — moduł paneli słonecznych / reaktora na stacji (stacja nie bierze energii z planety).
- **Surowce** stacji to dzisiejszy magazyn orbitalny: budowę modułów opłaca się z magazynu stacji (dowóz transportowcami)
  albo z planety, nad którą stacja wisi.
- **Rodzaje stacji:** macierzysta (wszystkie moduły, jedna) i wyspecjalizowane (rdzeń mniejszy, kilka gniazd, jeden
  „moduł miejsca”: gazowy, górniczy, nasłuchowy, handlowy).

## 4. Etapy (każdy = osobna wersja do sprawdzenia na iPadzie, gałąź `claude/…`, akceptacja przed publikacją)

### Etap 1 — Ekran stacji i moduły widoczne na niej (fundament) — zrobione (v0.72.0, 2D i 3D)
- Stuknięcie stacji w widoku układu albo na orbicie planety → **ekran stacji** (ścieżka „Galaktyka › Układ › Stacja”).
- Stacja duża na środku, obracana palcem jak planeta; **2D najpierw** (pikselowo, `Canvas`), 3D jako drugi krok etapu.
- **Panel „Moduły”** zamiast „Produkcji”: karty istniejących modułów (rdzeń, magazyn orbitalny, stocznia) — ulepszanie
  jak budynki; puste gniazda pokazane jako miejsca na przyszłe moduły („wkrótce”).
- Wygląd z modułów: rdzeń = środek, magazyn = kontenery na ramieniu, stocznia = dok z rusztowaniem; nowy poziom rdzenia =
  kolejny pierścień.
- Karta stacji w Imperium zostaje (skrót) i ma przycisk „Pokaż stację”.
- Zapis: istniejąca stacja przechodzi bez utraty (moduły z dzisiejszych pól `core`, `storage`, `shipyard`).

### Etap 2 — Stacja badawcza (decyzje właściciela 2026-11-09)
- **Własne drzewko badań stacji — główne miejsce rozwoju technologii**, większe niż drzewko planety. Ekran „Badania
  stacji”: najpierw wybór kategorii — **Produkcja, Flota, SI, Planetologia, Handel, Eksploracja** — potem galaktyka
  tej kategorii; kategorie łączą się **mostami** jak ramiona laboratorium na planecie, ale są mocniej rozbudowane.
  Konkretne badania — do ustalenia z właścicielem (szkic roboczy niżej). Badania planet zostają bez zmian.
- **Płaci magazyn stacji** (surowce dowożone transportowcami); **osobna kolejka** — stacja bada równolegle z planetami.
- Moduł **Laboratorium orbitalne** (gniazdo 2): poziom = jak daleko w pierścieniach galaktyk stacji.
- **Premia stacji macierzystej** działa na **otoczenie stacji**: najpierw planetę, nad którą krąży, a badania rozwoju
  stacji zwiększają **zasięg** (planeta → cały układ → sąsiednie układy…).
- Tematy na start (wybór właściciela): rozbudowa stacji, loty i paliwo, wydobycie imperium, przygotowanie kolejnych
  etapów (dok handlowy, stacje w kosmosie, załoga, nasłuch, dok megakonstruktów), zasięg premii stacji.

Podział na kroki (każdy do sprawdzenia na iPadzie):
- **2a** (zrobione — v0.73.0, szkic badań) — Laboratorium orbitalne (budowa z magazynu stacji), silnik badań stacji (osobny stan, kolejka, koszt
  z magazynu stacji), ekran „Badania stacji”: wybór 6 kategorii, galaktyka kategorii z mostami — na szkicu badań.
- **2b** (zrobione — v0.74.0) — premia stacji i jej zasięg (planeta → układ → sąsiednie układy), widoczna w widoku układu i w Imperium.
- **2c** (zrobione — v0.75.0, 90 badań, `docs/badania-stacji.md`) — docelowa lista badań (uzgodniona z właścicielem) w miejsce szkicu.

Szkic badań z kroku 2a (zastąpiony w kroku 2c pełną listą — `docs/badania-stacji.md`):

| Kategoria | Przykładowe badania (pierścienie 1 → 4) | Most do |
|---|---|---|
| Produkcja | Sieć zasilania stacji · Premia stacji: planeta (+5% wydobycia) · Zasięg premii: układ · Wydobycie imperium +3% · Zasięg premii: sąsiednie układy · Rafinacja orbitalna | Planetologia, Handel |
| Flota | Dok remontowy · Paliwo z odzysku (−10% paliwa lotów) · Napęd stacyjny (−10% czasu lotów) · Ładownie modułowe (+20% ładowności) · Statek konstrukcyjny (etap 4) | Handel, Eksploracja |
| SI | Węzeł SI Matki (+1 miejsce kolejki stacji) · SI logistyki (automatyczne dostawy na stację) · SI badawcza (−10% czasu badań stacji) · Rdzeń drugiej generacji (rozbudowa rdzenia, drugi pierścień gniazd) | Produkcja, Eksploracja |
| Planetologia | Skan orbitalny planet · Mapy złóż układu · Stabilizacja klimatu z orbity · Przygotowanie doku megakonstruktów (etap 7) | Produkcja, Eksploracja |
| Handel | Rejestr kupców · Dok handlowy (etap 3) · Kursy wymiany · Kontrakty długie | Produkcja, Flota |
| Eksploracja | Teleskop stacji · Wydobycie z kosmosu (etap 4) · Moduł mieszkalny (etap 5) · Nasłuch (etap 6) | Flota, SI, Planetologia |

- **2d** — nowe rzeczy z badań (2d-1 zrobione w v0.76.0: rdzeń poz. 2–3, pierścienie z drugimi egzemplarzami magazynu,
  stoczni i laboratorium; 2d-2 zrobione w v0.77.0: Kurier, Ciężki transportowiec, Konwoje; 2d-3 zrobione w v0.78.0: dostawy, SI nocna,
  kolejka, autonomia — etap 2 zamknięty): poziomy rdzenia (drugi i trzeci pierścień gniazd), nowe statki (Kurier,
  Ciężki transportowiec, Konwoje), automatyka SI (dostawy, SI nocna, autonomia), kolejka stacji.

### Etap 3 — Dok handlowy
- Moduł **Dok handlowy**: rynek z **kupcami sterowanymi przez grę** (bez innych graczy — zakres MVP): wymiana metalu ↔
  kryształów po kursie, który się zmienia; okazjonalne **zamówienia kupców** (dostarcz X w czasie Y → nagroda).
- Kupcy przylatują i odlatują (widać statki przy doku).
- Później (osobna decyzja): szlaki handlowe między stacjami.

### Etap 4 — Wydobycie z kosmosu i nowe stacje
- **Statek konstrukcyjny** (stocznia): leci w wybrane miejsce w widoku układu — gazowy olbrzym, pas asteroid, pusty punkt —
  i rozkłada **zalążek stacji wyspecjalizowanej**.
- **Przeniesienie stacji macierzystej** (wybór gracza): cała stacja rozkłada się, leci (czas, paliwo, ryzyko misji jak
  dla megakonstruktu) i staje w nowym miejscu; w tym czasie moduły nie pracują.
- **Stacja gazowa** przy olbrzymie (nowy surowiec roboczo „gaz” albo zamiana na energię/antymaterię — do decyzji przed
  etapem) i **stacja górnicza** na pasie (dzisiejsza stacja na pasie przechodzi tu jako rodzaj stacji).
- Stacje wyspecjalizowane widoczne w widoku układu, każda z własnym ekranem.

### Etap 5 — Załoga i życie stacji
- **Nowy zasób: załoga** (roboczo „Załoga” / „Koloniści”). Planety z Magazynem/Laboratorium (do decyzji) powoli dają
  ochotników; transportowiec przewozi ich na stację.
- **Moduł mieszkalny** daje miejsca; **zapasy** (roboczo z metalu i kryształów albo osobny moduł hydroponiki) zużywa
  załoga; **morale** (zapasy, miejsce, światło, bezpieczeństwo) zmienia wydajność modułów.
- Każdy moduł potrzebuje załogi do pracy; brak załogi = moduł pracuje słabiej (jak niedobór energii).

### Etap 6 — Kontakt z obcymi formami życia (sygnały i spotkania)
- Moduł **Nasłuch** (antena) wyłapuje **sygnały**; sygnał można zbadać (czas, statek), zignorować albo oznaczyć.
- **Spotkania** — krótkie wpisy w dzienniku z wyborem i skutkiem: wrak, dryfująca maszyna, żywa istota w pustce, echo
  dawnej cywilizacji. Skutki: znaleziska, wiedza do badań, surowce, czasem strata (półmrok — K-003), rzadko zagrożenie.
- Wszystkie treści **robocze** — przed etapem uzgodnienie z Projektem lore (K-001 pkt 8 „placówki orbitalne”, K-005
  „konflikt zbrojny rzadki”, K-008 „wiele głosów w ramie dziennika”, K-011 filtr: przewaga z wiedzy, nie z siły).

### Etap 7 — Dok megakonstruktów (ostatni etap wątku stacji; decyzja właściciela 2026-11-09)
- Osobny moduł na osi stacji pod rdzeniem: **maks. 3 miejsca cumowania** — megakonstrukt metalu, megakonstrukt
  kryształów (wiertnica) i jedno miejsce na przyszły megakonstrukt.
- Megakonstrukty, które dziś czekają „na orbicie” (krok 3b, v0.61 / v0.69), cumują w doku stacji; stamtąd lecą na
  wybraną planetę. Szczegóły (premia w doku, koszt cumowania, przeniesienie razem ze stacją) — pytania przed etapem.
- Od v0.72.0 dok widać na stacji jako „wkrótce” (trzy blade stanowiska pod rdzeniem).

## 5. Ryzyka i ograniczenia

- **Wydajność iPada:** ekran stacji to drugi „obiekt w dłoni” — jeden kontekst WebGL (stacja i planeta nie rysują się
  naraz), 2D najpierw, moduły z prostych brył, pomiar po etapie 1.
- **Zapis:** każde nowe pole opcjonalne i walidowane (`docs/SAVE_FORMAT.md`); stara stacja przechodzi bez utraty.
- **Zakres:** handel tylko z kupcami gry (bez innych graczy, bez serwera); walka nie jest częścią planu — obcy jako
  spotkania, nie wojna (K-005).
- **Lore:** nazwy modułów, załogi, obcych — robocze; lista do `docs/lore/nazwy-w-grze.md`.
- **Balans:** liczby robocze; strojenie stacji na końcu całego wątku (jak przed MVP).

## 6. Pytania na później (przed etapem, którego dotyczą)

1. Etap 4: czy gaz to nowy surowiec, czy od razu zamieniany na energię / antymaterię?
2. Etap 5: skąd biorą się ludzie (każda planeta, tylko z modułem/budynkiem, rośnie z poziomem planety)?
3. Etap 6: jak często spotkania i czy mogą zagrozić stacji (np. uszkodzony moduł do naprawy)?
4. Dalej: „sztuczna planeta” jako cel stacji macierzystej — kiedy i co daje?
