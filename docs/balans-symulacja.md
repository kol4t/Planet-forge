# Symulacja pętli MVP (etap 1)

Wygenerowano skryptem `npm run simulate` (limit 120 dni czasu gry). **To symulacja „rozsądnego gracza”, nie prawdziwa rozgrywka** — wskazówka do strojenia, nie wyrok. Gra nie została zmieniona. **Wnioski:** `docs/status.md`, punkt 8.

**Gracz w symulacji:** przy każdej wizycie na każdej planecie zaczyna najtańsze dostępne badanie (bez antymaterii), buduje według potrzeb (energia → magazyn → tańsza kopalnia → laboratorium do połowy poziomu kopalń) z kolejką, planety wyeksploatowane albo z pełnym magazynem wysyłają nadwyżkę transportowcami tam, gdzie jest miejsce, kolonizuje wolne planety własnego układu statkiem (od v0.53: koszt, paliwo z antymaterii, lot ok. 2 min); każdy lot płaci paliwo. Nie używa „Ukończ teraz”, specjalizacji, kompleksów, asteroid ani komet. Warunek końca: 3 planety z ≥ 80% wydobytych złóż metalu **i** kryształów.

| Profil gracza | Strategia kolonii | Wyeksploatowane planety | Czas | 1. planeta ≥ 80% | Planet założonych | Najdłuższy przestój planety | Transporty | Loty wstrzymane — brak paliwa | Antymateria na koniec | Najczęstsza blokada budowy |
|---|---|---|---|---|---|---|---|---|---|---|
| Aktywny (co 15 min, 8:00–24:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 30,0 d | 10,5 d | 4 | 288,0 h (TOI-843 b) | 1330 | 649 | 33 | maks. poziom (1834×) |
| Aktywny (co 15 min, 8:00–24:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 12,0 d | 10,0 d | 6 | 179,0 h (TOI-843 b) | 314 | 259 | 182 | maks. poziom (3486×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 37,0 d | 12,0 d | 4 | 306,0 h (TOI-843 b) | 207 | 0 | 1398 | maks. poziom (150×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 17,5 d | 12,5 d | 6 | 228,0 h (TOI-843 b) | 77 | 0 | 568 | maks. poziom (263×) |

## Aktywny (co 15 min, 8:00–24:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 159,83 mln | 0 / 6,75 mln | 40 / 19 / 40 / 28 / 10 | 9,3 d |
| TOI-843 b | 87/131 | 0 / 131,45 mln | 0 / 6,75 mln | 40 / 19 / 31 / 31 / 10 | 13,2 d |
| TOI-843 c | 87/124 | 0 / 133,34 mln | 1,29 mln / 6,75 mln | 40 / 19 / 33 / 30 / 10 | 10,1 d |
| TOI-843 d | 83/110 | 140,48 mln / 172,13 mln | 5,50 mln / 6,75 mln | 39 / 19 / 36 / 24 / 10 | 0,6 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:45 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 10:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 11:00 — Przewodnik: wykonany krok 1 — Rozbuduj Kopalnię metalu do poz. 3
- dzień 1, 11:00 — Przewodnik: wykonany krok 2 — Rozbuduj Elektrownię do poz. 3
- dzień 1, 18:15 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 1, 18:15 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 18:45 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 19:30 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 19:30 — Przewodnik: wykonany krok 3 — Rozbuduj Ekstraktor kryształów do poz. 3
- dzień 1, 19:30 — Przewodnik: wykonany krok 4 — Rozbuduj Magazyn do poz. 4
- dzień 1, 19:30 — Przewodnik: wykonany krok 5 — Obejrzyj swój układ
- dzień 1, 19:30 — Przewodnik: wykonany krok 6 — Zbuduj Laboratorium i zbadaj pierwszą technologię
- dzień 1, 20:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 20:00 — Przewodnik: wykonany krok 7 — Rozbuduj Kopalnię metalu do poz. 10
- dzień 1, 22:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 1, 23:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 08:00 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 2, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 2, 08:15 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 2, 08:15 — Budowa stoczni
- dzień 2, 08:15 — Przewodnik: wykonany krok 8 — Zbadaj „Metalurgię przemysłową”
- dzień 2, 08:15 — Przewodnik: wykonany krok 9 — Uruchom wielką fabrykę
- dzień 2, 08:15 — Przewodnik: wykonany krok 10 — Zbadaj „Moduł orbitalny”
- dzień 2, 08:15 — Przewodnik: wykonany krok 11 — Zbuduj stację macierzystą
- dzień 2, 10:30 — Przewodnik: wykonany krok 12 — Rozbuduj Kopalnię metalu do poz. 20
- dzień 2, 12:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 2, 16:30 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 22:45 — Przewodnik: wykonany krok 13 — Zbadaj „Megastruktury”
- dzień 6, 08:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 21,8 mln metalu, 2,3 mln kryształów)
- dzień 6, 08:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 6, 08:00 — Przewodnik: wykonany krok 14 — Kopalnia metalu poz. 40 — komplet osad
- dzień 6, 09:15 — Kepler-186 f: megakonstrukt działa
- dzień 6, 09:15 — Przewodnik: wykonany krok 15 — Zbuduj megakonstrukt
- dzień 7, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 9, 09:30 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 9, 09:30 — Kepler-186 f: wydobyto 50% złóż
- dzień 9, 09:45 — Stocznia: zamówiono statek kolonizacyjny
- dzień 9, 09:45 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 9, 09:45 — Przewodnik: wykonany krok 16 — Załóż drugą kolonię
- dzień 9, 10:30 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 9, 11:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 9, 11:00 — Przewodnik: wykonany krok 17 — Wyślij transport surowców
- dzień 9, 11:30 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 9, 11:45 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 9, 14:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 9, 14:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 9, 14:45 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 9, 15:30 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 9, 15:30 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 9, 16:45 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 9, 18:30 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 9, 21:45 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 9, 22:45 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 08:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 11, 20:30 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 11, 20:30 — Kepler-186 f: wydobyto 80% złóż
- dzień 11, 20:30 — Przewodnik: wykonany krok 18 — Wyeksploatuj pierwszą planetę (80% złóż)
- dzień 12, 13:45 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 212578 kryształów.
- dzień 12, 19:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 22,2 mln metalu, 1,0 mln kryształów)
- dzień 12, 19:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 12, 20:30 — TOI-843 b: megakonstrukt działa
- dzień 14, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 15, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 17, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 17, 08:00 — TOI-843 b: wydobyto 50% złóż
- dzień 17, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 17, 08:15 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 17, 09:15 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 17, 09:30 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 18, 08:15 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 18, 10:15 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 18, 11:30 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 18, 11:45 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 18, 12:15 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 18, 13:30 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 18, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 18, 17:45 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 18, 20:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 18, 22:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 19, 08:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 19, 08:45 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 21, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 21, 16:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 500819 kryształów.
- dzień 22, 13:15 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 31,0 mln metalu, 1,3 mln kryształów)
- dzień 22, 13:15 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 22, 15:15 — TOI-843 c: megakonstrukt działa
- dzień 23, 08:45 — TOI-843 c: wydobyto 25% złóż
- dzień 23, 20:45 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 26, 08:00 — TOI-843 b: wydobyto 100% złóż
- dzień 26, 21:15 — TOI-843 c: wydobyto 50% złóż
- dzień 27, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 27, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 27, 08:15 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 27, 09:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 27, 09:15 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 b
- dzień 27, 14:15 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 27, 15:45 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 27, 17:30 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 27, 17:45 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 27, 18:15 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 27, 18:45 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 27, 19:30 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 28, 08:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 28, 08:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 28, 12:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 28, 15:30 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 28, 19:45 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 31, 08:00 — TOI-843 c: wydobyto 80% złóż
- dzień 31, 08:00 — Przewodnik: wykonany krok 19 — Imperium gwiezdne: trzy wyeksploatowane planety
- dzień 31, 08:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Aktywny (co 15 min, 8:00–24:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 11,22 mln / 159,83 mln | 0 / 6,75 mln | 40 / 19 / 40 / 29 / 10 | 7,4 d |
| TOI-843 b | 87/131 | 11,60 mln / 131,45 mln | 1,71 mln / 6,75 mln | 40 / 19 / 34 / 26 / 10 | 8,5 d |
| TOI-843 c | 87/124 | 17,71 mln / 133,34 mln | 2,48 mln / 6,75 mln | 40 / 19 / 31 / 31 / 10 | 7,0 d |
| TOI-843 d | 87/116 | 14,01 mln / 172,13 mln | 1,14 mln / 6,75 mln | 40 / 19 / 30 / 29 / 10 | 7,2 d |
| TOI-843 f | 115/163 | 0 / 96,83 mln | 7,70 mln / 39,86 mln | 40 / 40 / 40 / 29 / 10 | 4,7 d |
| TOI-843 j | 99/286 | 24,33 mln / 37,80 mln | 12,15 mln / 64,03 mln | 19 / 40 / 40 / 29 / 10 | 6,2 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 08:15 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 08:45 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 09:15 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 09:15 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 1, 10:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 11:00 — Przewodnik: wykonany krok 1 — Rozbuduj Kopalnię metalu do poz. 3
- dzień 1, 11:00 — Przewodnik: wykonany krok 2 — Rozbuduj Elektrownię do poz. 3
- dzień 1, 14:30 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 1, 20:45 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 1, 20:45 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 21:15 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 22:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 22:00 — Przewodnik: wykonany krok 3 — Rozbuduj Ekstraktor kryształów do poz. 3
- dzień 1, 22:00 — Przewodnik: wykonany krok 4 — Rozbuduj Magazyn do poz. 4
- dzień 1, 22:00 — Przewodnik: wykonany krok 5 — Obejrzyj swój układ
- dzień 1, 22:00 — Przewodnik: wykonany krok 6 — Zbuduj Laboratorium i zbadaj pierwszą technologię
- dzień 1, 22:30 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 22:30 — Przewodnik: wykonany krok 7 — Rozbuduj Kopalnię metalu do poz. 10
- dzień 1, 23:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 2, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 2, 08:15 — Kepler-186 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 2, 08:15 — Kepler-186 f: uruchomiono wielką fabrykę
- dzień 2, 08:15 — Budowa stoczni
- dzień 2, 08:15 — Przewodnik: wykonany krok 8 — Zbadaj „Metalurgię przemysłową”
- dzień 2, 08:15 — Przewodnik: wykonany krok 9 — Uruchom wielką fabrykę
- dzień 2, 08:15 — Przewodnik: wykonany krok 10 — Zbadaj „Moduł orbitalny”
- dzień 2, 08:15 — Przewodnik: wykonany krok 11 — Zbuduj stację macierzystą
- dzień 2, 08:30 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 08:45 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 2, 09:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 09:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 2, 09:15 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 2, 09:15 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 2, 09:30 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 2, 09:45 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 10:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 10:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 2, 10:15 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 10:15 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 2, 10:30 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 10:30 — Przewodnik: wykonany krok 12 — Rozbuduj Kopalnię metalu do poz. 20
- dzień 2, 10:45 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 10:45 — Stocznia: zamówiono statek kolonizacyjny
- dzień 2, 11:00 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 2, 11:15 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 2, 11:45 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 11:45 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 11:45 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 12:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 12:00 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 12:00 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 2, 12:15 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 12:45 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 13:45 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 13:45 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 14:15 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 14:30 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 14:30 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 14:30 — TOI-843 d: pierwszy transport nadwyżki na Kepler-186 f
- dzień 2, 15:00 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 15:15 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 15:30 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 15:45 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 15:45 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 16:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 16:00 — TOI-843 j: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 16:30 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 16:30 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 17:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 2, 17:00 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 17:45 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 18:00 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 18:00 — TOI-843 f: uruchomiono wielką fabrykę
- dzień 2, 18:15 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 18:45 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 2, 19:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 19:15 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 19:15 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 19:15 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 19:45 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 20:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 20:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 2, 20:15 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 2, 20:15 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 20:30 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 20:45 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 21:00 — TOI-843 j: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 2, 21:30 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 21:30 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 22:30 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 23:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 08:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 08:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 08:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 3, 08:00 — TOI-843 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 3, 08:00 — TOI-843 j: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 08:00 — TOI-843 f: pierwszy transport nadwyżki na Kepler-186 f
- dzień 3, 08:45 — TOI-843 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 08:45 — TOI-843 j: pierwszy transport nadwyżki na Kepler-186 f
- dzień 3, 08:45 — Przewodnik: wykonany krok 13 — Zbadaj „Megastruktury”
- dzień 3, 09:15 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 09:45 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 3, 10:15 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 11:15 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 12:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 3, 14:45 — TOI-843 j: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 3, 16:15 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 16:30 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 16:30 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 19:45 — TOI-843 j: uruchomiono wielką fabrykę
- dzień 3, 20:30 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 20:45 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 3, 21:45 — TOI-843 f: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 3, 22:15 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 08:30 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 08:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 21,9 mln metalu, 1,5 mln kryształów)
- dzień 5, 08:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 5, 08:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 543092 kryształów.
- dzień 5, 08:00 — Przewodnik: wykonany krok 14 — Kopalnia metalu poz. 40 — komplet osad
- dzień 5, 09:15 — Kepler-186 f: megakonstrukt działa
- dzień 5, 09:15 — Przewodnik: wykonany krok 15 — Zbuduj megakonstrukt
- dzień 5, 09:15 — Przewodnik: wykonany krok 16 — Załóż drugą kolonię
- dzień 5, 09:15 — Przewodnik: wykonany krok 17 — Wyślij transport surowców
- dzień 5, 18:30 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 536703 kryształów.
- dzień 6, 08:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 24,8 mln metalu, 1,4 mln kryształów)
- dzień 6, 08:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 6, 08:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 516248 kryształów.
- dzień 6, 09:30 — TOI-843 b: megakonstrukt działa
- dzień 6, 12:45 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 27,2 mln metalu, 1,4 mln kryształów)
- dzień 6, 12:45 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 6, 14:30 — TOI-843 d: megakonstrukt działa
- dzień 6, 17:30 — Kepler-186 f: wydobyto 25% złóż
- dzień 6, 22:45 — TOI-843 b: wydobyto 25% złóż
- dzień 7, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 7, 09:45 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 30,8 mln metalu, 1,4 mln kryształów)
- dzień 7, 09:45 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 7, 11:45 — TOI-843 c: megakonstrukt działa
- dzień 7, 20:30 — TOI-843 f: wydobyto 25% złóż
- dzień 7, 23:15 — TOI-843 c: wydobyto 25% złóż
- dzień 8, 09:15 — TOI-843 f: budowa megakonstruktu (wydobyte dotąd: 35,3 mln metalu, 12,1 mln kryształów)
- dzień 8, 09:15 — TOI-843 f: megakonstrukt — brak przeszkód
- dzień 8, 11:15 — TOI-843 f: megakonstrukt działa
- dzień 8, 18:30 — Kepler-186 f: wydobyto 50% złóż
- dzień 9, 13:15 — TOI-843 d: wydobyto 50% złóż
- dzień 10, 08:00 — TOI-843 b: wydobyto 50% złóż
- dzień 10, 08:00 — TOI-843 f: wydobyto 50% złóż
- dzień 10, 16:45 — TOI-843 j: wydobyto 25% złóż
- dzień 11, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 11, 08:00 — Przewodnik: wykonany krok 18 — Wyeksploatuj pierwszą planetę (80% złóż)
- dzień 11, 11:30 — TOI-843 c: wydobyto 50% złóż
- dzień 12, 16:15 — TOI-843 d: wydobyto 80% złóż
- dzień 13, 08:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 13, 08:00 — TOI-843 f: wydobyto 80% złóż
- dzień 13, 08:00 — Przewodnik: wykonany krok 19 — Imperium gwiezdne: trzy wyeksploatowane planety
- dzień 13, 08:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 159,83 mln | 0 / 6,75 mln | 40 / 19 / 40 / 30 / 10 | 8,5 d |
| TOI-843 b | 87/131 | 0 / 131,45 mln | 0 / 6,75 mln | 40 / 19 / 30 / 29 / 10 | 13,8 d |
| TOI-843 c | 87/124 | 0 / 133,34 mln | 1,23 mln / 6,75 mln | 40 / 19 / 35 / 31 / 10 | 10,4 d |
| TOI-843 d | 59/103 | 150,70 mln / 153,00 mln | 5,77 mln / 6,00 mln | 29 / 12 / 19 / 17 / 10 | 1,1 d |

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
- dzień 4, 20:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 08:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 6, 17:00 — Przewodnik: wykonany krok 13 — Zbadaj „Megastruktury”
- dzień 7, 08:00 — Kepler-186 f: megakonstrukt — Megakonstrukt — brakuje: 95085 kryształów.
- dzień 7, 08:00 — Przewodnik: wykonany krok 14 — Kopalnia metalu poz. 40 — komplet osad
- dzień 7, 14:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 19,7 mln metalu, 1,3 mln kryształów)
- dzień 7, 14:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 7, 17:00 — Kepler-186 f: megakonstrukt działa
- dzień 7, 17:00 — Przewodnik: wykonany krok 15 — Zbuduj megakonstrukt
- dzień 8, 17:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 10, 20:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 10, 20:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 11, 08:00 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 11, 08:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 11, 08:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 11, 08:00 — Przewodnik: wykonany krok 16 — Załóż drugą kolonię
- dzień 11, 08:00 — Przewodnik: wykonany krok 17 — Wyślij transport surowców
- dzień 11, 14:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 11, 17:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 11, 20:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 12, 08:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 12, 14:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 12, 14:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 12, 17:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 12, 17:00 — TOI-843 b: uruchomiono wielką fabrykę
- dzień 12, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 13, 08:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 13, 08:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 13, 08:00 — Przewodnik: wykonany krok 18 — Wyeksploatuj pierwszą planetę (80% złóż)
- dzień 13, 14:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 13, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 14, 08:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 14, 11:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 16, 08:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 367812 kryształów.
- dzień 16, 14:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 17, 08:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 23,6 mln metalu, 1,2 mln kryształów)
- dzień 17, 08:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 17, 11:00 — TOI-843 b: megakonstrukt działa
- dzień 18, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 21, 11:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 21, 11:00 — TOI-843 b: wydobyto 50% złóż
- dzień 21, 14:00 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 21, 14:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 21, 14:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 22, 08:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 23, 14:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 23, 14:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 23, 17:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 23, 20:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 24, 08:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 24, 08:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 24, 11:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 24, 14:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 25, 08:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 25, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 25, 14:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 25, 17:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 26, 08:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 28, 14:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 391245 kryształów.
- dzień 29, 11:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 32,2 mln metalu, 1,4 mln kryształów)
- dzień 29, 11:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 29, 14:00 — TOI-843 c: megakonstrukt działa
- dzień 30, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 30, 11:00 — TOI-843 b: wydobyto 100% złóż
- dzień 33, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 33, 17:00 — TOI-843 c: wydobyto 50% złóż
- dzień 33, 20:00 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 c
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
- dzień 38, 08:00 — Przewodnik: wykonany krok 19 — Imperium gwiezdne: trzy wyeksploatowane planety
- dzień 38, 08:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 87/160 | 0 / 159,83 mln | 0 / 6,75 mln | 40 / 19 / 40 / 31 / 10 | 9,3 d |
| TOI-843 b | 87/131 | 0 / 131,45 mln | 767 tys. / 6,75 mln | 40 / 19 / 30 / 29 / 10 | 10,9 d |
| TOI-843 c | 87/124 | 9,44 mln / 133,34 mln | 2,05 mln / 6,75 mln | 40 / 19 / 37 / 33 / 10 | 6,9 d |
| TOI-843 d | 87/116 | 18,88 mln / 172,13 mln | 1,32 mln / 6,75 mln | 40 / 19 / 31 / 33 / 10 | 6,6 d |
| TOI-843 f | 115/163 | 36,74 mln / 96,83 mln | 24,07 mln / 39,86 mln | 40 / 40 / 40 / 25 / 10 | 4,4 d |
| TOI-843 j | 99/286 | 29,44 mln / 37,80 mln | 34,95 mln / 64,03 mln | 19 / 40 / 39 / 27 / 10 | 4,0 d |

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
- dzień 4, 08:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 08:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 4, 08:00 — Przewodnik: wykonany krok 11 — Zbuduj stację macierzystą
- dzień 4, 08:00 — Przewodnik: wykonany krok 12 — Rozbuduj Kopalnię metalu do poz. 20
- dzień 4, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 11:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 11:00 — Budowa stoczni
- dzień 4, 14:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 14:00 — TOI-843 b: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 4, 14:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 4, 17:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 4, 20:00 — Kepler-186 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 4, 20:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 4, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 4, 20:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 5, 08:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 5, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 5, 11:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 11:00 — TOI-843 d: pierwszy transport nadwyżki na Kepler-186 f
- dzień 5, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 5, 11:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 5, 14:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 5, 14:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 5, 17:00 — TOI-843 b: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 5, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 17:00 — TOI-843 f: pierwszy transport nadwyżki na Kepler-186 f
- dzień 5, 17:00 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 5, 20:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 5, 20:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 08:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 6, 08:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 08:00 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 6, 11:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 6, 11:00 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 6, 14:00 — TOI-843 c: uruchomiono wielką fabrykę
- dzień 6, 14:00 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 17:00 — Przewodnik: wykonany krok 13 — Zbadaj „Megastruktury”
- dzień 6, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 6, 20:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 7, 08:00 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 7, 11:00 — TOI-843 c: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 7, 11:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 7, 14:00 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 7, 14:00 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 7, 14:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 7, 14:00 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 7, 17:00 — Kepler-186 f: budowa megakonstruktu (wydobyte dotąd: 15,0 mln metalu, 1,3 mln kryształów)
- dzień 7, 17:00 — Kepler-186 f: megakonstrukt — brak przeszkód
- dzień 7, 17:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 7, 17:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 7, 17:00 — Przewodnik: wykonany krok 14 — Kopalnia metalu poz. 40 — komplet osad
- dzień 7, 20:00 — Kepler-186 f: megakonstrukt działa
- dzień 7, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 7, 20:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 20:00 — TOI-843 d: uruchomiono wielką fabrykę
- dzień 7, 20:00 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 7, 20:00 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 7, 20:00 — Przewodnik: wykonany krok 15 — Zbuduj megakonstrukt
- dzień 7, 20:00 — Przewodnik: wykonany krok 16 — Załóż drugą kolonię
- dzień 7, 20:00 — Przewodnik: wykonany krok 17 — Wyślij transport surowców
- dzień 8, 08:00 — TOI-843 b: megakonstrukt — Megakonstrukt — brakuje: 78274 kryształów.
- dzień 8, 08:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 8, 08:00 — TOI-843 j: pierwszy transport nadwyżki na Kepler-186 f
- dzień 8, 08:00 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 8, 14:00 — TOI-843 b: budowa megakonstruktu (wydobyte dotąd: 22,4 mln metalu, 1,2 mln kryształów)
- dzień 8, 14:00 — TOI-843 b: megakonstrukt — brak przeszkód
- dzień 8, 14:00 — TOI-843 d: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 8, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 8, 17:00 — TOI-843 b: megakonstrukt działa
- dzień 8, 17:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 8, 17:00 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 8, 20:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 8, 20:00 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 9, 08:00 — TOI-843 c: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 9, 08:00 — TOI-843 f: Kopalnia metalu — etap „Kombinat metalowy” (poz. 20) zlecony
- dzień 9, 08:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 9, 14:00 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 9, 14:00 — TOI-843 b: wydobyto 25% złóż
- dzień 9, 17:00 — TOI-843 f: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 9, 17:00 — TOI-843 f: uruchomiono wielką fabrykę
- dzień 10, 08:00 — TOI-843 j: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 10, 08:00 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 11:00 — TOI-843 c: megakonstrukt — Megakonstrukt — brakuje: 581122 kryształów.
- dzień 10, 11:00 — TOI-843 d: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 10, 11:00 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 10, 14:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 10, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 20:00 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 11, 08:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 11, 11:00 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 11, 14:00 — TOI-843 j: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 11, 17:00 — TOI-843 j: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 12, 08:00 — TOI-843 c: budowa megakonstruktu (wydobyte dotąd: 38,1 mln metalu, 1,6 mln kryształów)
- dzień 12, 08:00 — TOI-843 c: megakonstrukt — brak przeszkód
- dzień 12, 08:00 — TOI-843 d: megakonstrukt — Megakonstrukt — brakuje: 77403 kryształów.
- dzień 12, 08:00 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 12, 11:00 — TOI-843 c: megakonstrukt działa
- dzień 12, 11:00 — TOI-843 j: uruchomiono wielką fabrykę
- dzień 12, 14:00 — TOI-843 d: budowa megakonstruktu (wydobyte dotąd: 29,5 mln metalu, 1,4 mln kryształów)
- dzień 12, 14:00 — TOI-843 d: megakonstrukt — brak przeszkód
- dzień 12, 14:00 — TOI-843 c: wydobyto 25% złóż
- dzień 12, 17:00 — TOI-843 d: megakonstrukt działa
- dzień 12, 20:00 — TOI-843 b: wydobyto 50% złóż
- dzień 13, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 13, 17:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 13, 20:00 — TOI-843 j: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 13, 20:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 13, 20:00 — Przewodnik: wykonany krok 18 — Wyeksploatuj pierwszą planetę (80% złóż)
- dzień 15, 08:00 — TOI-843 f: Magazyn — etap „Megaskład” (poz. 20) zlecony
- dzień 15, 08:00 — TOI-843 f: megakonstrukt — Megakonstrukt — brakuje: 1786391 metalu.
- dzień 15, 17:00 — TOI-843 f: budowa megakonstruktu (wydobyte dotąd: 5,4 mln metalu, 3,3 mln kryształów)
- dzień 15, 17:00 — TOI-843 f: megakonstrukt — brak przeszkód
- dzień 15, 17:00 — TOI-843 d: wydobyto 50% złóż
- dzień 15, 20:00 — TOI-843 f: megakonstrukt działa
- dzień 16, 08:00 — TOI-843 c: wydobyto 50% złóż
- dzień 16, 17:00 — TOI-843 b: wydobyto 80% złóż
- dzień 17, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 17, 11:00 — TOI-843 f: wydobyto 25% złóż
- dzień 18, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 18, 20:00 — TOI-843 d: wydobyto 80% złóż
- dzień 18, 20:00 — Przewodnik: wykonany krok 19 — Imperium gwiezdne: trzy wyeksploatowane planety
- dzień 18, 20:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

