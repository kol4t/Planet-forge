# Symulacja pętli MVP (etap 1)

Wygenerowano skryptem `npm run simulate` (limit 120 dni czasu gry). **To symulacja „rozsądnego gracza”, nie prawdziwa rozgrywka** — wskazówka do strojenia, nie wyrok. Gra nie została zmieniona. **Wnioski:** `docs/status.md`, punkt 8.

**Gracz w symulacji:** przy każdej wizycie na każdej planecie zaczyna najtańsze dostępne badanie (bez antymaterii), buduje według potrzeb (energia → magazyn → tańsza kopalnia → laboratorium do połowy poziomu kopalń) z kolejką, planety wyeksploatowane albo z pełnym magazynem wysyłają nadwyżkę transportowcami tam, gdzie jest miejsce, kolonizuje wolne planety własnego układu statkiem (od v0.53: koszt, paliwo z antymaterii, lot ok. 2 min); każdy lot płaci paliwo. Nie używa „Ukończ teraz”, specjalizacji, kompleksów, asteroid ani komet. Warunek końca: 3 planety z ≥ 80% wydobytych złóż metalu **i** kryształów.

| Profil gracza | Strategia kolonii | Wyeksploatowane planety | Czas | 1. planeta ≥ 80% | Planet założonych | Najdłuższy przestój planety | Transporty | Loty wstrzymane — brak paliwa | Antymateria na koniec | Najczęstsza blokada budowy |
|---|---|---|---|---|---|---|---|---|---|---|
| Aktywny (co 15 min, 8:00–24:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 5,0 d | 1,6 d | 4 | 10,5 h (TOI-843 c) | 115 | 140 | 4 | brak pól (537×) |
| Aktywny (co 15 min, 8:00–24:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 3,6 d | 1,5 d | 6 | 12,0 h (TOI-843 b) | 76 | 190 | 0 | brak surowców (441×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 26,4 d | 9,5 d | 4 | — | 116 | 0 | 409 | brak surowców (79×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 22,5 d | 9,5 d | 6 | — | 114 | 0 | 345 | brak surowców (80×) |

## Aktywny (co 15 min, 8:00–24:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 116/160 | 0 / 2,58 mln | 0 / 1,22 mln | 21 / 19 / 22 / 15 / 1 | 1,2 d |
| TOI-843 b | 120/131 | 0 / 2,66 mln | 0 / 1,06 mln | 23 / 20 / 19 / 14 / 10 | 1,3 d |
| TOI-843 c | 111/124 | 432 tys. / 2,20 mln | 137 tys. / 811 tys. | 21 / 19 / 19 / 14 / 0 | 0,7 d |
| TOI-843 d | 0/116 | 2,95 mln / 2,95 mln | 1,06 mln / 1,06 mln | 1 / 1 / 1 / 1 / 0 | 0,0 d |

<details><summary>Oś czasu</summary>

- dzień 1, 10:30 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 12:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 13:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 14:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 17:15 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 18:15 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 18:30 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 19:45 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 08:30 — Kepler-186 f: wydobyto 25% złóż
- dzień 2, 09:45 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 14:15 — Kepler-186 f: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 14:30 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 2, 14:30 — Kepler-186 f: wydobyto 50% złóż
- dzień 2, 14:45 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 2, 17:30 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 19:45 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 20:30 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 21:15 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 2, 21:15 — Kepler-186 f: wydobyto 80% złóż
- dzień 3, 08:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 08:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 3, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 3, 08:45 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 09:45 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 10:30 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 15:15 — TOI-843 b: wydobyto 25% złóż
- dzień 3, 16:00 — TOI-843 b: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 3, 22:00 — TOI-843 b: wydobyto 50% złóż
- dzień 4, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 4, 10:30 — TOI-843 b: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 4, 13:15 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 4, 13:30 — Budowa stacji macierzystej (pod stocznię)
- dzień 4, 13:45 — Budowa stoczni
- dzień 4, 13:45 — TOI-843 b: wydobyto 100% złóż
- dzień 4, 14:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 4, 14:15 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 4, 14:30 — Stocznia: zamówiono statek kolonizacyjny
- dzień 4, 14:30 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 4, 16:15 — TOI-843 b: pierwszy transport nadwyżki na TOI-843 c
- dzień 4, 17:15 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 19:00 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 4, 19:45 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 4, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 20:15 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 5, 08:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 08:45 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 5, 09:15 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 5, 09:45 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 15:30 — TOI-843 c: wydobyto 25% złóż
- dzień 5, 17:30 — TOI-843 c: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 5, 22:45 — TOI-843 c: wydobyto 50% złóż
- dzień 6, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 6, 08:15 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 6, 08:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 6, 08:15 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 6, 08:15 — TOI-843 c: wydobyto 80% złóż
- dzień 6, 08:15 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Aktywny (co 15 min, 8:00–24:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 117/160 | 0 / 2,58 mln | 0 / 1,22 mln | 21 / 19 / 22 / 15 / 1 | 1,2 d |
| TOI-843 b | 120/131 | 0 / 2,66 mln | 0 / 1,06 mln | 22 / 19 / 21 / 14 / 9 | 1,6 d |
| TOI-843 c | 76/124 | 1,17 mln / 2,64 mln | 384 tys. / 973 tys. | 21 / 19 / 15 / 12 / 9 | 0,4 d |
| TOI-843 d | 116/116 | 146 tys. / 2,95 mln | 209 tys. / 1,06 mln | 22 / 19 / 21 / 16 / 0 | 0,4 d |
| TOI-843 f | 113/163 | 660 tys. / 2,85 mln | 891 tys. / 1,73 mln | 21 / 18 / 22 / 14 / 0 | 0,4 d |
| TOI-843 j | 69/302 | 801 tys. / 1,37 mln | 1,04 mln / 1,33 mln | 18 / 15 / 18 / 11 / 0 | 0,3 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 08:15 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 10:30 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 11:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 12:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 13:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:15 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:30 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 14:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 14:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 17:15 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 18:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 18:15 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 18:30 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 19:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 19:15 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 19:45 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 19:45 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 23:45 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 2, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 2, 08:30 — Kepler-186 f: wydobyto 25% złóż
- dzień 2, 09:45 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 10:30 — TOI-843 b: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 13:00 — TOI-843 b: wydobyto 50% złóż
- dzień 2, 14:15 — Kepler-186 f: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 14:30 — Kepler-186 f: wydobyto 50% złóż
- dzień 2, 20:15 — TOI-843 b: wydobyto 80% złóż
- dzień 2, 21:15 — Kepler-186 f: wydobyto 80% złóż
- dzień 3, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 3, 08:00 — TOI-843 b: wydobyto 100% złóż
- dzień 3, 09:15 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 09:30 — Budowa stacji macierzystej (pod stocznię)
- dzień 3, 09:45 — Budowa stoczni
- dzień 3, 10:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 10:15 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 3, 10:30 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 10:30 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 3, 10:45 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 3, 11:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 11:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 3, 11:15 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 3, 11:30 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 3, 11:45 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 3, 12:15 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 c
- dzień 3, 12:15 — TOI-843 b: pierwszy transport nadwyżki na TOI-843 c
- dzień 3, 12:30 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 d
- dzień 3, 13:15 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 13:15 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 c
- dzień 3, 13:30 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 14:30 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 15:15 — Stocznia: zamówiono statek kolonizacyjny
- dzień 3, 15:30 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 3, 15:45 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 15:45 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 3, 16:00 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 16:15 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 16:30 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 16:30 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 16:45 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 16:45 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 17:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 17:30 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 17:45 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 3, 18:45 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 19:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 19:15 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 20:00 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 3, 20:30 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 20:45 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 3, 21:15 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 21:15 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 21:15 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 3, 21:30 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 21:45 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 22:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 22:15 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 22:15 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 22:30 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 23:15 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 08:00 — TOI-843 f: pierwszy transport nadwyżki na TOI-843 d
- dzień 4, 08:00 — Transport niemożliwy: Wszystkie transportowce są w drodze (3) — poczekaj, aż któryś wróci, albo zbuduj kolejny (Imperium → Flota).
- dzień 4, 09:15 — TOI-843 j: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 09:45 — TOI-843 j: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 4, 10:00 — TOI-843 c: wydobyto 25% złóż
- dzień 4, 10:00 — TOI-843 d: wydobyto 25% złóż
- dzień 4, 11:00 — TOI-843 c: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 4, 11:15 — TOI-843 j: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 11:30 — TOI-843 d: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 4, 13:30 — TOI-843 f: wydobyto 25% złóż
- dzień 4, 13:45 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 4, 13:45 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 14:15 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 4, 15:45 — TOI-843 d: wydobyto 50% złóż
- dzień 4, 16:30 — TOI-843 c: wydobyto 50% złóż
- dzień 4, 17:15 — TOI-843 f: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 4, 22:30 — TOI-843 d: wydobyto 80% złóż
- dzień 4, 22:30 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 98/160 | 0 / 3,10 mln | 0 / 1,47 mln | 14 / 15 / 24 / 18 / 7 | 0,0 d |
| TOI-843 b | 95/131 | 0 / 2,66 mln | 0 / 1,06 mln | 15 / 14 / 23 / 18 / 6 | 0,0 d |
| TOI-843 c | 51/124 | 187 tys. / 2,20 mln | 162 tys. / 811 tys. | 12 / 11 / 11 / 18 / 0 | 0,0 d |
| TOI-843 d | 7/116 | 2,94 mln / 2,95 mln | 1,05 mln / 1,06 mln | 1 / 1 / 1 / 6 / 0 | 0,0 d |

<details><summary>Oś czasu</summary>

- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 17:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 14:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 08:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 17:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 9, 11:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 9, 11:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 9, 14:00 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 9, 14:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 9, 17:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 14:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 10, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 20:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 11, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 12, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 13, 08:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 13, 08:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 13, 11:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 13, 14:00 — Budowa stoczni
- dzień 13, 17:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 13, 17:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 14, 11:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 14, 17:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 14, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 15, 14:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 15, 20:00 — TOI-843 b: wydobyto 25% złóż
- dzień 17, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 17, 17:00 — TOI-843 b: wydobyto 50% złóż
- dzień 17, 20:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 17, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 17, 20:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 18, 17:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 19, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 19, 11:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 19, 14:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 19, 14:00 — TOI-843 b: pierwszy transport nadwyżki na TOI-843 c
- dzień 20, 08:00 — TOI-843 b: wydobyto 100% złóż
- dzień 21, 08:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 21, 08:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 21, 11:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 22, 20:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 23, 11:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 23, 14:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 23, 17:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 24, 14:00 — TOI-843 c: wydobyto 25% złóż
- dzień 26, 11:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 26, 11:00 — TOI-843 c: wydobyto 50% złóż
- dzień 26, 14:00 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 c
- dzień 26, 14:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 26, 14:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 27, 11:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 27, 14:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 27, 17:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 27, 17:00 — TOI-843 c: wydobyto 80% złóż
- dzień 27, 17:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 98/160 | 0 / 3,10 mln | 0 / 1,47 mln | 14 / 15 / 24 / 18 / 7 | 0,0 d |
| TOI-843 b | 97/131 | 0 / 2,66 mln | 0 / 1,06 mln | 15 / 16 / 23 / 18 / 6 | 0,0 d |
| TOI-843 c | 39/124 | 242 tys. / 2,20 mln | 151 tys. / 811 tys. | 12 / 11 / 11 / 18 / 0 | 0,0 d |
| TOI-843 d | 45/116 | 354 tys. / 2,95 mln | 282 tys. / 1,06 mln | 12 / 10 / 10 / 18 / 0 | 0,0 d |
| TOI-843 f | 44/163 | 892 tys. / 2,85 mln | 963 tys. / 1,73 mln | 11 / 9 / 11 / 17 / 0 | 0,0 d |
| TOI-843 j | 26/302 | 1,14 mln / 1,37 mln | 1,11 mln / 1,33 mln | 6 / 5 / 7 / 13 / 0 | 0,0 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 11:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 11:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 20:00 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 4, 17:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 17:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 14:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 17:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 08:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 08:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 7, 17:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 7, 17:00 — TOI-843 b: wydobyto 25% złóż
- dzień 9, 11:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 9, 14:00 — TOI-843 b: wydobyto 50% złóż
- dzień 9, 17:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 14:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 20:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 10, 20:00 — TOI-843 b: wydobyto 80% złóż
- dzień 11, 08:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 11, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 12, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 12, 08:00 — TOI-843 b: wydobyto 100% złóż
- dzień 13, 08:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 13, 08:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 13, 11:00 — Budowa stacji macierzystej (pod stocznię)
- dzień 13, 14:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 13, 14:00 — Budowa stoczni
- dzień 13, 17:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 13, 20:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 14, 08:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 14, 08:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 14, 11:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 14, 11:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 14, 14:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 14, 14:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 14, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 14, 20:00 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 15, 08:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 15, 08:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 15, 11:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 c
- dzień 15, 11:00 — TOI-843 b: pierwszy transport nadwyżki na TOI-843 c
- dzień 15, 11:00 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 c
- dzień 15, 14:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 15, 20:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 d
- dzień 15, 20:00 — Transport niemożliwy: Wszystkie transportowce są w drodze (3) — poczekaj, aż któryś wróci, albo zbuduj kolejny (Imperium → Flota).
- dzień 16, 08:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 16, 08:00 — TOI-843 f: pierwszy transport nadwyżki na TOI-843 c
- dzień 17, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 17, 17:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 17, 20:00 — Stocznia: zamówiono statek kolonizacyjny
- dzień 18, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 j (3 antymaterii paliwa)
- dzień 18, 11:00 — TOI-843 j: pierwszy transport nadwyżki na TOI-843 d
- dzień 18, 11:00 — Nowa kolonia: TOI-843 j — planeta nr 6
- dzień 18, 20:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 19, 11:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 19, 14:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 19, 17:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 19, 17:00 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 19, 17:00 — TOI-843 j: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 19, 20:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 20, 08:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 20, 11:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 20, 11:00 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 20, 17:00 — TOI-843 c: wydobyto 25% złóż
- dzień 20, 20:00 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 21, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 22, 11:00 — TOI-843 c: wydobyto 50% złóż
- dzień 22, 11:00 — TOI-843 f: wydobyto 25% złóż
- dzień 22, 17:00 — TOI-843 j: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 22, 20:00 — TOI-843 j: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 22, 20:00 — TOI-843 d: wydobyto 50% złóż
- dzień 23, 11:00 — TOI-843 j: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 23, 14:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 23, 17:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 23, 20:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 23, 20:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 23, 20:00 — TOI-843 j: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 23, 20:00 — TOI-843 c: wydobyto 80% złóż
- dzień 23, 20:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

