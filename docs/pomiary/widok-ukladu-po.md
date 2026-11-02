# Widok układu — pomiary PO zmianach (etap F)

Stan: 2026-11-02, gałąź `claude/widok-ukladu` (etapy B–F na v0.65.0). Te same skrypty co przed zmianami
(`docs/pomiary/widok-ukladu-przed.md`): `scripts/perf.ts --deep`, `scripts/perf-view.ts`, `scripts/perf-generation.ts`
oraz test przejść układ ↔ planeta.

**Zastrzeżenie (jak przed):** przeglądarka bezgłowa w kontenerze, 3D rysowane programowo (SwiftShader, ok. 2 kl./s),
`perf.ts` spowalnia procesor 4×. Liczby służą do porównania wersji, **nie są pomiarem iPada**.

## Tabela przed / po

| Pomiar | Przed (v0.65.0) | Po (etapy B–F) |
|---|---|---|
| Konteksty WebGL aktywne po starcie — 3D | **3** | **1** |
| Konteksty WebGL aktywne po starcie — 2D | 1 | **0** |
| Rysowanie planety, gdy widać układ | — (nie było widoku) | **wstrzymane** (3D i 2D) |
| Rysowanie planety, gdy stoi (bez palca i zoomu) | każda klatka (do 60 kl./s) | **najwyżej ~20 kl./s** (spokojne animacje); ruch — pełna płynność ¹ |
| 3D: rysowania / trójkąty (planeta startowa) | 44 / 102 234 | 44 / 102 234 (bez zmian) |
| 3D: kolonia na wysokich poziomach — rysowania / trójkąty | 46 / 129 418 | 46 / 129 418 (bez zmian) |
| 3D: geometrie start → 10 → 20 zmian planety | 48 → 57 → 57 | 48 → 62 → 62 (pamięć 3 modeli, **bez wycieku**) |
| Pamięć JS 3D: start → 10 → 20 zmian | 36,3 → 41,5 → 41,9 MB | 36,5 → 41,6 → 42,0 MB |
| Pamięć JS 2D: start → 10 → 20 zmian | 33,0 → 37,6 → 37,9 MB | 33,3 → 37,8 → 38,0 MB |
| Wejście na planetę 3D — pierwszy raz (od dotknięcia, z lotem 0,6 s) | — (przełączenie bez lotu: ok. 1,2 s liczenia) | ok. 1,5 s |
| Wejście na planetę 3D — ponownie | — (ok. 0,24–0,3 s liczenia) | **ok. 0,8 s z lotem** (liczenie ok. 0,2 s — model z pamięci) |
| Wejście na planetę 2D (z lotem 0,6 s) | — | ok. 0,75–0,86 s |
| Klatki 2D / 3D (bez panelu, 1×) | 4 / 2 kl./s | 5 / 2 kl./s (bez zmian w granicach szumu) |
| Start gry do gotowych paneli 2D / 3D | 27,2 / 26,3 s | 16,7 / 21,8 s ² |
| Mapa galaktyki — obiekty Phaser | 10 | 10 (bez zmian) |

¹ W tym środowisku planeta 3D rysuje się ok. 2 razy na sekundę, więc ograniczenia do 20 kl./s **nie da się tu
zmierzyć** (wynik jest taki sam z nim i bez niego). Działanie trzeba sprawdzić na iPadzie (Ustawienia → Diagnostyka:
płynność i bateria).
² Start zależy od obciążenia kontenera — różnica jest w granicach rozrzutu pomiaru, nie przypisuję jej zmianom.

## Co zmieniono w etapie F

- **Rzadsze rysowanie, gdy planeta stoi** (`PlanetView` i `CanvasPlanetFallback`): ruch (palec, bezwładność,
  przybliżanie, przesunięcie planety) — każda klatka; bez ruchu — najwyżej co 50 ms.
- **Niższa rozdzielczość w czasie lotu kamery** w widoku układu (60% gęstości pikseli, min. 1×), po zatrzymaniu pełna.
- **Miniatura aktywnej planety obrócona jak planeta** — przy przejściu układ ↔ planeta lądy nie przeskakują.
- **Diagnostyka** (Ustawienia → Zgłoś / diagnostyka): linia „widok” — poziom (galaktyka / układ / obiekt / powierzchnia),
  układ, obiekt, liczba modeli 3D w pamięci i miniatur układu; rysowania 3D jak dotąd.
- `scripts/perf-view.ts` liczy też rysowania WebGL na sekundę przy bezruchu.
