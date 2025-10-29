# Podsumowanie Zmian - System Cenników

## ✅ Zrealizowane

### 1. Jednolity Layout dla Wszystkich Producentów

-   **Przed:** Befame (tabela), Bomar (grid custom)
-   **Po:** Wszystkie producenty używają tego samego layoutu grid z kartami
-   **Routing:** `/producent/[manufacturer]` działa dla każdego producenta z pliku JSON

### 2. Edycja Faktorów Tylko w Adminie

-   **Panel Admin:** Zakładka "💰 Zarządzaj Faktorami Cen"

    -   Wybór producenta z listy
    -   Lista wszystkich produktów według kategorii
    -   Edycja inline (własna nazwa + faktor)
    -   Usuwanie nadpisań
    -   Wizualne oznaczenia (badge)

-   **Strony Producentów:** Tylko wyświetlanie
    -   Automatyczne pobieranie faktorów z bazy
    -   Niebieskie ceny dla zmodyfikowanych produktów
    -   Badge z faktorem (np. "1.1x")
    -   Przekreślona cena bazowa

### 3. Nowe Komponenty

#### ProductCard.tsx

Zastępuje ProductsTable - layout karty produktu:

-   Zdjęcie 200x200px
-   Nazwa (custom lub oryginalna)
-   Materiał, wymiary
-   Ceny z automatycznym obliczaniem faktora
-   Opcje, opisy
-   Notatki (czerwony badge)
-   Responsive grid (1/2/3 kolumny)

#### FactorManager.tsx

Panel zarządzania w adminie:

-   Lista producentów
-   Edycja produktów według kategorii
-   Inline forms
-   CRUD operations (Create, Read, Update, Delete)

### 4. Nowe API Endpoints

#### `/api/manufacturers` (GET)

Zwraca listę wszystkich producentów z folderu `data/`.

#### `/api/overrides` (GET/POST/DELETE)

Zarządzanie nadpisaniami cen w bazie danych.

### 5. Baza Danych (Neon PostgreSQL + Prisma)

**Tabela:** `ProductOverride`

```prisma
id            String   @id @default(cuid())
manufacturer  String
category      String
productName   String
customName    String?
priceFactor   Float    @default(1.0)
createdAt     DateTime @default(now())
updatedAt     DateTime @updatedAt
```

**Constraint:** `@@unique([manufacturer, category, productName])`

## 📊 Struktura Projektu

```
cenniki/
├── app/
│   ├── api/
│   │   ├── parse-pdf/          # AI endpoint (bez zmian)
│   │   ├── overrides/          # CRUD dla faktorów (bez zmian)
│   │   └── manufacturers/      # Nowy endpoint - lista producentów
│   ├── admin/
│   │   └── page.tsx            # 3 zakładki: PDF, Excel, Faktory
│   └── producent/
│       └── [manufacturer]/     # Dynamiczny routing z grid layout
│           └── page.tsx
├── components/
│   ├── ProductCard.tsx         # NOWY - karta produktu
│   ├── FactorManager.tsx       # NOWY - panel zarządzania
│   ├── ProductsTable.tsx       # STARY - nie używany (można usunąć)
│   └── PDFUploader.tsx         # Bez zmian
├── data/                       # Pliki JSON (bez zmian)
├── prisma/
│   ├── schema.prisma           # Bez zmian
│   └── migrations/             # Bez zmian
└── public/images/              # Zdjęcia produktów (bez zmian)
```

## 🎨 UI/UX

### Panel Admin - Faktory

```
┌─────────────────────────────────────┐
│ Wybierz producenta: [Dropdown]      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ KRZESŁA                             │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ NAZWA PRODUKTU         [✏️] [🗑️]│ │
│ │ Materiał: BUK                   │ │
│ │ [Badge: Faktor 1.1x]            │ │
│ │                                 │ │
│ │ [Formularz edycji inline]       │ │  ← Po kliknięciu ✏️
│ │ Własna nazwa: [_______]         │ │
│ │ Faktor: [1.1__]                 │ │
│ │ [Zapisz] [Anuluj]               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Strona Producenta

```
┌──────────────────────────────────────┐
│ PRODUCENT - CENNIK STYCZEŃ 2025      │
│ [← Powrót]                           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ [Krzesła] [Sofy] [Stoły]            │  ← Sticky navigation
└──────────────────────────────────────┘

KRZESŁA:
┌───────┐ ┌───────┐ ┌───────┐
│[1.1x] │ │       │ │       │  ← Grid 3 kolumny
│[IMG]  │ │[IMG]  │ │[IMG]  │
│NAZWA  │ │NAZWA  │ │NAZWA  │
│2875 zł│ │2500 zł│ │3200 zł│
│~~2500~│ │       │ │       │  ← Przekreślona cena bazowa
└───────┘ └───────┘ └───────┘
```

## 🔄 Przepływ Danych

```
JSON (data/)
    ↓
ProductCard
    ↓
Fetch overrides → /api/overrides?manufacturer=X&category=Y
    ↓
Oblicz: finalPrice = basePrice × factor
    ↓
Wyświetl z oznaczeniami
```

```
Admin Panel
    ↓
FactorManager
    ↓
POST /api/overrides → Zapisz do DB (Neon)
    ↓
Prisma Client → ProductOverride table
    ↓
Strona producenta automatycznie pobiera nowe faktory
```

## 📝 Pliki Dokumentacji

-   `README_PELNA_DOKUMENTACJA.md` - Pełny przewodnik systemu (zaktualizowany)
-   `AKTUALIZACJA_LAYOUT.md` - Szczegóły nowego layoutu grid
-   `NADPISYWANIE_CEN.md` - Jak działają faktory cen
-   `INSTRUKCJA_AI_CENNIKI.md` - Jak używać AI do parsowania PDF
-   `INSTRUKCJE_GROQ.md` - Setup Groq API (darmowe)
-   `TEST_API.md` - Przykłady testowania API

## 🚀 Jak Używać

### 1. Uruchom serwer

```bash
npm run dev
```

### 2. Dodaj cennik przez AI

```
http://localhost:3001/admin
→ Zakładka "📄 Upload PDF (AI)"
→ Przeciągnij PDF
→ Wybierz producenta
→ Zapisz
```

### 3. Zarządzaj faktorami

```
http://localhost:3001/admin
→ Zakładka "💰 Zarządzaj Faktorami Cen"
→ Wybierz producenta
→ Kliknij ✏️ przy produkcie
→ Wpisz faktor (np. 1.15 = +15%)
→ Zapisz
```

### 4. Zobacz wynik

```
http://localhost:3001/producent/[nazwa]
→ Produkty z faktorami mają niebieski tekst
→ Badge pokazuje mnożnik (np. "1.15x")
→ Cena bazowa przekreślona
```

## ⚙️ Konfiguracja

### .env

```bash
# AI (wybierz jedno lub oba)
GROQ_API_KEY=gsk_xxx...        # Darmowe
OPENAI_API_KEY=sk-proj-xxx...  # Płatne

# Baza danych
DATABASE_URL=postgresql://...   # Neon PostgreSQL
```

### Prisma

```bash
npx prisma migrate dev   # Zastosuj migracje
npx prisma studio        # Przeglądaj dane
npx prisma generate      # Wygeneruj client
```

## 🎯 Najważniejsze Zmiany

| Aspekt          | Przed                        | Po                                    |
| --------------- | ---------------------------- | ------------------------------------- |
| Layout          | Różny dla każdego producenta | Jednolity grid dla wszystkich         |
| Edycja faktorów | Na każdej stronie (ikona ✏️) | Tylko w panelu admin                  |
| Komponent       | ProductsTable (tabela)       | ProductCard (karta grid)              |
| Routing         | `/producent/Befame` (custom) | `/producent/[manufacturer]` (dynamic) |
| Admin           | 2 zakładki (PDF, Excel)      | 3 zakładki (PDF, Excel, Faktory)      |

## ✨ Korzyści

✅ **Spójność** - Wszystkie strony wyglądają identycznie  
✅ **Bezpieczeństwo** - Użytkownicy nie mogą edytować cen  
✅ **Łatwość** - Zarządzanie faktorami w jednym miejscu  
✅ **Skalowalność** - Łatwo dodać nowych producentów  
✅ **Responsywność** - Grid automatycznie dopasowuje się  
✅ **Wizualizacja** - Duże zdjęcia, czytelne karty

## 🐛 Znane Problemy

-   ⚠️ Brak cache dla overrides (każde odświeżenie = nowe zapytanie do DB)
-   ⚠️ Brak bulk edit (trzeba edytować produkt po produkcie)
-   ⚠️ Brak historii zmian faktorów

## 📦 Deployment

### Vercel

1. Push do GitHub
2. Połącz z Vercel
3. Ustaw zmienne środowiskowe:
    - `GROQ_API_KEY`
    - `OPENAI_API_KEY`
    - `DATABASE_URL`
4. Deploy automatyczny

### Inne

Wymaga Node.js 18+ i PostgreSQL.

## 📌 TODO (Opcjonalnie)

-   [ ] Dodać cache dla overrides (Redis/Memory)
-   [ ] Bulk edit w panelu admin
-   [ ] Historia zmian faktorów (audit log)
-   [ ] Export cennika do PDF/Excel ze zmodyfikowanymi cenami
-   [ ] Usunąć nieużywane pliki (`ProductsTable.tsx`, stare `/producent/Befame/page.tsx`)
-   [ ] Dodać autentykację dla panelu admin
-   [ ] Dodać search w FactorManager
-   [ ] Dodać filtrowanie po kategorii w FactorManager
