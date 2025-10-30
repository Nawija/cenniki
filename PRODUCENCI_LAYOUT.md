# Konfiguracja Producentów - Custom Layout i AI Prompt

## Struktura konfiguracji

Każdy producent jest zdefiniowany w pliku `producenci.ts` i może mieć:

-   **name**: unikalna nazwa (bez spacji, małe litery) - np. `"mpnidzica"`
-   **displayName**: nazwa wyświetlana użytkownikowi - np. `"Mp Nidzica"`
-   **displayType**: typ layoutu dla wyświetlania produktów
-   **aiPrompt**: opcjonalny custom prompt dla AI przy parsowaniu PDF

## Dostępne typy layoutów (displayType)

### 1. `"standard"` (domyślny)

Używany dla producentów takich jak Bomar, Halex.

**Struktura danych produktu:**

```json
{
    "NAZWA_PRODUKTU": {
        "image": "/images/producent/nazwa.webp",
        "material": "BUK / DĄB",
        "prices": {
            "Grupa I": 1200,
            "Grupa II": 1400,
            "Grupa III": 1600
        },
        "options": ["opcja 1", "opcja 2"]
    }
}
```

**Wyświetlanie:**

-   Pojedyncza karta produktu
-   Grupy cenowe wyświetlane w formie listy
-   Ceny obok nazw grup

### 2. `"mpnidzica"`

Dedykowany layout dla MP Nidzica z elementami i cenami A, B, C, D.

**Struktura danych produktu:**

```json
{
    "NAZWA_PRODUKTU": {
        "image": "/images/mpnidzica/nazwa.webp",
        "material": "materiał",
        "elements": {
            "3F": {
                "prices": {
                    "Grupa I": { "A": 5200, "B": 5400, "C": 5600, "D": 5800 },
                    "Grupa II": { "A": 5600, "B": 5800, "C": 6000, "D": 6200 }
                }
            },
            "2F BB": {
                "prices": {
                    "Grupa I": { "A": 4200, "B": 4400, "C": 4600, "D": 4800 }
                }
            }
        },
        "options": ["opcja 1", "opcja 2"]
    }
}
```

**Wyświetlanie:**

-   Karta produktu z rozwijanymi elementami (3F, 2F BB, PUF, itp.)
-   Każdy element zawiera grupy cenowe
-   W każdej grupie pokazane są ceny A, B, C, D w siatce 2x2
-   Użytkownik może rozwijać/zwijać elementy

## Jak dodać nowego producenta

### Krok 1: Dodaj konfigurację w `producenci.ts`

```typescript
{
    name: "nowyprocent",
    displayName: "Nowy Producent",
    displayType: "standard", // lub "mpnidzica"
    aiPrompt: `Opcjonalny custom prompt dla AI...`
}
```

### Krok 2: Jeśli potrzebujesz nowego typu layoutu

1. **Dodaj nowy typ do `DisplayType`:**

```typescript
export type DisplayType = "standard" | "mpnidzica" | "nowylayout"; // <-- nowy typ
```

2. **Stwórz nowy komponent (np. `ProductCardNowyLayout.tsx`):**

-   Skopiuj strukturę z `ProductCard.tsx` lub `ProductCardMPNidzica.tsx`
-   Dostosuj wyświetlanie do swoich potrzeb
-   Zachowaj obsługę `overrides` (faktory, promocje, custom nazwy)

3. **Zaktualizuj `ProducentPageClient.tsx`:**

```typescript
if (displayType === "nowylayout") {
    return (
        <ProductCardNowyLayout
            key={name + idx}
            name={name}
            data={data}
            category={category}
            overrides={overrides}
        />
    );
}
```

## Custom AI Prompty

Każdy producent może mieć dedykowany prompt AI dla parsowania PDF. Prompt powinien:

1. **Określić strukturę wyjściową JSON** - dokładnie opisać format danych
2. **Wyjaśnić specyfikę producenta** - np. jak są oznaczone ceny, elementy, grupy
3. **Zawierać przykłady** - pokazać jak powinny wyglądać dane wyjściowe
4. **Kończyć się przypomnieniem**: "ODPOWIEDŹ MUSI BYĆ POPRAWNYM JSON!"

### Przykład custom promptu (MP Nidzica):

```typescript
aiPrompt: `Jesteś ekspertem w analizie cenników mebli od producenta MP Nidzica.

STRUKTURA PRODUKTÓW MP NIDZICA:
- Model (nazwa produktu)
- Grupa cenowa (I, II, III, IV, V, VI)
- Element (np. 3F, 2F BB, PUF, 1 P/L)
- Ceny: A, B, C, D dla każdego elementu

Format wyjściowy JSON:
{
  "title": "CENNIK [MIESIĄC] [ROK]",
  "categories": {
    "narożniki": {
      "NAZWA": {
        "elements": {
          "3F": {
            "prices": {
              "Grupa I": { "A": 5200, "B": 5400, "C": 5600, "D": 5800 }
            }
          }
        }
      }
    }
  }
}

ODPOWIEDŹ MUSI BYĆ POPRAWNYM JSON!`;
```

## Testowanie

Po dodaniu nowego producenta:

1. Zrestartuj serwer deweloperski: `npm run dev`
2. Przejdź do panelu admin: `/admin/upload`
3. Upload PDF dla nowego producenta
4. Sprawdź czy dane są poprawnie parsowane
5. Sprawdź czy produkty są poprawnie wyświetlane na stronie producenta

## Przykłady użycia

### Bomar (standard)

-   Wyświetla krzesła, stoły z grupami cenowymi
-   Proste karty produktów z listą cen

### MP Nidzica (mpnidzica)

-   Wyświetla narożniki, sofy z elementami
-   Rozwijane sekcje dla każdego elementu
-   Ceny A, B, C, D w siatce

## Wsparcie dla nadpisań (overrides)

Wszystkie typy layoutów automatycznie wspierają:

-   ✅ Custom nazwy produktów
-   ✅ Faktory cenowe (mnożniki)
-   ✅ Promocje (rabaty %)
-   ✅ Custom ceny (całkowite nadpisanie)
-   ✅ Custom obrazy
-   ✅ Custom poprzednie nazwy

Nadpisania są zarządzane przez komponent `FactorManager` w panelu admin.
