# Test API Overrides

Ten plik zawiera przykłady testowania API nadpisań cen.

## Test 1: Dodanie nadpisania

```bash
curl -X POST http://localhost:3001/api/overrides \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "befame",
    "category": "narożniki",
    "productName": "BELAVIO NAROŻNIK SET 1",
    "customName": "Narożnik Premium Belavio",
    "priceFactor": 1.15
  }'
```

**Oczekiwany wynik:**

```json
{
    "override": {
        "id": "xxx",
        "manufacturer": "befame",
        "category": "narożniki",
        "productName": "BELAVIO NAROŻNIK SET 1",
        "customName": "Narożnik Premium Belavio",
        "priceFactor": 1.15,
        "createdAt": "...",
        "updatedAt": "..."
    }
}
```

## Test 2: Pobranie nadpisań dla producenta

```bash
curl "http://localhost:3001/api/overrides?manufacturer=befame"
```

**Oczekiwany wynik:**

```json
{
    "overrides": [
        {
            "id": "xxx",
            "manufacturer": "befame",
            "category": "narożniki",
            "productName": "BELAVIO NAROŻNIK SET 1",
            "customName": "Narożnik Premium Belavio",
            "priceFactor": 1.15,
            "createdAt": "...",
            "updatedAt": "..."
        }
    ]
}
```

## Test 3: Pobranie nadpisań dla kategorii

```bash
curl "http://localhost:3001/api/overrides?manufacturer=befame&category=narożniki"
```

## Test 4: Aktualizacja istniejącego nadpisania

```bash
curl -X POST http://localhost:3001/api/overrides \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "befame",
    "category": "narożniki",
    "productName": "BELAVIO NAROŻNIK SET 1",
    "customName": "Narożnik Luksusowy Belavio",
    "priceFactor": 1.25
  }'
```

Jeśli produkt już istnieje, zostanie zaktualizowany.

## Test 5: Usunięcie nadpisania

```bash
# Najpierw pobierz ID z Test 2
curl -X DELETE "http://localhost:3001/api/overrides?id=xxx"
```

**Oczekiwany wynik:**

```json
{
    "success": true
}
```

## Test w przeglądarce

1. Otwórz: http://localhost:3001/producent/befame
2. Znajdź dowolny produkt
3. Kliknij ikonę ołówka ✏️
4. Wpisz:
    - Własna nazwa: "Test Premium"
    - Mnożnik: 1.2
5. Kliknij "Zapisz"
6. Sprawdź czy cena się zmieniła (powinna być niebieska i +20%)

## Test w Prisma Studio

```bash
npx prisma studio
```

1. Otwórz http://localhost:5555
2. Wybierz tabelę `ProductOverride`
3. Sprawdź czy widzisz utworzone rekordy
4. Możesz edytować bezpośrednio w GUI

## Weryfikacja Schematu

```bash
npx prisma validate
```

Powinno pokazać: "The schema is valid ✔"

## Sprawdzenie Połączenia z Bazą

```bash
npx prisma db pull
```

Jeśli połączenie działa, zobaczyś: "Introspected X models..."
