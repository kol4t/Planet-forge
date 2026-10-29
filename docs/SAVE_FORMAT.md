# Format zapisu

Stan: v0.46. Kod: `src/core/save/empire.ts` (imperium), `src/core/save/save.ts` (planeta i gospodarka — walidacja),
`src/core/save/transfer.ts` (tekst `PF2:` / `PF1:`), migracje w `src/app/GameController.ts` (`restoreSlots`, `migrateResearch`).

## Gdzie gra trzyma dane (przeglądarka)

| Klucz | Co zawiera | Uwagi |
|---|---|---|
| `planet-forge.empire.v1` | **zapis gry** — całe imperium (JSON, `saveVersion` = 2) | co 10 s, po każdej akcji, przy schowaniu karty i zamknięciu |
| `planet-forge.empire.broken` | kopia zapisu, którego nie dało się wczytać (od v0.46) | nowa gra go nie nadpisuje; trafia do zgłoszenia z „Dołącz zapis” |
| `planet-forge.save.v1` | stary zapis jednej planety (v0.1–v0.6) | wczytywany raz przy przejściu na imperium, zostaje jako kopia |
| `planet-forge.boot.v1` | bezpiecznik startu: tryb grafiki 2D/3D, ostatnia awaria | `app/bootGuard.ts` |
| `planet-forge.ui.v2` | otwarty panel dolnego paska | `game/ui/uiPrefs.ts` (`ui.v1` — stary, czytany raz) |
| `planet-forge.focusZoom.v1` | przybliżenie do budynku (1,5× / 3×) | Ustawienia → Widok |
| `planet-forge.fieldGrid.v1` | siatka pól widoczna / ukryta | Ustawienia → Widok |
| `planet-forge.errors.v1` | dziennik ostatnich błędów JavaScript | do zgłoszeń |
| `planet-forge.feedbackDraft.v1` | niewysłane zgłoszenie (szkic) | okno „Zgłoś / diagnostyka” |
| `planet-forge.view.v1` (sessionStorage) | obrót i przybliżenie planety przy przełączeniu 2D ↔ 3D | znika po przeładowaniu |

Na iPadzie **Safari i aplikacja z ekranu początkowego mają osobną pamięć** — zapis przenosi się tekstem (Ustawienia →
Kopiuj zapis / Wczytaj zapis).

## Zapis imperium (`EmpireSave`, `saveVersion` = 2)

```jsonc
{
  "saveVersion": 2,
  "active": 0,                    // indeks aktywnej planety w "slots"
  "unlockedSlots": 5,             // odblokowane miejsca (5–10)
  "antimatter": 37.2,             // wspólny portfel antymaterii (ułamki się kumulują)
  "research": { "done": [], "current": null },   // pole zgodności — badania są przy planetach (od v0.15)
  "home": "1:16:3",               // miejsce startowe w galaktyce
  "missions": [ … ],              // statki kolonizacyjne w drodze (od v0.13; od v0.53 opcjonalne "fuel" — paliwo do zwrotu;
                                  //   od v0.58 "ship": true — statek z floty, wraca po zawróceniu)
  "journal": [ { "at": 0, "kind": "build", "text": "…" } ],  // dziennik, maks. 80 wpisów
  "ai": { "energy": "ask", … },   // samodzielność SI dla każdej reguły (od v0.14)
  "discoveries": { "16": 4, … },  // wiedza o galaktyce: układ → poziom 1–4 (od v0.34.2)
  "expeditions": [ … ],           // ekspedycje w drodze (od v0.34.3, opcjonalne)
  "shipments": [ … ],             // transportowce (od v0.36, opcjonalne; od v0.55 "station": "to" | "from" — lot na stację / ze stacji;
                                  //   od v0.58 "ship": true — transportowiec floty, "escort": n — okręty eskorty)
  "comets": [ … ],                // holowniki po komety (od v0.37.1, opcjonalne; od v0.58 "ship": true — holownik floty)
  "finds": { "items": {}, "next": {} },  // znaleziska megakompleksów (od v0.43.1, opcjonalne)
  "exploited": ["1:16:4"],        // wyeksploatowane planety, każda raz (od v0.54, opcjonalne; błędne adresy pomijane)
  "fleet": {                      // flota (od v0.58, opcjonalne; brak = flota startowa 3 / 1 / 1 / 0)
    "docked": { "transport": 2, "colonyShip": 1, "tug": 1, "escort": 0 },   // statki na stanie (w drodze — z lotów)
    "queue": [ { "type": "escort", "startsAt": 0, "readyAt": 1200000, "cost": { "metal": 3000, "crystal": 2000 } } ]
  },
  "transfers": [                  // megakonstrukty w transferze (od v0.56, opcjonalne; błędne pomijane)
    { "from": "1:16:4", "to": "1:16:1", "building": "crystalMine", "level": 20, "family": "crystal-drill",
      "startedAt": 0, "departsAt": 1800000, "arrivesAt": 2040000,   // ms: start rozkładania, odlot, przylot
      "cost": { "metal": 36268, "crystal": 18134 }, "fuel": 5,      // do zwrotu przy anulowaniu przed odlotem
      "departed": true }                                              // opcjonalne „mode” (tryb kompleksu)
  ],
  "station": {                    // stacja macierzysta (od v0.55, opcjonalne; błędna = brak stacji)
    "address": "1:16:3",          //   planeta, nad którą krąży
    "core": { "level": 1, "readyAt": 0 },       //   rdzeń SI Matki (readyAt — koniec budowy, ms)
    "storage": { "level": 2, "readyAt": 0 },    //   magazyn orbitalny (opcjonalny; błędny pomijany)
    "shipyard": { "level": 1, "readyAt": 0 },   //   stocznia (od v0.58, opcjonalna)
    "stock": { "metal": 1200, "crystal": 0 }    //   zapasy na stacji (ujemne → 0)
  },
  "slots": [ SlotSave, … ]
}
```

### Miejsce (`SlotSave`)

```jsonc
{
  "kind": "planet",
  "planet": { "definitionId": "kepler-186f", "seed": "KEPLER-186F-ALFA", "generatorVersion": 1, "address": "1:16:3" },
  "economy": {
    "stock": { "metal": 48215, "crystal": 31906 },
    "levels": { "metalMine": 14, "crystalMine": 12, "powerPlant": 11, "storage": 16, "antimatterCollector": 3, "laboratory": 6 },
    "lastUpdate": 1761571200000,                 // ms — od tej chwili liczy się produkcja
    "construction": null,                        // albo { building, targetLevel, startedAt, finishesAt, cost }
    "antimatter": 0,                             // zawsze 0 — portfel jest wspólny
    "settings": { … },                           // Zarządzanie: praca i pierwszeństwo (od v0.26.1, opcjonalne)
    "siteFactor": { … }, "energyFactor": { … },  // liczone przez grę (teren, kompleksy, tryby)
    "mined": { "metal": 0, "crystal": 0 },       // wydobyte ze złóż (od v0.27)
    "queue": ["metalMine"]                       // kolejka budowy (od v0.32.2)
  },
  "research": { "done": ["prod-core"], "current": null },  // badania planety (od v0.15)
  "plots": { "metalMine": [12, 13, 40, …] },    // obszar budynku: numery pól siatki (od v0.26)
  "plotsGrid": 3,                                // wersja siatki pól (FIELD_GRID_VERSION); inna = przydział od nowa
  "plotsLayout": 2,                              // wersja układu obszarów (PLOTS_LAYOUT; brak = sprzed v0.45)
  "complexes": [ { "family": "metal-factory", "building": "metalMine", "mode": "balanced", "mega": false } ],
  "fields": { "used": 57, "buildable": 160 },    // pola z ostatniego liczenia (lista planet bez liczenia siatek)
  "specialization": { "id": "mining", "readyAt": 0 },
  "asteroidStation": { "level": 2, "readyAt": 0 },
  "starCollector": { "level": 1, "readyAt": 0 },
  "afloat": ["crystalMine"]                      // megakonstrukty po transferze — stoją na każdym polu (od v0.56, opcjonalne)
}
```

## Walidacja

- `deserializeEmpire` odrzuca zapis, gdy: zła `saveVersion`, brak planet, więcej planet niż miejsc, błędna planeta lub
  gospodarka, `active` poza zakresem, ujemna antymateria. Pola opcjonalne z błędami są **pomijane** (statki, dziennik,
  ekspedycje, transportowce, komety, znaleziska, kompleksy) — nie psują reszty zapisu.
- Liczby muszą być skończone; poziomy całkowite; numery pól < 10 000; wpisy dziennika do 300 znaków.

## Uszkodzony zapis i pełna pamięć (od v0.46)

- Zapis istnieje, ale się nie wczytuje → gra zaczyna od nowa, **kopia trafia pod `planet-forge.empire.broken`**, gracz
  widzi komunikat. „Zgłoś / diagnostyka” z „Dołącz zapis” dołącza tę kopię, co pozwala odzyskać postęp.
- Zapis się nie udał (pełna pamięć, tryb prywatny) → jeden komunikat z radą „Ustawienia → Kopiuj zapis”; kolejny dopiero
  po udanym i znów nieudanym zapisie.
- Brak dostępu do `localStorage` (tryb prywatny Safari) → gra działa, tylko bez zapisu.

## Migracje (stare zapisy zawsze działają)

| Od | Co się dzieje |
|---|---|
| v0.1–v0.6 (`planet-forge.save.v1`, jedna planeta) | `empireFromLegacy` → imperium z jedną planetą, antymateria do portfela |
| przed v0.15 (badania imperium) | `migrateResearch` — badania trafiają do aktywnej planety |
| przed v0.26 (bez `plots`) | obszary przydzielane od nowa z poziomów |
| inna `plotsGrid` | przydział pól od nowa (nowa siatka) |
| przed v0.45 (bez `plotsLayout`) | obszar budynku rośnie od nowa od pierwszego pola budynku (`anchorsOnly`), poziomy bez zmian; stare kompleksy z polami → ulepszenie całego budynku (`parseComplexes`) |
| przed v0.34.2 (bez `discoveries`) | wiedza o galaktyce wyliczana na start |

Zasada: **nie podbijamy `GENERATOR_VERSION`** (zmieniłby planety w zapisach). Nowe pola dopisujemy jako opcjonalne.

## Eksport / import tekstem

- „Kopiuj zapis” → `PF2:` + base64(JSON imperium). Najpierw nalicza czas (`tick`).
- „Wczytaj zapis” przyjmuje `PF2:…`, starsze `PF1:…` (jedna planeta), także z białymi znakami w środku, oraz surowy JSON.
  Błędy po polsku: niepełny tekst, nieznany typ planety, inna wersja generatora.
- Czas od eksportu nalicza się jak nieobecność (maks. 8 h). Import zastępuje całe imperium.
- Rozmiar: ok. 3 KB JSON / 4,4 KB tekstu `PF2:` dla 5 planet (pomiar w `docs/PERFORMANCE.md`).
