# Symulacja pętli MVP (etap 1)

Wygenerowano skryptem `npm run simulate` (limit 90 dni czasu gry). **To symulacja „rozsądnego gracza”, nie prawdziwa rozgrywka** — wskazówka do strojenia, nie wyrok. Gra nie została zmieniona. **Wnioski:** `docs/status.md`, punkt 8.

**Gracz w symulacji:** przy każdej wizycie na każdej planecie zaczyna najtańsze dostępne badanie (bez antymaterii), buduje według potrzeb (energia → magazyn → tańsza kopalnia → laboratorium do połowy poziomu kopalń) z kolejką, planety wyeksploatowane albo z pełnym magazynem wysyłają nadwyżkę transportowcami tam, gdzie jest miejsce, kolonizuje wolne planety własnego układu statkiem (od v0.53: koszt, paliwo z antymaterii, lot ok. 2 min); każdy lot płaci paliwo. Nie używa „Ukończ teraz”, specjalizacji, kompleksów, asteroid ani komet. Warunek końca: 3 planety z ≥ 80% wydobytych złóż metalu **i** kryształów.

| Profil gracza | Strategia kolonii | Wyeksploatowane planety | Czas | 1. planeta ≥ 80% | Planet założonych | Najdłuższy przestój planety | Transporty | Loty wstrzymane — brak paliwa | Antymateria na koniec | Najczęstsza blokada budowy |
|---|---|---|---|---|---|---|---|---|---|---|
| Aktywny (co 15 min, 8:00–24:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 34,0 d | 10,0 d | 4 | 296,3 h (TOI-843 b) | 1500 | 1004 | 14 | maks. poziom (2672×) |
| Aktywny (co 15 min, 8:00–24:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 13,2 d | 10,0 d | 6 | 232,0 h (TOI-843 c) | 376 | 169 | 127 | maks. poziom (4931×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 49,1 d | 16,5 d | 4 | 318,0 h (TOI-843 b) | 257 | 0 | 1829 | maks. poziom (181×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 22,1 d | 16,5 d | 6 | 216,0 h (Kepler-186 f) | 78 | 0 | 685 | maks. poziom (377×) |

## Aktywny (co 15 min, 8:00–24:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 196,37 mln | 0 / 8,10 mln | 40 / 19 / 40 / 29 / 10 | 12,9 d |
| TOI-843 b | 87/131 | 0 / 163,26 mln | 0 / 8,10 mln | 40 / 19 / 30 / 31 / 10 | 21,3 d |
| TOI-843 c | 87/124 | 98 tys. / 165,47 mln | 1,55 mln / 8,10 mln | 40 / 19 / 30 / 30 / 10 | 14,8 d |
| TOI-843 d | 83/110 | 144,29 mln / 210,71 mln | 5,58 mln / 8,10 mln | 40 / 19 / 35 / 30 / 10 | 3,9 d |

<details><summary>Oś czasu</summary>

- dzień 1, 13:30 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 16:30 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 17:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 1, 17:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 17:45 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 20:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 21:30 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 1, 22:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 1, 22:15 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 23:30 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 2, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 2, 08:15 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 08:15 — Budowa stoczni
- dzień 2, 15:15 — Kepler-186 f: megakonstrukt — Najpierw zbadaj „Megastruktury” (Badania → Produktywność).
- dzień 2, 17:15 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 2, 21:45 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 1964934 kryształów.
- dzień 4, 23:45 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 37,9 mln metalu, 2,6 mln kryształów)
- dzień 4, 23:45 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 5, 08:00 — Kepler-186 f: megakonstrukt działa
- dzień 5, 16:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 8, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 8, 08:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 8, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 8, 08:15 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 8, 09:30 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 9, 08:15 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 11, 08:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 11, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 11, 08:30 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 11, 08:45 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 11, 09:30 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 11, 12:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 11, 12:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 11, 12:15 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 11, 12:45 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 11, 13:15 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 11, 14:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 11, 15:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 11, 16:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 11, 23:45 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 669735 metalu, 1984942 kryształów.
- dzień 12, 08:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 14, 11:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 33,0 mln metalu, 1,5 mln kryształów)
- dzień 14, 11:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 14, 12:30 — TOI-843 b: megakonstrukt działa
- dzień 15, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 15, 11:45 — TOI-843 b: wydobyto 25% złóż
- dzień 19, 08:30 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 19, 08:30 — TOI-843 b: wydobyto 50% złóż
- dzień 19, 08:45 — Stocznia: zamówiono statek kolonizacyjny
- dzień 19, 08:45 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 19, 10:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 20, 08:45 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 20, 10:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 20, 10:30 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 20, 11:30 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 20, 20:15 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 21, 08:15 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 21, 08:15 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 21, 08:30 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 21, 09:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 21, 10:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 21, 10:15 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 21, 12:15 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 21, 12:45 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 22, 08:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 22, 08:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 1891093 kryształów.
- dzień 23, 23:30 — TOI-843 b: wydobyto 80% złóż
- dzień 25, 18:45 — TOI-843 c: wydobyto 25% złóż
- dzień 26, 11:15 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 58,0 mln metalu, 2,4 mln kryształów)
- dzień 26, 11:15 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 26, 13:15 — TOI-843 c: megakonstrukt działa
- dzień 29, 23:45 — TOI-843 c: wydobyto 50% złóż
- dzień 30, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 30, 08:00 — TOI-843 b: wydobyto 100% złóż
- dzień 30, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 30, 08:15 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 30, 09:15 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 b
- dzień 30, 14:30 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 30, 15:15 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 30, 18:15 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 30, 18:15 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 30, 21:45 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 30, 23:45 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 31, 08:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 31, 08:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 31, 08:15 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 31, 09:15 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 31, 10:30 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 31, 11:15 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 31, 19:30 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 1992378 kryształów.
- dzień 31, 21:15 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 34, 13:45 — TOI-843 d: wydobyto 25% złóż
- dzień 35, 08:00 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 66,4 mln metalu, 2,5 mln kryształów)
- dzień 35, 08:00 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 35, 08:00 — TOI-843 c: wydobyto 80% złóż
- dzień 35, 08:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Aktywny (co 15 min, 8:00–24:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 4,99 mln / 196,37 mln | 0 / 8,10 mln | 40 / 19 / 40 / 32 / 10 | 12,3 d |
| TOI-843 b | 87/131 | 31,27 mln / 163,26 mln | 3,02 mln / 8,10 mln | 40 / 19 / 31 / 27 / 10 | 12,5 d |
| TOI-843 c | 87/124 | 20,94 mln / 165,47 mln | 2,82 mln / 8,10 mln | 40 / 19 / 30 / 27 / 10 | 11,1 d |
| TOI-843 d | 87/116 | 27,91 mln / 210,71 mln | 1,62 mln / 8,10 mln | 40 / 19 / 35 / 31 / 10 | 10,0 d |
| TOI-843 f | 115/163 | 0 / 122,87 mln | 5,77 mln / 46,73 mln | 40 / 40 / 40 / 27 / 10 | 9,9 d |
| TOI-843 j | 99/286 | 38,42 mln / 54,00 mln | 10,38 mln / 74,93 mln | 19 / 40 / 34 / 25 / 10 | 10,1 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 08:15 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 09:15 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 1, 13:30 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 14:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 1, 15:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 15:30 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 1, 15:30 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 16:30 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 17:15 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 1, 18:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 19:45 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 20:30 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 1, 20:45 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 1, 21:45 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 1, 22:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 2, 08:15 — Budowa stoczni
- dzień 2, 08:30 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 08:45 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 2, 09:00 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 2, 09:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 09:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 2, 14:45 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 461256 metalu, 1996536 kryształów.
- dzień 2, 16:45 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 17:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 18:45 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 18:45 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 19:30 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 2, 20:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 21:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 21:30 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 08:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 08:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 3, 08:00 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 3, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 3, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 08:15 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 3, 08:30 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 3, 08:45 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 08:45 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 3, 09:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 09:00 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 3, 09:15 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 3, 10:15 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 10:30 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 11:30 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 11:45 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 12:15 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 13:00 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 14:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 14:15 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 14:30 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 14:30 — TOI-843 j: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 14:45 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 14:45 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 14:45 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 14:45 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 15:15 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 15:30 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 15:30 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 15:30 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 15:45 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 16:30 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 16:30 — TOI-843 f: uruchomiono wielką fabrykę
- dzień 3, 18:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 18:00 — TOI-843 j: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 3, 18:30 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 18:30 — TOI-843 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 18:30 — TOI-843 j: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 18:45 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 20:15 — TOI-843 f: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 3, 22:30 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 22:45 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 3, 23:30 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 23:45 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 08:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 1893584 kryształów.
- dzień 4, 08:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 08:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 4, 08:00 — TOI-843 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 4, 08:00 — TOI-843 j: uruchomiono wielką fabrykę
- dzień 4, 08:00 — TOI-843 f: pierwszy transport nadwyżki na Kepler-186 f
- dzień 4, 08:15 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 4, 08:45 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 08:45 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 09:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 4, 09:15 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 4, 09:15 — TOI-843 j: pierwszy transport nadwyżki na Kepler-186 f
- dzień 4, 10:45 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 11:00 — TOI-843 d: pierwszy transport nadwyżki na Kepler-186 f
- dzień 4, 11:45 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 12:15 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 4, 12:15 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 4, 13:15 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 4, 13:30 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 14:15 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 15:30 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 4, 16:15 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 16:45 — TOI-843 f: megakonstrukt — Megakonstrukt — brakuje: 71845 metalu, 1035887 kryształów.
- dzień 4, 17:30 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 18:15 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 19:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 35,7 mln metalu, 2,5 mln kryształów)
- dzień 4, 19:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 4, 19:30 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 4, 20:15 — Kepler-186 f: megakonstrukt działa
- dzień 4, 21:15 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 1993128 kryształów.
- dzień 4, 23:00 — TOI-843 f: budowa megakonstruktu (wydobyte dotąd: 8,0 mln metalu, 2,8 mln kryształów)
- dzień 4, 23:00 — TOI-843 f: megakonstrukt — brak przeszkód
- dzień 5, 08:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 08:00 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 08:00 — TOI-843 f: megakonstrukt działa
- dzień 5, 08:00 — TOI-843 j: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 12:30 — Kepler-186 f: wydobyto 25% złóż
- dzień 5, 13:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 1996065 kryształów.
- dzień 7, 08:00 — TOI-843 f: wydobyto 25% złóż
- dzień 7, 18:45 — TOI-843 c: wydobyto 25% złóż
- dzień 7, 23:45 — TOI-843 d: wydobyto 25% złóż
- dzień 8, 08:00 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 58,7 mln metalu, 2,4 mln kryształów)
- dzień 8, 08:00 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 8, 08:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 8, 09:45 — TOI-843 d: megakonstrukt działa
- dzień 8, 11:15 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 60,4 mln metalu, 2,4 mln kryształów)
- dzień 8, 11:15 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 8, 13:15 — TOI-843 c: megakonstrukt działa
- dzień 8, 17:30 — TOI-843 b: wydobyto 25% złóż
- dzień 9, 08:45 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 52,0 mln metalu, 2,4 mln kryształów)
- dzień 9, 08:45 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 9, 10:15 — TOI-843 b: megakonstrukt działa
- dzień 9, 18:30 — TOI-843 f: wydobyto 50% złóż
- dzień 10, 19:15 — TOI-843 d: wydobyto 50% złóż
- dzień 11, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 12, 08:00 — TOI-843 c: wydobyto 50% złóż
- dzień 12, 14:15 — TOI-843 b: wydobyto 50% złóż
- dzień 13, 08:00 — TOI-843 f: wydobyto 80% złóż
- dzień 13, 08:00 — TOI-843 j: wydobyto 25% złóż
- dzień 14, 13:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 14, 13:15 — TOI-843 d: wydobyto 80% złóż
- dzień 14, 13:15 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 196,37 mln | 0 / 8,10 mln | 40 / 19 / 39 / 30 / 10 | 15,0 d |
| TOI-843 b | 87/131 | 0 / 163,26 mln | 0 / 8,10 mln | 40 / 19 / 27 / 30 / 10 | 19,9 d |
| TOI-843 c | 87/124 | 1,82 mln / 165,47 mln | 1,59 mln / 8,10 mln | 40 / 19 / 31 / 30 / 10 | 14,8 d |
| TOI-843 d | 61/103 | 187,12 mln / 187,30 mln | 7,10 mln / 7,20 mln | 28 / 13 / 24 / 10 / 10 | 0,9 d |

<details><summary>Oś czasu</summary>

- dzień 1, 20:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 08:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 11:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 14:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 4, 08:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 14:00 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 4, 20:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 5, 08:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 5, 14:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 7, 17:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 7, 20:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 8, 08:00 — Budowa stoczni
- dzień 8, 11:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 9, 11:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 10, 08:00 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 968052 kryształów.
- dzień 11, 11:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 34,5 mln metalu, 2,6 mln kryształów)
- dzień 11, 11:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 11, 14:00 — Kepler-186 f: megakonstrukt działa
- dzień 12, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 14, 20:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 14, 20:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 15, 08:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 15, 08:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 15, 08:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 15, 17:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 16, 08:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 17, 08:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 17, 08:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 17, 11:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 17, 17:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 17, 20:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 17, 20:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 20, 11:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 20, 17:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 20, 20:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 21, 08:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 21, 14:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 21, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 22, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 22, 17:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 23, 11:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 1464175 kryształów.
- dzień 25, 20:00 — TOI-843 b: wydobyto 25% złóż
- dzień 26, 08:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 50,6 mln metalu, 2,3 mln kryształów)
- dzień 26, 08:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 26, 11:00 — TOI-843 b: megakonstrukt działa
- dzień 29, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 29, 17:00 — TOI-843 b: wydobyto 50% złóż
- dzień 29, 20:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 29, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 29, 20:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 30, 14:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 30, 20:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 31, 20:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 31, 20:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 32, 08:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 32, 14:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 34, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 35, 11:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 35, 14:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 35, 14:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 35, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 36, 11:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 36, 17:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 37, 14:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 38, 11:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 1567278 kryształów.
- dzień 40, 14:00 — TOI-843 b: wydobyto 100% złóż
- dzień 41, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 41, 20:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 58,2 mln metalu, 2,4 mln kryształów)
- dzień 41, 20:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 42, 08:00 — TOI-843 c: megakonstrukt działa
- dzień 45, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 45, 08:00 — TOI-843 c: wydobyto 50% złóż
- dzień 45, 11:00 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 c
- dzień 45, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 45, 11:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 45, 20:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 46, 08:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 47, 11:00 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 47, 20:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 47, 20:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 48, 08:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 48, 08:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 48, 20:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 49, 11:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 49, 14:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 50, 08:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 50, 11:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 50, 11:00 — Transport niemożliwy: Wszystkie transportowce są w drodze (3) — poczekaj, aż któryś wróci, albo zbuduj kolejny (Imperium → Flota).
- dzień 50, 11:00 — TOI-843 c: wydobyto 80% złóż
- dzień 50, 11:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 196,37 mln | 0 / 8,10 mln | 40 / 19 / 39 / 30 / 10 | 14,5 d |
| TOI-843 b | 87/131 | 0 / 163,26 mln | 528 tys. / 8,10 mln | 40 / 19 / 31 / 31 / 10 | 16,0 d |
| TOI-843 c | 87/124 | 27,17 mln / 165,47 mln | 3,04 mln / 8,10 mln | 40 / 19 / 33 / 31 / 10 | 9,9 d |
| TOI-843 d | 87/116 | 28,23 mln / 210,71 mln | 1,62 mln / 8,10 mln | 40 / 19 / 30 / 31 / 10 | 9,8 d |
| TOI-843 f | 115/163 | 0 / 122,87 mln | 9,93 mln / 46,73 mln | 40 / 40 / 40 / 31 / 10 | 8,3 d |
| TOI-843 j | 99/286 | 39,88 mln / 54,00 mln | 14,39 mln / 74,93 mln | 19 / 40 / 35 / 25 / 10 | 8,5 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 11:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 20:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 20:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 08:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 11:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 14:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 14:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 17:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 3, 20:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 08:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 4, 11:00 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 4, 11:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 11:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 4, 14:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 4, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 4, 20:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 20:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 5, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 14:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 5, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 6, 08:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 6, 11:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 6, 14:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 6, 17:00 — Budowa stoczni
- dzień 6, 20:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 6, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 7, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 7, 11:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 7, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 7, 11:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 7, 14:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 7, 17:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 7, 17:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 7, 17:00 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 b
- dzień 7, 17:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 7, 17:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 7, 20:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 1824785 kryształów.
- dzień 7, 20:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 20:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 8, 08:00 — TOI-843 f: pierwszy transport nadwyżki na Kepler-186 f
- dzień 8, 08:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 8, 08:00 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 8, 11:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 8, 11:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 8, 11:00 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 8, 14:00 — TOI-843 j: pierwszy transport nadwyżki na TOI-843 b
- dzień 8, 14:00 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 8, 20:00 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 9, 11:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 9, 11:00 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 9, 11:00 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 9, 14:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 9, 17:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 10, 08:00 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 983052 kryształów.
- dzień 10, 08:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 10, 08:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 11:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 11:00 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 10, 11:00 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 10, 14:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 10, 14:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 14:00 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 10, 14:00 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 10, 17:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 10, 17:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 10, 17:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 20:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 20:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 10, 20:00 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 11, 08:00 — TOI-843 j: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 11, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 11, 11:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 34,5 mln metalu, 2,6 mln kryształów)
- dzień 11, 11:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 11, 11:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 46,3 mln metalu, 2,4 mln kryształów)
- dzień 11, 11:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 11, 11:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 11, 11:00 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 11, 11:00 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 11, 14:00 — Kepler-186 f: megakonstrukt działa
- dzień 11, 14:00 — TOI-843 b: megakonstrukt działa
- dzień 11, 14:00 — TOI-843 f: uruchomiono wielką fabrykę
- dzień 11, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 11, 17:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 11, 17:00 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 11, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 11, 20:00 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 12, 08:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 12, 08:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 12, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 12, 11:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 12, 11:00 — TOI-843 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 12, 14:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 12, 14:00 — TOI-843 f: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 12, 14:00 — TOI-843 j: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 12, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 12, 17:00 — TOI-843 j: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 12, 20:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 12, 20:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 13, 11:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 13, 11:00 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 13, 14:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 13, 14:00 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 13, 14:00 — TOI-843 j: uruchomiono wielką fabrykę
- dzień 13, 17:00 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 13, 17:00 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 14, 11:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 14, 11:00 — TOI-843 j: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 14, 14:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 1541125 kryształów.
- dzień 14, 17:00 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 1504878 kryształów.
- dzień 14, 17:00 — TOI-843 b: wydobyto 50% złóż
- dzień 14, 20:00 — TOI-843 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 14, 20:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 15, 11:00 — TOI-843 f: budowa megakonstruktu (wydobyte dotąd: 9,0 mln metalu, 3,1 mln kryształów)
- dzień 15, 11:00 — TOI-843 f: megakonstrukt — brak przeszkód
- dzień 15, 14:00 — TOI-843 f: megakonstrukt działa
- dzień 17, 08:00 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 59,9 mln metalu, 2,5 mln kryształów)
- dzień 17, 08:00 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 17, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 17, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 17, 11:00 — TOI-843 d: megakonstrukt działa
- dzień 17, 14:00 — TOI-843 f: wydobyto 25% złóż
- dzień 17, 20:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 55,1 mln metalu, 2,4 mln kryształów)
- dzień 17, 20:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 17, 20:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 18, 08:00 — TOI-843 c: megakonstrukt działa
- dzień 19, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 19, 17:00 — TOI-843 d: wydobyto 50% złóż
- dzień 20, 08:00 — Transport niemożliwy: Wszystkie transportowce są w drodze (3) — poczekaj, aż któryś wróci, albo zbuduj kolejny (Imperium → Flota).
- dzień 20, 08:00 — TOI-843 f: wydobyto 50% złóż
- dzień 21, 11:00 — TOI-843 c: wydobyto 50% złóż
- dzień 21, 20:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 23, 08:00 — TOI-843 j: wydobyto 25% złóż
- dzień 23, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 23, 11:00 — TOI-843 d: wydobyto 80% złóż
- dzień 23, 11:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

