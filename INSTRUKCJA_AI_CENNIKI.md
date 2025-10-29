# 🚀 System Automatyzacji Cenników z AI

## 📋 Problem

Zarządzanie cennikami od 30 producentów w różnych formatach PDF, wymagające ręcznej konwersji do Excel i poprawiania struktury danych.

## ✨ Rozwiązanie

System wykorzystujący **OpenAI GPT-4** do automatycznej ekstrakcji i strukturyzacji danych z PDF-ów:

### Funkcjonalności:

-   ✅ **Drag & Drop PDF** - Przeciągnij plik i poczekaj
-   ✅ **AI Parsing** - Automatyczna ekstrakcja produktów, cen, opcji
-   ✅ **Podgląd w czasie rzeczywistym** - Zobacz wynik przed zapisem
-   ✅ **Export do JSON** - Gotowe dane dla aplikacji
-   ✅ **Panel admina** - Zarządzanie wszystkimi cennikami

---

## 🛠️ Instalacja i konfiguracja

### 1. **Zainstaluj zależności** (już zrobione ✅)

```bash
npm install openai pdf-parse formidable@v3
```

### 2. **Konfiguracja AI API**

#### 🎯 OPCJA A: Groq (ZALECANE - DARMOWY!)

1. Zarejestruj się na: **https://console.groq.com/**
2. Idź na: https://console.groq.com/keys
3. Kliknij **"Create API Key"**
4. Skopiuj klucz (zaczyna się od `gsk-...`)
5. Dodaj do projektu:

```bash
# Skopiuj przykładowy plik
cp .env.local.example .env.local

# Edytuj .env.local i wklej swój klucz:
GROQ_API_KEY=gsk-twoj-prawdziwy-klucz-tutaj
```

**✅ Korzyści Groq:**

-   Całkowicie darmowy (6000 requestów/dzień)
-   Szybszy niż GPT-4 (2-5 sekund vs 10-30 sekund)
-   Model Llama 3.3 70B - świetny dla cenników

#### 💰 OPCJA B: OpenAI (Płatny)

Jeśli wolisz GPT-4 lub masz już konto:

1. Idź na: https://platform.openai.com/api-keys
2. Dodaj kartę kredytową na: https://platform.openai.com/account/billing
3. Kliknij **"Create new secret key"**
4. Dodaj do `.env.local`:

```bash
OPENAI_API_KEY=sk-twoj-prawdziwy-klucz-tutaj
```

**📝 System automatycznie wybiera:** Groq (jeśli dostępny) → OpenAI (jako backup)

### 3. **Uruchom aplikację**

```bash
npm run dev
```

Aplikacja uruchomi się na: http://localhost:3000

---

## 📖 Jak używać

### Szybki start:

1. **Otwórz panel admina:**

    ```
    http://localhost:3000/admin
    ```

2. **Wybierz zakładkę "📄 Upload PDF (AI)"**

3. **Wybierz producenta z listy** (np. Bomar, Befame, Gala)

4. **Przeciągnij PDF z cennikiem** lub kliknij, aby wybrać plik

5. **Poczekaj 10-30 sekund** - AI przetworzy dokument

6. **Sprawdź wynik** - Zobacz wyekstrahowane dane w podglądzie

7. **Pobierz JSON** lub edytuj ręcznie jeśli potrzeba

---

## 🎯 Przykładowy workflow

### Scenariusz: Dostałeś nowy cennik od Bomar

```
1. Otwierasz /admin
2. Wybierasz "Bomar" z listy
3. Przeciągasz PDF "Cennik_Bomar_Luty_2025.pdf"
4. Po 15 sekundach widzisz:
   ✅ 48 produktów
   ✅ Ceny dla 5 grup
   ✅ Wszystkie opcje i notatki
5. Klikasz "Pobierz JSON"
6. Kopiujesz zawartość do /data/Bomar.json
7. GOTOWE! 🎉
```

**Oszczędność czasu:** Z 2 godzin → 2 minuty

---

## 🔧 Konfiguracja dla nowych producentów

### Dodanie nowego producenta:

1. **Dodaj do listy w `components/PDFUploader.tsx`:**

```tsx
<option value="nowyproduccent">Nowy Producent</option>
```

2. **Utwórz folder na obrazy:**

```bash
mkdir -p public/images/nowyproduccent
```

3. **Opcjonalnie: Dostosuj prompt AI**
   Edytuj `/app/api/parse-pdf/route.ts` - możesz dodać specyficzne instrukcje dla producenta.

---

## 🧠 Jak działa AI Parsing?

```
PDF → Ekstrakcja tekstu → OpenAI GPT-4 → Strukturyzacja → JSON
```

### Co AI rozpoznaje automatycznie:

-   ✅ Nazwy produktów i kategorii
-   ✅ Ceny (nawet w różnych formatach)
-   ✅ Grupy cenowe (I, II, III, IV, V)
-   ✅ Materiały (Buk, Dąb, itp.)
-   ✅ Opcje dodatkowe
-   ✅ Notatki i uwagi

### Model AI:

-   **gpt-4o** - Najnowszy, szybki, doskonały do dokumentów
-   Koszt: ~$0.01-0.05 za jeden cennik (zależny od rozmiaru PDF)

---

## 💰 Koszty

### OpenAI API (Pay-as-you-go):

-   **1 cennik (10-20 stron):** $0.01 - $0.05
-   **30 cenników miesięcznie:** ~$1.50
-   **Vs. Twój czas:** 60 godzin oszczędzone = bezcenne! 😊

### Alternatywy FREE:

Jeśli chcesz za darmo, mogę dodać:

-   **Tesseract OCR** (darmowy, ale mniej dokładny)
-   **Claude API** (darmowy tier do 100 requestów/dzień)

---

## 📂 Struktura projektu

```
app/
  api/
    parse-pdf/
      route.ts          ← Backend API do przetwarzania PDF
  admin/
    page.tsx            ← Panel admina z uploaderem
components/
  PDFUploader.tsx       ← Komponent drag & drop
data/
  Bomar.json            ← Gotowe cenniki (output)
  Befame.json
  Gala.json
```

---

## 🐛 Rozwiązywanie problemów

### Błąd: "OPENAI_API_KEY is not defined"

-   Upewnij się, że utworzyłeś plik `.env.local`
-   Restart serwera: `Ctrl+C` → `npm run dev`

### Błąd: "Failed to parse PDF"

-   Sprawdź czy PDF nie jest zaszyfrowany/chroniony hasłem
-   Niektóre PDF-y są obrazami - wtedy potrzebny OCR

### AI zwraca niepełne dane

-   Zwiększ `temperature` w API call (domyślnie 0.1)
-   Dodaj więcej szczegółów do prompt dla danego producenta

---

## 🚀 Dalsze usprawnienia (opcjonalnie)

Jeśli to zadziała dobrze, możemy dodać:

1. **📸 OCR dla zeskanowanych PDF-ów** - dla starszych cenników
2. **🔄 Automatyczne aktualizacje** - Email → PDF → Auto-update
3. **📊 Dashboard z historią** - Śledzenie zmian cen
4. **🤖 Batch processing** - Przetwarzaj 10 PDF-ów naraz
5. **💾 Baza danych** - Zamiast JSON plików
6. **🔔 Powiadomienia** - Alert gdy producent zmieni ceny

---

## 📞 Pomoc

Jeśli coś nie działa:

1. Sprawdź console w przeglądarce (F12)
2. Zobacz logi w terminalu gdzie działa `npm run dev`
3. Sprawdź czy plik `.env.local` istnieje i ma klucz API

---

## 🎉 Podsumowanie

**Przed:**

-   📄 PDF → 🖥️ Excel → ✏️ Ręczne poprawki → 😫 2 godziny/cennik

**Po:**

-   📄 PDF → 🤖 AI → ✅ JSON → 🎉 2 minuty/cennik

**Oszczędność:** 60 godzin/miesiąc = 7.5 dni roboczych!

---

Powodzenia! 🚀
