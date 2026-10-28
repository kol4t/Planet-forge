# Symulacja pętli MVP (etap 1)

Wygenerowano skryptem `npm run simulate` (limit 120 dni czasu gry). **To symulacja „rozsądnego gracza”, nie prawdziwa rozgrywka** — wskazówka do strojenia, nie wyrok. Gra nie została zmieniona. **Wnioski:** `docs/status.md`, punkt 8.

**Gracz w symulacji:** przy każdej wizycie na każdej planecie zaczyna najtańsze dostępne badanie (bez antymaterii), buduje według potrzeb (energia → magazyn → tańsza kopalnia → laboratorium do połowy poziomu kopalń) z kolejką, planety wyeksploatowane albo z pełnym magazynem wysyłają nadwyżkę transportowcami tam, gdzie jest miejsce, kolonizuje wolne planety własnego układu statkiem (od v0.53: koszt, paliwo z antymaterii, lot ok. 2 min); każdy lot płaci paliwo. Nie używa „Ukończ teraz”, specjalizacji, kompleksów, asteroid ani komet. Warunek końca: 3 planety z ≥ 80% wydobytych złóż metalu **i** kryształów.

| Profil gracza | Strategia kolonii | Wyeksploatowane planety | Czas | 1. planeta ≥ 80% | Planet założonych | Najdłuższy przestój planety | Transporty | Loty wstrzymane — brak paliwa | Antymateria na koniec | Najczęstsza blokada budowy |
|---|---|---|---|---|---|---|---|---|---|---|
| Aktywny (co 15 min, 8:00–24:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 4,4 d | 1,6 d | 3 | 9,5 h (Kepler-186 f) | 112 | 177 | 0 | brak pól (455×) |
| Aktywny (co 15 min, 8:00–24:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 2,0 d | 1,5 d | 5 | 11,8 h (TOI-843 c) | 41 | 26 | 0 | brak surowców (215×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 26,4 d | 9,5 d | 4 | — | 117 | 0 | 466 | brak surowców (77×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 10,5 d | 9,5 d | 5 | — | 0 | 0 | 204 | brak pól (5×) |

## Aktywny (co 15 min, 8:00–24:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 116/160 | 0 / 2,58 mln | 0 / 1,22 mln | 21 / 19 / 22 / 15 / 1 | 1,2 d |
| TOI-843 b | 120/131 | 0 / 2,66 mln | 0 / 1,06 mln | 23 / 20 / 19 / 14 / 10 | 1,3 d |
| TOI-843 c | 111/124 | 233 tys. / 2,20 mln | 158 tys. / 811 tys. | 21 / 19 / 20 / 14 / 0 | 0,7 d |

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
- dzień 3, 22:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 3, 22:00 — TOI-843 b: wydobyto 50% złóż
- dzień 3, 22:15 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 3, 23:15 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 4, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 4, 08:15 — TOI-843 b: pierwszy transport nadwyżki na TOI-843 c
- dzień 4, 08:45 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 10:45 — TOI-843 b: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 4, 11:30 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 4, 11:45 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 12:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 4, 13:15 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 4, 13:45 — TOI-843 b: wydobyto 100% złóż
- dzień 4, 16:15 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 16:30 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 4, 17:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 17:30 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 5, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 5, 08:45 — TOI-843 c: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 5, 10:30 — TOI-843 c: wydobyto 50% złóż
- dzień 5, 14:30 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 5, 17:45 — TOI-843 c: wydobyto 80% złóż
- dzień 5, 17:45 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Aktywny (co 15 min, 8:00–24:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 115/160 | 0 / 2,58 mln | 0 / 1,22 mln | 21 / 19 / 22 / 15 / 1 | 1,3 d |
| TOI-843 b | 96/131 | 0 / 2,22 mln | 0 / 887 tys. | 22 / 19 / 19 / 14 / 3 | 0,8 d |
| TOI-843 c | 93/124 | 1,00 mln / 2,64 mln | 162 tys. / 973 tys. | 21 / 18 / 19 / 12 / 9 | 0,8 d |
| TOI-843 d | 113/116 | 574 tys. / 2,95 mln | 67 tys. / 1,06 mln | 22 / 19 / 20 / 14 / 0 | 0,8 d |
| TOI-843 f | 113/163 | 1,39 mln / 2,85 mln | 1,05 mln / 1,73 mln | 20 / 18 / 20 / 12 / 9 | 0,3 d |

<details><summary>Oś czasu</summary>

- dzień 1, 10:15 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 1, 10:30 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 1, 11:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 11:15 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 1, 11:30 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 1, 11:45 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 12:15 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 1, 12:30 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 1, 13:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:15 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 13:45 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 14:15 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 15:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 15:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 15:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 1, 15:15 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 1, 15:15 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 1, 15:45 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 16:15 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 16:30 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 16:45 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 17:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 17:15 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 17:30 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 18:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 18:15 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 18:15 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 18:15 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 18:45 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 19:45 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 19:45 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 20:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 20:45 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 21:15 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 21:15 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 21:15 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 21:30 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 21:30 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 22:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 22:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 22:30 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 22:30 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 23:00 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 23:30 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 08:15 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 08:30 — Kepler-186 f: wydobyto 25% złóż
- dzień 2, 08:45 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 2, 09:30 — TOI-843 b: wydobyto 25% złóż
- dzień 2, 09:45 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 09:45 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 2, 10:30 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 10:45 — TOI-843 c: wydobyto 25% złóż
- dzień 2, 11:15 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 11:45 — TOI-843 b: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 12:15 — TOI-843 d: wydobyto 25% złóż
- dzień 2, 13:30 — TOI-843 c: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 14:15 — Kepler-186 f: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 14:15 — TOI-843 d: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 14:15 — Kepler-186 f: wydobyto 50% złóż
- dzień 2, 15:15 — TOI-843 b: wydobyto 50% złóż
- dzień 2, 16:45 — TOI-843 c: wydobyto 50% złóż
- dzień 2, 18:00 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 19:00 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 19:30 — TOI-843 c: pierwszy transport nadwyżki na Kepler-186 f
- dzień 2, 19:30 — TOI-843 d: pierwszy transport nadwyżki na Kepler-186 f
- dzień 2, 19:30 — TOI-843 d: wydobyto 50% złóż
- dzień 2, 20:30 — TOI-843 f: wydobyto 25% złóż
- dzień 2, 21:00 — TOI-843 f: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 21:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 c
- dzień 2, 21:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 2, 21:15 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 22:30 — TOI-843 b: pierwszy transport nadwyżki na TOI-843 f
- dzień 2, 22:30 — Transport niemożliwy: W drodze jest już 3 transportowców (limit 3). Poczekaj, aż któryś dotrze.
- dzień 2, 22:30 — TOI-843 b: wydobyto 80% złóż
- dzień 2, 23:15 — Transport niemożliwy: Brak paliwa: lot kosztuje 1 antymateria, brakuje 1 (antymateria przybywa co godzinę i z Kolektora antymaterii).
- dzień 2, 23:45 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 3, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 3, 08:00 — TOI-843 b: wydobyto 100% złóż
- dzień 3, 08:45 — TOI-843 d: wydobyto 80% złóż
- dzień 3, 08:45 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 99/160 | 0 / 3,10 mln | 0 / 1,47 mln | 15 / 15 / 24 / 18 / 7 | 0,0 d |
| TOI-843 b | 96/131 | 0 / 2,66 mln | 0 / 1,06 mln | 16 / 14 / 23 / 18 / 6 | 0,0 d |
| TOI-843 c | 51/124 | 183 tys. / 2,20 mln | 160 tys. / 811 tys. | 12 / 11 / 11 / 18 / 0 | 0,0 d |
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
- dzień 13, 14:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 14, 11:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 14, 17:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 14, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 15, 14:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 15, 20:00 — TOI-843 b: wydobyto 25% złóż
- dzień 17, 17:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 17, 17:00 — TOI-843 b: wydobyto 50% złóż
- dzień 17, 20:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
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
| Kepler-186 f | 62/119 | 0 / 2,58 mln | 18 tys. / 1,22 mln | 12 / 14 / 14 / 18 / 0 | 0,0 d |
| TOI-843 b | 5/113 | 0 / 2,22 mln | 130 tys. / 887 tys. | 13 / 11 / 10 / 18 / 0 | 0,0 d |
| TOI-843 c | 16/112 | 148 tys. / 2,20 mln | 149 tys. / 811 tys. | 12 / 11 / 10 / 18 / 0 | 0,0 d |
| TOI-843 d | 38/110 | 904 tys. / 2,95 mln | 282 tys. / 1,06 mln | 12 / 10 / 11 / 17 / 0 | 0,0 d |
| TOI-843 f | 45/146 | 876 tys. / 2,85 mln | 918 tys. / 1,73 mln | 11 / 9 / 12 / 17 / 0 | 0,0 d |

<details><summary>Oś czasu</summary>

- dzień 1, 20:00 — Statek kolonizacyjny wyrusza do TOI-843 b (3 antymaterii paliwa)
- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 08:00 — Statek kolonizacyjny wyrusza do TOI-843 c (3 antymaterii paliwa)
- dzień 2, 08:00 — Nowa kolonia: TOI-843 b — planeta nr 2
- dzień 2, 11:00 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 2, 11:00 — Statek kolonizacyjny wyrusza do TOI-843 d (3 antymaterii paliwa)
- dzień 2, 11:00 — Nowa kolonia: TOI-843 c — planeta nr 3
- dzień 2, 14:00 — Statek kolonizacyjny wyrusza do TOI-843 f (3 antymaterii paliwa)
- dzień 2, 14:00 — Nowa kolonia: TOI-843 d — planeta nr 4
- dzień 2, 17:00 — Nowa kolonia: TOI-843 f — planeta nr 5
- dzień 3, 08:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 11:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 14:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 3, 20:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 17:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 14:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 5, 17:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 20:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 20:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 6, 08:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 6, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 20:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 08:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 11:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 14:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 14:00 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 7, 17:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 17:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 7, 20:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 7, 20:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 8, 08:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 8, 11:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 8, 11:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 8, 11:00 — TOI-843 b: wydobyto 25% złóż
- dzień 8, 14:00 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 8, 17:00 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 8, 17:00 — TOI-843 c: wydobyto 25% złóż
- dzień 9, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 9, 11:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 9, 17:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 08:00 — TOI-843 b: wydobyto 50% złóż
- dzień 10, 08:00 — TOI-843 f: wydobyto 25% złóż
- dzień 10, 14:00 — TOI-843 c: wydobyto 50% złóż
- dzień 10, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 17:00 — TOI-843 d: wydobyto 50% złóż
- dzień 10, 20:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 20:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 11, 11:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 11, 14:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 11, 14:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 11, 14:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 11, 14:00 — TOI-843 b: wydobyto 80% złóż
- dzień 11, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 11, 20:00 — TOI-843 c: wydobyto 80% złóż
- dzień 11, 20:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

