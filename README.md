# Planet Forge

Przeglądarkowa gra strategiczna science-fiction: jedna planeta 3D generowana z seeda, kolonia rosnąca na jej powierzchni i pierwsza pętla ekonomii. Wersja **0.3**, projektowana pod **iPada i Safari**.

## Jak zagrać

- Najprościej: otwórz plik `dist/index.html` w przeglądarce. To jeden samodzielny plik — można go też wrzucić na dowolny darmowy hosting statyczny (np. GitHub Pages, Netlify Drop, Cloudflare Pages).
- Obracaj planetę palcem. Ulepszaj budynki przyciskami po prawej (poziomo) lub na dole (pionowo).
- Ulepszenie trwa (30 s × docelowy poziom), naraz buduje się jeden budynek. Na planecie widać złote rusztowanie, a po ukończeniu wyrasta nowa budowla. Budowę można anulować (drugie dotknięcie potwierdza) — koszt wraca w całości.
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

Uwaga: w trybie prywatnym Safari zapis może nie działać — gra działa, ale bez zapamiętywania postępu.
