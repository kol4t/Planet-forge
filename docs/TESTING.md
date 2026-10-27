# Testy

Stan: v0.46 — **298 testów** (przed audytem: 291), wszystkie przechodzą (`npm run check`).

## Jak uruchomić

```sh
npm test             # wszystkie testy (node:test, Node ≥ 22.18 — TypeScript bez kompilacji)
npm run typecheck    # sprawdzenie typów
npm run check        # typy + testy + build (uruchamiaj po każdej zmianie kodu; tak samo robi GitHub przed publikacją)
node --test tests/economy.test.ts   # jeden plik
```

Testy nie potrzebują przeglądarki: `localStorage` zastępuje prosta pamięć (`withMemoryStorage` w testach kontrolera).

## Co testują (plik → zakres)

| Plik | Testów | Zakres |
|---|---:|---|
| `economy` | 21 | produkcja, energia i pierwszeństwo, magazyn, budowa, anulowanie, „Ukończ teraz”, offline, antymateria, Kolektor |
| `queue` | 10 | kolejka budowy: miejsca, koszt przy starcie, czekanie na surowce, offline, pola przy starcie (v0.46) |
| `deposits` | 10 | skończone złoża, wyczerpanie w trakcie naliczania |
| `controller` | 18 | GameController: budowa, zapis, kilka planet, migracje, uszkodzony zapis i nieudany zapis (v0.46) |
| `save`, `transfer` | 8 + 5 | walidacja zapisu, tryb prywatny, kopia uszkodzonego zapisu (v0.46), eksport/import PF1/PF2 |
| `planetSwitch` | 1 | zmiana planety bez liczenia siatek nieaktywnych |
| `fields` | 13 | siatka pól, obszary budynków (spójność, n+1 ⊇ n, bez nakładania), blokada braku miejsca, migracja układu |
| `complexes`, `planetology` | 9 + 5 | kompleksy i megakompleksy jako ulepszenie budynku, budowa na lodzie, burzenie |
| `colony`, `pick`, `fieldOverlay` | 6 + 5 + 1 | układ kompleksów do rysowania, wybór dotknięciem, obrysy pól |
| `research`, `researchView` | 12 + 5 | koszty, czasy, efekty bez podwójnego liczenia, mosty, widok galaktyki badań |
| `advisor` | 8 | SI Matka: reguły, propozycje, SI pod nieobecność, wstrzymanie po anulowaniu badania |
| `specialization` | 6 | specjalizacje, zmiana z podziałem czasu, limit 8 h raz dla całego naliczenia (v0.46) |
| `asteroids`, `transport` | 5 + 5 | stacja na pasie, komety, transportowce (kolektor energii gwiazdy — w `controller`) |
| `galaxy`, `orbits`, `discovery`, `expeditions`, `rareObjects`, `galaxyIndex`, `geology`, `systemTable`, `mapCamera` | 8+3+3+4+4+3+5+3+2 | galaktyka, ruch planet, wiedza, ekspedycje, rzadkie obiekty, wyszukiwarka, informacja geologiczna, tabela i kamera mapy |
| `generation`, `rng` | 10 + 7 | generator (wszystkie typy, zakresy, regresja planety startowej), deterministyczny RNG |
| `surface`, `terrainMethods`, `hydrology`, `profiles`, `lowPoly`, `sky` | 8+8+4+6+2+3 | teren, metody terenu, woda i lawa, profile, ląd 3D, tło nieba |
| `layout` | 10 (×8 rozmiarów ekranu) | układ ekranu: nic nie nachodzi, przyciski ≥ 44 pt, planeta ≤ 30%, pełny dolny pasek i wysokość kart (v0.46) |
| `gestures`, `dragRotator`, `motion` | 10 + 6 + 1 | obrót palcem, szczypanie, stuknięcie, animacje liczników |
| `empireCards` | 3 | karty i suma „Imperium” |
| `feedback`, `bootGuard`, `adaptiveResolution`, `build` | 5+8+2+5 | zgłoszenia, bezpiecznik startu, rozdzielczość 3D, zawartość buildu (manifest, ikony, service worker) |

## Sprawdzenia poza testami (audyt v0.46, skrypty do powtórzenia)

- **Symulacja losowa gry** (16 przebiegów × 600 akcji, 5 planet: budowa, kolejka, anulowanie, „Ukończ teraz”, burzenie,
  badania, kolonizacja, zmiana planety, zapis/wczytanie, eksport/import) — po każdej akcji: zasoby ≥ 0 i skończone,
  poziomy w zakresie, obszary spójne i bez nakładania, POLA = suma obszarów. **0 naruszeń.**
- **Zgodność naliczania:** jeden skok czasu (offline) vs kroki co ~1 s z budową i kolejką — różnica ≤ 2·10⁻¹⁰.
- **Siatka pól przed/po optymalizacji:** hash SHA-256 siatek 12 planet — identyczny.
- Zrzuty ekranów: `node scripts/screens.ts <folder> [2d|3d] [rozmiary]` (przy `npm run dev`).
- Pomiary: `docs/PERFORMANCE.md`.

## Czego testy NIE obejmują

- **Prawdziwego iPada i telefonu** (Safari, dotyk, pamięć grafiki, płynność) — tylko właściciel na urządzeniu
  (lista kontrolna w `README.md`). Przeglądarka bezgłowa to symulacja.
- Rysowania pikseli planety 2D i 3D (sprawdzane wzrokowo na zrzutach i w `npm run atlas`).
- Scen Phaser (panele, przyciski) — testowany jest czysty układ (`layout.ts`), nie wygląd.
- Service workera w działaniu (offline, aktualizacja) — testowana jest tylko zawartość buildu.
- Okien HTML (`*Panel.ts`, karta budowli) — poza logiką, z której biorą dane.
