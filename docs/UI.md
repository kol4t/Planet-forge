# Interfejs — ekrany, panele, nawigacja, dotyk, trzy formaty

Stan: v0.46. Kod: `src/game/scenes/` (Phaser) i `src/game/ui/` (układ, gesty, okna HTML).
Styl (C-001): kosmiczny dziennik ekspedycji — ciemne tło, stonowany turkus i kamień, złote akcenty, spokojna typografia
(`game/ui/theme.ts`: `COLORS`, `FONTS`). Interfejs po polsku.

## Ekran główny (planeta)

```
┌──────────────────────────── pasek zasobów ────────────────────────────┐
│ PLANET FORGE │ METAL │ KRYSZTAŁY │ ENERGIA │ ANTYMATERIA │ POLA        │
└───────────────────────────────────────────────────────────────────────┘
┌──── panel (jeden naraz) ────┐      (dymek SI Matki u góry)
│ Produkcja / Planeta / SI /  │            ◯ planeta         karta budowli →
│ Planety                     │                              + − ⟲ (kamera)
└─────────────────────────────┘
┌ ☰ │ Produkcja │ Badania │ Galaktyka │ Imperium │ Planeta ┐  ← dolny pasek, przyciski równej szerokości
```

- **Pasek zasobów**: stan, przyrost (/min, antymateria /h), pasek zapełnienia magazynu i pól. Dopiski, które się nie
  mieszczą w kolumnie, są ukrywane (v0.46). **Dotknięcie ENERGII** wyjaśnia bilans (v0.46).
- **Dolny pasek** (v0.71, decyzje właściciela): ☰ = Ustawienia (na telefonie najpierw małe menu z przyciskami, które się
  nie zmieściły), panele (Produkcja, Planeta) i ekrany pełnoekranowe (Badania, Galaktyka — dawna „Mapa”, Imperium).
  SI Matka nie ma przycisku — jej ustawienia są w Imperium → SI. Przyciski dzielą szerokość po równo (v0.46).
- **Panele**: Produkcja (karty 6 budynków), Planeta (v0.71: lista planet imperium — dotknięcie przełącza — i skrót
  aktywnej: nazwa, pola, złoża; „Szczegóły” pokazuje pełny opis: typ, specjalizacja, kosmos, złoża, środowisko,
  „‹ Planety” wraca; „Kosmos”).
- **Ekran stacji** (v0.72, etap 1 planu stacji): stacja macierzysta zamiast planety (2D pikselowo, 3D low-poly),
  obrót palcem i przybliżenie jak planeta; ścieżka „Galaktyka › Układ › Planeta › Stacja” (planeta = powrót).
  „Produkcja” → **„Moduły”** (karty rdzenia, magazynu, stoczni i gniazd „wkrótce”); dotknięcie modułu na stacji —
  złota ramka karty. Wejścia: znaczek stacji przy planecie w widoku układu, wiersz „Stacja macierzysta” na liście
  w „Planeta”, „Pokaż stację” na karcie w Imperium.
- **Tło**: gwiazdy i mgławice, bez sąsiednich planet (v0.71 — sąsiadów pokazuje widok układu).

### Zasada okien (v0.46)

- Naraz otwarty jest **jeden panel z dolnego paska ALBO wybrany budynek**.
- Wybrany budynek = **karta budowli** obok planety (HTML) + okienko „Budynek” z kartą i przyciskiem „Ulepsz”.
- Wyjątek: **Produkcja zostaje obok karty budowli** — wtedy bez okienka „Budynek” (ta sama karta jest w panelu,
  w złotej ramce).
- Otwarcie Planety zamyka wybór budynku; wybór budynku zamyka ten panel. Wejście w widok układu zamyka wybór
  budynku (v0.71).
- Okno HTML (kompleks, fabryka, kosmos…) chowa kartę budowli, dopóki jest otwarte — okna nie nachodzą na siebie (v0.71).
- **Dymek SI** chowa się, gdy wybrany jest budynek i gdy otwarty panel zostawia mało miejsca (telefon).
- Okna z „Ustawień” i okna HTML (kompleks, fabryka, kosmos, transport, wyszukiwarka, zgłoszenia) leżą nad wszystkim;
  zamyka je „Zamknij” albo dotknięcie tła. Wyższe niż ekran — przewijają się (v0.46).

### Karta budynku w Produkcji

Nazwa i poziom, ikona Zarządzania, efekt następnego poziomu, koszt (polski zapis liczb, spacja co tysiąc od 10 000),
przycisk **„Ulepsz do N · czas”** (v0.46 — czas na przycisku; w bardzo wąskich kartach czas w linii kosztu), stany:
„Dostępne za…”, „Za mały magazyn”, „Do kolejki”, w budowie — pasek, „Ukończ” i „Anuluj” (drugie dotknięcie: „Na pewno?”).
Czerwona linia w nagłówku Produkcji przy niedoborze energii (v0.46).

## Ekrany pełnoekranowe (`OverlayScene`)

- **Badania** — galaktyka badań: filtry ramion (w kilku wierszach na wąskim ekranie — v0.46), panel-karta ze
  szczegółami, legenda, „Wyśrodkuj”.
- **Mapa** — galaktyka → układ → planeta; filtry, wyszukiwarka (HTML), „Mój układ”, ekspedycje, kolonizacja, pas asteroid.
- **Imperium** — zakładki: Planety (suma, „Sytuacja imperium”, karty planet z sortowaniem, karta stacji macierzystej), Flota (v0.58: stocznia, statki, kolejka), Dziennik, SI; transportowce z eskortą.

## Dotyk i sterowanie

- Cele dotykowe **≥ 44 pt** (sprawdzane testem układu dla 8 rozmiarów ekranu; okna HTML — `min-height: 44px`).
- **Nic nie zależy od najechania myszą** (hover) — tylko dotknięcie/kliknięcie.
- Strona się nie przewija ani nie powiększa (blokada gestów Safari, `touch-action`); przewijają się tylko okna HTML.
- Gesty planety: patrz `docs/RENDERING.md`. Komputer: mysz = palec, kółko = przybliżenie, klawisze + − 0.
- Zmiana orientacji i rozmiaru okna: przeliczenie układu (`relayout`), safe-area (notch, pasek domowy) z `env()`.

## Trzy formaty (`game/ui/layout.ts`)

`u` = min(szerokość, wysokość) / 880, w granicach 0,8–1,1 — skala wszystkich wymiarów.

| Format | Układ | Uwagi z audytu v0.46 |
|---|---|---|
| Komputer (≥ 1280 szer.) | panel po lewej (40% szer., maks. 540 pt), planeta po prawej | pełny dolny pasek |
| iPad poziomo (1180×820, 1366×1024) | jak komputer | karty 2 kolumny, wysokość z miejscem na 2 wiersze efektu i kosztu; karta budowli obok kolumny przycisków kamery |
| iPad pionowo (820×1180) | panel po lewej (50%), planeta obok | dopiski paska zasobów bez nachodzenia |
| Telefon pionowo (390×844) | panel na całą szerokość nad dolnym paskiem, planeta nad nim (`sheet`); 4 przyciski + ☰ | dymek SI schowany przy otwartym panelu; bez przycisków kamery, gdy brak miejsca (szczypanie działa) |
| Telefon poziomo (844×390) | panel prawie na całą szerokość, mała planeta obok | panel Planeta w 2 kolumnach; okna Ustawień przewijane palcem; komunikaty w granicach ekranu; krótsze napisy w wąskich kartach |

Zrzuty wszystkich ekranów w 7 rozmiarach: `node scripts/screens.ts <folder>` (przy `npm run dev`).
