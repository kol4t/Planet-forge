# Zgłoszenia od testerów — błędy i sugestie

Od v0.26.5 każdy tester może z gry wysłać **błąd** albo **sugestię (propozycję zmiany)**. Zgłoszenia trafiają do
repozytorium gry na GitHubie (zakładka **Issues**: https://github.com/kol4t/Planet-forge/issues) i tam zostają —
można je przeczytać, przeanalizować i poprawić w kolejnej wersji.

## Jak zgłosić (dla testerów)

1. W grze: **☰ → Ustawienia → „Zgłoś / diagnostyka”**.
2. Wybierz **„Błąd”** albo **„Sugestia, propozycja zmiany”**.
3. Wpisz krótki tytuł i opis: co robiłeś, co się stało, czego się spodziewałeś (albo co proponujesz i dlaczego).
4. Zostaw zaznaczone „Dołącz diagnostykę” (wersja, urządzenie, płynność, planeta, ostatnie błędy) i — przy błędzie —
   „Dołącz zapis gry” (pozwala odtworzyć błąd na tej samej planecie).
5. **„Wyślij na GitHub”** otwiera gotowe zgłoszenie. Potrzebne jest darmowe konto GitHub; na stronie wystarczy
   nacisnąć **„Create”** (można jeszcze dołączyć zrzut ekranu).
6. Bez konta GitHub: **„Kopiuj”** i wyślij tekst właścicielowi gry (np. w wiadomości).

Tekst zgłoszenia zostaje w grze (także po powrocie z GitHuba), dopóki nie naciśniesz „Wyczyść zgłoszenie”.

## Co jest w zgłoszeniu

- **Opis gracza** (zawsze).
- **Diagnostyka**: wersja gry, przeglądarka i ekran, tryb grafiki i płynność z ostatniej minuty, planeta
  (typ, adres, seed), poziomy budynków, pola, przebieg ostatniego uruchomienia i ostatnia awaria, **ostatnie
  błędy JavaScript** (do 10, zbierane automatycznie, `planet-forge.errors.v1`). Bez danych osobowych.
- **Zapis gry** `PF2:…` (opcjonalnie) — wczytywany w Ustawienia → „Wczytaj zapis”.

Gdy adres zgłoszenia byłby za długi, najpierw wypada zapis gry (gra o tym informuje — wtedy wklej go ręcznie), potem
diagnostyka jest skracana.

## Etykiety

- `bug` — błędy (szablon `.github/ISSUE_TEMPLATE/blad.yml`),
- `enhancement` — sugestie i propozycje zmian (`sugestia.yml`).

## Jak pracujemy ze zgłoszeniami

Na początku sesji Claude Code przegląda otwarte zgłoszenia, odtwarza błąd (wersja, planeta, zapis), proponuje
właścicielowi, co poprawić w następnej wersji, i po wydaniu poprawki zamyka zgłoszenie z krótką odpowiedzią.
Sugestie czekają na decyzję właściciela (zakres, lore, balans — patrz `CLAUDE.md`).
