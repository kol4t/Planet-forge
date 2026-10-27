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
111. Obrót przez biegun: przeciągnij planetę palcem w górę albo w dół — da się ją przekręcić przez biegun i dalej, aż do pełnego obrotu (wcześniej zatrzymywała się przed biegunem). Za biegunem ruch w bok nadal przesuwa powierzchnię za palcem. Po puszczeniu planeta powoli wraca biegunem do góry.

### Od 0.23: profile powierzchni (przebudowa generatora, etap 4)

112. Część planet ma **inny kształt terenu niż w 0.22** (np. umiarkowana z dolinami erozji albo kraterami zamiast płyt) — metoda jest teraz losowana z profilu planety. Planeta startowa wygląda jak w 0.22. Kolory, proporcja lądu i wody, surowce — bez zmian.
113. „Mapa” → otwórz kilka układów: planety tego samego typu różnią się kształtem terenu, a jałowe nigdy nie mają dolin rzecznych.
114. Ustawienia → „Włącz 3D”: po przeładowaniu planeta jest obrócona tak samo jak w 2D (i odwrotnie przy „Wróć do 2D”).
115. Atlas: na GitHubie otwórz `docs/atlas/metryki.md` — obrazek wszystkich profili i metod oraz tabela liczb.

### Od 0.24: woda i lawa (przebudowa generatora, etap 5)

116. Planety z wodą (umiarkowana, lodowa, oceaniczna, pustynna) mają **jeziora** w zagłębieniach lądu (na lodowej — zamarznięte) i **rzeki** — cienkie wstęgi wody spływające do morza albo jeziora. Na pustyni jezior i rzek jest mało.
117. Planeta wulkaniczna: **jeziora lawy** w kraterach i jasne **strumienie lawy** schodzące ze szczytów; świecą także po nocnej stronie. W 3D lawa lekko „oddycha” (pulsuje jasnością).
118. Planeta jałowa: bez wody i lawy na lądzie.
119. 3D: jezioro ma płaską taflę; budowle nie stoją w jeziorach, rzekach ani w lawie.
120. „Mapa” i „Imperium”: miniatury rysują się tak szybko jak w 0.23.
121. Płynność: Ustawienia → „Diagnostyka” — porównaj z 0.23 (3D: średnio 60, najsłabsza sekunda 53). Ważne: także na planecie wulkanicznej w 3D (jedna dodatkowa siatka lawy).

### Od 0.25: lawa, kolory, kamera (przebudowa generatora, etap 6)

122. Planeta wulkaniczna: zamiast jednolitych pomarańczowych plam — **ciemna skorupa z żarzącymi się pęknięciami** (morze lawy i jeziora w kraterach); najjaśniejsze są tylko strumienie lawy przy szczytach. W 2D i 3D ten sam wzór, świeci także nocą.
123. Kolory lądu nieco inne: pustynia ma piaszczyste niziny i rdzawe skały, planeta lodowa szare skały pod śniegiem, wulkaniczna popiół i bazalt.
124. W prawym dolnym rogu obok planety trzy okrągłe przyciski: **„+”** przybliża, **„−”** oddala (do 0,8× — planeta z kawałkiem nieba), **celownik** wraca do widoku startowego (1×, biegun u góry). Przybliżanie (także palcami) jest płynne.
125. Telefon poziomo z otwartym panelem: przyciski chowają się (brak miejsca), szczypanie działa.
126. Przełączanie planet (☰ → inna planeta) powinno przycinać się krócej niż w 0.24. Płynność: Ustawienia → „Diagnostyka” po ok. 60 s obracania, także na planecie wulkanicznej w 3D.

### Od 0.25.1

127. Przybliż planetę (np. „+” dwa razy), potem Ustawienia → „Włącz 3D” / „Wróć do 2D”: po przeładowaniu planeta jest tak samo przybliżona i obrócona; „−” oddala dalej od tego przybliżenia.

### Od 0.25.2

128. Dotknij budowli na planecie przy dowolnym przybliżeniu (także bez przybliżania): planeta obraca się do niej, przybliża do 1,5× i otwiera się okienko budynku z „Ulepsz”. Ustawienia → „Widok” → „3× — z bliska”: od teraz przybliża do 3× (wybór zostaje po zamknięciu gry).
129. „Produkcja” → dotknij karty budynku (np. w nazwę „Elektrownia”, nie w przycisk): planeta pokazuje ten budynek z bliska. Budynek na poz. 0 → komunikat „nie stoi jeszcze na planecie”.
130. Pokazany budynek zostaje w kadrze (planeta nie obraca się sama); po dotknięciu planety albo „Resetuj widok” autoobrót wraca. Przy przybliżeniu od ok. 2× planeta też nie obraca się sama.
131. Komputer, 3D: obracanie powinno być płynne także na dużym monitorze. Ustawienia → „Diagnostyka” pokazuje „rozdzielczość N%” — gra sama obniża ostrość, gdy karta graficzna nie nadąża.

### Od 0.26: pola planety

132. Panel „Planeta”: wiersz **POLA** — zajęte / pola do zabudowy (np. „4 / 100 zajęte”; planeta startowa ma zawsze 100). Gdy wszystkie są zajęte, wiersz robi się czerwony („brak wolnych”).
133. Każde ulepszenie zajmuje jedno pole: nowa budowla staje na wolnym polu lądu obok reszty swojego budynku. Gdy pól brak, „Ulepsz” pokazuje „Brak wolnych pól…”. SI Matka też nie buduje.
134. Ustawienia → „Widok” → **„Siatka pól: ukryta — pokaż”**: na lądzie widać pola (turkusowe — wolne, złote — zajęte); morza, lód i lawa leżą między nimi. W 2D i 3D. Wybór zostaje po zamknięciu gry.
135. Budowle nie przeskakują: rozbuduj jeden budynek i zobacz, że pozostałe stoją na tych samych polach.
136. Nowe planety z mapy mają różną liczbę pól (zwykle ok. 100, rzadko ok. 30 albo ok. 200) — liczba wynika z seeda planety, niezależnie od tego, ile na niej wody.

### Od 0.26.1: grupy budowli i zarządzanie

137. Jedno pole mieści 3 poziomy jednego budynku (3 budowle obok siebie). Rozbuduj kopalnię metalu z poz. 1 do 3 — wiersz POLA w panelu „Planeta” się nie zmienia; poz. 4 zajmuje nowe pole.
138. Każda karta (poza kolektorem antymaterii) ma w prawym górnym rogu mały kwadrat z suwakami → okno **„Zarządzanie”**. Przesuń „Produktywność” na 50%: wydobycie i zużycie energii spadają o połowę (pasek zasobów u góry). 0% wyłącza budynek.
139. „Energia — pierwszeństwo”: gdy energii brakuje, budynek z wyższym pierwszeństwem dostaje ją pierwszy (wiersz „Energia: dostaje N% potrzebnej”).
140. Okno pokazuje najlepszy teren budynku: kopalnia metalu — wzgórza, ekstraktor kryształów — doliny, góry i lód, elektrownia — brzeg. Budynki poza dobrym terenem pracują w 75%.

### Od 0.26.2

141. Budowle nie stoją w wodzie: grupa (do 3 budowli) stoi zwartą kępką na lądzie pola, na wyspie — przy jej środku. Włącz siatkę pól i obejrzyj wybrzeża z bliska.
142. Pasek u góry, po prawej od antymaterii: **POLA** zajęte/do zabudowy (np. „4/100”) ze złotym paskiem; gdy brak wolnych — na czerwono. Lista planet (☰) pokazuje „pola N/M” przy metalu i kryształach każdej planety.

### Od 0.26.3

143. Widok 3D: nizinne wybrzeża są lądem (wcześniej wyglądały jak płycizna). Linia brzegu w 3D zgadza się z 2D i z siatką pól.
144. Po aktualizacji budowle jednorazowo się przestawiają (nowa, dokładniejsza siatka pól) — poziomy i zasoby bez zmian.
145. Ekstraktor kryształów staje najpierw na lodzie (czapy polarne, lodowce); na lądzie dopiero, gdy wolnego lodu brak. Lód nie zmniejsza liczby wolnych POLA.

### Od 0.26.4: siatka z mapy powierzchni

146. Siatka pól (Ustawienia → Widok) leży tylko na lądzie i lodzie: granice biegną wzdłuż brzegów i omijają jeziora; morza i lawa są bez pól.
147. Bieguny: czapy lodowe podzielone na pola (jasnobłękitne linie); ekstraktory kryształów stoją na lodzie.
148. Zajęte pole ma złoty obrys w 2D i w 3D (cała granica, także wspólna z wolnym sąsiadem).
149. Grupy budowli stoją w środkach pól i nie nachodzą na grupy z sąsiednich pól. Po aktualizacji budowle jednorazowo się przestawiają.

### Od 0.26.5: zgłoszenia

150. ☰ → Ustawienia → **„Zgłoś / diagnostyka”**: okno z rubrykami „Błąd” i „Sugestia, propozycja zmiany”, polami tytułu i opisu (klawiatura iPada), zaznaczeniem „Dołącz diagnostykę” i „Dołącz zapis gry”, podglądem diagnostyki.
151. „Wyślij na GitHub” otwiera gotowe zgłoszenie w repozytorium (po zalogowaniu wystarczy „Create”); „Kopiuj” kopiuje całe zgłoszenie (dla osób bez konta GitHub).
152. Wpisany tekst zostaje po powrocie z GitHuba; „Wyczyść zgłoszenie” go usuwa.

### Od 0.27: skończone złoża

153. Panel **„Planeta”**: pod paskami „ZŁOŻA” dwa wiersze — „Metal: zostało … z … (…%) · wyczerpie się za ok. …” i to samo dla kryształów. Na nowej planecie złoża są pełne (100%); stare zapisy też zaczynają od pełnych złóż.
154. Ikona ustawień na karcie kopalni (**„Zarządzanie”**): na dole wiersz o złożu tej kopalni.
155. Gdy złoże się wyczerpie: karta kopalni pisze na czerwono „Złoże wyczerpane — kopalnia stoi”, surowiec rośnie już tylko o przyrost podstawowy (+6/min metalu, +3/min kryształów), zgromadzone surowce zostają, a energia przechodzi na inne budynki.

### Od 0.28: informacja geologiczna

156. **Mapa** → układ → dotknij wolnej planety: pod typem planety są linijki „Bogactwo złóż: …”, „Pola: … · Złoże: metal … · kryształy …” i „Względem <Twoja planeta>: metal +…% · kryształy −…% · pola +…”.
157. Dotknij swojej planety na mapie: zamiast „Złoże” jest „Zostało: metal … z … · kryształy … z …”.

### Od 0.29: animacje

158. Dotknij **Planeta** albo **Produkcja** na dolnym pasku: panel krótko wjeżdża od dołu.
159. Rozpocznij budowę: karta budynku błyska na złoto, a liczby metalu i kryształów w górnym pasku zmniejszają się płynnie.
160. Z włączonym „Ogranicz ruch” (Ustawienia iPada → Dostępność → Ruch) wszystko dzieje się od razu, bez animacji.

### Od 0.30: płynniejszy start i zmiana planety

161. Z kilkoma planetami gra startuje szybciej (także po przełączeniu grafiki 2D ↔ 3D, które uruchamia grę od nowa).
162. ☰ → dotknij innej planety: najpierw pojawia się komunikat „Ładowanie: …”, po chwili nowa planeta. Pierwsze wejście na planetę w danej sesji trwa dłużej, kolejne — krócej.

### Od 0.30.1: siatka pól

163. Ustawienia → Widok → włącz siatkę pól. Granice pól mają ciemną obwódkę i są widoczne także na lodzie (bieguny), jasnym lądzie i po nocnej stronie — w 2D i 3D.

### Od 0.31: ekran „Badania”

164. W każdej gwieździe jest ikona rodzaju badania; zablokowane mają przerywany obrys.
165. Panel po prawej (albo na dole) bez zaznaczenia: postęp każdego ramienia i do 3 badań „dostępne teraz” — dotknięcie przenosi do badania.
166. Dotknij odległej gwiazdy: jasna linia pokazuje, co trzeba zbadać po drodze; panel pisze, ile badań brakuje, i pokazuje efekt w liczbach (np. „Metal: 18/min → 20/min”).

### Od 0.31.2: badania — panel i nawigacja

167. U góry mapy badań: „Całe drzewo” i ramiona — dotknięcie ramienia pokazuje je w całości, reszta przygasa.
168. Panel to karta tak wysoka jak treść; pod nią można przesuwać mapę. Szczegóły badania: wymagania z ✓/✗, „Brakuje: …” przy koszcie, przycisk „Wyśrodkuj”.
169. Na telefonie szczegóły badania wysuwają się jako wyższy arkusz od dołu.

### Od 0.32: ekran „Imperium”

170. U góry kafelki: metal i kryształy na godzinę z całego imperium, pola, antymateria.
171. Każda planeta ma paski Magazyn / Złoża / Pola i znaczki (np. „bogata w metal”, „magazyn pełny”). Dotknięcie karty przenosi na planetę.
172. „Usuń planetę” jest w menu ⋯ na karcie (drugie dotknięcie potwierdza). Puste miejsce ma kartę „+ Wolne miejsce” — dotknięcie otwiera mapę.

### Od 0.32.1: „Imperium” — sytuacja i kolejność

173. Pod kafelkami „Sytuacja imperium”: co wymaga uwagi (czerwone, złote) i okazje (turkusowe). Dotknięcie wiersza przenosi na planetę albo do Badań / mapy. „Pokaż wszystkie” rozwija listę.
174. Przyciski „Kolejno / Produkcja / Problemy / Wolne pola” zmieniają kolejność kart.
175. Kafelek Energia pokazuje bilans całego imperium i ostrzega, gdy na którejś planecie brakuje energii.

### Od 0.32.2: kolejka budowy

176. Gdy coś się buduje, na innych kartach „Produkcji” jest „Do kolejki (0/1)”. Dotknięcie dopisuje budynek — surowce się nie zmieniają.
177. Karta w kolejce pokazuje „W kolejce: poz. N”; „Usuń z kolejki” zdejmuje go bez straty. Gdy kolejka pełna — „Kolejka pełna (1/1)”.
178. Po ukończeniu budowy następna z kolejki rusza sama (koszt pobrany wtedy). Gdy brakuje surowców, kolejka czeka i rusza, gdy się uzbierają — także przy zamkniętej grze.
179. Badania SI „Plan budowy” i „Harmonogram” dodają po jednym miejscu w kolejce. Karta planety w „Imperium” pokazuje „… · potem X”.

### Od 0.32.3: specjalizacje kolonii

180. Panel „Planeta” ma wiersz SPECJALIZACJA. „Wybierz” otwiera okno z czterema specjalizacjami, ich dopasowaniem do położenia (gwiazda i strefa orbity) i efektami na tej planecie.
181. Pierwszy wybór działa od razu. Później przyciski pokazują „Zablokowane”, dopóki planeta nie zbada „Przebudowy kolonii” (Planetologia).
182. Po badaniu „Zmień (1 h)” → „Na pewno?” → zmiana trwa godzinę, w tym czasie bez premii.
183. Na mapie, po dotknięciu planety, jest „Najlepsza specjalizacja tutaj”. W „Imperium” karta ma znaczek specjalizacji, a planeta bez niej — podpowiedź w „Sytuacji imperium”.

### Od 0.33: „Mapa” — atlas złóż

184. Galaktyka bez zaznaczenia („Odznacz”): w panelu legenda rodzajów gwiazd z liczbą układów.
185. Widok układu: orbity w barwach stref temperatury (legenda pod nazwą układu), pas asteroid podpisany.
186. Panel układu: tabela — każda planeta w wierszu z kropką właściciela i paskami metalu i kryształów. Dotknięcie wiersza pokazuje szczegóły planety.
187. „Wolne / Metal / Kryształy” podświetlają pasujące planety (turkusowa obwódka), resztę przygaszają; drugie dotknięcie wyłącza filtr.

### Od 0.34: ruch planet

188. Widok układu jest pod kątem (orbity jako elipsy); planety krążą — najbliższa w ~2 min, najdalsza w ~25 min.
189. Zapamiętaj położenie planety, przejdź na kilka minut do Badań i wróć — planeta jest dalej na orbicie (o tyle, ile minęło), nie na początku.
190. Planety po dalszej stronie orbity chowają się za gwiazdą. W szczegółach planety jest „obieg N min”.

### Od 0.34.1: galaktyka

191. Galaktyka: gęstsze ramiona z gromadami gwiazd, różowe obłoki, ciemne pasma pyłu; układy jako małe gwiazdy (czarna dziura — ciemny środek z dyskiem).
192. Twój układ: złoty celownik. Przesuń mapę tak, by zniknął — przy krawędzi pojawia się złota strzałka w jego stronę; dotknięcie strzałki albo „Mój układ” w pasku przewozi mapę do Twojego układu.
193. Wejdź do układu i wróć przez „Galaktyka” — mapa jest w tym samym miejscu i przybliżeniu.

### Od 0.34.2: wiedza o galaktyce

194. W pasku mapy: „Znane układy: N z 100”. Widać tylko Twój układ (i układy z Twoimi planetami), kilku najbliższych sąsiadów (kolorowe gwiazdy) i blade obwódki — sygnały. Reszta galaktyki to nieznany obszar.
195. Dotknij sygnału: „Nieznany sygnał” — bez nazwy i szczegółów. Dotknij sąsiada: nazwa, gwiazda, liczba planet, „rozpoznany”; przycisk „Nie zbadany” (widok układu — dopiero po zbadaniu).
196. Twój układ i układy z Twoimi planetami działają jak dotąd (widok układu, kolonizacja).

### Od 0.34.3: ekspedycje

197. Badania → Eksploracja: „Sondy zwiadowcze” (pierścień 2). Bez nich panel sygnału na mapie mówi, czego brakuje.
198. Po badaniu: dotknij sygnału albo rozpoznanego układu — panel pokazuje czas, koszt i szansę; na mapie przerywany okrąg zasięgu. „Wyślij ekspedycję” pobiera koszt; na mapie przerywana trasa i sonda (tam i z powrotem), w panelu odliczanie, w „Imperium” — ekspedycja w drodze.
199. Po powrocie (także przy zamkniętej grze): komunikat i wpis w dzienniku. Udana: sygnał → układ rozpoznany (nazwa, gwiazda, planety), rozpoznany → zbadany (widok układu, kolonizacja statkiem), nowe sygnały w pobliżu. Nieudana: „wróciła bez wyników”.
200. Kolejne badania sond, astronomii i analizy sygnałów: większy zasięg, krótsze wyprawy, większa szansa, więcej wiedzy z jednej wyprawy.

### Od 0.34.4: rzadkie obiekty

201. Wyprawa do sygnału, który okaże się pulsarem albo czarną dziurą, bez „Astrofizyki ekstremalnej”: raport „niezwykły obiekt”, na mapie przerywany fioletowy pierścień, kolejna wyprawa zablokowana z podpowiedzią.
202. Po badaniu „Astrofizyka ekstremalna” (Eksploracja, pierścień 5): wyprawy rozpoznają i badają te obiekty; zbadany — pełny fioletowy pierścień, w panelu „Rzadki obiekt · dane naukowe”, w panelu galaktyki „Dane naukowe”.
203. Premie dla całego imperium: każdy zbadany pulsar +0,25 antymaterii/h, każda czarna dziura −5% czasu badań (do 4 obiektów każdego rodzaju).

### Od 0.34.5: wyszukiwarka i filtry galaktyki

204. Panel galaktyki (bez zaznaczenia): „Wszystkie / Zbadane / Rzadkie / W zasięgu” z liczbami — na mapie pasujące w turkusowej obwódce, reszta przygaszona; drugie dotknięcie wyłącza filtr.
205. „Szukaj układu”: okno z polem tekstowym (klawiatura iPada), filtrami i listą znanych układów (Twój pierwszy, potem od najbliższych). Wpisz część nazwy (bez polskich znaków też działa) albo numer, np. 1:42.
206. Dotknięcie wyniku zamyka okno, przewozi mapę do układu i pokazuje jego szczegóły. Sygnały na liście nie mają nazwy ani numeru.

### Od 0.35: Planetologia, mosty, burzenie

207. Badania → Planetologia: trzy ścieżki — Geologia (środek), Środowisko i Osadnictwo; nowe „Budowa na lodzie” i „Platformy przybrzeżne” (wkrótce). Linie łączą też badania z innych ramion (np. Geologia głębinowa wymaga Wierteł diamentowych, Głębokie szyby — Geologii głębinowej).
208. Po „Budowie na lodzie” na lodowej planecie liczba POLA w pasku rośnie (pola lodu przyjmują wszystkie budynki).
209. „Geologia głębinowa” i „Głębokie szyby”: w panelu „Planeta” złoże całkowite jest większe.
210. Produkcja → ikonka „Zarządzanie” na karcie → „Zburz poz. N” → „Na pewno?”: poziom spada o 1 (bez zwrotu), przy grupie 3 poziomów zwalnia się pole (POLA w pasku maleje). Nie działa, gdy budynek się buduje albo jest w kolejce.

### Od 0.36: Transportowce

211. Badania → Flota (ramię jest teraz aktywne): „Transportowce”, potem „Ładownie modułowe” (dwa razy większy ładunek) i „Lżejsze kadłuby” (krótszy lot; wymagają też badania z Eksploracji).
212. Po zbadaniu „Transportowców”: Imperium → ⋯ na karcie innej planety → „Wyślij tu”. Okno pokazuje trasę, czas lotu i ile transportowców jest w drodze.
213. Przesuń suwaki Metal i Kryształy (albo „Połowa” / „Ile się zmieści”) → „Wyślij”: zapas aktywnej planety maleje od razu, nad alertami w „Imperium” pojawia się „Transportowiec: … → …” z odliczaniem.
214. Po przylocie: komunikat „Transportowiec dotarł…”, zapas planety odbiorcy rośnie (karta w „Imperium”), wpis w „Dzienniku”. Działa też przy zamkniętej grze — komunikat po powrocie.

### Od 0.36.1: czytelne połączenia w „Badaniach”

215. Badania → „Całe drzewo”: linie biegną łukami wzdłuż ramion, żadna nie przecina galaktyki przez środek.
216. Badania wymagające wiedzy z innego ramienia mają tylko krótki „zaczep” z kropką w kolorze tamtego ramienia (np. fioletowa = SI).
217. Dotknij takie badanie (np. „Ciągłość produkcji” w Produktywności): pojawia się cały most — przerywana linia do badania w innym ramieniu; pozostałe linie przygasają. W „Wymaganiach” przy moście stoi nazwa ramienia („Autonomia · SI”).

### Od 0.37: Górnictwo asteroid

218. Badania → „Stacja i handel” (ramię jest teraz aktywne): „Górnictwo asteroid”, potem „Rafinacja w próżni” (wymaga też Wierteł z Produktywności; +50% urobku).
219. Panel „Planeta” ma wiersz „PAS ASTEROID”. Na planecie startowej: „brak pasa w układzie” (układ 1:16 nie ma pasa).
220. Planeta w układzie z pasem (Mapa → układ z pierścieniem okruchów; kolonizacja statkiem): „Stacja” → okno z urobkiem i kosztem → „Zbuduj stację”. Wiersz odlicza budowę, potem pokazuje „stacja poz. N · +…/h”; metal i kryształy rosną szybciej, złoża planety się nie zmniejszają.
221. Imperium: znaczek „pas asteroid N” na karcie planety. Mapa → układ → dotknij pas: kto ma stację i przycisk „Do planety”.

### Od 0.37.1: Przechwyt komet

222. Badania → „Stacja i handel” → „Przechwyt komet” (po „Górnictwie asteroid”; wymaga też „Napędu międzygwiezdnego” z Eksploracji).
223. Panel „Planeta”: wiersz „KOSMOS” (np. „bez pasa · holownik gotowy”) → „Wydobycie” → okno z sekcjami „Pas asteroid” i „Kometa”. Na planecie bez pasa sekcja pasa tylko wyjaśnia, gdzie można postawić stację.
224. „Wyślij holownik”: koszt schodzi od razu, wiersz pokazuje „kometa 59:59”, w „Imperium” — „Holownik po kometę: …”. Po godzinie komunikat „Kometa przyholowana…” i więcej metalu i kryształów; działa też przy zamkniętej grze.

### Od 0.38: wiertła kryształu i kompleks wiertniczy

225. Ekstraktor kryształów na poziomie 3, 6, 9…: każde pełne pole (3 poziomy) to jedno większe wiertło z szybem w gruncie zamiast trzech małych budowli — w 2D ciemny szyb z obiegającym światłem, w 3D platforma z otworem i obracającą się głowicą.
226. Badania → Produktywność → „Wspólne szyby”. Potem Produkcja → ikonka „Zarządzanie” na karcie Ekstraktora → „Kompleks wiertniczy”: okno pokazuje, czy 3 pełne pola leżą obok siebie, ile pól zajmie kompleks (POLA +1), ile więcej kryształów i koszt.
227. „Połącz w kompleks”: kryształy/min w pasku rosną o tyle, ile pokazał podgląd, POLA +1, na planecie szyb główny z rurami do trzech wierteł.
228. To samo okno → „Rozłącz” → „Na pewno?”: kompleks znika, POLA −1, wydobycie wraca. Zburzenie poziomu Ekstraktora też rozłącza kompleks.

Uwaga: w trybie prywatnym Safari zapis może nie działać — gra działa, ale bez zapamiętywania postępu.
