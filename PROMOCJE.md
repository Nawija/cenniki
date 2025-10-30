# System Promocji

## Opis

System promocji pozwala na ustawienie rabatu procentowego na produkty. Promocja jest stosowana **po** zastosowaniu mnożnika cen (priceFactor).

## Użycie

### W Panelu Administracyjnym

1. Wejdź na `/admin` i wybierz "Zarządzaj cenami"
2. Wybierz producenta z listy
3. Znajdź produkt, który chcesz objąć promocją
4. Kliknij "Edytuj"
5. W formularzu edycji:
    - **Własna nazwa** - opcjonalna zmiana nazwy produktu
    - **Mnożnik cen (faktor)** - podstawowy mnożnik (np. 1.1 = +10%, 0.9 = -10%)
    - **Promocja (% rabatu)** - procent rabatu od 0 do 100 (np. 20 = -20%)
6. Kliknij "Zapisz"

### Przykład

Jeśli produkt kosztuje 1000 zł, a ustawisz:

-   Mnożnik: 1.2 (cena wzrasta o 20%)
-   Promocja: 20% (rabat 20%)

Obliczenie:

1. 1000 zł × 1.2 = 1200 zł (cena po zastosowaniu mnożnika)
2. 1200 zł - 20% = 960 zł (cena po rabacie promocyjnym)

## Usunięcie Promocji

Aby usunąć promocję:

1. Edytuj produkt
2. Wyczyść pole "Promocja (% rabatu)" (zostaw puste)
3. Zapisz

**LUB**

1. Kliknij "Usuń" przy produkcie
2. Potwierdź usunięcie (usuwa całe nadpisanie: nazwę, mnożnik i promocję)

## Wizualna Prezentacja

### Badge Promocji

-   Produkty z promocją mają **czerwony pulsujący badge** "PROMOCJA -X%"
-   Badge jest widoczny zarówno w panelu administracyjnym, jak i na stronie producenta

### Ceny z Promocją

-   Cena końcowa jest wyświetlana na **czerwono**
-   Cena przed rabatem jest przekreślona na szaro powyżej
-   Przykład:
    ```
    960 zł  (czerwony, pogrubiony)
    1200 zł (szary, przekreślony)
    ```

## Struktura Bazy Danych

### Tabela: ProductOverride

```prisma
model ProductOverride {
    id           String @id @default(cuid())
    manufacturer String
    category     String
    productName  String

    customName  String? // Opcjonalna własna nazwa
    priceFactor Float   @default(1.0) // Mnożnik cen
    discount    Int?    // Procent rabatu (null = brak promocji)

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}
```

## API

### POST /api/overrides

Utwórz lub zaktualizuj nadpisanie z promocją:

```json
{
    "manufacturer": "befame",
    "category": "sofy",
    "productName": "BELAVIO",
    "customName": null,
    "priceFactor": 1.0,
    "discount": 20
}
```

### DELETE /api/overrides?id={id}

Usuń nadpisanie (wraz z promocją):

```
DELETE /api/overrides?id=clxx123456789
```

## Komponenty

### ProductCard

-   Wyświetla badge promocji
-   Pokazuje ceny z rabatem
-   Przekreśla stare ceny

### FactorManager

-   Formularz z polem promocji
-   Badge promocji w edytorze
-   Podgląd cen z promocją

## Logika Obliczeń

```typescript
// 1. Zastosuj mnożnik
const priceWithFactor = basePrice * priceFactor;

// 2. Zastosuj rabat (jeśli istnieje)
if (discount && discount > 0) {
    const discountedPrice = priceWithFactor * (1 - discount / 100);
    return {
        finalPrice: discountedPrice,
        originalPrice: priceWithFactor,
        hasDiscount: true,
    };
}

return {
    finalPrice: priceWithFactor,
    hasDiscount: false,
};
```

## Migracja

Pole `discount` zostało dodane do bazy danych w migracji `20251030004951_add_discount_field`.
