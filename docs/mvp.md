# Planet Forge — podsumowanie MVP (v0.70.1)

Stan: 2026-11-09. Opublikowana wersja: **v0.70.1** (`https://kol4t.github.io/Planet-forge/`).
Definicja MVP właściciela (2026-10-28, `docs/status.md`): pętla **planeta → wyczerpanie → transport i przenoszenie
megakonstruktów → 80% złóż na 3 planetach → stacja macierzysta / flota / imperium gwiezdne**, antymateria jako paliwo.

## 1. Werdykt

**Pętla MVP jest kompletna i grywalna od zera do końca.** Wszystkie etapy planu z `docs/status.md` są w grze,
przewodnik SI Matki prowadzi przez całość, zapisy z 7 starych wersji wczytują się poprawnie, 412 testów przechodzi.
Do formalnego ogłoszenia brakuje tylko **dwóch pomiarów płynności na iPadzie** (widok układu i 3D bez przełączania
grafiki) — nie blokują gry, można je dopisać później (punkt 4).

## 2. Pętla gry — co gracz robi

| Krok | Co się dzieje | Wersja |
|---|---|---|
| 1. Rozbudowa planety | 6 budynków do poz. 40, kolejka 5, kompleksy (+30%) i znaleziska; czas budowy rośnie z poziomem (poz. 40 ok. 4,7 h) | v0.45–v0.70 |
| 2. Megakonstrukt | Kopalnia metalu (osady → konstrukt) i Ekstraktor kryształów (wiertnica nad lejem do jądra); +60%, praca ok. 6 dni | v0.59–v0.69 |
| 3. Wyczerpanie | ≥ 80% złoża — resztki wolniej; oba złoża ≥ 80% = planeta wyeksploatowana (licznik X/3) | v0.54 |
| 4. Antymateria = paliwo | Każdy lot (kolonizacja, transport, transfer) kosztuje paliwo | v0.53 |
| 5. Stacja macierzysta | Rdzeń SI Matki + magazyn orbitalny, węzeł transportu, stocznia | v0.55, v0.58 |
| 6. Transfer megakonstruktu | Rozłożenie 30 min, lot, ten sam poziom na nowej planecie; konstrukty także przez orbitę | v0.56, v0.61 |
| 7. Flota i ryzyko | Transportowce, statek kolonizacyjny, holownik, eskorta; piraci na trasach między układami (skutki łagodne) | v0.58, v0.62 |
| 8. Imperium gwiezdne | 3 planety wyeksploatowane + stacja → miejsca do 10 planet, plansza SI Matki | v0.63 |
| 9. Stacje kolonii | Przekaźniki: loty do stacji 2× szybciej i za pół paliwa | v0.64 |
| Przez całość | Przewodnik „Pierwsze kroki” (19 kroków), widok układu (galaktyka → układ → planeta) | v0.66–v0.67 |

## 3. Tempo (symulacja „rozsądnego gracza”, `docs/balans-symulacja.md`)

| Gracz | Poz. 40 na 1. planecie | 1. planeta wyeksploatowana | Cała pętla (3 planety) |
|---|---|---|---|
| Aktywny (co 15 min) | 6. dzień | 10,5 dnia | **ok. 30 dni** |
| Okazjonalny (co 3 h) | 7. dzień | 12 dni | **ok. 37 dni** |

Zgodnie z decyzją właściciela (2026-11-09): pętla ok. miesiąca, wolniejszy start. Gracz „chciwy” (kolonizuje od razu)
kończy w 12–17,5 dnia — to świadomy skrót dla ekspertów.

## 4. Płynność na iPadzie właściciela (Safari, 810×1080 @2)

| Widok | Średnio | Najsłabsza sekunda | Wersja | Ocena |
|---|---|---|---|---|
| 2D — planeta lawowa (najcięższa) | 55 kl./s | 48 kl./s | v0.70.1 | dobrze (przed poprawką 27 / 9) |
| 3D — planeta startowa | 57 kl./s | 8 kl./s* | v0.70.0 | dobrze; *pomiar objął przełączenie 2D → 3D |
| Widok układu | — | — | — | **do zmierzenia** |
| 3D bez przełączania | — | — | — | **do zmierzenia** |

Krótkie przycięcia przy zmianie planety i przełączaniu 2D ↔ 3D (ok. 1 s ładowania) są znane i jednorazowe.

## 5. Jakość

- **Testy:** 412 automatycznych (reguły gry, zapis, generowanie, pola, renderer 2D) + symulator pętli.
- **Zapis:** automatyczny, eksport/import `PF2:`, zapisy z v0.46–v0.66 wczytują się (test `oldSaves`), uszkodzony
  zapis → kopia i komunikat.
- **Stabilność:** zamrażanie dotyku naprawione u źródła (v0.69.5); osłony pętli klatek i scen; diagnostyka w grze.
- **Zgłoszenia:** brak otwartych zgłoszeń testerów na GitHubie.

## 6. Odłożone na po MVP (decyzje właściciela, zapisane w `CLAUDE.md`)

1. Antymateria zużywana przez megakonstrukty.
2. Nowy wygląd Ekstraktora kryształów (najpierw szkic / wizja właściciela).
3. Ikony na dolnym pasku i podział `PlanetScene.ts` (etap 7 UI).
4. DNA (generator, SI, badania), osobny ekran SI, stacja badawcza.
5. Księżyc i lokacje wokół planety, gwiazdy mistrzowskie, gazowe olbrzymy i pasy asteroid, kolejne galaktyki.
6. Endgame, walka, dok handlowy, czerpanie gazu; na końcu backend / konta / multiplayer.

## 7. Otwarte decyzje (nie blokują MVP, `docs/KNOWN_ISSUES.md`)

- Nazwy a lore: „Imperium”, „imperium gwiezdne”, „piraci” (zostaje — do odnotowania w Projekcie lore).
- Telefon pionowo — pełnoprawny cel czy „da się grać”?
- Wielkość pól wg typu planety (wariant B) — obecnie stałe rozmiary.

## 8. Rekomendacja

1. **Ogłosić MVP na v0.70.1** — pętla działa, tempo zgodne z decyzją, płynność 2D i 3D dobra.
2. Dwa brakujące pomiary dopisać do punktu 4, gdy właściciel je wyśle (bez wstrzymywania ogłoszenia).
3. Pierwszy etap po MVP — do wyboru właściciela; propozycja: **antymateria w megakonstruktach** (domyka gospodarkę
   paliwem, którą gracz już zna) albo **ikony na dolnym pasku** (najtańsza poprawa czytelności dla nowych graczy).
