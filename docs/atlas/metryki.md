# Atlas profili i metod terenu

Plik generowany przez `npm run atlas` — nie edytuj ręcznie.

![Atlas](atlas.png)

**Jak czytać obrazek:** wiersze to profile (od góry): terrestrial (ziemiopodobny), arid (pustynny), ice (lodowy), oceanic (oceaniczny), volcanic (wulkaniczny), barren (jałowy).
Kolumny to trzy grupy metod (od lewej): tectonic, erosion, fractured — w każdej grupie dwie planety (seedy 1:17:4 i 1:52:3).
Widok 2D jak w grze. Kombinacja niezgodna z profilem jest przygaszona i przekreślona.

**Kombinacje niezgodne:**
- **barren × erosion** — bez wody i atmosfery nie ma erozji wodnej — doliny rzeczne byłyby fałszywym śladem

**Metryki** (model na siatce detail 24): ląd — udział lądu; chaos — udział drobnych nierówności; stromość — średnia różnica wysokości z sąsiadem; płaskie — udział prawie płaskiego lądu; igła — największe odchylenie od sąsiadów; pieczenie — czas liczenia kształtu (ms, komputer, nie iPad).

| Profil | Metoda | Seed | Ląd | Chaos | Stromość | Płaskie | Igła | Pieczenie (ms) |
|---|---|---|---|---|---|---|---|---|
| terrestrial | tectonic (preferowana) | 1:17:4 | 0,45 | 0,051 | 0,0144 | 0,055 | 0,050 | 85 |
| terrestrial | tectonic (preferowana) | 1:52:3 | 0,79 | 0,059 | 0,0156 | 0,029 | 0,088 | 45 |
| terrestrial | erosion | 1:17:4 | 0,45 | 0,083 | 0,0234 | 0,001 | 0,056 | 198 |
| terrestrial | erosion | 1:52:3 | 0,79 | 0,064 | 0,0164 | 0,003 | 0,038 | 132 |
| terrestrial | fractured | 1:17:4 | 0,45 | 0,214 | 0,0381 | 0,000 | 0,129 | 42 |
| terrestrial | fractured | 1:52:3 | 0,80 | 0,195 | 0,0405 | 0,000 | 0,128 | 23 |
| arid | tectonic | 1:17:4 | 0,93 | 0,078 | 0,0161 | 0,007 | 0,079 | 37 |
| arid | tectonic | 1:52:3 | 0,95 | 0,062 | 0,0184 | 0,005 | 0,069 | 39 |
| arid | erosion (preferowana) | 1:17:4 | 0,93 | 0,070 | 0,0187 | 0,001 | 0,043 | 142 |
| arid | erosion (preferowana) | 1:52:3 | 0,95 | 0,063 | 0,0214 | 0,002 | 0,078 | 140 |
| arid | fractured | 1:17:4 | 0,93 | 0,222 | 0,0404 | 0,000 | 0,162 | 33 |
| arid | fractured | 1:52:3 | 0,95 | 0,219 | 0,0445 | 0,000 | 0,199 | 21 |
| ice | tectonic (preferowana) | 1:17:4 | 0,50 | 0,065 | 0,0191 | 0,022 | 0,090 | 36 |
| ice | tectonic (preferowana) | 1:52:3 | 0,68 | 0,072 | 0,0155 | 0,077 | 0,072 | 40 |
| ice | erosion | 1:17:4 | 0,50 | 0,059 | 0,0183 | 0,006 | 0,035 | 108 |
| ice | erosion | 1:52:3 | 0,68 | 0,058 | 0,0158 | 0,007 | 0,037 | 141 |
| ice | fractured | 1:17:4 | 0,50 | 0,193 | 0,0385 | 0,000 | 0,165 | 21 |
| ice | fractured | 1:52:3 | 0,69 | 0,216 | 0,0331 | 0,000 | 0,124 | 21 |
| oceanic | tectonic (preferowana) | 1:17:4 | 0,13 | 0,073 | 0,0209 | 0,001 | 0,062 | 35 |
| oceanic | tectonic (preferowana) | 1:52:3 | 0,16 | 0,072 | 0,0214 | 0,000 | 0,081 | 35 |
| oceanic | erosion | 1:17:4 | 0,13 | 0,087 | 0,0272 | 0,001 | 0,061 | 110 |
| oceanic | erosion | 1:52:3 | 0,16 | 0,068 | 0,0230 | 0,001 | 0,050 | 108 |
| oceanic | fractured | 1:17:4 | 0,13 | 0,263 | 0,0434 | 0,000 | 0,168 | 20 |
| oceanic | fractured | 1:52:3 | 0,16 | 0,232 | 0,0432 | 0,000 | 0,155 | 21 |
| volcanic | tectonic | 1:17:4 | 0,74 | 0,079 | 0,0168 | 0,016 | 0,107 | 37 |
| volcanic | tectonic | 1:52:3 | 0,66 | 0,080 | 0,0199 | 0,003 | 0,108 | 36 |
| volcanic | erosion | 1:17:4 | 0,74 | 0,088 | 0,0235 | 0,001 | 0,054 | 131 |
| volcanic | erosion | 1:52:3 | 0,66 | 0,085 | 0,0263 | 0,000 | 0,066 | 127 |
| volcanic | fractured (preferowana) | 1:17:4 | 0,74 | 0,256 | 0,0473 | 0,000 | 0,152 | 39 |
| volcanic | fractured (preferowana) | 1:52:3 | 0,65 | 0,269 | 0,0514 | 0,000 | 0,226 | 20 |
| barren | tectonic | 1:17:4 | 1,00 | 0,068 | 0,0172 | 0,005 | 0,072 | 37 |
| barren | tectonic | 1:52:3 | 1,00 | 0,077 | 0,0231 | 0,001 | 0,112 | 35 |
| barren | erosion ✗ | 1:17:4 | 1,00 | 0,079 | 0,0261 | 0,000 | 0,056 | 184 |
| barren | erosion ✗ | 1:52:3 | 1,00 | 0,075 | 0,0261 | 0,000 | 0,048 | 151 |
| barren | fractured (preferowana) | 1:17:4 | 1,00 | 0,250 | 0,0441 | 0,000 | 0,131 | 23 |
| barren | fractured (preferowana) | 1:52:3 | 1,00 | 0,257 | 0,0466 | 0,000 | 0,172 | 22 |
