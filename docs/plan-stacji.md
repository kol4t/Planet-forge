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
| Kolejność | 1) ekran i moduły, 2) stacja badawcza, 3) dok handlowy, 4) wydobycie z kosmosu i nowe stacje, 5) załoga, 6) kontakt z obcymi |

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

### Etap 1 — Ekran stacji i moduły widoczne na niej (fundament)
- Stuknięcie stacji w widoku układu albo na orbicie planety → **ekran stacji** (ścieżka „Galaktyka › Układ › Stacja”).
- Stacja duża na środku, obracana palcem jak planeta; **2D najpierw** (pikselowo, `Canvas`), 3D jako drugi krok etapu.
- **Panel „Moduły”** zamiast „Produkcji”: karty istniejących modułów (rdzeń, magazyn orbitalny, stocznia) — ulepszanie
  jak budynki; puste gniazda pokazane jako miejsca na przyszłe moduły („wkrótce”).
- Wygląd z modułów: rdzeń = środek, magazyn = kontenery na ramieniu, stocznia = dok z rusztowaniem; nowy poziom rdzenia =
  kolejny pierścień.
- Karta stacji w Imperium zostaje (skrót) i ma przycisk „Pokaż stację”.
- Zapis: istniejąca stacja przechodzi bez utraty (moduły z dzisiejszych pól `core`, `storage`, `shipyard`).

### Etap 2 — Stacja badawcza
- Moduł **Laboratorium orbitalne**: **badania dla całego imperium** (dziś każda planeta bada osobno).
- Nowe, trudniejsze badania tylko na stacji (np. lepsze moduły, dalsze loty, przygotowanie pod obcych) — w ramieniu
  „Stacja i handel” i nowych gwiazdach ramion; robocze nazwy.
- Badanie na stacji wymaga kryształów + czasu; poziom laboratorium = jak daleko w pierścieniach.

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
