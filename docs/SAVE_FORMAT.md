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
                                  //   od v0.58 "ship": true — statek z floty, wraca po zawróceniu; od v0.62 "incident")
  "journal": [ { "at": 0, "kind": "build", "text": "…" } ],  // dziennik, maks. 80 wpisów
  "ai": { "energy": "ask", … },   // samodzielność SI dla każdej reguły (od v0.14)
  "discoveries": { "16": 4, … },  // wiedza o galaktyce: układ → poziom 1–4 (od v0.34.2)
  "expeditions": [ … ],           // ekspedycje w drodze (od v0.34.3, opcjonalne)
  "shipments": [ … ],             // transportowce (od v0.36, opcjonalne; od v0.55 "station": "to" | "from" — lot na stację / ze stacji;
                                  //   od v0.58 "ship": true — transportowiec floty, "escort": n — okręty eskorty;
                                  //   od v0.62 "incident" — atak piratów, patrz niżej)
  "comets": [ … ],                // holowniki po komety (od v0.37.1, opcjonalne; od v0.58 "ship": true — holownik floty)
  "finds": { "items": {}, "next": {} },  // znaleziska megakompleksów (od v0.43.1, opcjonalne)
  "exploited": ["1:16:4"],        // wyeksploatowane planety, każda raz (od v0.54, opcjonalne; błędne adresy pomijane)
  "orbiting": [                   // megakonstrukty na orbicie / w locie do lądowania (od v0.61, opcjonalne)
    { "origin": "1:16:4", "readyAt": 1800000, "fuel": 10, "lifted": true,   // start z planety, koniec przygotowania, paliwo
      "target": "1:16:1", "landsAt": 2040000,                               // opcjonalnie: ściągany na planetę
      "kind": "crystal" }                                                   // od v0.69: wiertnica kryształów (brak = metal)
  ],
  "guide": { "step": 4, "seen": ["system"], "transport": true },  // przewodnik SI Matki (od v0.67, opcjonalne;
                                  //   "off": true — wyłączony; brak = start od pierwszego niewykonanego kroku)
  "view": { "level": "obiekt", "system": 16, "object": "1:16:4", "zoom": 2.5 },  // ostatni widok (od widoku układu,
                                  //   etap B; opcjonalne; poziom galaktyka|uklad|obiekt|powierzchnia; błędny = start na aktywnej planecie)
  "colonyStations": [ { "address": "1:16:1", "readyAt": 900000 } ],  // stacje kolonii (od v0.64, opcjonalne;
                                  //   błędne i powtórzone adresy pomijane)
  "stellar": { "at": 1793571502739, "seen": true },   // imperium gwiezdne — zamknięcie pętli (od v0.63, opcjonalne;
                                  //   "seen" — plansza SI Matki widziana; błędne pole = pętla otwarta)
  "fleet": {                      // flota (od v0.58, opcjonalne; brak = flota startowa 3 / 1 / 1 / 0)
    "docked": { "transport": 2, "colonyShip": 1, "tug": 1, "escort": 0 },   // statki na stanie (w drodze — z lotów)
    "queue": [ { "type": "escort", "startsAt": 0, "readyAt": 1200000, "cost": { "metal": 3000, "crystal": 2000 } } ],
    "repairs": [ { "readyAt": 1800000, "count": 1 } ]   // od v0.62, opcjonalne: okręty eskorty w naprawie po ataku
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

**Atak piratów w locie (`incident`, od v0.62, opcjonalne)** — w `shipments`, `missions`, `transfers` i `orbiting`
(lądowanie): `{ "at": 1300000, "delaySeconds": 120, "lossShare": 0.3, "damaged": 1, "done": true }` — chwila ataku (ms),
opóźnienie (s), część utraconego ładunku (tylko transport, 0–1), uszkodzone okręty eskorty, `done` — atak już zaszedł
(opóźnienie doliczone do `arrivesAt` / `landsAt`, strata odjęta). Błędne pole jest pomijane (lot bez ataku).

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
  "afloat": ["crystalMine"],                     // megakonstrukty po transferze — stoją na każdym polu (od v0.56, opcjonalne)
  "metalComplex": {                              // kompleks kopalni metalu (etap 1 kompleksu, opcjonalne)
    "center": [0.6, -0.185, 0.778],              // środek dzielnicy (sfera jednostkowa), wybrany raz
    "phase": "osady",                            // „osady” albo „konstrukt”
    "states": { "osada1.fabryka": { "stan": "zniszczony", "wytrzymalosc": 0 } },  // tylko odstępstwa (na razie nigdy)
    "build": { "startedAt": 0, "readyAt": 5400000, "cost": { "metal": 60000, "crystal": 40000 } }  // budowa megakonstruktu (od v0.60, opcjonalne)
  },
  "crystalComplex": {                            // megakonstrukt kryształów i lej (od v0.69, opcjonalne)
    "phase": "konstrukt",                        // „budowa”, „konstrukt” (wiertnica pracuje) albo „lej” (wiertnica odleciała)
    "cells": [41, 42, 57],                       // pola leja — zajęte na zawsze
    "center": 42,                                // pole środka leja (jedno z `cells`)
    "minedAt": 1200000,                          // kryształy wydobyte ze złoża, gdy wiertnica zaczęła pracę
    "stage": 2,                                  // etap leja 1–4 (największy osiągnięty)
    "build": { "startedAt": 0, "readyAt": 4200000, "cost": { "metal": 1000000, "crystal": 4000000 }, "fresh": true }  // tylko w fazie „budowa”
  }
}
```

**`crystalComplex`** (`core/economy/crystalConstruct.ts`, `docs/megakonstrukt-krysztalow.md`): nieznana faza, brak pól
albo środek spoza `cells` — pole pomijane; numery pól spoza siatki planety odrzuca gra przy przeliczeniu pól (lej znika).
Błędny etap = 1. Faza „budowa” wymaga poprawnego `build` (`readyAt ≥ startedAt`, koszt); `fresh` — lej powstał z tą
budową (znika przy anulowaniu). `EMPIRE_VERSION` bez zmian.

**`metalComplex`** (`core/colony/complexLayout.ts`, `docs/kompleks-kopalni-metalu.md`): środek musi mieć długość 0,9–1,1
(jest normalizowany), błędna faza = „osady”, stany tylko dla znanych `slotId` (`osadaN.kopalniaM`, `osadaN.fabryka`,
`konstrukt`). Brak pola albo błędny środek = **migracja**: przy pierwszym przeliczeniu pól planety (`syncPlots`) środek
wybierany automatycznie i deterministycznie (`ensureMetalComplex` — pole najbliżej środka obszaru kopalni metalu, a bez
obszaru pole lądu z największą ilością lądu wokół), faza „osady”. Tak samo przy imporcie `PF2:`. `EMPIRE_VERSION` bez zmian.
`build` (od v0.60): budowa megakonstruktu w toku — tylko w fazie „osady”, `readyAt ≥ startedAt`, koszt do zwrotu przy
anulowaniu; błędne pomijane. Po `readyAt` faza zmienia się na „konstrukt”, a kompleks kopalni metalu staje się megakompleksem.

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
