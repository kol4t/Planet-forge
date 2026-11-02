# Zapisy ze starych wersji (etap 12 — kandydat MVP)

Każdy plik to zapis utworzony **prawdziwą** starą wersją gry (kilkanaście godzin gry: ulepszenia budynków, kolonia
we własnym układzie) — surowy zapis z `localStorage` (`raw`) i tekst eksportu `PF2:` (`pf2`), jeśli wersja go miała.
Test `tests/oldSaves.test.ts` sprawdza, że obecna wersja je wczytuje (planety, naliczanie czasu, zapis, eksport).

Wersje i commity: v0.46.0 `c880c5f`, v0.50.0 `12d40ec`, v0.54.0 `1e10eaf`, v0.58.0 `06f889d`, v0.61.0 `3a6f65a`,
v0.64.0 `a9d96ba`, v0.66.0 `fdf3ab6`. Nowy zapis: `scripts/make-old-save.ts` (opis w nagłówku skryptu).
