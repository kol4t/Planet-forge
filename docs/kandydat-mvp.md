# Kandydat MVP (etap 12) — raport

Stan: 2026-11-02, gałąź `claude/kandydat-mvp` (na v0.67.0). Definicja MVP właściciela (2026-10-28, `docs/status.md`):
planeta → rozwój → wyczerpanie → transport / przeniesienie → 80% złóż na 3 planetach → stacja macierzysta / flota /
imperium gwiezdne, antymateria jako paliwo.

## 1. Pętla MVP — co jest w grze (stan na v0.67)

| Krok pętli | Stan | Gdzie (wersja) |
|---|---|---|
| Planeta: start, pola, złoża (3 rodzaje złóż) | ✅ | v0.45, v0.65 |
| Rozwój: 6 budynków do poz. 40, kompleksy, badania, kolejka 5 | ✅ | v0.38–v0.45, v0.65 |
| Megakonstrukt kopalni metalu (główny motyw planety, ok. tydzień wydobycia) | ✅ | v0.59–v0.61, v0.65 |
| Megakonstrukt kryształów (wiertnica nad lejem do jądra, orbita) | ✅ | v0.69 |
| Wyczerpanie: 80% złóż = planeta wyeksploatowana, resztki wolniej | ✅ | v0.54 |
| Transport surowców, przeniesienie konstruktu (orbita, transfer) | ✅ | v0.36, v0.56, v0.61 |
| Antymateria = paliwo każdego lotu | ✅ | v0.53 |
| Stacja macierzysta (magazyn orbitalny, stocznia), stacje kolonii | ✅ | v0.55, v0.58, v0.64 |
| Wstępna flota (budowa statków, eskorta) i ryzyko misji | ✅ | v0.58, v0.62 |
| Imperium gwiezdne (3 wyeksploatowane planety + stacja) | ✅ | v0.63 |
| Wstępna ekonomia (strojona symulacją) | ✅ | v0.65 |
| Pierwsze kroki — przewodnik SI Matki przez całą pętlę | ✅ | v0.67 |
| Widok układu (galaktyka → układ → planeta) | ✅ | v0.66 |
| Płynność na iPadzie | ⏳ **pomiar właściciela** | lista niżej |

## 2. Testy kandydata (wykonane w tym etapie)

- **Zapisy ze starych wersji:** 7 prawdziwych zapisów utworzonych grą v0.46, v0.50, v0.54, v0.58, v0.61, v0.64 i v0.66
  (`tests/fixtures/saves/`, test `tests/oldSaves.test.ts`). Każdy wczytuje się w obecnej wersji, ma te same planety,
  przechodzi naliczenie 8 h i przejście na każdą planetę, zapisuje się w nowym formacie i eksportuje / importuje jako
  `PF2:`. Tekst `PF2:` wyeksportowany przez starą wersję też się wczytuje. **Wynik: 7 / 7.**
- **Pętla od zera z przewodnikiem** (`npm run simulate`, raport `docs/balans-symulacja.md`): symulowany gracz wykonuje
  wszystkie 19 kroków przewodnika SI Matki i zamyka pętlę.

  | Gracz | Pętla „po kolei” | Kolonizuje równolegle |
  |---|---|---|
  | Okazjonalny (co 3 h) | **36,3 dnia** | 17,1 dnia |
  | Aktywny (co 15 min) | 26,6 dnia | 11,3 dnia |

  Gracz okazjonalny: stacja macierzysta w 4. dniu, megakonstrukt w 7., druga kolonia w 11., pierwsza wyeksploatowana
  planeta w 13., imperium gwiezdne w 37. dniu.
- **Poprawka z audytu:** krok przewodnika „Załóż drugą kolonię” przeniesiony za megakonstrukt — wcześniej gracz
  grający planem właściciela (pierwsza planeta → konstrukt → kolonia) stał na nim kilka dni, a następne kroki wpadały naraz.
- Wszystkie testy: 401 (node:test), typy i budowanie bez błędów.

## 3. Lista kontrolna na iPadzie (do wykonania przez właściciela)

Najpierw: Safari → gra → pasek „Dostępna aktualizacja” (jeśli jest) → dotknij. Zapis zapasowy: Ustawienia → „Kopiuj
zapis” i wklej do Notatek.

**A. Płynność (najważniejsze — ostatni pomiar był na v0.46)**
1. Ustawienia → „Zgłoś / diagnostyka” — zanotuj wersję (ma być 0.67 albo nowsza).
2. 2D: przez minutę obracaj planetę palcem, przybliżaj i oddalaj. Potem otwórz diagnostykę i przepisz „płynność
   (ostatnia minuta)”: średnią i najsłabszą sekundę.
3. Ściśnij planetę do widoku układu, przez minutę przesuwaj układ i dotykaj planet. Przepisz płynność.
4. Ustawienia → „Włącz 3D” (gra się przeładuje). Powtórz punkty 2–3, przepisz płynność oraz linię „rysowania”
   i „widok” z diagnostyki.
5. Zostaw grę na 5 minut na nieruchomej planecie (3D). Czy iPad jest ciepły? (Porównaj z wrażeniem sprzed v0.66.)

**B. Zapis**
6. Zamknij Safari całkiem i otwórz grę — planety, poziomy i przewodnik na miejscu.
7. Ustawienia → „Kopiuj zapis”, potem „Wczytaj zapis” i wklej — gra wraca do tego samego stanu.

**C. Pętla (krótko)**
8. Panel przewodnika SI Matki pokazuje bieżący krok; wykonaj go — komunikat z nagrodą.
9. Widok układu: dotknij swojej planety, obcej planety, gwiazdy — każde reaguje.
10. Imperium: karty planet z plakietką rodzaju złóż, stacja macierzysta (jeśli zbudowana), zakładka Flota.

**Co przesłać:** wyniki z punktów 2–4 (liczby), odpowiedź „tak / nie” do 5–10 i zrzut ekranu, jeśli coś wygląda źle.
Wyniki dopiszę do `docs/PERFORMANCE.md`; jeśli płynność 3D spadnie poniżej ok. 30 kl./s, zaproponuję poprawki
przed ogłoszeniem MVP.

## 4. Otwarte sprawy przed ogłoszeniem MVP (do decyzji właściciela)

1. **Płynność iPada** — wyniki z listy wyżej (blokujące).
2. ~~Nazwa „piraci”~~ — **zostaje** (decyzja właściciela 2026-11-02); do odnotowania w Projekcie lore (K-005, O-205 / O-206).
3. **Megakonstrukt kryształów** — **gotowy** (v0.69: wiertnica i lej do jądra, `docs/megakonstrukt-krysztalow.md`).
4. **Odłożone (zapisane w `CLAUDE.md`):** antymateria zużywana przez megakonstrukty, nowy wygląd Ekstraktora kryształów,
   DNA, osobny ekran SI.
