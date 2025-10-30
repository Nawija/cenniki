# 🚀 DEPLOY NA VERCEL - KROK PO KROKU

## ⚠️ NAJWAŻNIEJSZE - ZACZNIJ OD TEGO!

### Krok 1: Dodaj kolumnę discount w bazie Neon (2 minuty)

1. Otwórz https://console.neon.tech
2. Wybierz swoją bazę danych
3. Kliknij "SQL Editor"
4. Wklej i uruchom:
   ```sql
   ALTER TABLE "ProductOverride" ADD COLUMN IF NOT EXISTS "discount" INTEGER;
   ```
5. Sprawdź czy się udało:
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'ProductOverride';
   ```
   Powinieneś zobaczyć: id, manufacturer, category, productName, customName, priceFactor, **discount**, createdAt, updatedAt

### Krok 2: Deploy na Vercel

Teraz możesz po prostu:
```bash
git add .
git commit -m "Add discount field for promotions"
git push
```

Vercel automatycznie zdeployuje! ✅

---

## 📋 Alternatywnie: Pełny proces z migracją

Jeśli wolisz użyć Prisma Migrate:

### 1. Ustaw DATABASE_URL lokalnie
```bash
# Skopiuj z Vercel → Settings → Environment Variables → DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

### 2. Uruchom migrację
```bash
npx prisma migrate deploy
```

### 3. Deploy
```bash
git push
```

---

## 🧪 Testowanie po deploy

1. Wejdź na swoją stronę Vercel
2. Przejdź do `/admin`
3. Kliknij "Zarządzaj cenami"
4. Wybierz producenta
5. Edytuj produkt i dodaj promocję (np. 20 dla -20%)
6. Zapisz
7. Sprawdź czy produkt ma czerwony badge "PROMOCJA -20%"

---

## ❌ Jeśli coś pójdzie nie tak

### Błąd: "discount does not exist in type"
**Rozwiązanie:** Uruchom Krok 1 (dodaj kolumnę w Neon Console)

### Błąd: "Build failed"
**Rozwiązanie:** 
1. Sprawdź logi na Vercel
2. Upewnij się że `DATABASE_URL` jest w Environment Variables
3. Sprawdź czy kolumna discount istnieje w bazie

### Błąd: "Prisma Client validation failed"
**Rozwiązanie:**
```bash
# Lokalnie
npx prisma generate
npm run build

# Jeśli działa lokalnie, usuń cache na Vercel:
# Vercel Dashboard → Settings → Clear Cache → Redeploy
```

---

## ✅ Co zostało zaktualizowane

- ✅ Schema Prisma (`discount Int?`)
- ✅ Migracja (`20251030004951_add_discount_field`)
- ✅ API route (`/api/overrides` obsługuje discount)
- ✅ ProductCard (wyświetla promocje)
- ✅ FactorManager (formularz z polem promocji)
- ✅ package.json (automatyczne generowanie Prisma Client)

---

## 💡 Szybka ściągawka

**Lokalne testowanie:**
```bash
npm run dev
# Otwórz http://localhost:3000/admin
```

**Deploy:**
```bash
# Jeśli NIE wykonałeś Kroku 1:
# 1. Wejdź na console.neon.tech
# 2. Dodaj kolumnę discount (patrz Krok 1 powyżej)

# Potem:
git push
```

**Gotowe!** 🎉
