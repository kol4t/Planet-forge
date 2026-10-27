# Dokumentacja Planet Forge

Stan: v0.46 (audyt projektu). Opis gry, uruchomienie i lista kontrolna na iPada: **`../README.md`**.
Instrukcje dla Claude Code (zasady, stan, etapy): **`../CLAUDE.md`**.

| Plik | Co zawiera |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | katalogi, warstwy (core / data / renderer / game / app), przepływ danych, zasady, schemat |
| [MECHANICS.md](MECHANICS.md) | wszystkie mechaniki: zasoby, budynki, energia, magazyn, pola i obszar budynku, budowa, offline, imperium, badania, mapa, kolonizacja, SI Matka, dziennik |
| [BALANCE.md](BALANCE.md) | tabele wartości z `src/data` — **generowane** (`npm run balance-doc`), robocze |
| [RENDERING.md](RENDERING.md) | generator planet i wersje, 2D vs 3D, fallback, kamera i gesty |
| [UI.md](UI.md) | ekrany, panele, zasada okien, nawigacja, dotyk, trzy formaty (komputer / tablet / telefon) |
| [SAVE_FORMAT.md](SAVE_FORMAT.md) | format zapisu, klucze w przeglądarce, walidacja, migracje, eksport/import `PF2:` |
| [TESTING.md](TESTING.md) | co testują testy, jak je uruchomić, czego nie obejmują |
| [PERFORMANCE.md](PERFORMANCE.md) | raport wydajności (przed / po), instrukcja pomiaru na iPadzie |
| [CHANGELOG.md](CHANGELOG.md) | historia wersji v0.1 – v0.46 (z `git log`) |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | znane ograniczenia i lista „Do decyzji” właściciela |
| [LORE_TOUCHPOINTS.md](LORE_TOUCHPOINTS.md) | nazwy w grze dotykające świata, pliki i status z kanonu |

Pozostałe:

- `decisions.md` — decyzje architektoniczne i właściciela (historia).
- `generator-plan.md`, `specyfikacja-generatora-i-ui.md` — plan i specyfikacja przebudowy generatora i UI.
- `plan-przemysl.md` — plan przemysłu („Industrial Evolution”), `raport-galaktyka.md` — raport przebudowy galaktyki.
- `zgloszenia.md` — jak testerzy zgłaszają błędy i sugestie.
- `lore/` — kopia lore z Projektu na claude.ai (kanon K-xxx) — nie zmieniać z poziomu kodu.
- `atlas/` — obrazy profili powierzchni i etapów kompleksów.
- `lista-kontrolna-historia.md` — dawne listy kontrolne kolejnych wersji (archiwum dawnego README).
