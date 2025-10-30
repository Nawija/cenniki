# Instrukcje Deploy na Vercel z Promocjami

## Problem
Vercel nie może zdeployować projektu bo baza danych Neon nie ma kolumny `discount`.

## Rozwiązanie

### Opcja 1: Automatyczna migracja przez Vercel (Zalecane)

1. **Dodaj Build Command w Vercel:**
   - Wejdź w ustawienia projektu na Vercel
   - Settings → General → Build & Development Settings
   - Build Command: `npx prisma generate && npx prisma migrate deploy && npm run build`

2. **Upewnij się że masz DATABASE_URL:**
   - Settings → Environment Variables
   - Sprawdź czy jest `DATABASE_URL` (connection string do Neon)

3. **Redeploy:**
   - Deployments → ... → Redeploy

### Opcja 2: Ręczna migracja przez Neon Console (Najszybsza)

1. **Wejdź do Neon Console:**
   - Otwórz https://console.neon.tech
   - Wybierz swoją bazę danych

2. **Uruchom SQL Query:**
   ```sql
   ALTER TABLE "ProductOverride" ADD COLUMN IF NOT EXISTS "discount" INTEGER;
   ```

3. **Zdeployuj na Vercel:**
   - Vercel automatycznie wygeneruje Prisma Client
   - Deploy powinien przejść

### Opcja 3: Migracja przez CLI (Dla zaawansowanych)

1. **Pobierz DATABASE_URL z Vercel:**
   ```bash
   # Skopiuj z Vercel → Settings → Environment Variables
   export DATABASE_URL="postgresql://..."
   ```

2. **Uruchom migrację lokalnie:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Deploy na Vercel:**
   ```bash
   vercel --prod
   ```

## Weryfikacja

Sprawdź czy migracja zadziałała:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ProductOverride';
```

Powinieneś zobaczyć kolumnę `discount` typu `integer`.

## Co robi pole discount?

- `discount` = `20` → rabat -20%
- `discount` = `null` → brak promocji
- Promocja jest stosowana **po** zastosowaniu `priceFactor`

## Troubleshooting

### Błąd: "discount does not exist in type"
- Nie został wygenerowany Prisma Client po migracji
- Rozwiązanie: Usuń `.next` i node_modules/.prisma, uruchom `npx prisma generate`

### Błąd przy deploy na Vercel
- Baza danych nie ma kolumny `discount`
- Rozwiązanie: Użyj Opcji 2 (ręczna migracja przez Neon Console)

### Build działa lokalnie, ale nie na Vercel
- Vercel używa innego DATABASE_URL
- Rozwiązanie: Sprawdź Environment Variables na Vercel
