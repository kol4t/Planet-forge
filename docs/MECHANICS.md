# Mechaniki gry

Stan: v0.46. Opis zasad prostym językiem; liczby — `docs/BALANCE.md` (generowane z kodu, wszystkie **robocze**).
Kod reguł: `src/core/`. Nazwy fabularne są robocze — `docs/LORE_TOUCHPOINTS.md`.

## Zasoby

| Zasób | Skąd | Na co |
|---|---|---|
| **Metal** | Kopalnia metalu + przyrost podstawowy (6/min) | budynki, badania, statki, kompleksy |
| **Kryształy** | Ekstraktor kryształów + przyrost podstawowy (3/min) | j.w. |
| **Energia** | Elektrownia (+ kolektor energii gwiazdy w układzie) | nie gromadzi się — bilans na bieżąco |
| **Antymateria** | 1/h pasywnie + Kolektor antymaterii (+ pulsary, znaleziska) | „Ukończ teraz”, badania od pierścienia 4 |

- Metal i kryształy mieszczą się w **Magazynie** (pojemność osobno dla każdego). Pełny magazyn zatrzymuje przyrost;
  nadwyżka ponad pojemność (np. zwrot kosztu) nie przepada.
- Antymateria jest **wspólna dla imperium** (jeden portfel), metal i kryształy — osobno na każdej planecie.

## Budynki

Sześć budynków na każdej planecie: Kopalnia metalu, Ekstraktor kryształów, Elektrownia, Magazyn, Kolektor antymaterii,
Laboratorium. Poziomy 1–40. Koszt rośnie wykładniczo z poziomem, wydobycie = baza × poziom × 1,1^poziom.

### Energia

- Elektrownie produkują energię, kopalnie, Kolektor i Laboratorium ją zużywają.
- **Niedobór energii** obniża wydajność odbiorców: gdy potrzeba 1000, a jest 520, kopalnie pracują na 52% i wydobywają
  mniej. Pasek zasobów pokazuje wtedy czerwoną energię i „kopalnie N%”. Dotknięcie kolumny ENERGIA (albo czerwonej linii
  w Produkcji) wyjaśnia bilans i co zrobić (v0.46).
- **Zarządzanie** (ikona ustawień na karcie): suwak pracy (0–100%, skaluje wydobycie i zużycie) i pierwszeństwo energii —
  przy niedoborze budynki z wyższym pierwszeństwem dostają energię najpierw.

### Budowa, kolejka, „Ukończ teraz”

- Naraz buduje się jeden budynek na planecie. Czas = 30 s × docelowy poziom. Koszt pobierany na starcie.
- **Anulowanie** (dwa dotknięcia) zwraca cały koszt.
- **Kolejka**: 1 miejsce na start, więcej z badań SI. Koszt pobierany dopiero przy starcie pozycji; brak surowców =
  kolejka czeka (także offline). Przy starcie sprawdzane są wolne pola — pozycja bez miejsca wypada (v0.46).
- **„Ukończ teraz”**: do poziomu 5 za darmo, wyżej 1 antymateria za każde rozpoczęte 15 min pozostałej budowy.
- **Burzenie**: −1 poziom od razu, bez zwrotu (nie podczas budowy/kolejki tego budynku; Magazyn min. 1; Laboratorium
  nie w trakcie badania). Zwalnia pola.

## Pola planety i obszar budynku (footprint, v0.45)

- Planeta ma **pola** (30–200, startowa 100) — siatka z mapy powierzchni; tylko ląd (lód po badaniu „Budowa na lodzie”,
  kryształy zawsze także lód). Woda i lawa nie mają pól.
- Każdy budynek zajmuje **jeden spójny kawałek sąsiednich pól**, który rośnie z poziomem w etapach:
  kopalnie i elektrownia — mała instalacja 1–3 pola (poz. 1–5), zakład 6–10 (poz. 6–11), wielka fabryka 16–22
  (poz. 12–19), megakonstrukt 40–50 (poz. 20+); Magazyn, Kolektor, Laboratorium — mniejsze.
- Obszar rośnie od kotwicy, najpierw na **dedykowanym terenie**: kryształy — lód, metal — wzgórza i góry, elektrownia —
  równiny. Poza nim pola pracują w 75%. Gracz może wskazać pole (karta budowli → „Wybierz miejsce”).
- **Brak wolnych pól obok obszaru = ulepszenie zablokowane** (komunikat z etapem i liczbą pól).
- Licznik **POLA** = suma obszarów wszystkich budynków / pula pól.
- Decyzja właściciela (wariant B): stałe rozmiary; planeta startowa mieści jeden megakonstrukt i uczy podstaw; duże
  planety wyspecjalizowane mieszczą kilka (lód → kryształ, skaliste/lawowe → metal, blisko gwiazdy → energia).

## Złoża

- Planeta ma skończone złoża metalu i kryształów (z bogactwa i liczby pól). Kopalnie je wyczerpują; przyrost podstawowy
  nie. Kopalnia na pustym złożu stoi i nie bierze energii. Bez odnawiania (decyzja właściciela) — dalej burzenie,
  transport, asteroidy, komety.

## Kompleksy, megakompleksy, znaleziska (przemysł)

- Od etapu „wielka fabryka” gracz może uruchomić **kompleks** całego budynku (badanie + koszt): +30% wydobycia/energii.
  Wielka fabryka ma **tryby pracy** (Zrównoważony / Maksymalna produkcja / Oszczędzanie energii).
- Od megakonstruktu: **megakompleks** (+60%) — co 4–8 h (także offline) przynosi **znalezisko**: stałą premię dla
  całego imperium (7 rodzajów, limit sztuk).

## Czas i nieobecność (offline)

- Gospodarka liczy się w czasie rzeczywistym (na minutę). Po powrocie gra nalicza nieobecność: **maks. 8 h produkcji**
  (badania mogą wydłużyć) — limit liczony raz dla całego naliczenia (v0.46). Budowy, kolejka, badania, statki,
  ekspedycje, dostawy i znaleziska kończą się w swoich chwilach także offline.
- Komunikat „Podczas nieobecności…” podsumowuje zyski i zdarzenia.

## Imperium (kilka planet)

- 5 miejsc na start (do 10 w przyszłości). Nowe planety: kolonizacja z mapy (własny układ) albo statkiem kolonizacyjnym.
- Aktywna jest jedna planeta; nieaktywne nadrabiają czas przy przejściu (jak nieobecność). Ekran **Imperium**: suma,
  „Sytuacja imperium” (alerty), karty planet, dziennik, SI.
- **Specjalizacja kolonii** (Górnicza, Energetyczna, Naukowa, Przemysłowa): premia zależna od gwiazdy i strefy orbity;
  zmiana po badaniu, trwa 1 h.
- **Transportowce** przewożą metal i kryształy między planetami (ładowność, czas lotu z odległości, maks. 3 naraz).

## Kosmos wokół planety

- **Stacja na pasie asteroid** (układ z pasem i planetą gracza): urobek doliczany do przyrostu planety.
- **Holownik po kometę**: raz na jakiś czas ładunek metalu i kryształów (także w układach bez pasa).
- **Kolektor energii gwiazdy** na orbicie: energia dla wszystkich planet gracza w układzie, zależna od jasności gwiazdy.

## Badania

- Ekran **Badania** — galaktyka z jądrem i 6 ramionami: Produktywność, Planetologia, Eksploracja, Stacja i handel, SI,
  Flota (cywilna). Pierścień dostępny zależnie od poziomu **Laboratorium**.
- Badania są **przypisane do planety** (własne Laboratorium i kolejka, efekty na tej planecie); odblokowania funkcji
  (statek, SI, budowa na lodzie, kompleksy…) działają w całym imperium.
- **Mosty**: niektóre badania wymagają wiedzy z innego ramienia.

## Mapa galaktyki, wiedza, ekspedycje, kolonizacja

- 100 układów (gwiazda, pulsar, czarna dziura…), 3–10 planet, gazowe olbrzymy, pasy asteroid; adres planety
  `1:układ:orbita` = seed. Planety krążą w czasie świata (2–25 min na obieg).
- **Wiedza**: nieznany → sygnał → wykryty → rozpoznany → zbadany. Na start znany własny układ i najbliżsi sąsiedzi.
- **Ekspedycje** (sondy, po badaniu): podnoszą wiedzę o celu; szansa maleje z odległością.
- **Rzadkie obiekty** (pulsary, czarne dziury) po badaniu „Astrofizyka ekstremalna” dają premie dla imperium.
- **Kolonizacja**: wolna planeta własnego układu od razu z mapy; inne zbadane układy — statkiem kolonizacyjnym.
- Zajęte miejsca w układach: boty („inny gracz”) i formy obce — na razie tylko opis na mapie.

## SI Matka

- Po badaniu „SI Matka” proponuje działania (energia, magazyn, badania, kopalnie) w dymku nad planetą: Tak / Nie /
  Zawsze tak rób. Dla każdej reguły poziom: **Podpowiada / Pyta / Samo** (Samo — po „SI wykonawcze”).
- SI buduje najwyżej do poziomu Laboratorium planety i nie wpycha się przed kolejkę gracza. Anulowanie badania przez
  gracza wstrzymuje regułę „Badania” do ręcznego wyboru.
- **Autonomia**: SI buduje przy zamkniętej grze (budowy o 50% dłuższe).

## Dziennik

- Zakładka „Dziennik” w Imperium: budowy, badania, kolonie, statki, nieobecność, SI, ekspedycje, znaleziska
  (maks. 80 najnowszych wpisów, w zapisie).

## Zgłoszenia i diagnostyka

- Ustawienia → **Zgłoś / diagnostyka**: błąd albo sugestia jako GitHub Issue (albo tekst do skopiowania), z diagnostyką
  (wersja, urządzenie, płynność, grafika 3D, planeta, ostatnie błędy) i opcjonalnie zapisem gry.
