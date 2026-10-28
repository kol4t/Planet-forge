# Symulacja pętli MVP (etap 1)

Wygenerowano skryptem `npm run simulate` (limit 120 dni czasu gry). **To symulacja „rozsądnego gracza”, nie prawdziwa rozgrywka** — wskazówka do strojenia, nie wyrok. Gra nie została zmieniona. **Wnioski:** `docs/status.md`, punkt 8.

**Gracz w symulacji:** przy każdej wizycie na każdej planecie zaczyna najtańsze dostępne badanie (bez antymaterii), buduje według potrzeb (energia → magazyn → tańsza kopalnia → laboratorium do połowy poziomu kopalń) z kolejką, planety wyeksploatowane albo z pełnym magazynem wysyłają nadwyżkę transportowcami tam, gdzie jest miejsce, kolonizuje wolne planety własnego układu (bez statku). Nie używa „Ukończ teraz”, specjalizacji, kompleksów, asteroid ani komet. Warunek końca: 3 planety z ≥ 80% wydobytych złóż metalu **i** kryształów.

| Profil gracza | Strategia kolonii | Wyeksploatowane planety | Czas | 1. planeta ≥ 80% | Planet założonych | Najdłuższy przestój planety | Transporty | Antymateria na koniec | Najczęstsza blokada budowy |
|---|---|---|---|---|---|---|---|---|---|
| Aktywny (co 15 min, 8:00–24:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 4,3 d | 1,5 d | 4 | 11,3 h (Kepler-186 f) | 221 | 119 | brak pól (470×) |
| Aktywny (co 15 min, 8:00–24:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 1,5 d | 1,3 d | 6 | 8,8 h (Kepler-186 f) | 62 | 41 | za mały magazyn (172×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte) | 3 / 3 | 26,0 d | 9,5 d | 4 | — | 118 | 590 | brak surowców (80×) |
| Okazjonalny (co 3 h, 8:00–23:00) | Chciwy (kolonizuje, gdy tylko może) | 3 / 3 | 9,5 d | 9,3 d | 5 | — | 0 | 197 | brak pól (4×) |

## Aktywny (co 15 min, 8:00–24:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 116/160 | 0 / 2,58 mln | 0 / 1,22 mln | 21 / 19 / 22 / 14 / 1 | 1,2 d |
| TOI-843 b | 118/131 | 0 / 2,66 mln | 0 / 1,06 mln | 22 / 20 / 19 / 14 / 10 | 0,8 d |
| TOI-843 c | 117/124 | 0 / 2,20 mln | 156 tys. / 811 tys. | 22 / 19 / 21 / 14 / 3 | 0,3 d |
| TOI-843 d | 27/116 | 2,89 mln / 2,95 mln | 1,04 mln / 1,06 mln | 7 / 7 / 7 / 10 / 0 | 0,0 d |

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
- dzień 2, 14:30 — Nowa kolonia: TOI-843 b (1:16:1) — planeta nr 2
- dzień 2, 14:30 — Kepler-186 f: wydobyto 50% złóż
- dzień 2, 17:15 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 19:30 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 2, 19:45 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 2, 20:15 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 2, 21:00 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 2, 21:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 2, 22:15 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 3, 08:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 3, 08:15 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 3, 08:30 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 3, 09:30 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 3, 10:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 3, 14:45 — TOI-843 b: wydobyto 25% złóż
- dzień 3, 15:45 — TOI-843 b: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 3, 21:30 — Nowa kolonia: TOI-843 c (1:16:2) — planeta nr 3
- dzień 3, 21:30 — TOI-843 b: wydobyto 50% złóż
- dzień 4, 08:00 — TOI-843 b: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 4, 08:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 08:00 — TOI-843 b: wydobyto 80% złóż
- dzień 4, 08:15 — TOI-843 b: pierwszy transport nadwyżki na TOI-843 c
- dzień 4, 09:00 — TOI-843 b: wydobyto 100% złóż
- dzień 4, 09:45 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 4, 11:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 4, 11:15 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 4, 11:30 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 4, 13:15 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 16:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 4, 16:30 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 4, 17:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 4, 23:00 — TOI-843 c: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 5, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 5, 08:30 — TOI-843 c: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 5, 08:30 — Nowa kolonia: TOI-843 d (1:16:3) — planeta nr 4
- dzień 5, 08:30 — TOI-843 c: wydobyto 50% złóż
- dzień 5, 11:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 5, 11:45 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 c
- dzień 5, 13:30 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 5, 14:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 5, 14:15 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 5, 15:30 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 d
- dzień 5, 15:30 — TOI-843 c: wydobyto 80% złóż
- dzień 5, 15:30 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Aktywny (co 15 min, 8:00–24:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 68/160 | 0 / 2,58 mln | 241 tys. / 1,22 mln | 22 / 19 / 22 / 14 / 0 | 0,8 d |
| TOI-843 b | 5/131 | 0 / 2,22 mln | 0 / 887 tys. | 22 / 20 / 18 / 14 / 6 | 0,4 d |
| TOI-843 c | 70/124 | 1,38 mln / 2,64 mln | 386 tys. / 973 tys. | 20 / 17 / 19 / 11 / 8 | 0,8 d |
| TOI-843 d | 115/116 | 0 / 2,95 mln | 0 / 1,06 mln | 22 / 19 / 21 / 15 / 8 | 0,3 d |
| TOI-843 f | 115/163 | 1,11 mln / 2,85 mln | 934 tys. / 1,73 mln | 21 / 18 / 20 / 12 / 9 | 0,4 d |
| TOI-843 j | 8/302 | 1,36 mln / 1,37 mln | 1,33 mln / 1,33 mln | 3 / 2 / 3 / 4 / 0 | 0,0 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Nowa kolonia: TOI-843 b (1:16:1) — planeta nr 2
- dzień 1, 08:15 — Nowa kolonia: TOI-843 c (1:16:2) — planeta nr 3
- dzień 1, 08:30 — Nowa kolonia: TOI-843 d (1:16:3) — planeta nr 4
- dzień 1, 08:45 — Nowa kolonia: TOI-843 f (1:16:5) — planeta nr 5
- dzień 1, 10:30 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 10:45 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 11:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 11:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 11:15 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 1, 11:45 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 1, 12:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 12:45 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 13:15 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:15 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:15 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 13:30 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 13:30 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 13:45 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 13:45 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 14:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 14:15 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 14:15 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 1, 14:15 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 1, 14:45 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 1, 17:15 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 17:30 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 17:30 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 18:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 18:15 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 18:15 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 18:30 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 18:30 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 1, 18:30 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 18:45 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 19:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 19:15 — TOI-843 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 1, 19:30 — TOI-843 c: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 19:45 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 19:45 — TOI-843 d: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 1, 20:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 20:00 — TOI-843 d: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 1, 20:30 — TOI-843 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 2, 08:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 2, 08:00 — TOI-843 b: wydobyto 25% złóż
- dzień 2, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 2, 08:15 — Kepler-186 f: wydobyto 25% złóż
- dzień 2, 09:00 — TOI-843 b: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 09:15 — TOI-843 d: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 09:15 — TOI-843 c: wydobyto 25% złóż
- dzień 2, 09:30 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 10:45 — TOI-843 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 11:15 — TOI-843 b: wydobyto 50% złóż
- dzień 2, 11:15 — TOI-843 d: wydobyto 50% złóż
- dzień 2, 12:15 — Kepler-186 f: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 12:30 — TOI-843 c: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 12:45 — TOI-843 f: wydobyto 25% złóż
- dzień 2, 13:15 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 2, 13:45 — TOI-843 f: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 14:15 — Kepler-186 f: wydobyto 50% złóż
- dzień 2, 15:45 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 b
- dzień 2, 16:00 — TOI-843 d: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 2, 16:15 — TOI-843 b: pierwszy transport nadwyżki na Kepler-186 f
- dzień 2, 16:15 — TOI-843 b: wydobyto 80% złóż
- dzień 2, 16:15 — TOI-843 d: wydobyto 80% złóż
- dzień 2, 16:30 — TOI-843 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 16:30 — Transport niemożliwy: W drodze jest już 3 transportowców (limit 3). Poczekaj, aż któryś dotrze.
- dzień 2, 17:15 — TOI-843 c: Kopalnia metalu — etap „Megakompleks metalowy” (poz. 20) zlecony
- dzień 2, 17:30 — TOI-843 f: pierwszy transport nadwyżki na Kepler-186 f
- dzień 2, 17:45 — TOI-843 c: wydobyto 50% złóż
- dzień 2, 18:15 — Nowa kolonia: TOI-843 j (1:16:9) — planeta nr 6
- dzień 2, 18:45 — TOI-843 b: Ekstraktor kryształów — etap „Megaodkrywka” (poz. 20) zlecony
- dzień 2, 18:45 — TOI-843 d: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 20:00 — TOI-843 b: wydobyto 100% złóż
- dzień 2, 20:15 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 2, 20:30 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 f
- dzień 2, 20:30 — Kepler-186 f: wydobyto 80% złóż
- dzień 2, 20:30 — TOI-843 d: wydobyto 100% złóż
- dzień 2, 20:30 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Pętla (nowa kolonia, gdy ostatnia ma ≥ 50% wydobyte)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 94/160 | 0 / 3,10 mln | 0 / 1,47 mln | 13 / 13 / 24 / 18 / 6 | 0,0 d |
| TOI-843 b | 93/131 | 0 / 2,66 mln | 0 / 1,06 mln | 13 / 14 / 23 / 18 / 6 | 0,0 d |
| TOI-843 c | 45/124 | 74 tys. / 2,20 mln | 157 tys. / 811 tys. | 12 / 10 / 11 / 18 / 0 | 0,0 d |
| TOI-843 d | 7/116 | 2,94 mln / 2,95 mln | 1,05 mln / 1,06 mln | 1 / 1 / 1 / 6 / 0 | 0,0 d |

<details><summary>Oś czasu</summary>

- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 17:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 14:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 14:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 08:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 17:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 9, 11:00 — Nowa kolonia: TOI-843 b (1:16:1) — planeta nr 2
- dzień 9, 11:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 9, 17:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 08:00 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 10, 11:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 10, 20:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 20:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 11, 11:00 — Kepler-186 f: wydobyto 100% złóż
- dzień 12, 17:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 12, 17:00 — Kepler-186 f: pierwszy transport nadwyżki na TOI-843 b
- dzień 13, 14:00 — Kepler-186 f: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 14, 14:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 14, 17:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 15, 08:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 15, 20:00 — TOI-843 b: wydobyto 25% złóż
- dzień 16, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 17, 08:00 — Kepler-186 f: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 17, 14:00 — Nowa kolonia: TOI-843 c (1:16:2) — planeta nr 3
- dzień 17, 14:00 — TOI-843 b: wydobyto 50% złóż
- dzień 18, 11:00 — TOI-843 c: pierwszy transport nadwyżki na TOI-843 b
- dzień 18, 14:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 18, 20:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 18, 20:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 18, 20:00 — TOI-843 b: pierwszy transport nadwyżki na TOI-843 c
- dzień 18, 20:00 — TOI-843 b: wydobyto 80% złóż
- dzień 19, 14:00 — TOI-843 b: wydobyto 100% złóż
- dzień 20, 14:00 — TOI-843 b: Laboratorium — etap „Laboratorium” (poz. 6) zlecony
- dzień 20, 17:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 20, 20:00 — TOI-843 b: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 22, 14:00 — TOI-843 b: Elektrownia — etap „Reaktor antymaterii” (poz. 20) zlecony
- dzień 22, 17:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 23, 08:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 23, 11:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 24, 08:00 — TOI-843 c: wydobyto 25% złóż
- dzień 25, 20:00 — Nowa kolonia: TOI-843 d (1:16:3) — planeta nr 4
- dzień 25, 20:00 — TOI-843 c: wydobyto 50% złóż
- dzień 26, 17:00 — TOI-843 d: pierwszy transport nadwyżki na TOI-843 c
- dzień 26, 20:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 26, 20:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 27, 08:00 — TOI-843 c: wydobyto 80% złóż
- dzień 27, 08:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

## Okazjonalny (co 3 h, 8:00–23:00) · Chciwy (kolonizuje, gdy tylko może)

| Planeta | Pola | Złoże metalu (zostało / było) | Złoże kryształów | Poziomy (metal / kryształy / energia / magazyn / lab.) | Czas bez budowy |
|---|---|---|---|---|---|
| Kepler-186 f | 12/102 | 0 / 2,58 mln | 193 tys. / 1,22 mln | 11 / 11 / 13 / 18 / 0 | 0,0 d |
| TOI-843 b | 5/113 | 0 / 2,22 mln | 59 tys. / 887 tys. | 12 / 13 / 9 / 18 / 0 | 0,0 d |
| TOI-843 c | 16/112 | 0 / 2,20 mln | 136 tys. / 811 tys. | 12 / 11 / 10 / 18 / 0 | 0,0 d |
| TOI-843 d | 38/110 | 904 tys. / 2,95 mln | 282 tys. / 1,06 mln | 12 / 10 / 11 / 17 / 0 | 0,0 d |
| TOI-843 f | 45/146 | 876 tys. / 2,85 mln | 918 tys. / 1,73 mln | 11 / 9 / 12 / 17 / 0 | 0,0 d |

<details><summary>Oś czasu</summary>

- dzień 1, 08:00 — Nowa kolonia: TOI-843 b (1:16:1) — planeta nr 2
- dzień 1, 11:00 — Nowa kolonia: TOI-843 c (1:16:2) — planeta nr 3
- dzień 1, 14:00 — Nowa kolonia: TOI-843 d (1:16:3) — planeta nr 4
- dzień 1, 17:00 — Nowa kolonia: TOI-843 f (1:16:5) — planeta nr 5
- dzień 2, 08:00 — Kepler-186 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 08:00 — TOI-843 b: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 11:00 — TOI-843 c: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 11:00 — Transport niemożliwy: Najpierw zbadaj „Transportowce” (Badania → Flota).
- dzień 2, 14:00 — TOI-843 d: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 2, 20:00 — TOI-843 f: Magazyn — etap „Magazyn” (poz. 6) zlecony
- dzień 4, 17:00 — Kepler-186 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 17:00 — TOI-843 d: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 20:00 — TOI-843 b: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 4, 20:00 — TOI-843 c: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 08:00 — TOI-843 f: Magazyn — etap „Terminal magazynowy” (poz. 12) zlecony
- dzień 5, 14:00 — Kepler-186 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 5, 20:00 — TOI-843 b: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 11:00 — TOI-843 b: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 c: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 14:00 — TOI-843 f: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 17:00 — Kepler-186 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 6, 17:00 — TOI-843 c: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 6, 20:00 — Kepler-186 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 6, 20:00 — TOI-843 c: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 6, 20:00 — TOI-843 d: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 08:00 — TOI-843 d: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 11:00 — TOI-843 b: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 7, 11:00 — TOI-843 d: Elektrownia — etap „Generator fuzyjny” (poz. 6) zlecony
- dzień 7, 11:00 — TOI-843 b: wydobyto 25% złóż
- dzień 7, 14:00 — TOI-843 f: Kopalnia metalu — etap „Zakład przetwórczy” (poz. 6) zlecony
- dzień 7, 14:00 — Kepler-186 f: wydobyto 25% złóż
- dzień 7, 17:00 — TOI-843 f: Ekstraktor kryształów — etap „Szyb wiertniczy” (poz. 6) zlecony
- dzień 7, 17:00 — TOI-843 c: wydobyto 25% złóż
- dzień 8, 08:00 — TOI-843 d: wydobyto 25% złóż
- dzień 9, 08:00 — TOI-843 b: wydobyto 50% złóż
- dzień 9, 08:00 — TOI-843 f: wydobyto 25% złóż
- dzień 9, 11:00 — Kepler-186 f: wydobyto 50% złóż
- dzień 9, 14:00 — TOI-843 c: wydobyto 50% złóż
- dzień 9, 17:00 — Kepler-186 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 9, 17:00 — TOI-843 d: wydobyto 50% złóż
- dzień 10, 08:00 — TOI-843 b: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 14:00 — TOI-843 b: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 14:00 — TOI-843 c: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 14:00 — TOI-843 d: Kopalnia metalu — etap „Huta” (poz. 12) zlecony
- dzień 10, 14:00 — TOI-843 f: Elektrownia — etap „Elektrownia jądrowa” (poz. 12) zlecony
- dzień 10, 14:00 — TOI-843 b: wydobyto 80% złóż
- dzień 10, 20:00 — Kepler-186 f: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 20:00 — TOI-843 c: Ekstraktor kryształów — etap „Odkrywka” (poz. 12) zlecony
- dzień 10, 20:00 — Kepler-186 f: wydobyto 80% złóż
- dzień 10, 20:00 — TOI-843 c: wydobyto 80% złóż
- dzień 10, 20:00 — PĘTLA ZAMKNIĘTA: 3 planety z ≥ 80% wydobytych złóż

</details>

