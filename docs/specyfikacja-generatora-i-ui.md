# PLANET FORGE --- SPECYFIKACJA PRZEBUDOWY GENEROWANIA PLANET I INTERFEJSU

**Dokument dla Claude Code**\
**Projekt:** Planet Forge\
**Technologie docelowe:** Phaser + TypeScript + Three.js\
**Urządzenie priorytetowe:** iPadOS / Safari\
**Cel:** przebudować generowanie terenu, warstwy cieczy i system
wizualny planet oraz zmodernizować główny interfejs, bez utraty
działających mechanik gry.

------------------------------------------------------------------------

## 0. Instrukcja nadrzędna dla Claude Code

Pracujesz w istniejącym repozytorium Planet Forge. Nie twórz niezależnej
demonstracji ani statycznej makiety zamiast modyfikacji aplikacji.

Zanim zmienisz kod:

1.  Przeanalizuj strukturę repozytorium i aktualny sposób uruchamiania
    projektu.
2.  Znajdź kod odpowiedzialny za generowanie geometrii planet, mapy
    wysokości, biomów, materiałów, wody/lawy, oświetlenia, kamery,
    sterowania dotykowego i interfejsu.
3.  Ustal, które elementy są już proceduralne, a które korzystają ze
    stałych danych lub tekstur.
4.  Zidentyfikuj istniejące definicje planet, seed, zapisy stanu oraz
    zależności między planetą a budynkami/ekonomią.
5.  Uruchom dostępne testy i kompilację przed rozpoczęciem zmian.
    Zanotuj istniejące błędy, aby nie przypisywać ich nowej
    implementacji.
6.  Przygotuj plan zmian z listą plików i ryzykiem dla każdej części.

Następnie wdrażaj rozwiązanie etapami. Nie przepisuj całego projektu w
jednym kroku. Zachowaj działające mechaniki, API i formaty zapisów, o
ile ich zmiana nie jest konieczna. Jeśli konieczna jest migracja danych,
przygotuj migrację zgodną wstecz.

Nie deklaruj, że funkcja działa, jeśli została tylko opisana lub
zamockowana. Rozróżniaj testy automatyczne, kontrolę kompilacji i ręczne
sprawdzenie wizualne.

## 1. Wizja i priorytety

Planet Forge ma prezentować proceduralnie generowane, stylizowane
planety 3D o czytelnym ukształtowaniu powierzchni, atrakcyjnej rzeźbie
terenu i wyraźnym oddzieleniu stałego gruntu od cieczy.

Styl graficzny: - stylizowany low-poly, z czytelną geometrią; -
kosmiczny, nowoczesny i atrakcyjny, ale nie przesadnie neonowy; -
inspiracja ogólną czytelnością stylizowanych gier, a nie kopiowanie
cudzych assetów; - duże, przemyślane formy terenu zamiast przypadkowego
szumu; - wyraźne różnice między typami planet; - oświetlenie kierunkowe,
ciemniejsza strona nocna i cienka atmosfera; - UI, które wspiera
odkrywanie i rozwój kolonii, zamiast dominować nad planetą.

Priorytety w kolejności: 1. Zaprojektować rozszerzalną architekturę
generowania. 2. Oddzielić dane terenu, materiałów i cieczy. 3. Wdrożyć
trzy metody generowania terenu. 4. Wdrożyć sześć bazowych profili
wizualno-geologicznych. 5. Zapewnić zgodność każdej metody z profilami,
tam gdzie kombinacja ma sens. 6. Dopracować wodę, lawę i granice między
warstwami. 7. Dodać zoom kamery i dopracować sterowanie dotykowe. 8.
Przebudować UI. 9. Przetestować jakość wizualną, deterministyczność i
wydajność na iPadzie.

## 2. Architektura generowania: oddziel algorytm terenu od profilu planety

Nie twórz osobnego generatora dla każdej możliwej planety. Wprowadź
architekturę opartą na kompozycji:

**PlanetDefinition = TerrainGenerator + SurfaceProfile +
Hydrology/LavaProfile + AtmosphereProfile + LightingProfile + Seed +
OptionalFeatures**

Algorytm generowania terenu ma określać sposób tworzenia wysokości i
form. Profil powierzchni ma określać materiały, paletę, progi biomów,
wygląd cieczy i charakterystykę geologiczną. Dzięki temu trzy metody
generowania i sześć profili dają wiele kombinacji bez duplikowania kodu.

Użyj typów TypeScript i walidacji definicji. W miarę możliwości trzymaj
konfigurację w danych, a nie w rozproszonych warunkach `if/else`.

Proponowany koncept typów --- dostosuj do konwencji repozytorium:

``` ts
type TerrainMethod =
  | "tectonic"
  | "erosion"
  | "fractured";

type SurfaceProfileId =
  | "terrestrial"
  | "arid"
  | "ice"
  | "oceanic"
  | "volcanic"
  | "barren";

interface PlanetDefinition {
  id: string;
  seed: number;
  terrainMethod: TerrainMethod;
  surfaceProfile: SurfaceProfileId;
  radiusKm: number;
  terrain: TerrainParameters;
  hydrology: HydrologyParameters;
  atmosphere: AtmosphereParameters;
  lighting: LightingParameters;
  features?: PlanetFeature[];
}
```

To przykład architektoniczny, nie wymóg dosłownego skopiowania. Najpierw
sprawdź istniejące typy i unikaj tworzenia drugiego równoległego systemu
definicji planet.

Wszystkie wartości powinny być walidowane. Nieprawidłowa definicja
planety ma dawać czytelny błąd lub bezpieczny profil domyślny, zamiast
powodować awarię renderera.

## 3. Trzy metody generowania terenu

Wdroż trzy odrębne algorytmy o różnej charakterystyce. Nie mogą różnić
się wyłącznie paletą kolorów.

### Metoda A --- Tectonic / kontynentalna

Przeznaczenie: planety z dużymi kontynentami, pasmami górskimi,
płaskowyżami, basenami i wyraźnymi wybrzeżami.

Zasady: - generuj duże struktury kontynentalne z
niskoczęstotliwościowych pól; - twórz granice płyt lub stref
geologicznych; - wykorzystuj te granice do budowania pasm górskich,
rowów i uskoków; - dodawaj mniejsze szczegóły dopiero po utworzeniu
dużej struktury; - zapewnij kontrolę nad udziałem lądu i poziomem
wody; - unikaj losowego, równomiernego rozmieszczenia gór na całej
powierzchni.

Oczekiwany efekt: planeta ma rozpoznawalny układ kontynentów i kilka
głównych form geologicznych.

### Metoda B --- Erosion / erozyjna

Przeznaczenie: planety z dolinami, kanionami, łagodnymi płaskowyżami,
dolinami rzecznymi i bardziej naturalnymi przejściami wysokości.

Zasady: - zacznij od bazowej mapy wysokości; - zastosuj kontrolowaną
erozję hydrauliczną i/lub termiczną, jeśli koszt obliczeń jest
akceptowalny; - modeluj spływ z obszarów wysokich do niższych; - twórz
doliny, osady i łagodniejsze strefy u podnóża gór; - zapewnij parametry
liczby iteracji i intensywności erozji; - ogranicz koszt generowania
oraz pamięć potrzebną na mapę.

Jeżeli pełna erozja hydrauliczna jest zbyt kosztowna, użyj uproszczonego
algorytmu offline/proceduralnego podczas generowania, a nie symulacji
uruchamianej w każdej klatce.

Oczekiwany efekt: powierzchnia wygląda na ukształtowaną przez
długotrwałe procesy geologiczne.

### Metoda C --- Fractured / tektoniczno-fraktalna

Przeznaczenie: planety surowe, popękane, kraterowe, z ostrymi
grzbietami, szczelinami i nieregularnymi płaskowyżami.

Zasady: - łącz pola szumu o różnych skalach z kontrolowanymi formami
geometrycznymi; - generuj uskoki, szczeliny, kratery i ostre grzbiety; -
stosuj ograniczoną deformację wierzchołków, aby utrzymać spójność
kuli; - zapewnij kontrolę nad ostrością i częstotliwością struktur; -
nie dopuszczaj do przypadkowego, jednolitego „szumu trójkątów" na całej
powierzchni; - zachowaj czytelność z typowej odległości kamery.

Oczekiwany efekt: surowa powierzchnia z mocnymi, celowymi formami
terenu, a nie przypadkowa mozaika.

### Wspólne wymagania dla generatorów

Każdy generator powinien: - przyjmować seed i parametry; - być
deterministyczny dla tego samego seeda i konfiguracji; - zwracać wspólny
format danych wysokości/cech; - umożliwiać niezależne ustawianie skali
dużych form i drobnych detali; - wspierać kontrolę poziomu morza i
udziału lądu; - umożliwiać późniejsze dodawanie nowych metod; - być
testowalny bez uruchamiania pełnego renderera.

Nie implementuj całego generowania na GPU, jeśli utrudni to
deterministyczność, testowanie lub obsługę iPada. Wybierz rozwiązanie
zgodne z istniejącą architekturą.

## 4. Sześć bazowych profili powierzchni

Zaimplementuj sześć bazowych profili materiałów i parametrów
powierzchni. Nazwy i parametry mają być danymi konfiguracyjnymi, a nie
sześcioma osobnymi rendererami.

### Profil 1 --- Terrestrial / skalisto-kontynentalny

-   Ląd: skały, ziemia, ograniczone obszary roślinności.
-   Woda: oceany, morza i jeziora.
-   Teren: kontynenty, pasma górskie, doliny i równiny.
-   Paleta: stonowane brązy, szarości, zielenie i błękity.

### Profil 2 --- Arid / pustynny

-   Ląd: piaski, skały, suche płaskowyże.
-   Teren: wydmy stylizowane geometrycznie, kaniony, mesas i rozległe
    pustkowia.
-   Woda: rzadka, głównie zamknięte baseny lub wyschnięte koryta.
-   Paleta: ochra, piaskowy beż, rdzawy brąz i ciemne skały.

### Profil 3 --- Ice / lodowy

-   Ląd: lód, śnieg, skały podlodowe i lodowce.
-   Ciecz: ciemna woda lub głębokie oceany, gdy temperatura i definicja
    planety na to pozwalają.
-   Teren: szczeliny lodowcowe, grzbiety, lodowe płaskowyże, kotliny.
-   Paleta: biel, chłodne błękity, cyjan, grafit i ciemny granat.
-   Unikaj rozmytych białych plam; lodowce muszą mieć czytelne granice i
    wysokość.

### Profil 4 --- Oceanic / oceaniczny

-   Dominująca powierzchnia: woda.
-   Ląd: wyspy, archipelagi, grzbiety wulkaniczne i nieliczne wyniesione
    kontynenty.
-   Dno: rowy oceaniczne, baseny i podmorskie grzbiety, widoczne tylko
    tam, gdzie pozwala na to styl renderowania.
-   Paleta: głęboki granat, turkus, błękit, skały bazaltowe.

### Profil 5 --- Volcanic / wulkaniczny

-   Ląd: bazalt, ciemne skały, popiół i pola zastygłej lawy.
-   Ciecz: lawa tylko w wyznaczonych obszarach o odpowiednich
    wysokościach i połączeniach.
-   Teren: kaldery, kratery, szczeliny, stożki i kanały lawowe.
-   Paleta: grafit, czerń, rdza, pomarańcz i czerwone światło lawy.
-   Nie pokrywaj całej planety świecącą lawą. Jej obecność ma być
    kontrolowana geologicznie.

### Profil 6 --- Barren / jałowy

-   Ląd: skały, pył, kratery i erozja.
-   Woda: zwykle brak, ale definicja może dopuszczać niewielkie
    zamarznięte złoża lub pozostałości.
-   Teren: kratery, uskoki, suche kotliny i ostre grzbiety.
-   Paleta: szarości, ochra, przygaszony czerwony i ciemny brąz.

Każdy profil powinien zawierać: - identyfikator i nazwę; - paletę
kolorów; - progi wysokości; - reguły biomów; - parametry materiałów; -
parametry wody/lawy; - parametry erozji lub ostrych form; - profil
atmosfery, jeśli jest potrzebny; - opcjonalne cechy i ograniczenia
zgodności.

## 5. Kombinacje metod i profili

Docelowo trzy metody terenu × sześć profili powierzchni powinny dawać do
18 bazowych kombinacji. Nie oznacza to, że każda kombinacja musi
wyglądać identycznie dobrze od pierwszej iteracji. Każda powinna jednak
być technicznie obsługiwana, a niezgodności powinny być jawne i
walidowane.

Przykładowe zalecane zestawienia:

  Profil        Metoda preferowana   Inne sensowne kombinacje
  ------------- -------------------- --------------------------
  Terrestrial   Tectonic             Erosion, Fractured
  Arid          Erosion              Tectonic, Fractured
  Ice           Tectonic             Erosion, Fractured
  Oceanic       Tectonic             Erosion, Fractured
  Volcanic      Fractured            Tectonic, Erosion
  Barren        Fractured            Tectonic, Erosion

Profil powierzchni powinien modyfikować wynik generatora przez
parametry, a nie wymuszać całkowicie nowy kod. Przykładowo profil lodowy
może pokryć wysokie obszary lodowcami, ale nadal korzystać z
kontynentalnego generatora terenu.

Dodawanie siódmego profilu powinno polegać przede wszystkim na dodaniu
nowej definicji danych, materiałów i ewentualnych reguł, a nie
kopiowaniu algorytmu generatora.

Przygotuj narzędzie diagnostyczne lub test generujący siatkę kombinacji.
Powinno być możliwe szybkie obejrzenie wszystkich kombinacji i
wychwycenie profili, które dają zbyt płaskie, zbyt chaotyczne lub
nieczytelne powierzchnie.

## 6. Wspólny model danych powierzchni

Oddziel następujące pojęcia:

1.  **Height field / wysokość terenu** --- podstawowa geometria.
2.  **Terrain classification / klasyfikacja terenu** --- ląd, skała,
    piasek, lód, śnieg, popiół itp.
3.  **Hydrology / hydrologia** --- oceany, morza, jeziora, rzeki i
    przepływ.
4.  **Lava system / system lawy** --- źródła, kanały, zbiorniki i
    zastygłe pola.
5.  **Surface materials / materiały powierzchni** --- kolory,
    chropowatość i inne właściwości renderowania.
6.  **Atmosphere / atmosfera** --- kolor, gęstość wizualna i poświata.
7.  **Features / cechy specjalne** --- kratery, anomalie, ruiny i
    miejsca budowy.

Nie traktuj wody jako niebieskiej tekstury malowanej bezpośrednio na
losowych trójkątach. Jej granice mają wynikać z wysokości, poziomu wody
i reguł hydrologii.

## 7. Oddzielenie gruntu od cieczy

Zastosuj wyraźne warstwy powierzchniowe. Woda i lawa powinny być
osobnymi powierzchniami lub warstwami renderowania, które współpracują z
mapą wysokości.

### Woda

-   Ustal poziom morza jako parametr planety.
-   Wszystkie obszary poniżej poziomu morza powinny być klasyfikowane
    zgodnie z regułami hydrologii.
-   Generuj spójne oceany i jeziora, bez przypadkowych niebieskich plam
    na stokach.
-   Zapobiegaj widocznemu przenikaniu powierzchni wody przez grunt.
-   Kontroluj kolejność renderowania i z-fighting.
-   Zapewnij czytelne wybrzeża oraz przejścia ląd--woda.
-   Dla oceanicznych planet dopuszczaj bardzo wysoki udział wody.
-   Dla pustynnych i jałowych planet dopuszczaj niski udział wody albo
    jej brak.

### Lawa

-   Lawa musi występować tylko w obszarach zdefiniowanych przez profil i
    cechy geologiczne.
-   Generuj źródła w kalderach, szczelinach lub kanałach.
-   Kanały powinny wynikać z wysokości i spływu w dół, a nie być
    losowymi pomarańczowymi liniami.
-   Rozróżniaj świecącą, płynną lawę i zastygłe pola bazaltowe.
-   Świecenie powinno być subtelne, a nie przepalać całą scenę.
-   Nie pozwalaj, by lawa pojawiała się na przypadkowych stokach lub pod
    powierzchnią gruntu.

### Lód i zamarznięta woda

-   Rozróżnij lód będący materiałem gruntu, lodowiec i zamarznięty
    zbiornik.
-   Nie zakładaj, że każda niebieska powierzchnia jest cieczą.
-   Zdefiniuj, czy lód jest powierzchnią terenu, czy warstwą nad wodą.
-   Zapewnij wizualne rozróżnienie przez geometrię, kolor i materiał.

## 8. Fizyczne zachowanie wody i lawy --- rozsądny zakres

Celem jest wiarygodny wygląd i spójne reguły, a nie pełna symulacja
Naviera--Stokesa na całej planecie w czasie rzeczywistym.

### Etap bazowy

-   Generuj oceany i jeziora z poziomu wody oraz mapy wysokości.
-   Wyznacz przepływ wody w uproszczony sposób podczas generowania
    planety.
-   Woda spływa z wyższych obszarów do niższych i gromadzi się w
    basenach.
-   Rzeki, jeśli są wspierane, powinny łączyć obszary źródłowe z
    jeziorami lub oceanami.
-   W miejscach, gdzie teren zamyka basen, woda powinna tworzyć jezioro
    zamiast przechodzić przez grzbiet.
-   Utrzymuj stałe, deterministyczne wyniki przy tym samym seedzie.

### Lawa

-   Traktuj lawę jako wolniej przemieszczającą się ciecz o uproszczonym
    modelu spływu.
-   Źródła lawy umieszczaj w kalderach lub szczelinach.
-   Spływ prowadź zgodnie z lokalnym spadkiem wysokości.
-   Po zastygnięciu zapisuj obszar jako bazalt lub inną powierzchnię
    wulkaniczną.
-   Animuj tylko wybrane kanały lub powierzchnie, a nie całą planetę.
-   Zmiany powierzchni w czasie rozgrywki wprowadzaj tylko wtedy, gdy
    będą zgodne z logiką gry i zapisem stanu.

### Wymagania wydajnościowe

-   Cięższe obliczenia hydrologii wykonuj podczas generowania, nie w
    każdej klatce.
-   Wykorzystuj uproszczone siatki lub mapy danych.
-   Nie aktualizuj całej geometrii planety w każdej klatce tylko po to,
    aby animować wodę.
-   Oddziel statyczną geometrię powierzchni od lekkiej animacji
    materiału.
-   Jeśli rzeczywista symulacja dynamiczna nie jest jeszcze potrzebna,
    nie dodawaj jej do pierwszego etapu.
-   Dokumentuj ograniczenia modelu. Nie przedstawiaj uproszczonego
    modelu jako pełnej symulacji fizycznej.

## 9. Lepsze generowanie gór, wzniesień i uskoków

Góry powinny mieć czytelne formy i wynikać z rodzaju planety.

Wymagania: - pasma górskie zamiast losowych pojedynczych szczytów; -
różna wysokość i szerokość form; - kontrolowane grzbiety i doliny; -
płaskowyże i uskoki dla planet tektonicznych; - erozja i doliny dla
planet erozyjnych; - ostre grzbiety, szczeliny i kratery dla planet
fraktalnych; - łagodniejsze formy dla planet oceanicznych i pustynnych,
jeśli pasuje to do profilu; - odpowiednie skalowanie detalu, by góry
były czytelne z odległości widoku strategicznego.

Uważaj na: - przypadkowe igły i ostre artefakty; - równomierny szum na
całej powierzchni; - nagłe skoki wysokości bez uzasadnienia; - zbyt duży
kontrast, który tworzy wizualny chaos; - nakładanie się gór na wybrzeża
i warstwy cieczy w sposób niefizyczny.

Wykorzystaj kontrolowane parametry amplitudy, szerokości, ostrości i
skali form. Zapewnij możliwość łatwego dostrojenia ich dla każdego
profilu.

## 10. Deterministyczność i odtwarzalność

Ta sama kombinacja: - seed; - metody terenu; - profilu powierzchni; -
parametrów; - wersji algorytmu

musi generować taki sam świat w obrębie tej samej wersji generatora.

Nie używaj globalnego `Math.random()` w miejscach, gdzie wynik ma być
deterministyczny. Użyj istniejącego generatora pseudolosowego albo
wprowadź lokalny, seedowany generator zgodny z architekturą projektu.

Zapisuj wersję generatora. Zmiana algorytmu nie może po cichu zmienić
istniejących planet zapisanych w danych gry. W razie potrzeby zapewnij
`generatorVersion` i migrację lub zachowanie starego wariantu.

Dodaj testy: - ten sam seed daje ten sam wynik; - różne seedy dają
sensownie różne planety; - wszystkie wartości wysokości i materiałów są
poprawne; - brak NaN i nieskończoności; - brak nieprawidłowych granic
cieczy; - konfiguracje niezgodne są wykrywane; - nowy profil można dodać
bez zmiany kodu wszystkich generatorów.

## 11. Kamera i możliwość oddalania planety

Dodaj możliwość płynnego przybliżania i oddalania widoku planety.

Wymagania: - Obsłuż gest pinch-to-zoom na iPadzie. - Zachowaj obracanie
planety jednym palcem, zgodne z istniejącym sterowaniem. - Nie dopuść do
konfliktu gestu zoomu z przeciąganiem planety. - Ustaw minimalną i
maksymalną odległość kamery. - Zastosuj łagodne ograniczenia, bez
wchodzenia kamery w powierzchnię. - Użyj płynnej interpolacji zoomu, bez
skoków. - Zachowaj stabilny punkt zainteresowania kamery. - Opcjonalnie
dodaj dyskretne przyciski „+" i „−" oraz „Resetuj widok". - Zapewnij
wygodne sterowanie myszą i klawiaturą w wersji desktopowej, jeśli obecny
projekt to obsługuje. - Sprawdź zachowanie przy zmianie orientacji i
rozmiaru ekranu.

Nie zmieniaj bez potrzeby obecnej architektury kamery. Najpierw sprawdź,
czy aktualnie używana jest kamera perspektywiczna czy ortograficzna,
oraz jak kontrolowana jest planeta.

Zoom powinien zwiększać czytelność terenu i budynków, ale nie powodować
nadmiernego obciążenia renderera. Jeśli projekt ma poziomy
szczegółowości, dopasuj je do odległości kamery; nie wprowadzaj systemu
LOD, jeśli nie przyniesie realnej korzyści.

## 12. Rekonstrukcja UI --- główny widok

Obecny interfejs jest funkcjonalny, ale zbyt statyczny i panelowy. Zmień
jego hierarchię tak, aby planeta była centralnym obiektem, a panele
pełniły rolę kontekstową.

### Górny pasek

-   Kompaktowy pasek zasobów: metal, kryształy, energia, antymateria.
-   Czytelne ikony, wartości i produkcja na minutę/godzinę, gdy dane są
    dostępne.
-   Energię pokaż jako bilans oraz wykorzystanie/maksimum, jeśli takie
    dane istnieją.
-   Delikatne animacje zmian wartości, bez migania.
-   Oszczędzaj wysokość ekranu.

### Panel planety

-   Nazwa i typ planety.
-   Średnica.
-   Istotny stan kolonii, jeśli dane istnieją.
-   Przycisk zmiany planety lub otwarcia szczegółów.
-   Panel nie może zasłaniać dużej części powierzchni.

### Panel kontekstowy po prawej lub z boku

-   Otwierany po wybraniu budowy, badań lub szczegółów obiektu.
-   Zwijany jednym dotknięciem.
-   Nie powinien być stale widoczny, jeśli nie jest potrzebny.
-   Pokazuje rzeczywiste poziomy, koszty, produkcję i czas z
    istniejącego systemu.
-   Wybrany budynek może zostać wizualnie wyróżniony na planecie.

### Nawigacja

Zaprojektuj czytelną nawigację do: - Kolonii; - Budowy; - Badań; - Mapy
układu; - Imperium.

Używaj ikon i krótkich etykiet. Wyróżniaj aktywną sekcję turkusem lub
złotem. Zachowaj odpowiednie pola dotykowe na iPadzie.

### Aktywność wizualna

Dodaj umiar w mikroanimacjach: - płynne otwieranie paneli; -
podświetlenie wybranego obiektu; - krótkie potwierdzenie rozpoczęcia
budowy; - widoczny postęp ulepszenia; - subtelne światła działających
kompleksów; - spokojne tło kosmiczne z paralaksą.

Nie dodawaj fikcyjnych zadań, statystyk, populacji, nagród lub
przycisków, które nie są obsługiwane przez logikę gry. Jeżeli element
jest nową propozycją, wyraźnie oznacz go jako opcjonalny i nie udawaj,
że działa.

## 13. System dodawania nowych profili i kombinacji

Po zakończeniu implementacji dodawanie nowego profilu planety powinno
być możliwe przez: 1. Dodanie nowej definicji profilu. 2. Określenie
palety materiałów. 3. Ustawienie progów wysokości i reguł biomów. 4.
Konfigurację cieczy i atmosfery. 5. Określenie preferowanych metod
terenu. 6. Dodanie testu walidującego profil. 7. Obejrzenie planety w
narzędziu podglądu lub scenie testowej.

Nie powinno być konieczne kopiowanie całego generatora ani modyfikowanie
wszystkich istniejących profili.

Przygotuj czytelny katalog konfiguracji, np. `planet/profiles/`, jeśli
odpowiada to strukturze repozytorium. Nie wymuszaj dokładnej ścieżki bez
audytu.

## 14. Testy wizualne i wydajność

Dodaj, jeśli to możliwe, scenę lub narzędzie deweloperskie do
przeglądania kombinacji generatorów i profili.

Powinno umożliwiać: - wybór metody terenu; - wybór profilu
powierzchni; - ustawienie seeda; - ponowne wygenerowanie tej samej
planety; - obrót i zoom; - sprawdzenie poziomu wody i geometrii; -
szybkie porównanie kombinacji.

Testy jakości: - kontynenty są czytelne; - woda nie przecina przypadkowo
lądu; - lawa występuje w geologicznie uzasadnionych obszarach; - góry
mają zróżnicowane formy; - powierzchnia nie wygląda jak przypadkowy
szum; - materiały odpowiadają profilowi; - obrót i zoom są płynne; - UI
nie zasłania planety nadmiernie.

Testy wydajności: - czas generowania planety; - liczba wierzchołków; -
liczba draw calls; - zużycie pamięci; - płynność renderowania na
iPadzie; - zachowanie przy otwartych panelach; - brak wycieków zasobów
przy zmianie planet.

Nie ustawiaj arbitralnego progu FPS bez pomiaru na docelowym urządzeniu.
Najpierw zmierz obecny stan, a następnie porównaj wynik po zmianach.
Utrzymuj płynność interakcji jako priorytet.

## 15. Proponowana kolejność wdrożenia

### Etap 1 --- audyt i kontrakty danych

Zidentyfikuj istniejące generatory, materiały, kamerę i UI. Zaproponuj
docelowe interfejsy danych i plan migracji. Nie zmieniaj jeszcze całej
implementacji.

### Etap 2 --- wspólny model powierzchni

Oddziel wysokość, klasyfikację materiałów, hydrologię, lawę i cechy
specjalne. Dodaj walidację i testy deterministyczności.

### Etap 3 --- trzy metody generowania

Wdroż lub dostosuj generatory tectonic, erosion i fractured do wspólnego
formatu wyniku.

### Etap 4 --- sześć profili

Wprowadź profile terrestrial, arid, ice, oceanic, volcanic i barren.
Sprawdź kombinacje metod z każdym profilem.

### Etap 5 --- woda i lawa

Dodaj spójne granice, baseny, kanały, kontrolowany spływ i oddzielne
powierzchnie cieczy. Ciężkie obliczenia wykonuj przy generowaniu.

### Etap 6 --- oświetlenie, atmosfera, kamera

Popraw stronę nocną, cienką poświatę, obrót, pinch-to-zoom i
ograniczenia kamery.

### Etap 7 --- przebudowa UI

Uporządkuj pasek zasobów, panel planety, nawigację i panele kontekstowe.
Zachowaj istniejącą logikę.

### Etap 8 --- podgląd i walidacja

Sprawdź kombinacje, testy automatyczne, działanie na iPadzie i
wydajność. Napraw regresje.

Nie realizuj wszystkich etapów w jednym ogromnym commicie. Po każdym
etapie pozostaw projekt w stanie możliwym do uruchomienia.

## 16. Kryteria akceptacji

Uznaj pracę za zakończoną dopiero wtedy, gdy:

-   istnieją trzy rzeczywiście różne metody generowania terenu;
-   istnieje sześć profili materiałów i biomów;
-   profile można łączyć z metodami przez konfigurację;
-   architektura pozwala dodać kolejne profile bez kopiowania
    generatora;
-   ta sama konfiguracja i seed dają powtarzalny rezultat;
-   ląd i ciecz są odrębnie klasyfikowane i renderowane;
-   woda i lawa zachowują się zgodnie z uproszczonymi regułami wysokości
    i spływu;
-   góry, uskoki, kotliny i wybrzeża są czytelne;
-   kamera obsługuje płynny zoom dotykowy;
-   interfejs ma lepszą hierarchię i nie dominuje nad planetą;
-   działające mechaniki ekonomii, budynków i badań nadal funkcjonują;
-   testy i kompilacja przechodzą, z wyjątkiem wcześniej istniejących
    błędów wyraźnie udokumentowanych;
-   ograniczenia wydajności i fizyki są jasno opisane.

## 17. Raport końcowy

Po wdrożeniu przedstaw: 1. Zmienione i dodane pliki. 2. Architekturę
trzech generatorów. 3. Opis sześciu profili i ich kompatybilności. 4.
Sposób reprezentacji wysokości, biomów, wody i lawy. 5. Sposób dodawania
nowego profilu. 6. Sposób obsługi zoomu na iPadzie. 7. Zmiany w UI. 8.
Testy rzeczywiście uruchomione i ich wyniki. 9. Znane ograniczenia oraz
elementy wymagające ręcznej oceny wizualnej. 10. Proponowany następny
etap.

**Najważniejsza zasada:** najpierw dopasuj architekturę do istniejącego
projektu, potem wdrażaj ją stopniowo. Celem nie jest maksymalna
złożoność symulacji, lecz atrakcyjny, rozszerzalny i wydajny system
proceduralnych planet, który można rozwijać przez długi czas.
