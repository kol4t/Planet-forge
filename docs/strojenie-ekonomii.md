# Strojenie ekonomii przed MVP (2026-11-09)

Decyzje właściciela (2026-11-09): pętla **ok. miesiąca, wolniejszy start**; obszar Ekstraktora kryształów zostaje
**50 pól**; megakonstrukt na wyczerpanym złożu — **tylko ostrzeżenie**; zakres — wszystko (budynki, badania, antymateria
i flota, złoża i megakonstrukty). Narzędzie: `npm run simulate` (raport `docs/balans-symulacja.md`) — symulacja
„rozsądnego gracza”, nie prawdziwa gra.

## Zmiany

| Co | Było | Jest | Dlaczego |
|---|---|---|---|
| Czas budowy poziomu | 30 s × poziom (poz. 40 = 20 min) | 30 s × poziom × **1,07**^(poziom − 1) (poz. 10 = 9 min, poz. 20 = 1 h, poz. 30 = 2,5 h, poz. 40 = 4,7 h) | Aktywny gracz miał poz. 40 w 2. dniu — „wszystko od razu” |
| Praca megakonstruktu (część złoża) | ok. 7 dni | ok. **6 dni** | Dłuższa rozbudowa planety, pętla dalej ok. miesiąca |
| Ostrzeżenie o wyczerpanym złożu | tylko wiertnica kryształów | także megakonstrukt metalu (przed budową) | Decyzja właściciela: ostrzegać, nie blokować |

Budowy rozpoczęte przed zmianą kończą się o swojej godzinie (zapis trzyma chwilę końca).

## Wynik symulacji

| Gracz | Poz. 40 kopalni metalu | Megakonstrukt rusza | 1. planeta wyeksploatowana | Imperium gwiezdne (koniec pętli) |
|---|---|---|---|---|
| Aktywny (co 15 min) — przed | dzień 2 | dzień 3 | dzień 9 | 26,5 dnia |
| Aktywny — **po** | **dzień 6** | dzień 6 | dzień 10,5 | **30 dni** |
| Okazjonalny (co 3 h) — przed | dzień 6 | dzień 7 | dzień 12,4 | 37 dni |
| Okazjonalny — **po** | **dzień 7** | dzień 7,7 | dzień 12 | **37 dni** |

(Strategia „pętla”: następna kolonia, gdy poprzednia ma ≥ 50% wydobyte. Gracz, który kolonizuje od razu — 12–17,5 dnia.)

## Sprawdzone bez zmian (symulacja nie pokazała problemu)

- **Badania:** „Megastruktury” kończą się razem z poz. 40 (dzień 6–7) — nie hamują ani nie wyprzedzają rozbudowy.
- **Koszty budynków** (×1,2 na poziom) i **wydobycie** (×1,05): blokadą budowy jest głównie maks. poziom, nie brak
  surowców; przed megakonstruktem kolonii brakuje ok. 1 dnia kryształów — celowo (moment na transport).
- **Antymateria i flota:** gracz okazjonalny kończy z ok. 1400 antymaterii (paliwa nie brakuje); aktywny, który wysyła
  setki transportów, czasem czeka na paliwo — to koszt intensywnego transportu, nie blokada pętli. Decyzja z etapu 10
  („antymaterię zostawić”) obowiązuje.
- **Ceny megakonstruktów** (metal 4 mln / 1 mln, kryształy 1 mln / 4 mln): osiągalne w 1–2 dni po poz. 40.
- **Obszar Ekstraktora** 50 pól — bez zmian (decyzja właściciela).

## Do sprawdzenia na iPadzie

Czy rozbudowa od nowej gry „czuje się” lepiej: poziomy 1–10 nadal szybkie (sekundy–minuty), 20+ — godziny, poz. 40
w kilka dni. Jeśli start jest za wolny / za szybki — jedna liczba (`buildTimeGrowth` w `src/data/balance.ts`).
