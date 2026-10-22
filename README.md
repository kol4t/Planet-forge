# Planet Forge

Przeglądarkowa gra strategiczna science-fiction: jedna planeta 3D generowana z seeda, kolonia rosnąca na jej powierzchni i pierwsza pętla ekonomii. Wersja **0.9**, projektowana pod **iPada i Safari**.

## Jak zagrać

- **Gra online: https://kol4t.github.io/Planet-forge/** (publikowana automatycznie z gałęzi `main`).
- Gra to folder `dist/` — wrzuć go w całości na hosting https (np. GitHub Pages, Cloudflare Pages). Na iPadzie otwórz adres w Safari → „Udostępnij” → „Do ekranu początkowego”: gra otwiera się z ikony na pełnym ekranie i działa offline.
- Sam plik `dist/index.html` też da się otworzyć w przeglądarce (bez trybu offline i ikony).
- Safari i aplikacja z ekranu początkowego mają osobną pamięć. Postęp przenosisz w „Ustawienia” → „Kopiuj zapis” / „Wczytaj zapis”.
- Obracaj planetę palcem. Ulepszaj budynki przyciskami po prawej (poziomo) lub na dole (pionowo).
- Ulepszenie trwa (30 s × docelowy poziom), naraz buduje się jeden budynek. Na planecie widać złote rusztowanie, a po ukończeniu wyrasta nowa budowla. Budowę można anulować (drugie dotknięcie potwierdza) — koszt wraca w całości. Do poziomu 5 budowę można też ukończyć od razu za darmo („Ukończ teraz”), wyżej za antymaterię (1 za każde rozpoczęte 15 minut).
- Antymateria przybywa sama (1 na godzinę, także offline) i szybciej z Kolektorem antymaterii.
- Magazyn mieści ograniczoną ilość metalu i kryształów (paski pod liczbami u góry). Pełny magazyn zatrzymuje wydobycie — rozbuduj Magazyn.
- Elektrownia zasila kopalnie — gdy energii brakuje, wydobycie spada (pasek „ENERGIA” robi się czerwony).
- „Nowa planeta” losuje nowy seed — a z nim typ planety (umiarkowana, pustynna, lodowa, oceaniczna lub wulkaniczna) — i zaczyna grę od nowa.

## Dla programisty / Claude Code

Wymagany Node.js ≥ 22.18.

```sh
npm install
npm run dev        # podgląd na http://localhost:5173
npm run check      # typy + testy + budowanie
```

Instrukcje i zasady architektury: **`CLAUDE.md`**. Decyzje: `docs/decisions.md`.

## Lista kontrolna — test na iPadzie (Safari)

1. Strona się ładuje, napis „Przygotowywanie ekspedycji…” znika, widać planetę i panele.
2. Przeciągnięcie palcem po planecie ją obraca; szybki ruch → planeta kręci się dalej i zwalnia.
3. Przeciągnięcie palcem zaczęte **na panelu** nie obraca planety i nie przewija strony.
4. Dwa palce / szczypanie nie powiększa strony.
5. „Ulepsz do 2” przy Elektrowni: zasoby maleją, startuje budowa (pasek i odliczanie), po minucie poziom rośnie i pojawia się zielony komunikat.
6. Przycisk bez zasobów pokazuje „Dostępne za m:ss”; dotknięcie → czerwony komunikat „Brakuje: …”.
7. Obrót iPada pionowo ↔ poziomo: układ przebudowuje się, nic nie wychodzi poza ekran.
8. Zamknij kartę, otwórz po kilku minutach: postęp zachowany + komunikat o produkcji podczas nieobecności.
9. „Nowa planeta” → „Generuj”: inny wygląd i parametry; „Anuluj” nic nie zmienia.
10. Planeta obraca się płynnie (bez wyraźnego szarpania) przez ~1 minutę.
11. **Nowe w 0.2:** krawędź planety ma miękką poświatę — bez jasnego pierścienia („aureoli”).
12. **Nowe w 0.2:** po udanym „Ulepsz” planeta sama obraca się do kolonii, a nowa budowla wyrasta z animacją. Dotknięcie planety w trakcie przerywa obrót.
13. **Nowe w 0.2:** kilka razy „Nowa planeta” → pojawiają się różne typy (pustynna, lodowa, oceaniczna, wulkaniczna ze świecącą lawą); nazwa i typ widoczne w panelu planety.
14. **Nowe w 0.2:** płynność obrotu (pkt 10) także na planecie z rozbudowaną kolonią.
15. **Nowe w 0.3:** w trakcie budowy pozostałe budynki pokazują „Trwa inna budowa”; dotknięcie → komunikat, którą budowę trzeba dokończyć.
16. **Nowe w 0.3:** „Anuluj budowę” → przycisk zmienia się na „Na pewno anulować?”; drugie dotknięcie zwraca cały koszt. Po 3 s bez dotknięcia przycisk wraca do „Anuluj budowę”.
17. **Nowe w 0.3:** rozpocznij budowę, zamknij kartę na dłużej niż czas budowy, wróć: komunikat „Ukończono: …”, poziom podniesiony, planeta pokazuje nową budowlę.
18. **Nowe w 0.4:** karta „Magazyn” jest czwarta; pod metalem i kryształami u góry widać paski zapełnienia.
19. **Nowe w 0.4:** podczas budowy do poz. 5 obok „Anuluj” jest „Ukończ teraz”: dotknięcie → budowa od razu gotowa, nic nie kosztuje. Przy budowie poz. 6+ widać tylko „Anuluj budowę”.
20. **Nowe w 0.4:** gdy magazyn jest pełny, zamiast „+X/min” pojawia się czerwone „magazyn pełny”, a liczba przestaje rosnąć. Budynek droższy niż pojemność magazynu pokazuje „Za mały magazyn”.
21. **Nowe w 0.4:** na planecie pojawiają się silosy magazynu (czwarta dzielnica kolonii).
22. **Nowe w 0.5:** u góry czwarta kolumna „ANTYMATERIA” (na start 5, „+1,0/h”). W poziomie karta „Kolektor antymaterii” stoi pod panelem planety, w pionie karty układają się 3 + 2.
23. **Nowe w 0.5:** budowa poziomu 6+ → przycisk „Ukończ (N)”; dotknięcie kończy budowę i zabiera N antymaterii (komunikat pokazuje koszt). Bez antymaterii przycisk jest szary, a dotknięcie mówi, ile brakuje.
24. **Nowe w 0.5:** zbuduj Kolektor (poz. 1): przyrost antymaterii rośnie, na planecie pojawia się iglica z fioletową kulą.

### PWA (od 0.6, na grze z hostingu https)

25. Safari → adres gry → „Udostępnij” → „Do ekranu początkowego” → „Dodaj”: na ekranie jest ikona planety ze złotą orbitą i nazwa „Planet Forge”.
26. Otwarcie z ikony: pełny ekran bez paska Safari; pasek zasobów nie wchodzi pod zegar/baterię (także po obrocie iPada).
27. Tryb samolotowy → zamknij aplikację (przesuń w górę w przełączniku aplikacji) → otwórz z ikony: gra startuje i działa (produkcja, budowy), postęp się zapisuje.
28. „Ustawienia” → „Kopiuj zapis” → zielony komunikat; wklej w Notatkach: tekst zaczyna się od „PF1:”.
29. „Ustawienia” → „Wczytaj zapis” → wklej zły tekst → czerwony błąd po polsku, gra bez zmian; wklej poprawny → planeta i postęp z zapisu.
30. Po wgraniu nowej wersji na hosting i ponownym otwarciu aplikacji: pasek „Dostępna aktualizacja” → „Odśwież” → gra przeładowuje się w nowej wersji, postęp zostaje.
31. **Nowe w 0.6.1:** gra z ikony uruchamia się i działa ponad minutę bez restartu iPada.
32. **Nowe w 0.6.1:** „Ustawienia” → „Grafika”: „Tryb 2D” przełącza na planetę 2D (gra się przeładowuje), „Włącz 3D” wraca. „Diagnostyka” kopiuje raport do schowka.

### Od 0.7: planeta 2D, kilka planet

33. Start: pikselowa planeta 2D z obrotem palcem; budowle to kolorowe kwadraciki, plac budowy — złota ramka wypełniająca się od dołu.
34. „Ustawienia” → „Włącz 3D” → gra przeładowuje się z planetą 3D; „Wróć do 2D” wraca.
35. „Planety” → lista z Twoją planetą („Tu jesteś”) i „Zajęte miejsca: 1 z 5”. „Nowa planeta” → nowa planeta, stara zostaje na liście.
36. „Planety” → „Przejdź” przy starej planecie → wraca z całym postępem (+ to, co wyprodukowała w międzyczasie). Antymateria jest wspólna.
37. „Usuń” przy nieaktywnej planecie → „Na pewno?” → drugie dotknięcie usuwa. Przy 5 planetach „Nowa planeta” jest wyszarzona.
38. „Ustawienia” → „Diagnostyka” po minucie gry: wiersz „płynność (ostatnia minuta)”.

### Od 0.8: przybliżanie i miniatury

39. Dwa palce na planecie, rozsuń → planeta się przybliża (ostre piksele terenu, budowle jako wyraźne kwadraty); zsuń → oddala do całej planety.
40. Po przybliżeniu jeden palec nadal obraca planetę (wolniej — teren zostaje pod palcem). Gest zaczęty na panelu nie przybliża.
41. „Planety” → przy każdej planecie mała, obracająca się pikselowa miniatura w jej kolorach.
42. Lodowa planeta: krawędź lodu wyraźna i nieregularna, bez rozmytych pionowych smug.

### Od 0.9: zwijane panele (nieaktualne od 0.19 — zastąpione dolnym paskiem)

43. Poziomo: panel planety po lewej z przyciskiem „–” w prawym górnym rogu → zostaje nazwa, typ, seed, klasa i przyciski; „+” rozwija z powrotem.
44. Poziomo: „Produkcja” po prawej z przyciskiem ☰ → zwija się do zakładki „PRODUKCJA” (z paskiem postępu, gdy coś się buduje); dotknięcie zakładki rozwija.
45. Po zwinięciu paneli planeta płynnie rośnie. iPad w pionie: panele też po bokach — otwarta „Produkcja” odsuwa planetę w lewo, panel planety w prawo, po zamknięciu obu planeta wraca na środek.
46. Zamknij i otwórz grę: panele są tak, jak je zostawiłeś.

### Od 0.10: badania — galaktyka

47. „Produkcja” → nowa karta **Laboratorium** (poz. 0). Poziomo karta stoi pod panelem planety, planeta nie maleje. Ulepsz do 1.
48. „Badania” (w panelu planety albo na karcie Laboratorium) → ekran galaktyki: złote jądro w środku, 6 spiralnych ramion. Produktywność i Planetologia świecą, pozostałe są podpisane „wkrótce”.
49. Przesuń mapę palcem, przybliż dwoma palcami (przy zbliżeniu pojawiają się nazwy gwiazd). Dotknij gwiazdy → na dole szczegóły: efekt, koszt, czas.
50. „Podstawy przemysłu” → „Badaj” → koszt znika z zasobów, na gwieździe złoty pierścień postępu, na dole odliczanie. Druga gwiazda → „Trwa inne badanie”.
51. „Anuluj” → „Na pewno?” → zwrot kosztu. Gwiazda z pierścienia 2 przy Laboratorium poz. 1 → „Laboratorium 2”.
52. Po ukończeniu: komunikat „Zbadano: …”, gwiazda wypełniona, produkcja metalu i kryształów rośnie. Badanie kończy się też przy zamkniętej grze.
53. „Zamknij” → wracasz do planety; obrót i przybliżanie planety działają jak wcześniej.

### Od 0.11: mapa galaktyki

54. Panel planety pokazuje adres (np. „adres 1:4:7”); Twoja planeta i postęp są takie jak wcześniej.
55. „Mapa” → galaktyka: 100 układów jako kolorowe gwiazdy, Twój układ ze złotym pierścieniem i podpisem. Przesuń palcem, przybliż dwoma (pojawiają się nazwy układów). Dotknij układu → szczegóły (gwiazda, liczba planet, miejsca startowe graczy).
56. „Pokaż układ” → gwiazda w środku, planety na orbitach (miniatury). Złoty pierścień — Twoja, czerwony — inny gracz (bot), fioletowy — forma obca, bez pierścienia — wolna.
57. Dotknij wolnej planety w swoim układzie → „Skolonizuj” → gra przechodzi na nową planetę, komunikat „Skolonizowano: …”. Typ planety pasuje do miejsca: blisko gorącej gwiazdy pustynie i wulkany, daleko lód.
58. Planeta w innym układzie → „Wymaga statku”; dotknięcie wyjaśnia, że potrzebne będą badanie i statek kolonizacyjny.
59. „Planety” → przy każdej planecie adres; przycisk „Mapa układu” otwiera Twój układ.

### Od 0.12: wygląd galaktyki, gazowe olbrzymy, pasy asteroid, komety

60. „Mapa” → galaktyka wygląda jak prawdziwa galaktyka spiralna: jasne jądro, dwa ramiona z tysiącami drobnych gwiazd i ciemnymi pasami pyłu. Twój układ i postęp bez zmian.
61. Co kilka sekund przez galaktykę przelatuje kometa z warkoczem (maks. 3 naraz).
62. W układach: gazowe olbrzymy (większe tarcze w pasy, część z pierścieniem) — dotknięcie: „Gazowy olbrzym”, nie da się skolonizować.
63. W części układów pas asteroid za 3. albo 4. planetą — dotknij pasa → „Pas asteroid”, wydobycie wkrótce.

### Od 0.13: statek kolonizacyjny, Imperium, dziennik

64. Panel planety: „Planety” zmieniło się w „Imperium” → ekran z kartą każdej planety (miniatura, adres, metal i kryształy z przyrostem, trwająca budowa z paskiem), „Przejdź”, „Usuń” (dwa dotknięcia). Na górze suma produkcji całego imperium.
65. „Imperium” → „Dziennik”: wpisy z godziną — ukończone budowy, badania, kolonie, statki, podsumowanie nieobecności. Lista przewija się palcem.
66. „Badania” → ramię Eksploracja świeci; „Napęd międzygwiezdny” (pierścień 1) można zbadać.
67. Po zbadaniu: „Mapa” → inny układ → wolna planeta → widać koszt i czas lotu → „Wyślij statek”. Na mapie galaktyki złota przerywana trasa i statek; przy planecie przerywany pierścień i odliczanie. „Zawróć statek” zwraca koszt.
68. Po przylocie (także przy zamkniętej grze): komunikat „Statek dotarł — skolonizowano …”, nowa planeta w „Imperium” (gra nie przełącza się sama).

### Od 0.14: SI Matka

69. „Badania” → ramię SI świeci; zbadaj „SI Matka” (pierścień 1).
70. Po zbadaniu na ekranie planety pojawia się dymek „SI MATKA” z propozycją i powodem, np. przy braku energii: „Ulepszyć Elektrownię do poz. …?”. „Tak” → budowa rusza; „Nie” → SI nie pyta o to przez 10 minut.
71. Kolejność ważności: energia → magazyn (≥ 90%) → badanie (gdy Laboratorium nic nie bada) → kopalnie (gdy nic się nie buduje).
72. Po zbadaniu „SI wykonawcze” (pierścień 2) w dymku jest „Zawsze tak rób” — od tej chwili ta reguła działa sama: komunikat „SI Matka: …” i wpis w Dzienniku.
73. „Imperium” → „SI”: dla każdej reguły „Podpowiada” / „Pyta” / „Działa samo” (to ostatnie po „SI wykonawcze”). Ustawienia zostają po zamknięciu gry.

### Od 0.15: badania na planetę, limit SI, SI przy zamkniętej grze

74. Twoje dotychczasowe badania są na każdej Twojej planecie (nic nie przepadło). „Badania” pokazują u góry nazwę planety i jej Laboratorium.
75. Nowa kolonia ma pustą galaktykę badań — bada od zera własnym Laboratorium; efekty (np. +10% metalu) działają tylko na planecie, która zbadała. Statek kolonizacyjny, SI i dodatkowe miejsce na planetę działają w całym imperium, jeśli zbadała je którakolwiek planeta.
76. SI proponuje budynki najwyżej do poziomu Laboratorium tej planety (np. Laboratorium 5 → inne budynki do 5); samo Laboratorium ulepszasz sam.
77. Badania → SI → „Autonomia” (pierścień 3): po zbadaniu reguły „Działa samo” budują także przy zamkniętej grze, każda budowa o 50% dłużej. Po powrocie: Imperium → Dziennik — wpisy „SI Matka (podczas nieobecności)”.

### Od 0.16: planeta 3D w stylu low-poly

Ustawienia → „Grafika” → „Włącz 3D” (domyślnie gra pokazuje planetę 2D).

78. Planeta 3D ma ostre fasety: kontynenty i lodowce z wyraźnymi krawędziami, płaskowyże i uskoki (tarasy), ciemniejsze strome zbocza.
79. Nocna strona jest ciemna, ale nie czarna — widać zarys planety; atmosfera to cienka poświata przy krawędzi.
80. Planeta lodowa: lód na biegunach i tafle zamarzniętego morza są widoczne nad wodą. Planeta wulkaniczna: lawa nadal świeci.
81. Puść planetę po obrocie — po chwili sama zaczyna się powoli obracać, łagodnie (bez szarpnięcia). Gwiazdy w tle przesuwają się lekko przy obrocie (dwie warstwy).
82. Jeśli w iPadzie włączone jest Ustawienia → Dostępność → Ruch → „Ogranicz ruch”: planeta nie obraca się sama, gwiazdy stoją.
83. Płynność: Ustawienia gry → „Diagnostyka” — licznik kl./s przy obracaniu (porównaj z v0.15: ok. 53–60). Gra nie może się wyłączać ani przełączać sama na 2D.

### Od 0.17: kosmos, który żyje (etap 2 modernizacji wyglądu)

84. Za planetą (2D i 3D) widać głębię: drobne dalekie gwiazdy, jaśniejsze bliższe (kilka z krzyżykiem blasku), delikatny pas galaktyki i słabe mgławice — inne dla każdej planety.
85. Obróć planetę palcem: gwiazdy lekko się przesuwają (bliższe szybciej), po puszczeniu wracają na miejsce. Kilka gwiazd powoli migocze; co jakiś czas (rzadko) przelatuje spadająca gwiazda.
86. Obok planety widać 1–2 sąsiednie planety Twojego układu (te same co na „Mapie” — skaliste albo gazowe olbrzymy). Na telefonie w pionie, gdy brak miejsca, chowają się.
87. Planeta 2D: wyraźniejsza granica dnia i nocy, ciemniejsza noc (zarys lądu nadal widać), cieńsza poświata atmosfery. Lawa na planecie wulkanicznej świeci także po nocnej stronie.
88. Ustawienia iPada → Dostępność → Ruch → „Ogranicz ruch”: tło stoi, gwiazdy nie migoczą, brak spadających gwiazd, planeta nie obraca się sama (także w 2D).
89. Płynność: Ustawienia gry → „Diagnostyka” — licznik kl./s przy obracaniu, w 2D i w 3D (porównaj z poprzednią wersją).

### Od 0.18: nowy fundament terenu i planety jałowe (przebudowa generatora, etap 2)

90. Twoje planety wyglądają **dokładnie tak samo** jak w 0.17 (teren liczy się teraz w nowym miejscu, ale tym samym algorytmem), surowce i rozmiary bez zmian, zapis wczytuje się normalnie.
91. „Mapa” → układy blisko gorącej gwiazdy albo daleko od niej: pojawiają się planety **„jałowa, bez atmosfery”** — szarobrązowe skały i pył, bez wody, małe szronowe czapy na biegunach. Dotknij takiej planety: podgląd i opis jak u innych typów.
92. Pozostałe planety na mapie mają te same typy co w 0.17 (zmieniły się tylko te, które stały się jałowe — nigdy miejsca startowe ani Twoje planety).
93. Skolonizuj (albo wyślij statek na) planetę jałową: gra działa jak z innymi typami, w panelu planety typ „jałowa, bez atmosfery”.

### Od 0.19: nowy układ ekranu

94. U góry pasek zasobów, na dole pasek z przyciskami: ☰, Produkcja, Badania, Mapa, Imperium, Planeta, SI (na telefonie część przycisków jest pod ☰).
95. Dotknij „Produkcja”: nad paskiem wysuwa się panel z kartami budynków (iPad: po lewej, planeta przesuwa się w prawo). Drugie dotknięcie zamyka panel. To samo dla „Planeta” i „SI”.
96. Gdy coś się buduje, a panel „Produkcja” jest zamknięty, na przycisku „Produkcja” widać cienki złoty pasek postępu.
97. Planeta jest mniejsza niż dawniej (najwyżej ok. 1/3 ekranu) i nie chowa się pod panelem. Obróć iPada — układ się dopasowuje, w obu orientacjach da się obracać planetę palcem.
98. Zamknij i otwórz grę: otwarty panel jest taki, jak go zostawiłeś.

### Od 0.20: ulepszanie dotknięciem budowli

99. Przybliż planetę dwoma palcami prawie do końca (od ok. 3×). Krótko dotknij budowli: otwiera się okienko „Budynek” z kartą jak w „Produkcji” (Ulepsz / Ukończ teraz / Anuluj).
100. Przy małym przybliżeniu dotknięcie planety niczego nie otwiera, a przeciągnięcie palcem nadal obraca planetę (nie otwiera okienka).
101. Sprawdź w 2D i w 3D (Ustawienia → Grafika).

### Od 0.21: lista planet pod ☰

102. Dotknij ☰: wysuwa się panel „Planety” z miniaturami Twoich planet i ich stanem (np. trwająca budowa).
103. Dotknij innej planety na liście: gra przełącza się na nią. Pod listą są „Ustawienia” (i na telefonie przyciski, które nie zmieściły się na pasku).
104. Przy wielu planetach pod listą pojawia się „…i jeszcze N — wszystkie w „Imperium””.

### Od 0.22: trzy metody terenu (przebudowa generatora, etap 3)

105. Twoje planety mają **nowy teren** (surowce, rozmiar i budynki bez zmian, zapis wczytuje się normalnie). Proporcja lądu i wody jest podobna jak wcześniej.
106. Planeta umiarkowana, lodowa i oceaniczna: duże kontynenty o gładszych brzegach, a wzdłuż części wybrzeży pasma gór (jaśniejsze, ośnieżone grzbiety).
107. Planeta pustynna: łagodniejsze wyżyny, rozgałęzione doliny schodzące do nizin i mórz.
108. Planeta wulkaniczna i jałowa: wyraźne okrągłe kratery (misa z wałem, duże z płaskim dnem), proste uskoki i szczeliny.
109. „Mapa” → otwórz kilka układów i „Imperium”: miniatury rysują się normalnie; pierwsze otwarcie układu może trwać chwilę dłużej (teren liczy się raz).
110. Sprawdź w 2D i w 3D (Ustawienia → Grafika). Płynność: Ustawienia → „Diagnostyka” — porównaj z pomiarem z 0.21 (3D: 59 średnio / 48 najsłabsza sekunda; 2D: 58 / 50).

Uwaga: w trybie prywatnym Safari zapis może nie działać — gra działa, ale bez zapamiętywania postępu.
