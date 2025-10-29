# Aktualizacja Systemu - Layout Bomar dla wszystkich producentów

## Co się zmieniło?

### 1. Nowy layout produktów (grid z kartami)

Wszystkie strony producentów używają teraz tego samego layoutu co Bomar:

-   Grid 3 kolumny (responsywny: 1 kolumna mobile, 2 tablet, 3 desktop)
-   Karty produktów z dużymi zdjęciami (200x200px)
-   Nawigacja sticky po kategoriach
-   Hover effects i animacje

### 2. Edycja faktorów tylko w panelu Admin

-   **Panel Admin (`/admin`)**: Pełne zarządzanie faktorami cen
    -   Zakładka "💰 Zarządzaj Faktorami Cen"
    -   Możliwość edycji nazw i faktorów dla każdego produktu
    -   Podgląd wszystkich produktów z bazy danych
-   **Strony producentów (`/producent/[id]`)**: Tylko wyświetlanie
    -   Automatyczne pobieranie faktorów z bazy
    -   Wyświetlanie zmodyfikowanych cen
    -   Oznaczenia: niebieski tekst dla zmodyfikowanych cen, badge z faktorem

### 3. Nowy komponent ProductCard

Zastępuje starą tabelę `ProductsTable`. Obsługuje:

-   Różne formaty danych (prices dla krzeseł, sizes dla stołów)
-   Wyświetlanie zdjęć produktów
-   Automatyczne obliczanie cen z faktorami
-   Materiały, wymiary, opcje, opisy
-   Notatki (czerwony badge)
-   Poprzednie nazwy produktów

## Struktura plików

### Nowe pliki:

```
components/
  ├── ProductCard.tsx         # Komponent karty produktu (zastępuje ProductsTable)
  └── FactorManager.tsx       # Panel zarządzania faktorami (tylko admin)

app/
  └── api/
      └── manufacturers/
          └── route.ts        # API endpoint - lista producentów
```

### Zmodyfikowane pliki:

```
app/
  ├── admin/page.tsx                 # Dodano zakładkę "Faktory"
  └── producent/
      └── [manufacturer]/page.tsx    # Nowy layout grid z ProductCard
```

## Routing

### Przed:

```
/producent/Befame → ProductsTable (tabela)
/producent/Bomar → Custom layout (grid)
```

### Po:

```
/producent/befame → ProductCard (grid)
/producent/bomar → ProductCard (grid)
/producent/gala → ProductCard (grid)
/producent/[dowolny] → ProductCard (grid)
```

Wszystkie strony używają tego samego layoutu!

## Panel Admin - Zakładka "Faktory"

### Funkcje:

1. **Wybór producenta** z listy rozwijanej
2. **Lista produktów** według kategorii
3. **Edycja inline** dla każdego produktu:
    - Własna nazwa (opcjonalnie)
    - Mnożnik cen (faktor)
4. **Wizualne oznaczenia**:
    - Badge "Faktor: 1.1x" - niebieski
    - Badge "Zmieniona nazwa" - zielony
5. **Akcje**:
    - ✏️ Edytuj - otwiera formularz
    - 🗑️ Usuń - usuwa nadpisanie (przywraca oryginał)

### Screenshot przepływu:

```
1. Wybierz producenta → Lista produktów
2. Kliknij ✏️ → Formularz edycji (inline)
3. Wpisz dane → Zapisz
4. Produkt ma badge z faktorem
```

## Strony producentów - Wyświetlanie

### Elementy UI:

-   **Header**: Nazwa producenta + tytuł cennika z datą
-   **Nawigacja**: Sticky buttons do kategorii (tylko jeśli >1 kategoria)
-   **Grid produktów**: 3 kolumny z kartami

### Karta produktu:

```
┌─────────────────────────┐
│ [Badge: 1.1x]           │  ← Jeśli ma faktor
│                         │
│    [Zdjęcie 200x200]    │
│                         │
│ NAZWA PRODUKTU          │
│ Oryginalna: stara (*)   │  ← Jeśli zmieniono nazwę
│ Materiał                │
│ Wymiary: 200x90x85 cm   │
│                         │
│ Ceny brutto:            │
│ Grupa A: 2875 zł (*)    │  ← Niebieska jeśli faktor
│         ~~2500 zł~~     │  ← Przekreślona bazowa
│                         │
│ Dostępne opcje:         │
│ • opcja 1               │
└─────────────────────────┘
```

(\*) Elementy opcjonalne

## API Endpoints

### `/api/manufacturers` (GET)

Zwraca listę wszystkich producentów.

**Response:**

```json
{
    "manufacturers": ["Befame", "Bomar", "Gala"]
}
```

### `/api/overrides` (GET/POST/DELETE)

Bez zmian - działa jak wcześniej.

## Migracja danych

**Nie wymaga migracji!**

-   Stare pliki JSON działają bez zmian
-   Baza danych używa tej samej struktury
-   Kompatybilność wsteczna zachowana

## Zalety nowego podejścia

✅ **Spójność** - wszystkie strony wyglądają identycznie  
✅ **Responsywność** - grid automatycznie dostosowuje się do ekranu  
✅ **Łatwość zarządzania** - edycja faktorów tylko w jednym miejscu (admin)  
✅ **Bezpieczeństwo** - użytkownicy nie mogą edytować cen na stronach producentów  
✅ **Czytelność** - karty bardziej wizualne niż tabela  
✅ **Skalowalność** - łatwo dodać nowych producentów (wystarczy plik JSON)

## Testowanie

### 1. Sprawdź layout:

```
http://localhost:3001/producent/befame
http://localhost:3001/producent/bomar
http://localhost:3001/producent/gala
```

Wszystkie powinny wyglądać tak samo (grid z kartami).

### 2. Sprawdź admin:

```
http://localhost:3001/admin
```

Zakładka "💰 Zarządzaj Faktorami Cen":

1. Wybierz producenta
2. Edytuj produkt (zmień faktor na 1.2)
3. Zapisz
4. Wróć na stronę producenta
5. Sprawdź czy cena się zmieniła (niebieski tekst + badge)

### 3. Sprawdź responsive:

-   Desktop: 3 kolumny
-   Tablet: 2 kolumny
-   Mobile: 1 kolumna

Użyj DevTools (F12) → Toggle device toolbar

## Rozwiązywanie problemów

### Problem: Strona producenta nie wyświetla produktów

**Rozwiązanie:** Sprawdź czy plik JSON istnieje w `data/[Producent].json`

### Problem: Faktory nie działają

**Rozwiązanie:**

1. Sprawdź połączenie z bazą: `npx prisma studio`
2. Sprawdź czy faktor został zapisany w tabeli `ProductOverride`
3. Sprawdź konsole przeglądarki (F12) - błędy API

### Problem: Zdjęcia nie ładują się

**Rozwiązanie:**

1. Sprawdź ścieżkę w JSON: `/images/[producent]/[nazwa].webp`
2. Sprawdź czy pliki istnieją w `public/images/`

## Następne kroki (opcjonalne)

1. **Usunąć stare pliki** `/producent/Befame/page.tsx` i `/producent/Bomar/page.tsx` (już nieużywane)
2. **Dodać cache** dla API overrides (redis/memory)
3. **Dodać bulk edit** w panelu admin (edycja wielu produktów naraz)
4. **Dodać historię zmian** faktorów (audit log)
5. **Dodać export** do PDF/Excel ze zmodyfikowanymi cenami
