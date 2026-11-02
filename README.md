# Planet Forge

Przeglądarkowa strategia science-fiction projektowana pod **iPada (Safari)**. Gracz trzyma w dłoni planetę — obraca ją
palcem, rozbudowuje kolonię (budynki rosną w kompleksy zajmujące pola), gospodaruje metalem, kryształami, energią
i antymaterią, bada galaktykę technologii, odkrywa mapę 100 układów, zakłada kolejne kolonie i przewozi surowce.
Wersja **0.46**. Interfejs po polsku.

## Jak zagrać

- **Gra online: https://kol4t.github.io/Planet-forge/** (publikowana automatycznie z gałęzi `main`).
- Na iPadzie: Safari → adres gry → „Udostępnij” → **„Do ekranu początkowego”**. Gra otwiera się z ikony na pełnym
  ekranie i działa offline. Nowa wersja → pasek „Dostępna aktualizacja” → „Odśwież”.
- Safari i aplikacja z ekranu początkowego mają **osobną pamięć**: postęp przenosisz w ☰ → Ustawienia → „Kopiuj zapis”
  / „Wczytaj zapis”.
- Planeta 2D jest domyślna; 3D — ☰ → Ustawienia → „Włącz 3D”.
- Błąd albo pomysł: ☰ → Ustawienia → **„Zgłoś / diagnostyka”** (instrukcja: `docs/zgloszenia.md`).

## Dla programisty / Claude Code

Wymagany Node.js ≥ 22.18.

```sh
npm install
npm run dev           # podgląd na http://localhost:5173 (buduje przy odświeżeniu)
npm run check         # typy + testy + build — po każdej zmianie kodu
npm run build         # dist/ — gra w jednym pliku + PWA (do wrzucenia na hosting https)
npm run atlas         # docs/atlas/ — profile powierzchni × metody terenu
npm run balance-doc   # docs/BALANCE.md — tabele wartości z kodu
node scripts/screens.ts <folder> [2d|3d]   # zrzuty ekranów w 7 rozmiarach (przy npm run dev)
```

Instrukcje i zasady: **`CLAUDE.md`**. Dokumentacja: **`docs/README.md`**.

## Lista kontrolna — przewodnik SI Matki (etap 11)

1. Nowa gra (albo obecna): pod paskiem „Galaktyka › …” panel „SI Matka · krok X z 19” z zadaniem i paskiem postępu.
2. Wykonaj zadanie (np. ulepsz Kopalnię metalu) — komunikat „SI Matka: wykonane… Nagroda: …”, surowce przybywają,
   panel pokazuje następny krok; wpis w Imperium → Dziennik.
3. Dotknij nagłówka panelu — zwija / rozwija podpowiedź (zapamiętane).
4. Ustawienia → „Przewodnik SI: włączony — wyłącz” chowa panel; ponowne włączenie wraca do tego samego kroku.

## Lista kontrolna — widok układu (gałąź `claude/widok-ukladu`, etapy B–C)

1. Planeta stoi w miejscu; Ustawienia → „Obrót planety: wyłączony — włącz” włącza powolny obrót (zapamiętany).
2. Ściśnij planetę dwoma palcami mocniej niż do najmniejszego przybliżenia (albo „−” na minimum) — kamera odlatuje
   do widoku układu: gwiazda, orbity, planety w ruchu, Twoja planeta w turkusowym pierścieniu.
3. U góry pasek „Galaktyka › nazwa układu” i „Resetuj widok” (wraca na Twoją planetę). „Galaktyka” otwiera Mapę.
4. W układzie: przeciągnij (przesuwanie), ściśnij / rozsuń (przybliżanie), dotknij małej planety — trafia łatwo.
5. Dotknij obcej planety — kamera do niej leci, okienko z typem, strefą i adresem; „Zamknij” wraca do całego układu.
6. Dotknij swojej planety — kamera przybliża, pojawia się zwykły widok planety (2D albo 3D), panele działają jak dotąd.
9. (Etap F) Gdy planeta stoi, gra powinna mniej grzać i zużywać baterii (rzadsze rysowanie). Ustawienia → Zgłoś /
   diagnostyka: linia „widok” pokazuje poziom widoku i liczbę zapamiętanych modeli 3D.
8. (Etap E) Mapa → zaznacz zbadany układ → „Pokaż układ”: Mapa się zamyka, kamera wlatuje do układu. Dotknij gwiazdy
   (okienko z danymi), pasa asteroid i wolnej planety (geologia, „Wyślij statek”, gdy to możliwe). „Tabela układu”
   otwiera dawny widok Mapy.
7. (Etap D) Miniatura w układzie rośnie dokładnie w miejsce planety i płynnie w nią przechodzi — bez czarnej klatki.
   Przy innej Twojej planecie najpierw krótkie „Ładowanie…”, potem lot. Drugie wejście na tę samą planetę jest szybsze.

## Lista kontrolna — test na iPadzie (aktualna, v0.46)

Krótka kontrola całości po każdej publikacji (ok. 10 minut). Dawne listy kolejnych wersji: `docs/lista-kontrolna-historia.md`.

**Start i planeta**
1. Gra startuje z ikony bez paska Safari; napis „Przygotowywanie ekspedycji…” znika, widać planetę, pasek zasobów u góry
   i dolny pasek przycisków na całą szerokość.
2. Przeciągnięcie palcem obraca planetę (z bezwładnością), dwa palce przybliżają; strona się nie przesuwa ani nie powiększa.
3. Przeciągnięcie zaczęte na panelu nie obraca planety.

**Produkcja i budowa**
4. Dolny pasek → **Produkcja**: 6 kart; tekst nie wychodzi poza kartę i nie chowa się pod przyciskiem; przycisk pokazuje
   „Ulepsz do N · czas”.
5. Ulepsz budynek: zasoby maleją, pasek postępu i odliczanie; „Anuluj” → „Na pewno?” → koszt wraca.
6. Przy ujemnej energii: czerwona linia „⚡ Brak energii…” w nagłówku Produkcji; dotknięcie jej (albo kolumny ENERGIA
   u góry) pokazuje wyjaśnienie, co zrobić.
7. Dotknij budynku na planecie (przy otwartej Produkcji): obok planety karta budowli z obrysem pól, karta budynku
   w Produkcji w złotej ramce, **bez** dodatkowego okienka „Budynek” i bez dymku SI na karcie. Zamknięcie Produkcji →
   pojawia się okienko „Budynek” z przyciskiem „Ulepsz”.
8. Otwarcie panelu Planeta lub SI zamyka kartę budowli (jeden panel naraz).

**Ekrany**
9. Badania, Mapa, Imperium otwierają się i zamykają „Zamknij”; w Badaniach widać wszystkie filtry ramion.
10. ☰ → lista planet → dotknięcie innej planety: „Ładowanie…”, potem nowa planeta; powrót działa.
11. ☰ → Ustawienia: wszystkie przyciski widać; „Zamknij” zamyka.

**Zapis i offline**
12. Zamknij grę na kilka minut i wróć: komunikat „Podczas nieobecności…”, postęp zachowany.
13. Ustawienia → „Kopiuj zapis” → „Wczytaj zapis” (wklej): gra wczytuje to samo imperium.

**Obrót urządzenia i płynność**
14. Obróć iPada pionowo ↔ poziomo: układ przebudowuje się, nic nie wychodzi poza ekran, pasek zasobów nie nachodzi na siebie.
15. Płynność: instrukcja pomiaru w `docs/PERFORMANCE.md` (Ustawienia → Zgłoś / diagnostyka → „Pokaż diagnostykę”).

**Kompleks kopalni metalu (etap 2 — osady)**
16. Kopalnia metalu nie jest już rozlana na dziesiątki pól: na planecie osady (fabryka + do 3 kopalń) połączone ciemnymi
    drogami i pusty plac w środku; licznik POLA zajętych przez kopalnię: poz. 10 → 5, poz. 40 → 20.
17. Oddal planetę (dwa palce do siebie): widać fabryki, plac i drogi; przybliż — kopalnie wyrastają płynnie, bez skoku.
18. Przybliż i dotknij kopalni, fabryki, placu albo drogi: otwiera się karta Kopalni metalu (jak dotknięcie budowli).
19. Ulepsz Kopalnię metalu: złote rusztowanie stoi w miejscu następnej kopalni albo fabryki.
20. Ustawienia → grafika 2D: kopalnie jako kółka, fabryki jako trójkąty, plac jako kwadrat, drogi jako linie.
21. Inne budynki nie stają w dzielnicy kopalni (także na placu); stary zapis z wysoką kopalnią metalu wczytuje się,
    poziom zostaje, zwolnione pola są wolne.
22. Kopalnia metalu poz. 40 → dotknij jej → Kompleks: sekcja „Megakonstrukt” (koszt, czas 1–2 h); „Zbuduj megakonstrukt”
    → na placu rośnie złote rusztowanie, wydobycie metalu bez zmian; „Anuluj budowę” → „Na pewno?” → koszt wraca.
23. Po ukończeniu: konstrukt w środku, 4 fabryki na ramionach, pasy do konstruktu, kopalnie na końcach; w Produkcji
    wydobycie metalu wyraźnie wyższe; wpis w dzienniku.
24. Kompleks na planecie z konstruktem → „Wyrzuć na orbitę” → „Na pewno?”: odliczanie 30 min („Anuluj start” zwraca
    paliwo); po starcie na planecie 4 osady z pustym placem, a nad nią krąży konstrukt; Imperium → Flota pokazuje go.
25. Na innej planecie z Kopalnią metalu poz. 40 → Kompleks: „Ściągnij z orbity … · czas · paliwo”; po przylocie osady
    przechodzą w układ promienisty.

## Licencja i treści

Nazwy, opisy i liczby w grze są robocze (lore powstaje osobno — `docs/lore/`, `docs/LORE_TOUCHPOINTS.md`).
