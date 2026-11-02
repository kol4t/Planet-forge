# Symulacja pętli MVP (etap 1)

Wygenerowano skryptem `npm run simulate` (limit 90 dni czasu gry). **To symulacja „rozsądnego gracza”, nie prawdziwa rozgrywka** — wskazówka do strojenia, nie wyrok. Gra nie została zmieniona. **Wnioski:** `docs/status.md`, punkt 8.

**Gracz w symulacji:** przy każdej wizycie na każdej planecie zaczyna najtańsze dostępne badanie (bez antymaterii), buduje według potrzeb (energia → magazyn → tańsza kopalnia → laboratorium do połowy poziomu kopalń) z kolejką, planety wyeksploatowane albo z pełnym magazynem wysyłają nadwyżkę transportowcami tam, gdzie jest miejsce, kolonizuje wolne planety własnego układu statkiem (od v0.53: koszt, paliwo z antymaterii, lot ok. 2 min); każdy lot płaci paliwo. Nie używa „Ukończ teraz”, specjalizacji, kompleksów, asteroid ani komet. Warunek końca: 3 planety z ≥ 80% wydobytych złóż metalu **i** kryształów.

| Profil gracza | Strategia kolonii | Wyeksploatowane planety | Czas | 1. planeta ≥ 80% | Planet założonych | Najdłuższy przestój planety | Transporty | Loty wstrzymane — brak paliwa | Antymateria na koniec | Najczęstsza blokada budowy |
|---|---|---|---|---|---|---|---|---|---|---|
| Aktywny (co 15 min, 8:00–24:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 26,6 d | 9,0 d | 4 | 264,0 h (Kepler-186 f) | 1216 | 729 | 17 | maks. poziom (2327×) |
| Aktywny (co 15 min, 8:00–24:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 11,3 d | 9,0 d | 6 | 196,5 h (TOI-843 c) | 268 | 132 | 211 | maks. poziom (4226×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 36,3 d | 12,4 d | 4 | 264,0 h (Kepler-186 f) | 198 | 0 | 1380 | maks. poziom (168×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 17,1 d | 12,4 d | 6 | 216,0 h (TOI-843 b) | 79 | 0 | 554 | maks. poziom (277×) |

## Aktywny (co 15 min, 8:00–24:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 180,17 mln | 0 / 6,75 mln | 40 / 19 / 37 / 27 / 10 | 11,3 d |
| TOI-843 b | 87/131 | 0 / 147,06 mln | 0 / 6,75 mln | 40 / 19 / 33 / 33 / 10 | 14,9 d |
| TOI-843 c | 87/124 | 5,16 mln / 149,27 mln | 1,35 mln / 6,75 mln | 40 / 19 / 36 / 28 / 10 | 12,7 d |
| TOI-843 d | 87/116 | 147,25 mln / 194,51 mln | 5,01 mln / 6,75 mln | 40 / 19 / 32 / 25 / 10 | 2,5 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:45 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 10:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 11:00 — Przewodnik: wykonany krok 1 — Rozbuduj Kopalnię metalu do poz. 3
- dzień 1, 11:00 — Przewodnik: wykonany krok 2 — Rozbuduj Elektrownię do poz. 3
- dzień 1, 12:45 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 1, 13:30 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 14:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 14:45 — Przewodnik: wykonany krok 3 — Rozbuduj Ekstraktor kryształów do poz. 3
- dzień 1, 14:45 — Przewodnik: wykonany krok 4 — Rozbuduj Magazyn do poz. 4
- dzień 1, 14:45 — Przewodnik: wykonany krok 5 — Obejrzyj swój układ
- dzień 1, 14:45 — Przewodnik: wykonany krok 6 — Zbuduj Laboratorium i zbadaj pierwszą technologię
- dzień 1, 15:15 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 15:30 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 15:30 — Przewodnik: wykonany krok 7 — Rozbuduj Kopalnię metalu do poz. 10
- dzień 1, 20:45 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 1, 21:30 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 1, 21:30 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 1, 21:30 — Przewodnik: wykonany krok 8 — Zbadaj „Metalurgię przemysłową”
- dzień 1, 21:30 — Przewodnik: wykonany krok 9 — Uruchom wielką fabrykę
- dzień 1, 21:30 — Przewodnik: wykonany krok 10 — Zbadaj „Moduł orbitalny”
- dzień 1, 22:30 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 2, 08:15 — Budowa stoczni
- dzień 2, 08:15 — Przewodnik: wykonany krok 11 — Zbuduj stację macierzystą
- dzień 2, 08:15 — Przewodnik: wykonany krok 12 — Rozbuduj Kopalnię metalu do poz. 20
- dzień 2, 08:30 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 09:15 — Przewodnik: wykonany krok 13 — Zbadaj „Megastruktury”
- dzień 2, 17:45 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 908228 kryształów.
- dzień 2, 17:45 — Przewodnik: wykonany krok 14 — Kopalnia metalu poz. 40 — komplet osad
- dzień 2, 19:15 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 3, 17:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 19,3 mln metalu, 1,3 mln kryształów)
- dzień 3, 17:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 3, 18:15 — Kepler-186 f: megakonstrukt działa
- dzień 3, 18:15 — Przewodnik: wykonany krok 15 — Zbuduj megakonstrukt
- dzień 5, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 7, 10:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 7, 10:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 7, 10:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 7, 10:15 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 7, 10:15 — Przewodnik: wykonany krok 16 — Załóż drugą kolonię
- dzień 7, 11:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 11:30 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 7, 11:30 — Przewodnik: wykonany krok 17 — Wyślij transport surowców
- dzień 7, 12:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 7, 12:15 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 7, 13:15 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 7, 13:30 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 7, 13:45 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 7, 14:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 7, 14:30 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 7, 14:45 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 15:15 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 7, 16:30 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 7, 17:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 8, 08:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 1801059 metalu, 934254 kryształów.
- dzień 8, 09:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 10, 08:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 10, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 10, 08:00 — Przewodnik: wykonany krok 18 — Wyeksploatuj pierwszą planetę (80% złóż)
- dzień 10, 10:30 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 28,1 mln metalu, 1,3 mln kryształów)
- dzień 10, 10:30 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 10, 12:00 — TOI-843 b: megakonstrukt działa
- dzień 11, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 13, 20:45 — Kepler-186 f: wydobyto 100% złóż
- dzień 14, 08:15 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 14, 08:15 — TOI-843 b: wydobyto 50% złóż
- dzień 14, 08:30 — Stocznia: zamówiono statek kolonizacyjny
- dzień 14, 08:30 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 14, 09:30 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 14, 09:45 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 15, 08:15 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 15, 10:15 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 15, 11:15 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 15, 11:15 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 16, 08:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 16, 08:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 16, 08:30 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 16, 10:15 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 16, 11:30 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 16, 14:15 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 16, 15:30 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 16, 20:15 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 17, 08:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 925806 kryształów.
- dzień 18, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 19, 08:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 32,4 mln metalu, 1,3 mln kryształów)
- dzień 19, 08:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 19, 10:00 — TOI-843 c: megakonstrukt działa
- dzień 19, 19:30 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 20, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 23, 08:15 — TOI-843 b: wydobyto 100% złóż
- dzień 23, 17:30 — TOI-843 c: wydobyto 50% złóż
- dzień 24, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 24, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 24, 08:15 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 24, 09:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 24, 09:15 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 b
- dzień 24, 14:15 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 24, 15:45 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 24, 17:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 24, 17:15 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 24, 18:15 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 24, 18:30 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 24, 19:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 24, 20:30 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 24, 22:15 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 25, 08:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 25, 08:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 25, 13:30 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 25, 16:45 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 980753 kryształów.
- dzień 27, 08:45 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 34,6 mln metalu, 1,4 mln kryształów)
- dzień 27, 08:45 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 27, 10:30 — TOI-843 d: megakonstrukt działa
- dzień 27, 22:45 — TOI-843 c: wydobyto 80% złóż
- dzień 27, 22:45 — Przewodnik: wykonany krok 19 — Imperium gwiezdne: trzy wyeksploatowane planety
- dzień 27, 22:45 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Aktywny (co 15 min, 8:00–24:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 13,75 mln / 180,17 mln | 0 / 6,75 mln | 40 / 19 / 40 / 30 / 10 | 10,0 d |
| TOI-843 b | 87/131 | 18,57 mln / 147,06 mln | 1,68 mln / 6,75 mln | 40 / 19 / 34 / 31 / 10 | 10,4 d |
| TOI-843 c | 87/124 | 25,48 mln / 149,27 mln | 2,46 mln / 6,75 mln | 40 / 19 / 31 / 26 / 10 | 9,1 d |
| TOI-843 d | 87/116 | 22,01 mln / 194,51 mln | 1,08 mln / 6,75 mln | 40 / 19 / 32 / 33 / 10 | 9,0 d |
| TOI-843 f | 115/163 | 0 / 106,67 mln | 9,07 mln / 45,38 mln | 40 / 40 / 40 / 26 / 10 | 8,0 d |
| TOI-843 j | 99/286 | 25,07 mln / 37,80 mln | 17,71 mln / 73,58 mln | 19 / 40 / 40 / 28 / 10 | 8,4 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 08:15 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 08:45 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 09:15 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 09:15 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 1, 10:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 11:00 — Przewodnik: wykonany krok 1 — Rozbuduj Kopalnię metalu do poz. 3
- dzień 1, 11:00 — Przewodnik: wykonany krok 2 — Rozbuduj Elektrownię do poz. 3
- dzień 1, 12:45 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 1, 13:30 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 14:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 14:30 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 1, 14:45 — Przewodnik: wykonany krok 3 — Rozbuduj Ekstraktor kryształów do poz. 3
- dzień 1, 14:45 — Przewodnik: wykonany krok 4 — Rozbuduj Magazyn do poz. 4
- dzień 1, 14:45 — Przewodnik: wykonany krok 5 — Obejrzyj swój układ
- dzień 1, 14:45 — Przewodnik: wykonany krok 6 — Zbuduj Laboratorium i zbadaj pierwszą technologię
- dzień 1, 15:15 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 15:30 — Przewodnik: wykonany krok 7 — Rozbuduj Kopalnię metalu do poz. 10
- dzień 1, 16:45 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 17:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 18:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 1, 19:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 1, 21:45 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 1, 23:00 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 1, 23:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 1, 23:00 — Przewodnik: wykonany krok 8 — Zbadaj „Metalurgię przemysłową”
- dzień 1, 23:00 — Przewodnik: wykonany krok 9 — Uruchom wielką fabrykę
- dzień 1, 23:00 — Przewodnik: wykonany krok 10 — Zbadaj „Moduł orbitalny”
- dzień 1, 23:00 — Przewodnik: wykonany krok 11 — Zbuduj stację macierzystą
- dzień 1, 23:00 — Przewodnik: wykonany krok 12 — Rozbuduj Kopalnię metalu do poz. 20
- dzień 1, 23:15 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 23:15 — Budowa stoczni
- dzień 1, 23:30 — Stocznia: zamówiono statek kolonizacyjny
- dzień 1, 23:45 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 2, 08:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 2, 08:00 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 2, 08:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 08:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 2, 09:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 2, 09:00 — Przewodnik: wykonany krok 13 — Zbadaj „Megastruktury”
- dzień 2, 09:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 09:15 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 2, 09:30 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 2, 09:30 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 09:45 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 09:45 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 10:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 10:15 — TOI-843 d: pierwszy transport nadwyżki na Kepler-186 f
- dzień 2, 10:45 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 11:30 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 11:45 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 12:15 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 13:45 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 14:45 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 2, 15:30 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 782951 metalu, 895415 kryształów.
- dzień 2, 15:30 — Przewodnik: wykonany krok 14 — Kopalnia metalu poz. 40 — komplet osad
- dzień 2, 17:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 2, 17:45 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 18:45 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 19:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 19:15 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 20:15 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 20:30 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 20:45 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 21:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 21:45 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 22:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 22:15 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 23:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 23:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 23:45 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 08:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 3, 08:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 08:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 3, 08:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 08:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 3, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 3, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 08:15 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 3, 08:30 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 08:30 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 3, 08:45 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 08:45 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 3, 09:15 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 09:45 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 10:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 10:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 10:00 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 10:15 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 2003788 metalu, 980479 kryształów.
- dzień 3, 10:15 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 10:15 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 10:30 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 10:30 — TOI-843 j: pierwszy transport nadwyżki na TOI-843 b
- dzień 3, 11:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 11:30 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 12:00 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 12:00 — TOI-843 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 3, 12:15 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 12:30 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 13:15 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 13:15 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 14:00 — TOI-843 f: uruchomiono wielką fabrykę
- dzień 3, 14:15 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 14:30 — TOI-843 j: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 14:30 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 15:00 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 15:00 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 15:45 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 16:15 — TOI-843 j: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 17:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 19,5 mln metalu, 1,4 mln kryształów)
- dzień 3, 17:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 3, 17:15 — TOI-843 f: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 3, 17:30 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 17:45 — TOI-843 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 18:15 — Kepler-186 f: megakonstrukt działa
- dzień 3, 18:15 — TOI-843 j: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 3, 18:15 — Przewodnik: wykonany krok 15 — Zbuduj megakonstrukt
- dzień 3, 18:15 — Przewodnik: wykonany krok 16 — Załóż drugą kolonię
- dzień 3, 18:15 — Przewodnik: wykonany krok 17 — Wyślij transport surowców
- dzień 3, 19:45 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 3, 21:15 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 989208 kryształów.
- dzień 3, 22:15 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 23:00 — TOI-843 j: uruchomiono wielką fabrykę
- dzień 4, 08:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 4, 08:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 471407 metalu, 929939 kryształów.
- dzień 4, 08:00 — TOI-843 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 4, 08:00 — TOI-843 j: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 4, 08:00 — Transport niemożliwy: Wszystkie transportowce są w drodze (3) — poczekaj, aż któryś wróci, albo zbuduj kolejny (Imperium → Flota).
- dzień 4, 12:15 — TOI-843 f: budowa megakonstruktu (wydobyte dotąd: 5,8 mln metalu, 1,9 mln kryształów)
- dzień 4, 12:15 — TOI-843 f: megakonstrukt — brak przeszkód
- dzień 4, 14:15 — TOI-843 f: megakonstrukt działa
- dzień 5, 08:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 25,5 mln metalu, 1,3 mln kryształów)
- dzień 5, 08:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 5, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 5, 09:30 — TOI-843 b: megakonstrukt działa
- dzień 5, 13:30 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 33,2 mln metalu, 1,4 mln kryształów)
- dzień 5, 13:30 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 5, 15:15 — TOI-843 d: megakonstrukt działa
- dzień 6, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 6, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 6, 12:15 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 32,1 mln metalu, 1,4 mln kryształów)
- dzień 6, 12:15 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 6, 14:15 — TOI-843 c: megakonstrukt działa
- dzień 6, 18:45 — TOI-843 f: wydobyto 25% złóż
- dzień 7, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 7, 13:15 — Kepler-186 f: wydobyto 50% złóż
- dzień 8, 15:30 — TOI-843 d: wydobyto 50% złóż
- dzień 9, 08:45 — TOI-843 b: wydobyto 50% złóż
- dzień 9, 11:30 — TOI-843 f: wydobyto 50% złóż
- dzień 10, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 10, 08:00 — Przewodnik: wykonany krok 18 — Wyeksploatuj pierwszą planetę (80% złóż)
- dzień 10, 10:30 — TOI-843 j: wydobyto 25% złóż
- dzień 10, 16:15 — TOI-843 c: wydobyto 50% złóż
- dzień 11, 18:15 — TOI-843 d: wydobyto 80% złóż
- dzień 12, 14:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 12, 14:00 — TOI-843 f: wydobyto 80% złóż
- dzień 12, 14:00 — Przewodnik: wykonany krok 19 — Imperium gwiezdne: trzy wyeksploatowane planety
- dzień 12, 14:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 180,17 mln | 0 / 6,75 mln | 40 / 19 / 40 / 27 / 10 | 11,9 d |
| TOI-843 b | 87/131 | 0 / 147,06 mln | 0 / 6,75 mln | 40 / 19 / 30 / 34 / 10 | 14,8 d |
| TOI-843 c | 87/124 | 6,43 mln / 149,27 mln | 1,34 mln / 6,75 mln | 40 / 19 / 32 / 30 / 10 | 11,3 d |
| TOI-843 d | 58/102 | 170,06 mln / 172,90 mln | 5,79 mln / 6,00 mln | 25 / 11 / 19 / 23 / 10 | 1,1 d |

<details><summary>Oś czasu</summary>

- dzień 1, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 17:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 17:00 — Przewodnik: wykonany krok 1 — Rozbuduj Kopalnię metalu do poz. 3
- dzień 1, 17:00 — Przewodnik: wykonany krok 2 — Rozbuduj Elektrownię do poz. 3
- dzień 2, 08:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 08:00 — Przewodnik: wykonany krok 3 — Rozbuduj Ekstraktor kryształów do poz. 3
- dzień 2, 11:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 08:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 17:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 17:00 — Przewodnik: wykonany krok 4 — Rozbuduj Magazyn do poz. 4
- dzień 3, 17:00 — Przewodnik: wykonany krok 5 — Obejrzyj swój układ
- dzień 3, 17:00 — Przewodnik: wykonany krok 6 — Zbuduj Laboratorium i zbadaj pierwszą technologię
- dzień 3, 17:00 — Przewodnik: wykonany krok 7 — Rozbuduj Kopalnię metalu do poz. 10
- dzień 3, 20:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 20:00 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 3, 20:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 3, 20:00 — Przewodnik: wykonany krok 8 — Zbadaj „Metalurgię przemysłową”
- dzień 3, 20:00 — Przewodnik: wykonany krok 9 — Uruchom wielką fabrykę
- dzień 3, 20:00 — Przewodnik: wykonany krok 10 — Zbadaj „Moduł orbitalny”
- dzień 4, 08:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 08:00 — Budowa stoczni
- dzień 4, 08:00 — Przewodnik: wykonany krok 11 — Zbuduj stację macierzystą
- dzień 4, 08:00 — Przewodnik: wykonany krok 12 — Rozbuduj Kopalnię metalu do poz. 20
- dzień 4, 11:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 20:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 20:00 — Kepler-186 f: megakonstrukt — Najpierw zbadaj „Megastruktury” (Badania → Produktywność).
- dzień 6, 17:00 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 187897 kryształów.
- dzień 6, 17:00 — Przewodnik: wykonany krok 13 — Zbadaj „Megastruktury”
- dzień 6, 17:00 — Przewodnik: wykonany krok 14 — Kopalnia metalu poz. 40 — komplet osad
- dzień 7, 08:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 22,2 mln metalu, 1,6 mln kryształów)
- dzień 7, 08:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 7, 11:00 — Kepler-186 f: megakonstrukt działa
- dzień 7, 11:00 — Przewodnik: wykonany krok 15 — Zbuduj megakonstrukt
- dzień 8, 17:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 11, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 11, 08:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 11, 11:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 11, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 11, 11:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 11, 11:00 — Przewodnik: wykonany krok 16 — Załóż drugą kolonię
- dzień 11, 11:00 — Przewodnik: wykonany krok 17 — Wyślij transport surowców
- dzień 11, 17:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 11, 20:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 12, 08:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 12, 11:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 12, 17:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 12, 17:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 12, 20:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 12, 20:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 13, 08:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 13, 11:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 13, 17:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 13, 17:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 13, 17:00 — Przewodnik: wykonany krok 18 — Wyeksploatuj pierwszą planetę (80% złóż)
- dzień 13, 20:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 14, 08:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 14, 14:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 15, 11:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 656819 kryształów.
- dzień 17, 11:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 28,9 mln metalu, 1,2 mln kryształów)
- dzień 17, 11:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 17, 11:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 17, 14:00 — TOI-843 b: megakonstrukt działa
- dzień 18, 11:00 — TOI-843 b: wydobyto 25% złóż
- dzień 21, 14:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 21, 14:00 — TOI-843 b: wydobyto 50% złóż
- dzień 21, 17:00 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 21, 17:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 21, 17:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 22, 11:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 23, 17:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 23, 17:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 23, 20:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 24, 08:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 24, 11:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 24, 11:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 24, 14:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 24, 17:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 25, 08:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 25, 11:00 — TOI-843 b: wydobyto 80% złóż
- dzień 25, 17:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 25, 20:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 26, 08:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 27, 08:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 709548 kryształów.
- dzień 29, 08:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 35,5 mln metalu, 1,5 mln kryształów)
- dzień 29, 08:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 29, 11:00 — TOI-843 c: megakonstrukt działa
- dzień 29, 20:00 — TOI-843 c: wydobyto 25% złóż
- dzień 30, 14:00 — TOI-843 b: wydobyto 100% złóż
- dzień 33, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 33, 08:00 — TOI-843 c: wydobyto 50% złóż
- dzień 33, 11:00 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 b
- dzień 33, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 33, 11:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 33, 20:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 35, 11:00 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 35, 11:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 35, 14:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 35, 17:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 35, 20:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 35, 20:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 36, 08:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 36, 11:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 36, 17:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 37, 11:00 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 37, 14:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 37, 14:00 — TOI-843 c: wydobyto 80% złóż
- dzień 37, 14:00 — Przewodnik: wykonany krok 19 — Imperium gwiezdne: trzy wyeksploatowane planety
- dzień 37, 14:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 180,17 mln | 0 / 6,75 mln | 40 / 19 / 39 / 30 / 10 | 11,8 d |
| TOI-843 b | 87/131 | 0 / 147,06 mln | 778 tys. / 6,75 mln | 40 / 19 / 34 / 30 / 10 | 12,8 d |
| TOI-843 c | 87/124 | 33,86 mln / 149,27 mln | 2,02 mln / 6,75 mln | 40 / 19 / 35 / 26 / 10 | 8,6 d |
| TOI-843 d | 87/116 | 30,44 mln / 194,51 mln | 1,33 mln / 6,75 mln | 40 / 19 / 34 / 34 / 10 | 8,6 d |
| TOI-843 f | 115/163 | 46,31 mln / 106,67 mln | 29,58 mln / 45,38 mln | 40 / 40 / 40 / 27 / 10 | 7,5 d |
| TOI-843 j | 99/286 | 29,26 mln / 37,80 mln | 36,17 mln / 73,58 mln | 19 / 40 / 40 / 25 / 10 | 5,8 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 11:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 17:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 17:00 — Przewodnik: wykonany krok 1 — Rozbuduj Kopalnię metalu do poz. 3
- dzień 1, 17:00 — Przewodnik: wykonany krok 2 — Rozbuduj Elektrownię do poz. 3
- dzień 1, 20:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 08:00 — Przewodnik: wykonany krok 3 — Rozbuduj Ekstraktor kryształów do poz. 3
- dzień 2, 11:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 08:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 11:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 14:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 14:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 14:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 3, 17:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 17:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 17:00 — Przewodnik: wykonany krok 4 — Rozbuduj Magazyn do poz. 4
- dzień 3, 17:00 — Przewodnik: wykonany krok 5 — Obejrzyj swój układ
- dzień 3, 17:00 — Przewodnik: wykonany krok 6 — Zbuduj Laboratorium i zbadaj pierwszą technologię
- dzień 3, 17:00 — Przewodnik: wykonany krok 7 — Rozbuduj Kopalnię metalu do poz. 10
- dzień 3, 20:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 20:00 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 3, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 20:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 3, 20:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 3, 20:00 — Przewodnik: wykonany krok 8 — Zbadaj „Metalurgię przemysłową”
- dzień 3, 20:00 — Przewodnik: wykonany krok 9 — Uruchom wielką fabrykę
- dzień 3, 20:00 — Przewodnik: wykonany krok 10 — Zbadaj „Moduł orbitalny”
- dzień 4, 08:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 08:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 4, 08:00 — Przewodnik: wykonany krok 11 — Zbuduj stację macierzystą
- dzień 4, 08:00 — Przewodnik: wykonany krok 12 — Rozbuduj Kopalnię metalu do poz. 20
- dzień 4, 11:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 11:00 — Budowa stoczni
- dzień 4, 14:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 14:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 4, 14:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 4, 17:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 4, 20:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 4, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 4, 20:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 5, 08:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 5, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 5, 11:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 11:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 11:00 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 b
- dzień 5, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 5, 11:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 5, 14:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 14:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 5, 14:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 5, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 17:00 — TOI-843 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 5, 17:00 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 5, 20:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 5, 20:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 08:00 — Kepler-186 f: megakonstrukt — Najpierw zbadaj „Megastruktury” (Badania → Produktywność).
- dzień 6, 08:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 6, 08:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 08:00 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 6, 11:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 6, 11:00 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 b: megakonstrukt — Najpierw zbadaj „Megastruktury” (Badania → Produktywność).
- dzień 6, 14:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 6, 14:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 6, 14:00 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 17:00 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 201108 kryształów.
- dzień 6, 17:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 767709 kryształów.
- dzień 6, 17:00 — Przewodnik: wykonany krok 13 — Zbadaj „Megastruktury”
- dzień 6, 17:00 — Przewodnik: wykonany krok 14 — Kopalnia metalu poz. 40 — komplet osad
- dzień 6, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 6, 20:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 7, 08:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 22,1 mln metalu, 1,6 mln kryształów)
- dzień 7, 08:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 7, 08:00 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 7, 11:00 — Kepler-186 f: megakonstrukt działa
- dzień 7, 11:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 7, 11:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 7, 11:00 — Przewodnik: wykonany krok 15 — Zbuduj megakonstrukt
- dzień 7, 11:00 — Przewodnik: wykonany krok 16 — Załóż drugą kolonię
- dzień 7, 11:00 — Przewodnik: wykonany krok 17 — Wyślij transport surowców
- dzień 7, 14:00 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 7, 14:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 7, 14:00 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 7, 17:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 7, 17:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 7, 17:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 7, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 7, 20:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 20:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 7, 20:00 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 7, 20:00 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 8, 08:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 25,9 mln metalu, 1,2 mln kryształów)
- dzień 8, 08:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 8, 08:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 8, 08:00 — TOI-843 j: pierwszy transport nadwyżki na TOI-843 b
- dzień 8, 08:00 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 8, 11:00 — TOI-843 b: megakonstrukt działa
- dzień 8, 14:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 8, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 8, 14:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 8, 17:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 8, 17:00 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 8, 20:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 816212 kryształów.
- dzień 8, 20:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 9, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 9, 14:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 08:00 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 10, 08:00 — TOI-843 j: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 10, 08:00 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 11:00 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 10, 14:00 — TOI-843 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 10, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 17:00 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 10, 20:00 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 713275 kryształów.
- dzień 10, 20:00 — TOI-843 f: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 10, 20:00 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 11, 08:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 11, 11:00 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 11, 14:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 6,5 mln metalu, 1,4 mln kryształów)
- dzień 11, 14:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 11, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 11, 17:00 — TOI-843 c: megakonstrukt działa
- dzień 11, 17:00 — TOI-843 j: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 11, 20:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 12, 08:00 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 36,0 mln metalu, 1,5 mln kryształów)
- dzień 12, 08:00 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 12, 11:00 — TOI-843 d: megakonstrukt działa
- dzień 12, 11:00 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 12, 11:00 — TOI-843 b: wydobyto 50% złóż
- dzień 12, 14:00 — TOI-843 j: uruchomiono wielką fabrykę
- dzień 12, 17:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 12, 17:00 — TOI-843 f: uruchomiono wielką fabrykę
- dzień 13, 08:00 — TOI-843 j: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 13, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 13, 14:00 — TOI-843 c: wydobyto 25% złóż
- dzień 13, 17:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 13, 17:00 — Przewodnik: wykonany krok 18 — Wyeksploatuj pierwszą planetę (80% złóż)
- dzień 14, 14:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 15, 08:00 — TOI-843 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 15, 08:00 — TOI-843 d: wydobyto 50% złóż
- dzień 15, 14:00 — TOI-843 f: budowa megakonstruktu (wydobyte dotąd: 9,6 mln metalu, 3,7 mln kryształów)
- dzień 15, 14:00 — TOI-843 f: megakonstrukt — brak przeszkód
- dzień 15, 17:00 — TOI-843 f: megakonstrukt działa
- dzień 16, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 16, 08:00 — TOI-843 c: wydobyto 50% złóż
- dzień 17, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 17, 11:00 — TOI-843 f: wydobyto 25% złóż
- dzień 18, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 18, 11:00 — TOI-843 d: wydobyto 80% złóż
- dzień 18, 11:00 — Przewodnik: wykonany krok 19 — Imperium gwiezdne: trzy wyeksploatowane planety
- dzień 18, 11:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

