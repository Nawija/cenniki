# Nadpisywanie Cen i Nazw Produktów

## Funkcjonalność

System umożliwia indywidualne dostosowanie cen i nazw produktów bez zmiany oryginalnych plików JSON.

### Co możesz zmienić:

-   **Mnożnik cen (faktor)** - np. 1.1 zwiększy wszystkie ceny produktu o 10%, 0.9 zmniejszy o 10%
-   **Własna nazwa produktu** - możesz nadać produktowi własną nazwę, oryginalna będzie pokazana małym drukiem

### Gdzie są przechowywane dane:

-   **Baza danych (Neon PostgreSQL)** - tylko mnożniki cen i własne nazwy (oszczędność miejsca)
-   **Pliki JSON (data/)** - wszystkie pozostałe dane (ceny bazowe, obrazy, wymiary, materiały)

## Jak używać

### 1. Edycja produktu

Na każdej stronie producenta (np. `/producent/befame`), przy każdym produkcie jest ikona ołówka ✏️.

1. Kliknij ikonę ołówka przy nazwie produktu
2. Otwiera się modal z polami:
    - **Własna nazwa** - wpisz nową nazwę lub zostaw puste
    - **Mnożnik cen** - wpisz wartość (domyślnie 1.0)
3. Kliknij **Zapisz**

### 2. Przykłady mnożników

-   `1.0` - bez zmiany (domyślnie)
-   `1.1` - +10% do wszystkich cen tego produktu
-   `0.9` - -10% do wszystkich cen
-   `1.5` - +50%
-   `0.5` - -50%

### 3. Wizualne oznaczenia

Po zapisaniu nadpisania, w tabeli zobaczysz:

-   **Niebieska czcionka** - cena została zmodyfikowana faktorem
-   **Przekreślona cena** - oryginalna cena bazowa (jeśli różni się od finalnej)
-   **"faktor: 1.1x"** - mały napis pokazujący aktualny mnożnik
-   **"oryginalna: [nazwa]"** - jeśli zmieniłeś nazwę produktu

## Struktura bazy danych

Tabela `ProductOverride`:

```prisma
id            String   // Unikalny identyfikator
manufacturer  String   // np. "befame", "bomar"
category      String   // np. "narożniki", "sofy"
productName   String   // Oryginalna nazwa z JSON
customName    String?  // Twoja własna nazwa (opcjonalnie)
priceFactor   Float    // Mnożnik cen (domyślnie 1.0)
```

## API Endpoints

### GET `/api/overrides?manufacturer=befame`

Pobiera wszystkie nadpisania dla producenta.

**Query params:**

-   `manufacturer` - wymagane
-   `category` - opcjonalne (filtrowanie po kategorii)

**Response:**

```json
{
    "overrides": [
        {
            "id": "abc123",
            "manufacturer": "befame",
            "category": "narożniki",
            "productName": "BELAVIO NAROŻNIK SET 1",
            "customName": "Narożnik Premium Belavio",
            "priceFactor": 1.15
        }
    ]
}
```

### POST `/api/overrides`

Tworzy lub aktualizuje nadpisanie.

**Body:**

```json
{
    "manufacturer": "befame",
    "category": "narożniki",
    "productName": "BELAVIO NAROŻNIK SET 1",
    "customName": "Narożnik Premium Belavio",
    "priceFactor": 1.15
}
```

### DELETE `/api/overrides?id=abc123`

Usuwa nadpisanie.

## Przykład użycia w kodzie

```tsx
// Komponent automatycznie pobiera nadpisania
<ProductsTable products={jsonData} manufacturer="befame" />
```

Komponent `ProductsTable` automatycznie:

1. Pobiera nadpisania z API podczas montowania
2. Stosuje mnożniki do cen bazowych z JSON
3. Wyświetla własne nazwy jeśli istnieją
4. Pokazuje ikony edycji przy każdym produkcie

## Zalety tego podejścia

✅ **Oszczędność bazy danych** - przechowujesz tylko małe nadpisania, nie całe cenniki  
✅ **Elastyczność** - możesz łatwo wrócić do oryginalnych cen usuwając nadpisanie  
✅ **Niezależność** - oryginalne pliki JSON pozostają nienaruszone  
✅ **Szybkość** - nie musisz generować na nowo całego cennika po małej zmianie

## Migracje Prisma

Struktura została utworzona przez:

```bash
npx prisma migrate dev --name init
```

Jeśli potrzebujesz zaktualizować schemat:

1. Edytuj `prisma/schema.prisma`
2. Uruchom: `npx prisma migrate dev --name nazwa_migracji`
3. Prisma Client zostanie automatycznie wygenerowany
