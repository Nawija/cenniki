# System Cenników - Pełna Dokumentacja

## Przegląd Systemu

System składa się z 3 głównych części:

1. **Przetwarzanie PDF z AI** - automatyczna ekstrakcja danych z plików PDF
2. **Przechowywanie danych** - pliki JSON z cenami bazowymi
3. **Nadpisywanie cen** - baza danych z indywidualnymi mnożnikami (tylko admin)

**Layout:** Wszystkie strony producentów używają jednolitego layoutu grid (karty produktów) z nawigacją po kategoriach.

## 1. Przetwarzanie PDF (AI)

### Lokalizacja

Panel administracyjny: `/admin`

### Jak to działa

1. Przeciągnij PDF do uploader'a
2. Wybierz producenta z listy
3. AI (Groq lub OpenAI) przetwarza PDF i wyciąga:
    - Tytuł cennika (z datą)
    - Kategorie produktów
    - Nazwy produktów
    - Ceny dla różnych grup (A-E, I-IV, itp.)
    - Wymiary
    - Materiały
    - Opcje dodatkowe

### Wynik

Plik JSON zapisany w `data/[Producent].json`

**Przykład:**

```json
{
    "title": "CENNIK STYCZEŃ 2025",
    "categories": {
        "sofy": {
            "SOFIA 3 OSOBOWA": {
                "image": "/images/befame/sofia.webp",
                "material": "BUK",
                "dimensions": "200x90x85 cm",
                "prices": {
                    "Grupa A": 2500,
                    "Grupa B": 2700
                }
            }
        }
    }
}
```

### Instrukcje

-   `INSTRUKCJA_AI_CENNIKI.md` - pełny przewodnik
-   `INSTRUKCJE_GROQ.md` - setup darmowego API Groq

## 2. Wyświetlanie Cenników

### Routing

-   **Dynamiczny:** `/producent/[nazwa]` - np. `/producent/befame`
-   Automatycznie generuje strony dla wszystkich JSON w folderze `data/`

### Komponenty

-   `ProductCard.tsx` - karta produktu (layout grid)
-   Funkcje:

    -   Grid 3 kolumny (responsive: 1/2/3)
    -   Duże zdjęcia produktów (200x200px)
    -   Automatyczne obliczanie cen z faktorami
    -   Grupowanie po kategoriach z nawigacją
    -   Obsługa różnych formatów (prices/sizes)
    -   Wyświetlanie opcji, opisów, materiałów, wymiarów

-   `FactorManager.tsx` - panel zarządzania faktorami (tylko admin)

### Struktura

```
/producent/befame → wczytuje data/Befame.json (grid layout)
/producent/bomar → wczytuje data/Bomar.json (grid layout)
/producent/gala → wczytuje data/Gala.json (grid layout)
```

## 3. Nadpisywanie Cen i Nazw

### Gdzie

**Panel Admin (`/admin`)** - zakładka "💰 Zarządzaj Faktorami Cen"  
Tylko administratorzy mogą edytować faktory. Na stronach producentów użytkownicy widzą tylko wynik (zmodyfikowane ceny).

### Co można zmienić

-   **Mnożnik cen** (priceFactor) - np. 1.1 = +10%, 0.9 = -10%
-   **Własna nazwa** (customName) - np. "Narożnik Premium" zamiast "NAROZNIK SET 1"

### Baza danych

**Tabela:** `ProductOverride`

-   `manufacturer` - np. "befame"
-   `category` - np. "sofy"
-   `productName` - oryginalna nazwa z JSON
-   `customName` - Twoja nazwa (opcjonalnie)
-   `priceFactor` - mnożnik (domyślnie 1.0)

### Obliczanie ceny

```
Cena finalna = Cena bazowa (JSON) × Faktor (DB)
```

### Przykład

Produkt w JSON:

```json
"prices": { "Grupa A": 2500 }
```

Faktor w DB: `1.15` (tj. +15%)

Wyświetlana cena: **2875 zł**  
(pokazuje też przekreśloną cenę bazową: ~~2500 zł~~)

## Przepływ Danych

```
PDF → AI (Groq/OpenAI) → JSON (data/) → ProductsTable
                                             ↓
                                     Baza danych (overrides)
                                             ↓
                                     Wyświetlenie ze zmienioną ceną
```

## Pliki Konfiguracyjne

### `.env`

```bash
# AI - wybierz jedno lub oba
GROQ_API_KEY=gsk_xxx...        # Darmowe 6000 req/dzień
OPENAI_API_KEY=sk-proj-xxx...  # Płatne, lepsze wyniki

# Baza danych (Neon PostgreSQL)
DATABASE_URL=postgresql://...
```

### `prisma/schema.prisma`

Schemat bazy danych dla nadpisań cen.

## API Endpoints

### `/api/parse-pdf` (POST)

Przetwarza PDF przez AI.

**Body (multipart/form-data):**

-   `file` - plik PDF
-   `manufacturer` - nazwa producenta
-   `saveToFile` - czy zapisać JSON (true/false)

### `/api/overrides` (GET)

Pobiera nadpisania cen.

**Query:**

-   `manufacturer` - wymagane
-   `category` - opcjonalne

### `/api/overrides` (POST)

Tworzy/aktualizuje nadpisanie.

**Body:**

```json
{
    "manufacturer": "befame",
    "category": "sofy",
    "productName": "SOFIA 3 OSOBOWA",
    "customName": "Sofa Premium Sofia",
    "priceFactor": 1.1
}
```

### `/api/overrides` (DELETE)

Usuwa nadpisanie.

**Query:**

-   `id` - ID nadpisania

## Uruchamianie

### Development

```bash
npm run dev
```

### Build (produkcja)

```bash
npm run build
npm start
```

### Prisma (migracje bazy)

```bash
npx prisma migrate dev     # Zastosuj migracje
npx prisma studio          # GUI do przeglądania danych
npx prisma generate        # Wygeneruj Prisma Client
```

## Struktura Projektu

```
cenniki/
├── app/
│   ├── api/
│   │   ├── parse-pdf/      # AI endpoint
│   │   └── overrides/      # CRUD dla nadpisań
│   ├── admin/              # Panel AI
│   ├── producent/
│   │   └── [manufacturer]/ # Dynamiczne strony
│   ├── layout.tsx
│   └── page.tsx            # Strona główna
├── components/
│   ├── ProductsTable.tsx   # Główny komponent
│   ├── PDFUploader.tsx     # Upload PDF
│   └── buttons/
├── data/                   # Pliki JSON z cennikami
│   ├── Befame.json
│   ├── Bomar.json
│   └── Gala.json
├── prisma/
│   ├── schema.prisma       # Schemat DB
│   └── migrations/         # Historia migracji
├── public/
│   └── images/             # Zdjęcia produktów
├── .env                    # Klucze API i DB
├── INSTRUKCJA_AI_CENNIKI.md
├── INSTRUKCJE_GROQ.md
└── NADPISYWANIE_CEN.md
```

## Najważniejsze Funkcje

✅ **AI Parsing** - 2 minuty zamiast 2+ godzin ręcznej pracy  
✅ **Dynamiczne routing** - automatyczne strony dla wszystkich producentów  
✅ **Hybrydowe przechowywanie** - JSON (dane) + DB (nadpisania)  
✅ **Wyszukiwanie** - szybkie filtrowanie produktów  
✅ **Edycja cen** - bez modyfikacji oryginalnych plików  
✅ **Responsive** - działa na mobile i desktop  
✅ **Obrazy** - automatyczna optymalizacja przez Next.js

## Wsparcie

### Błędy kompilacji

```bash
npm run build
```

Jeśli są błędy TypeScript, sprawdź typy w `ProductsTable.tsx`.

### Problemy z bazą danych

```bash
npx prisma studio
```

Przeglądaj i edytuj dane w przeglądarce.

### Problemy z AI

-   Sprawdź klucze API w `.env`
-   Groq: 6000 req/dzień limit
-   OpenAI: wymaga credits
-   Logi w konsoli przeglądarki (F12)

## Stack Technologiczny

-   **Framework:** Next.js 15.5.4 (App Router)
-   **React:** 19.1.0
-   **TypeScript:** ✅
-   **Styling:** Tailwind CSS 4
-   **AI:** Groq (llama-3.3-70b-versatile), OpenAI (GPT-4o)
-   **PDF:** pdf2json
-   **Database:** Neon PostgreSQL (serverless)
-   **ORM:** Prisma 6.18.0
-   **Icons:** lucide-react
-   **Image Optimization:** Next.js Image

## Deployment

### Vercel (zalecane)

1. Połącz repo z GitHub
2. Ustaw zmienne środowiskowe:
    - `GROQ_API_KEY`
    - `OPENAI_API_KEY` (opcjonalnie)
    - `DATABASE_URL` (z Neon)
3. Deploy automatyczny przy push

### Inne platformy

Wymaga Node.js 18+ i PostgreSQL database.
