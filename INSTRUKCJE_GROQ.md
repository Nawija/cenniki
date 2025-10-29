# 🚀 Konfiguracja DARMOWEGO AI - Groq

## Problem z OpenAI?

Jeśli dostałeś błąd `insufficient_quota` przy użyciu OpenAI, **użyj Groq - jest całkowicie DARMOWY!**

---

## ✨ Dlaczego Groq?

-   ✅ **Całkowicie darmowy** tier (6000 requestów/dzień)
-   ⚡ **Super szybki** - szybszy niż GPT-4!
-   🤖 **Llama 3.3 70B** - świetny model od Meta
-   🎯 **Idealny dla cenników** - świetnie radzi sobie z tabelami

---

## 📝 Jak skonfigurować (2 minuty):

### 1. **Zarejestruj się na Groq**

Idź na: **https://console.groq.com/**

-   Kliknij "Sign Up" (możesz użyć Google/GitHub)
-   Potwierdź email

### 2. **Pobierz klucz API**

-   Po zalogowaniu idź na: https://console.groq.com/keys
-   Kliknij **"Create API Key"**
-   Nazwij go np. "Cenniki"
-   **Skopiuj klucz** (zaczyna się od `gsk_...`)

### 3. **Dodaj klucz do projektu**

```bash
# Utwórz plik .env.local (jeśli nie istnieje)
cp .env.local.example .env.local

# Edytuj plik
nano .env.local
# lub otwórz w VS Code
```

**Wklej swój klucz:**

```env
GROQ_API_KEY=gsk_twoj_prawdziwy_klucz_tutaj
```

### 4. **Restartuj serwer**

```bash
# Zatrzymaj serwer (Ctrl+C)
# Uruchom ponownie
npm run dev
```

---

## 🎯 Gotowe!

Teraz gdy przesyłasz PDF:

-   ✅ System automatycznie użyje Groq (za darmo!)
-   ⚡ Przetwarzanie 2-5 sekund (szybciej niż GPT-4!)
-   💰 **Koszt: 0 zł** (do 6000 cenników dziennie!)

---

## 🔄 Porównanie:

| Feature           | Groq           | OpenAI GPT-4         |
| ----------------- | -------------- | -------------------- |
| **Cena**          | ✅ DARMOWY     | 💵 $0.01-0.05/cennik |
| **Szybkość**      | ⚡ 2-5 sek     | 🐌 10-30 sek         |
| **Limit dzienny** | 6000 requestów | Zależy od kredytów   |
| **Jakość**        | ⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐           |
| **Model**         | Llama 3.3 70B  | GPT-4o               |

---

## ❓ FAQ

### Czy Groq jest naprawdę darmowy?

**TAK!** Darmowy tier to 6000 requestów/dzień. Jeśli przetwarzasz 30 cenników dziennie, masz zapas na 200 dni! 😊

### Czy mogę używać obu (Groq + OpenAI)?

**TAK!** System automatycznie wybiera:

-   Jeśli masz `GROQ_API_KEY` → używa Groq (darmowy)
-   Jeśli tylko `OPENAI_API_KEY` → używa OpenAI (płatny)

### Co jeśli przekroczę limit Groq?

Darmowy limit to 6000/dzień. Jeśli go przekroczysz:

-   Dodaj `OPENAI_API_KEY` jako backup
-   Lub poczekaj do następnego dnia (limit resetuje się o północy UTC)

### Czy Groq jest tak dobry jak GPT-4?

Dla cenników - **TAK!** Llama 3.3 70B świetnie radzi sobie z tabelami i strukturyzacją danych. Jest nawet szybszy!

---

## 🐛 Rozwiązywanie problemów

### Błąd: "GROQ_API_KEY is not defined"

1. Sprawdź czy plik `.env.local` istnieje
2. Upewnij się, że klucz zaczyna się od `gsk_`
3. Restartuj serwer: `Ctrl+C` → `npm run dev`

### Błąd: "Rate limit exceeded"

Przekroczyłeś darmowy limit (6000/dzień):

-   Poczekaj do następnego dnia
-   Lub dodaj `OPENAI_API_KEY` jako backup

---

## 🎉 Podsumowanie

**Przed (OpenAI):**

-   💵 Wymagana karta kredytowa
-   💰 ~$1.50/miesiąc (30 cenników)
-   ❌ Błąd "insufficient_quota"

**Teraz (Groq):**

-   ✅ Całkowicie darmowy
-   ⚡ Szybszy
-   😊 Działa od razu!

---

Gotowe? Dodaj klucz Groq do `.env.local` i ciesz się darmowym AI! 🚀
