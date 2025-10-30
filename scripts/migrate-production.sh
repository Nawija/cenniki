#!/bin/bash

# Skrypt do uruchomienia migracji na produkcji (Vercel + Neon)
# Uruchom: chmod +x scripts/migrate-production.sh && ./scripts/migrate-production.sh

echo "🔄 Uruchamianie migracji Prisma na produkcji..."

# Sprawdź czy DATABASE_URL jest ustawione
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Błąd: DATABASE_URL nie jest ustawione"
    echo "💡 Skopiuj DATABASE_URL z Vercel Environment Variables"
    exit 1
fi

# Uruchom migrację
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migracja zakończona sukcesem!"
    
    # Wygeneruj Prisma Client
    echo "🔄 Generowanie Prisma Client..."
    npx prisma generate
    
    echo "✅ Gotowe! Możesz teraz zdeployować na Vercel."
else
    echo "❌ Migracja nie powiodła się"
    exit 1
fi
