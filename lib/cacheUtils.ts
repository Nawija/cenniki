"use client";

/**
 * Utility functions for cache invalidation
 * Used by admin panel to clear cached scheduled changes
 */

// Klucz do sygnalizacji invalidacji cache (używany między zakładkami)
const CACHE_INVALIDATION_KEY = "scheduled-changes-invalidated";

// Event name dla invalidacji w tej samej zakładce
export const CACHE_INVALIDATED_EVENT = "scheduled-changes-cache-invalidated";

// Funkcja do emitowania eventu invalidacji (dla tej samej zakładki)
function emitCacheInvalidatedEvent(producerSlug?: string) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent(CACHE_INVALIDATED_EVENT, {
                detail: { producerSlug: producerSlug || "all" },
            })
        );
    }
}

/**
 * Czyści cache scheduled changes w localStorage i emituje event invalidacji
 * Używane przez admin panel po zapisaniu/usunięciu zmian
 */
export function clearScheduledChangesCache(producerSlug?: string) {
    try {
        // Wyczyść główny cache
        localStorage.removeItem("scheduled-changes-cache");
        localStorage.removeItem("scheduled-changes-producers");

        if (producerSlug) {
            localStorage.removeItem(
                `scheduled-changes-products-${producerSlug}`
            );
        } else {
            // Wyczyść wszystkie cache produktów
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith("scheduled-changes-products-")) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
        }

        // Sygnalizuj innym zakładkom
        localStorage.setItem(
            CACHE_INVALIDATION_KEY,
            JSON.stringify({
                timestamp: Date.now(),
                producerSlug: producerSlug || "all",
            })
        );
    } catch {
        // localStorage niedostępne
    }

    // Emituj event dla tej samej zakładki
    emitCacheInvalidatedEvent(producerSlug);
}
