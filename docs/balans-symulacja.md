# Symulacja pętli MVP (etap 1)

Wygenerowano skryptem `npm run simulate` (limit 90 dni czasu gry). **To symulacja „rozsądnego gracza”, nie prawdziwa rozgrywka** — wskazówka do strojenia, nie wyrok. Gra nie została zmieniona. **Wnioski:** `docs/status.md`, punkt 8.

**Gracz w symulacji:** przy każdej wizycie na każdej planecie zaczyna najtańsze dostępne badanie (bez antymaterii), buduje według potrzeb (energia → magazyn → tańsza kopalnia → laboratorium do połowy poziomu kopalń) z kolejką, planety wyeksploatowane albo z pełnym magazynem wysyłają nadwyżkę transportowcami tam, gdzie jest miejsce, kolonizuje wolne planety własnego układu statkiem (od v0.53: koszt, paliwo z antymaterii, lot ok. 2 min); każdy lot płaci paliwo. Nie używa „Ukończ teraz”, specjalizacji, kompleksów, asteroid ani komet. Warunek końca: 3 planety z ≥ 80% wydobytych złóż metalu **i** kryształów.

| Profil gracza | Strategia kolonii | Wyeksploatowane planety | Czas | 1. planeta ≥ 80% | Planet założonych | Najdłuższy przestój planety | Transporty | Loty wstrzymane — brak paliwa | Antymateria na koniec | Najczęstsza blokada budowy |
|---|---|---|---|---|---|---|---|---|---|---|
| Aktywny (co 15 min, 8:00–24:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 27,6 d | 9,0 d | 4 | 346,0 h (TOI-843 b) | 1230 | 784 | 0 | maks. poziom (2321×) |
| Aktywny (co 15 min, 8:00–24:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 11,5 d | 9,0 d | 6 | 226,0 h (Kepler-186 f) | 282 | 320 | 145 | maks. poziom (4071×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 37,0 d | 12,0 d | 4 | 261,0 h (TOI-843 b) | 204 | 0 | 1353 | maks. poziom (167×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 16,1 d | 12,0 d | 6 | 252,0 h (TOI-843 b) | 64 | 0 | 461 | maks. poziom (281×) |

## Aktywny (co 15 min, 8:00–24:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 180,17 mln | 0 / 6,75 mln | 40 / 19 / 40 / 30 / 10 | 11,4 d |
| TOI-843 b | 87/131 | 0 / 147,06 mln | 0 / 6,75 mln | 40 / 19 / 35 / 27 / 10 | 16,1 d |
| TOI-843 c | 87/124 | 4,39 mln / 149,27 mln | 1,35 mln / 6,75 mln | 40 / 19 / 36 / 28 / 10 | 12,3 d |
| TOI-843 d | 87/116 | 147,01 mln / 194,51 mln | 5,00 mln / 6,75 mln | 40 / 19 / 32 / 25 / 10 | 2,5 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:45 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 10:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:30 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 1, 13:45 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 14:45 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 15:30 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 15:45 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 17:45 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 18:45 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 1, 19:45 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 1, 21:30 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 23:45 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 2, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 2, 08:15 — Budowa stoczni
- dzień 2, 16:00 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 418014 metalu, 978781 kryształów.
- dzień 3, 19:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 21,2 mln metalu, 1,5 mln kryształów)
- dzień 3, 19:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 3, 20:15 — Kepler-186 f: megakonstrukt działa
- dzień 5, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 7, 13:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 7, 13:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 7, 13:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 7, 13:15 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 7, 14:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 14:30 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 8, 08:15 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 8, 08:15 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 8, 10:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 8, 10:30 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 8, 10:45 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 9, 08:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 9, 08:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 9, 08:15 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 9, 09:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 9, 10:15 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 9, 10:45 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 9, 22:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 581226 metalu, 993237 kryształów.
- dzień 10, 08:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 10, 08:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 10, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 11, 10:30 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 20,4 mln metalu, 1,1 mln kryształów)
- dzień 11, 10:30 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 11, 12:00 — TOI-843 b: megakonstrukt działa
- dzień 12, 14:15 — TOI-843 b: wydobyto 25% złóż
- dzień 13, 23:30 — Kepler-186 f: wydobyto 100% złóż
- dzień 15, 19:30 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 15, 19:30 — TOI-843 b: wydobyto 50% złóż
- dzień 15, 19:45 — Stocznia: zamówiono statek kolonizacyjny
- dzień 15, 19:45 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 15, 20:45 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 15, 21:00 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 16, 08:15 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 16, 10:15 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 16, 11:15 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 16, 11:15 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 17, 08:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 17, 08:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 17, 08:30 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 17, 10:15 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 17, 11:30 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 17, 14:15 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 17, 15:30 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 17, 20:15 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 18, 08:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 925806 kryształów.
- dzień 19, 16:00 — TOI-843 b: wydobyto 80% złóż
- dzień 19, 20:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 25,9 mln metalu, 1,0 mln kryształów)
- dzień 19, 20:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 19, 22:00 — TOI-843 c: megakonstrukt działa
- dzień 20, 11:00 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 21, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 24, 17:45 — TOI-843 c: wydobyto 50% złóż
- dzień 24, 19:30 — TOI-843 b: wydobyto 100% złóż
- dzień 25, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 25, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 25, 08:15 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 25, 09:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 25, 09:15 — TOI-843 d: pierwszy transport nadwyżki na Kepler-186 f
- dzień 25, 14:15 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 25, 15:45 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 25, 17:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 25, 17:15 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 25, 18:15 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 25, 18:30 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 25, 19:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 25, 20:30 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 25, 22:15 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 26, 08:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 26, 08:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 26, 13:30 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 26, 16:45 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 980753 kryształów.
- dzień 28, 08:45 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 34,6 mln metalu, 1,4 mln kryształów)
- dzień 28, 08:45 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 28, 10:30 — TOI-843 d: megakonstrukt działa
- dzień 28, 23:00 — TOI-843 c: wydobyto 80% złóż
- dzień 28, 23:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Aktywny (co 15 min, 8:00–24:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 10,01 mln / 180,17 mln | 0 / 6,75 mln | 40 / 19 / 40 / 29 / 10 | 10,3 d |
| TOI-843 b | 87/131 | 47,53 mln / 147,06 mln | 3,06 mln / 6,75 mln | 40 / 19 / 28 / 33 / 10 | 10,7 d |
| TOI-843 c | 87/124 | 28,74 mln / 149,27 mln | 2,72 mln / 6,75 mln | 40 / 19 / 34 / 32 / 10 | 8,2 d |
| TOI-843 d | 87/116 | 29,98 mln / 194,51 mln | 1,33 mln / 6,75 mln | 40 / 19 / 37 / 31 / 10 | 8,6 d |
| TOI-843 f | 115/163 | 0 / 106,67 mln | 9,07 mln / 45,38 mln | 40 / 40 / 40 / 26 / 10 | 8,1 d |
| TOI-843 j | 99/286 | 26,14 mln / 37,80 mln | 22,65 mln / 73,58 mln | 19 / 40 / 40 / 28 / 10 | 7,3 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 08:15 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 08:45 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 09:15 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 09:15 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 1, 10:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:30 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 1, 13:45 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 14:30 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 1, 15:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 15:30 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 17:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 17:15 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 1, 18:30 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 1, 19:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 19:30 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 1, 20:45 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 1, 21:30 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 21:45 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 2, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 2, 08:15 — Budowa stoczni
- dzień 2, 08:30 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 14:00 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 1540421 metalu, 995072 kryształów.
- dzień 3, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 3, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 08:15 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 3, 08:30 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 3, 08:30 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 3, 08:45 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 08:45 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 3, 09:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 3, 09:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 09:15 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 3, 09:30 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 09:45 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 10:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 10:45 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 11:15 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 12:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 12:30 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 12:45 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 14:30 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 14:45 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 14:45 — TOI-843 f: uruchomiono wielką fabrykę
- dzień 3, 15:30 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 15:45 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 16:15 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 17:00 — TOI-843 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 17:15 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 18:00 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 18:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 18:00 — TOI-843 f: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 3, 18:15 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 18:30 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 20,9 mln metalu, 1,5 mln kryształów)
- dzień 3, 18:30 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 3, 18:30 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 18:30 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 19:15 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 19:45 — Kepler-186 f: megakonstrukt działa
- dzień 3, 19:45 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 20:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 20:15 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 20:45 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 22:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 23:15 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 23:30 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 08:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 4, 08:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 4, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 4, 08:15 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 4, 08:15 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 4, 08:30 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 08:45 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 08:45 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 4, 09:15 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 09:30 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 10:15 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 10:30 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 4, 12:30 — TOI-843 j: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 4, 12:30 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 13:00 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 15:00 — TOI-843 f: megakonstrukt — Megakonstrukt — brakuje: 2169138 metalu, 521124 kryształów.
- dzień 4, 16:30 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 4, 16:45 — TOI-843 j: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 4, 17:30 — TOI-843 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 4, 18:15 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 27410 metalu, 995474 kryształów.
- dzień 4, 18:15 — TOI-843 j: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 18:45 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 19:00 — TOI-843 f: budowa megakonstruktu (wydobyte dotąd: 5,8 mln metalu, 2,0 mln kryształów)
- dzień 4, 19:00 — TOI-843 f: megakonstrukt — brak przeszkód
- dzień 4, 21:00 — TOI-843 f: megakonstrukt działa
- dzień 4, 21:15 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 4, 21:30 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 4, 21:45 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 701398 metalu, 999156 kryształów.
- dzień 4, 22:30 — TOI-843 j: uruchomiono wielką fabrykę
- dzień 5, 08:00 — TOI-843 j: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 08:00 — TOI-843 j: pierwszy transport nadwyżki na Kepler-186 f
- dzień 5, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 5, 09:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 5, 09:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 5, 10:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 5, 10:15 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 5, 10:30 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 5, 11:45 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 13:15 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 5, 13:30 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 5, 16:45 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 17:30 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 5, 18:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 6, 08:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 6, 08:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 469141 metalu, 927085 kryształów.
- dzień 6, 17:00 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 37,5 mln metalu, 1,5 mln kryształów)
- dzień 6, 17:00 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 6, 18:45 — TOI-843 d: megakonstrukt działa
- dzień 7, 08:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 34,8 mln metalu, 1,4 mln kryształów)
- dzień 7, 08:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 7, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 7, 08:00 — TOI-843 f: wydobyto 25% złóż
- dzień 7, 09:45 — Kepler-186 f: wydobyto 50% złóż
- dzień 7, 10:00 — TOI-843 c: megakonstrukt działa
- dzień 7, 23:00 — TOI-843 c: wydobyto 25% złóż
- dzień 8, 09:30 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 30,1 mln metalu, 1,4 mln kryształów)
- dzień 8, 09:30 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 8, 11:00 — TOI-843 b: megakonstrukt działa
- dzień 9, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 9, 15:45 — TOI-843 d: wydobyto 50% złóż
- dzień 9, 17:15 — TOI-843 f: wydobyto 50% złóż
- dzień 10, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 11, 09:00 — TOI-843 j: wydobyto 25% złóż
- dzień 11, 11:15 — TOI-843 c: wydobyto 50% złóż
- dzień 12, 08:00 — TOI-843 b: wydobyto 50% złóż
- dzień 12, 18:45 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 b
- dzień 12, 18:45 — TOI-843 d: wydobyto 80% złóż
- dzień 12, 19:45 — TOI-843 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 12, 19:45 — Stocznia: zamówiono statek kolonizacyjny
- dzień 12, 19:45 — TOI-843 f: wydobyto 80% złóż
- dzień 12, 19:45 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 180,17 mln | 0 / 6,75 mln | 40 / 19 / 39 / 33 / 10 | 11,6 d |
| TOI-843 b | 87/131 | 0 / 147,06 mln | 0 / 6,75 mln | 40 / 19 / 33 / 32 / 10 | 15,4 d |
| TOI-843 c | 87/124 | 2,74 mln / 149,27 mln | 1,25 mln / 6,75 mln | 40 / 19 / 32 / 31 / 10 | 11,5 d |
| TOI-843 d | 60/103 | 170,60 mln / 172,90 mln | 5,75 mln / 6,00 mln | 29 / 13 / 19 / 17 / 10 | 1,1 d |

<details><summary>Oś czasu</summary>

- dzień 1, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 17:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 20:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 14:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 14:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 20:00 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 3, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 14:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 14:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 3, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 17:00 — Budowa stoczni
- dzień 4, 08:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 11:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 17:00 — Kepler-186 f: megakonstrukt — Najpierw zbadaj „Megastruktury” (Badania → Produktywność).
- dzień 6, 17:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 21,0 mln metalu, 1,6 mln kryształów)
- dzień 6, 17:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 6, 20:00 — Kepler-186 f: megakonstrukt działa
- dzień 8, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 10, 14:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 10, 14:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 10, 17:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 10, 17:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 10, 17:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 11, 11:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 12, 17:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 12, 17:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 12, 20:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 13, 08:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 13, 08:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 13, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 13, 11:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 13, 11:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 13, 14:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 13, 17:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 13, 20:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 14, 14:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 14, 17:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 15, 11:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 15, 20:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 728431 kryształów.
- dzień 17, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 17, 17:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 27,7 mln metalu, 1,3 mln kryształów)
- dzień 17, 17:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 17, 20:00 — TOI-843 b: megakonstrukt działa
- dzień 18, 14:00 — TOI-843 b: wydobyto 25% złóż
- dzień 21, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 21, 17:00 — TOI-843 b: wydobyto 50% złóż
- dzień 21, 20:00 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 21, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 21, 20:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 22, 14:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 23, 20:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 23, 20:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 24, 08:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 24, 11:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 24, 14:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 24, 14:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 24, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 24, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 25, 11:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 25, 14:00 — TOI-843 b: wydobyto 80% złóż
- dzień 25, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 26, 08:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 26, 11:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 27, 11:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 749903 kryształów.
- dzień 29, 11:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 33,0 mln metalu, 1,3 mln kryształów)
- dzień 29, 11:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 29, 14:00 — TOI-843 c: megakonstrukt działa
- dzień 30, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 30, 17:00 — TOI-843 b: wydobyto 100% złóż
- dzień 33, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 33, 17:00 — TOI-843 c: wydobyto 50% złóż
- dzień 33, 20:00 — TOI-843 d: pierwszy transport nadwyżki na Kepler-186 f
- dzień 33, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 33, 20:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 34, 14:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 35, 20:00 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 35, 20:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 36, 08:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 36, 11:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 36, 14:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 36, 14:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 36, 17:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 36, 20:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 37, 11:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 37, 20:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 38, 08:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 38, 08:00 — Transport niemożliwy: Wszystkie transportowce są w drodze (3) — poczekaj, aż któryś wróci, albo zbuduj kolejny (Imperium → Flota).
- dzień 38, 08:00 — TOI-843 c: wydobyto 80% złóż
- dzień 38, 08:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 180,17 mln | 0 / 6,75 mln | 40 / 19 / 39 / 33 / 10 | 11,6 d |
| TOI-843 b | 87/131 | 3,58 mln / 147,06 mln | 1,04 mln / 6,75 mln | 40 / 19 / 34 / 34 / 10 | 11,6 d |
| TOI-843 c | 87/124 | 33,83 mln / 149,27 mln | 2,02 mln / 6,75 mln | 40 / 19 / 35 / 26 / 10 | 8,6 d |
| TOI-843 d | 87/116 | 30,43 mln / 194,51 mln | 1,33 mln / 6,75 mln | 40 / 19 / 34 / 34 / 10 | 8,6 d |
| TOI-843 f | 115/163 | 40,06 mln / 106,67 mln | 28,05 mln / 45,38 mln | 40 / 40 / 40 / 30 / 10 | 7,1 d |
| TOI-843 j | 99/286 | 30,78 mln / 37,80 mln | 43,00 mln / 73,58 mln | 19 / 40 / 40 / 25 / 10 | 4,8 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 11:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 17:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 20:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 20:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 14:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 14:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 20:00 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 3, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 3, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 11:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 11:00 — Budowa stoczni
- dzień 3, 14:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 14:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 14:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 14:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 3, 14:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 17:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 3, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 20:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 3, 20:00 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 3, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 20:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 4, 08:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 08:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 4, 11:00 — TOI-843 d: pierwszy transport nadwyżki na Kepler-186 f
- dzień 4, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 4, 11:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 4, 14:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 4, 14:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 14:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 4, 17:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 17:00 — TOI-843 f: pierwszy transport nadwyżki na Kepler-186 f
- dzień 4, 17:00 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 4, 20:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 4, 20:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 5, 08:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 5, 08:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 5, 08:00 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 5, 08:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 5, 11:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 11:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 5, 11:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 5, 11:00 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 5, 14:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 14:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 5, 14:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 5, 14:00 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 5, 17:00 — Kepler-186 f: megakonstrukt — Najpierw zbadaj „Megastruktury” (Badania → Produktywność).
- dzień 5, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 5, 20:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 6, 08:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 6, 08:00 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 6, 11:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 6, 11:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 6, 17:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 21,0 mln metalu, 1,6 mln kryształów)
- dzień 6, 17:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 6, 17:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 729867 kryształów.
- dzień 6, 17:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 6, 17:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 6, 20:00 — Kepler-186 f: megakonstrukt działa
- dzień 6, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 6, 20:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 6, 20:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 6, 20:00 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 7, 08:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 7, 14:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 7, 17:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 7, 17:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 7, 20:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 823544 kryształów.
- dzień 7, 20:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 7, 20:00 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 7, 20:00 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 8, 08:00 — TOI-843 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 8, 08:00 — TOI-843 j: pierwszy transport nadwyżki na TOI-843 b
- dzień 8, 08:00 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 8, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 8, 14:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 29,8 mln metalu, 1,4 mln kryształów)
- dzień 8, 14:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 8, 14:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 8, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 8, 17:00 — TOI-843 b: megakonstrukt działa
- dzień 8, 17:00 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 9, 08:00 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 9, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 9, 20:00 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 699292 kryształów.
- dzień 9, 20:00 — TOI-843 f: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 9, 20:00 — TOI-843 f: uruchomiono wielką fabrykę
- dzień 10, 08:00 — TOI-843 j: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 10, 08:00 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 11:00 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 10, 14:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 6,5 mln metalu, 1,4 mln kryształów)
- dzień 10, 14:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 10, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 14:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 10, 17:00 — TOI-843 c: megakonstrukt działa
- dzień 10, 20:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 10, 20:00 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 11, 08:00 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 36,0 mln metalu, 1,5 mln kryształów)
- dzień 11, 08:00 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 11, 11:00 — TOI-843 d: megakonstrukt działa
- dzień 11, 11:00 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 11, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 11, 17:00 — TOI-843 j: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 12, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 12, 11:00 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 12, 11:00 — TOI-843 b: wydobyto 50% złóż
- dzień 12, 14:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 12, 14:00 — TOI-843 j: uruchomiono wielką fabrykę
- dzień 12, 14:00 — TOI-843 c: wydobyto 25% złóż
- dzień 13, 08:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 13, 08:00 — TOI-843 j: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 13, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 13, 17:00 — TOI-843 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 14, 08:00 — TOI-843 f: budowa megakonstruktu (wydobyte dotąd: 11,7 mln metalu, 4,0 mln kryształów)
- dzień 14, 08:00 — TOI-843 f: megakonstrukt — brak przeszkód
- dzień 14, 08:00 — TOI-843 d: wydobyto 50% złóż
- dzień 14, 11:00 — TOI-843 f: megakonstrukt działa
- dzień 15, 08:00 — TOI-843 c: wydobyto 50% złóż
- dzień 16, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 16, 08:00 — TOI-843 f: wydobyto 25% złóż
- dzień 17, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 17, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 17, 11:00 — TOI-843 d: wydobyto 80% złóż
- dzień 17, 11:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

