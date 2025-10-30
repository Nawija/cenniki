-- SQL do uruchomienia w Neon Console
-- https://console.neon.tech

-- 1. Sprawdź czy kolumna discount już istnieje
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ProductOverride'
ORDER BY ordinal_position;

-- 2. Jeśli kolumny discount nie ma, dodaj ją:
ALTER TABLE "ProductOverride" ADD COLUMN IF NOT EXISTS "discount" INTEGER;

-- 3. Weryfikacja - powinno pokazać wszystkie kolumny włącznie z discount
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ProductOverride'
ORDER BY ordinal_position;

-- 4. (Opcjonalnie) Zobacz aktualne nadpisania
SELECT id, manufacturer, category, "productName", "customName", "priceFactor", discount
FROM "ProductOverride"
LIMIT 10;
