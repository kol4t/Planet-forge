# Megakonstrukt kryształów: wiertnica i lej (v0.69)

Decyzje właściciela z 2026-11-02 i 2026-11-03. Prototyp wyglądu zaakceptowany 2026-11-03 (zrzuty:
`docs/zrzuty/krater-krysztalow/`, w grze: `docs/zrzuty/megakonstrukt-krysztalow/`). Nazwy i liczby są robocze.

## Wygląd (zaakceptowany)

- **Lej do jądra planety**: okrągły, tarasowy, zwęża się ku środkowi. Półki są jaśniejsze, zbocza ciemniejsze. Kolor
  zmienia się z głębokością: skała (brąz), płaszcz (czerwień), żar. Na etapie 4 na dnie świeci jądro. Bez pionowego szybu.
- **Wiertnica** wisi nad lejem na linach-rurach (jak ekstraktor z v0.49): złoty pierścień, głowica w dół, kryształy na
  wierzchu. Liny sięgają kotew na krawędzi leja: 3 / 3 / 4 / 5 lin na etapach 1–4.
- **Dużo kryształów** (gromady na półkach) i **znaleziska jako obiekty w leju**. Kryształ rdzeniowy to turkusowy
  sześciokątny słup. Odłamek rezonansowy to fioletowy odłamek unoszący się w pierścieniu. Zapis z głębi to ciemna płyta
  ze złotymi pasami. Każda zebrana sztuka to jeden obiekt.
- 3D: `planet-renderer/crater.ts` (kształt jako `OpenPit`), `crystalRigMesh.ts` (wiertnica, kryształy, znaleziska),
  `PlanetView.paintOpenPit` (barwy). 2D: `complexLook.craterGround`, `CanvasPlanetFallback.drawCraterRig`.

## Zasady

| Sprawa | Decyzja |
|---|---|
| Warunki | Jak metal: Ekstraktor kryształów poz. 40, badanie „Megastruktury”, działający kompleks Ekstraktora |
| Koszt i czas | Odwrotne ceny niż metal: 1 mln metalu i 4 mln kryształów; budowa 1–2 h (czas stały dla planety). Ekstraktor w tym czasie pracuje, anulowanie zwraca koszt |
| Premia | Po ukończeniu Ekstraktor działa jak megakompleks: +60% i znaleziska. Zastępuje megakompleks kryształów (ten z dawnego zapisu działa do czasu wiertnicy) |
| Miejsce | Lej powstaje na obszarze Ekstraktora: pola Ekstraktora w chwili budowy, środek w polu najbliżej środka obszaru. Zasięg leja na etapie 4 = obszar (najwyżej 0,6 rad) |
| Wzrost leja | Z wydobyciem złoża kryształów: postęp = kryształy wydobyte od startu wiertnicy ÷ (próg wyeksploatowania 80% złoża − wydobycie na starcie). Co 25% postępu lej rośnie o etap (1→4), na etapie 4 sięga jądra. Lej się nie zmniejsza |
| Blizna | Lej zostaje na zawsze, a jego pól nie da się zabudować: to obszar Ekstraktora, a po jego zburzeniu pola zarezerwowane |
| Orbita | Jak metal: „Wyrzuć na orbitę” (30 min bez premii, 10 antymaterii; lej zostaje), „Ściągnij z orbity” nad Ekstraktor poz. 40 z kompleksem innej planety (paliwo i lot z odległości, ryzyko piratów). Na planecie z dawnym lejem nowa wiertnica drąży go dalej |
| Blokady | Póki wiertnica pracuje albo się buduje, Ekstraktora nie da się zburzyć, a jego kompleksu ani premii wyłączyć. Transfer z v0.56 tylko dla dawnego megakompleksu |

Kod: `core/economy/crystalConstruct.ts` (warunki, etap leja, środek, zapis), `GameController` (sekcja „megakonstrukt
kryształów i lej”, `syncPlots` — pola leja), okno Kompleks (`game/ui/complexPanel.ts`, `kind: 'crystal'`). Liczby:
`BALANCE.crystalComplex`, orbita: `BALANCE.metalComplex.orbit`. Zapis: `crystalComplex` w miejscu planety, `kind:
"crystal"` w `orbiting` (`docs/SAVE_FORMAT.md`). Testy: `tests/crystalConstruct.test.ts`.
