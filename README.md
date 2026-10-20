# Planet Forge

Przeglądarkowa gra strategiczna science-fiction: jedna planeta 3D generowana z seeda, kolonia rosnąca na jej powierzchni i pierwsza pętla ekonomii. Wersja **0.5**, projektowana pod **iPada i Safari**.

## Jak zagrać

- Najprościej: otwórz plik `dist/index.html` w przeglądarce. To jeden samodzielny plik — można go też wrzucić na dowolny darmowy hosting statyczny (np. GitHub Pages, Netlify Drop, Cloudflare Pages).
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

Uwaga: w trybie prywatnym Safari zapis może nie działać — gra działa, ale bez zapamiętywania postępu.
