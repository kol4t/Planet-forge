# Plan wstępnej ekonomii (etap 10) — do akceptacji właściciela

Stan: 2026-11-01, wersja gry v0.64.0. Liczby poniżej są **propozycją**. Zmienię je w grze dopiero po akceptacji,
a po zmianie sprawdzę je symulacją (`npm run simulate`).

## Decyzje właściciela (2026-11-01)

- **Główny motyw planety: jeden megakonstrukt.** Złoża planety wystarczają na rozwój i **jeden megakonstrukt**
  (metalu albo kryształów — zależnie od złóż). Konstrukt wydobywa potem przez **ok. tydzień**.
- **3 rodzaje złóż:** dużo metalu, dużo kryształów, po równo.
- **Pierwsza planeta** wystarcza na: kolonię, stację macierzystą i jeden megakonstrukt. Potem gracz sam wybiera:
  - przenoszenie megakonstruktów;
  - rozwój stacji macierzystej;
  - (później) walka o przestrzeń i handel.
- **Pętla (3 wyeksploatowane planety) dla gracza, który zagląda co kilka godzin: ok. miesiąc.**
- **Kolejka budowy: dłuższa** (3 miejsca na planetę).
- **Antymateria: bez zmian.**
- Zakres MVP: produkcja, pętla, flota.

## Co pokazała symulacja v0.64 (przed zmianami)

| Gracz | Pętla zamknięta | 1. planeta ≥ 80% |
|---|---|---|
| Aktywny (co 15 min), „pętla” | 7,5 dnia | 1,6 dnia |
| Aktywny, „chciwy” | 4,0 dnia | 1,6 dnia |
| Okazjonalny (co 3 h), „pętla” | 26,5 dnia | 9,5 dnia |
| Okazjonalny, „chciwy” | 22,0 dnia | 9,4 dnia |

- **Planeta wyczerpuje się przy kopalniach na poz. ~20.**
  - Osady, megakonstrukt i jego przenoszenie wymagają poz. 40.
  - Poz. 40 kosztuje dziś ok. 440 mln metalu, a złoże planety to 2–3 mln.
  - Wniosek: **megakonstrukt jest dziś nieosiągalny** w zwykłej grze.
- **Przyczyna:** koszt rośnie o 50% na poziom (`costGrowth` 1,5), a wydobycie o ok. 10% (`levelGrowth` 1,1).
- **Martwy punkt (poprawiony w symulatorze, nie w grze):**
  - Ostatnia kolonia miała pełny magazyn, a obok nie było wolnego pola na rozbudowę.
  - Symulowany gracz nie wywoził wtedy nadwyżki na planety wyeksploatowane, więc przebieg utknął na 120 dni.
  - W grze gracz może to zrobić sam (transport, stacja).

## Proponowane zmiany (do akceptacji)

1. **Rodzaj złóż planety** (bez zmiany generatora — z istniejącej „zasobności” planety):
   - **„dużo metalu”**, **„dużo kryształów”** albo **„po równo”**;
   - plakietka na karcie planety i w Geologii.
2. **Wielkość złóż = rozwój + tydzień megakonstruktu.**
   - Złoże głównego surowca ≈ to, co wydobędzie się podczas rozwoju do poz. 40, plus **7 dni pracy megakonstruktu**.
   - Drugi surowiec w ilości potrzebnej na budowę.
   - Planeta „po równo” — oba złoża średnie, konstrukt dowolny.
3. **Łagodniejsze krzywe:**
   - koszt poziomu rośnie ok. **×1,2** zamiast ×1,5;
   - wydobycie ok. **×1,05** na poziom zamiast ×1,1;
   - poz. 40 staje się osiągalny w kilka dni, a konstrukt nie wydobywa setek milionów na godzinę.
4. **Megakonstrukt jako duży wydatek:** koszt budowy rośnie z 60 tys. / 40 tys. do wartości dopasowanej do nowych
   złóż (rząd kilku milionów); czas budowy bez zmian (1–2 h).
5. **Kryształy:** do czasu własnego konstruktu kryształów rolę „megakonstruktu kryształów” pełni megakompleks
   Ekstraktora (Megaodkrywka) — z tą samą zasadą złóż.
6. **Kolejka budowy: 3 miejsca** (było 1).
7. **Antymateria: bez zmian.**

## Docelowy rytm (do sprawdzenia symulacją po zmianach)

| Gracz | Rozwój planety do poz. 40 i konstruktu | Praca konstruktu | Pętla (3 planety) |
|---|---|---|---|
| Okazjonalny (co 3 h) | ok. 3 dni | ok. 7 dni | **ok. miesiąc** |
| Aktywny (co 15 min) | ok. 1–1,5 dnia | ok. 7 dni | ok. 3 tygodnie |

Tydzień pracy konstruktu jest taki sam dla obu graczy. Aktywność skraca tylko rozwój. Przeniesienie konstruktu na
nową planetę (orbita) skraca kolejne planety — dla gracza, który to wykorzysta.

## Po akceptacji — kolejność prac

1. Krzywe, złoża i koszt konstruktu w `src/data/balance.ts`; rodzaj złóż (core + plakietka).
2. Kolejka 3 miejsca.
3. Symulacja całej pętli i dostrojenie liczb do tabeli wyżej.
4. Testy, dokumentacja (`BALANCE.md`, decyzje), raport z symulacji.

**Uwaga o zapisach:** zmiana złóż i krzywych działa także na istniejące zapisy. Wydobyte ilości zostają, a zmienia się
całe złoże. Planeta „wyeksploatowana” wg starych liczb zostaje oznaczona (lista w zapisie), ale jej nowe złoże będzie
większe.
