"use client";

import { useState, useEffect, useCallback } from "react";
import {
    calculateChangesOnly,
    type ScheduledChangeItem,
} from "@/lib/scheduledChangesUtils";

interface ScheduledChange {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    createdAt: string;
    changes: ScheduledChangeItem[];
    updatedData?: Record<string, any>;
    summary: {
        totalChanges: number;
        priceIncrease: number;
        priceDecrease: number;
        avgChangePercent: number;
    };
    status: "pending" | "applied" | "cancelled";
}

// Typ dla zindeksowanych zmian produktów
export interface ProductScheduledChange {
    scheduledDate: string;
    percentChange: number;
    oldPrice: number;
    newPrice: number;
    priceGroup?: string;
    dimension?: string;
}

// Typ dla scalonej zmiany produktu (gdy wiele zaplanowanych zmian dla tego samego produktu)
export interface MergedProductChange {
    // Najbliższa data zmiany
    nextChangeDate: string;
    // Łączna zmiana procentowa (wszystkie zmiany połączone)
    totalPercentChange: number;
    // Średnia zmiana procentowa
    averagePercentChange: number;
    // Liczba zaplanowanych zmian
    changesCount: number;
    // Lista wszystkich zmian (do tooltipu)
    allChanges: {
        date: string;
        percentChange: number;
        priceGroup?: string;
        dimension?: string;
    }[];
}

// Typ dla mapy zmian produktów
// Klucz: "kategoria__produkt" lub "produkt"
export type ScheduledChangesMap = Map<string, ProductScheduledChange[]>;

// ============================================
// CACHE INVALIDATION - eksportowane funkcje
// ============================================

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

// Migracja ze starego sessionStorage do localStorage (jednorazowo)
function migrateFromSessionStorage() {
    try {
        // Wyczyść stary sessionStorage cache (migracja)
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith("scheduled-changes")) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    } catch (e) {
        // sessionStorage niedostępne
    }
}

// Wywołaj migrację przy starcie (tylko w przeglądarce)
if (typeof window !== "undefined") {
    migrateFromSessionStorage();
}

export function clearScheduledChangesCache(producerSlug?: string) {
    // Wyczyść globalny cache
    globalCache = {
        data: null,
        timestamp: 0,
        producerSlug: null,
    };

    // Wyczyść localStorage
    try {
        // Zawsze czyść główny cache banera i cache producentów z pending changes
        localStorage.removeItem("scheduled-changes-cache");
        localStorage.removeItem("scheduled-changes-producers");

        if (producerSlug) {
            // Wyczyść cache dla konkretnego producenta
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

        // Sygnalizuj innym zakładkom że cache został unieważniony
        // Używamy timestamp aby storage event był zawsze emitowany
        localStorage.setItem(
            CACHE_INVALIDATION_KEY,
            JSON.stringify({
                timestamp: Date.now(),
                producerSlug: producerSlug || "all",
            })
        );
    } catch (e) {
        // localStorage niedostępne
    }

    // Emituj event dla tej samej zakładki (storage event nie działa w tej samej zakładce)
    emitCacheInvalidatedEvent(producerSlug);
}

// Cache globalne dla całej aplikacji
let globalCache: {
    data: ScheduledChangesMap | null;
    timestamp: number;
    producerSlug: string | null;
} = {
    data: null,
    timestamp: 0,
    producerSlug: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minut

export function useScheduledChanges(producerSlug: string) {
    const [changesMap, setChangesMap] = useState<ScheduledChangesMap>(
        new Map()
    );
    const [loading, setLoading] = useState(true);

    const fetchChanges = useCallback(async () => {
        if (!producerSlug) {
            setLoading(false);
            return;
        }

        // Sprawdź cache
        const now = Date.now();
        if (
            globalCache.data &&
            globalCache.producerSlug === producerSlug &&
            now - globalCache.timestamp < CACHE_TTL
        ) {
            setChangesMap(globalCache.data);
            setLoading(false);
            return;
        }

        // Sprawdź localStorage
        try {
            const cached = localStorage.getItem(
                `scheduled-changes-products-${producerSlug}`
            );
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (now - timestamp < CACHE_TTL) {
                    const map = new Map(
                        Object.entries(data)
                    ) as ScheduledChangesMap;
                    globalCache = {
                        data: map,
                        timestamp,
                        producerSlug,
                    };
                    setChangesMap(map);
                    setLoading(false);
                    return;
                }
            }
        } catch (e) {
            // localStorage niedostępne
        }

        // Pobierz z API
        try {
            // Pobierz zaplanowane zmiany i aktualne dane producenta równolegle
            const [scheduledRes, producerRes] = await Promise.all([
                fetch(`/api/scheduled-changes?status=pending`),
                fetch(`/api/producers/${producerSlug}/data`),
            ]);

            const scheduledResult = await scheduledRes.json();
            const producerResult = await producerRes.json();

            if (scheduledResult.success) {
                // Filtruj tylko dla tego producenta
                const producerChanges: ScheduledChange[] =
                    scheduledResult.changes.filter(
                        (c: ScheduledChange) => c.producerSlug === producerSlug
                    );

                const currentData = producerResult.data;

                // Utwórz mapę: klucz produktu -> lista zmian
                const map: ScheduledChangesMap = new Map();

                for (const change of producerChanges) {
                    // Jeśli changes jest puste, oblicz z updatedData
                    let changeItems = change.changes;
                    if (
                        (!changeItems || changeItems.length === 0) &&
                        change.updatedData &&
                        currentData
                    ) {
                        changeItems = calculateChangesOnly(
                            currentData,
                            change.updatedData
                        );
                    }

                    for (const item of changeItems) {
                        const key = item.category
                            ? `${item.category}__${item.product}`
                            : item.product;

                        const existing = map.get(key) || [];
                        existing.push({
                            scheduledDate: change.scheduledDate,
                            percentChange: item.percentChange,
                            oldPrice: item.oldPrice,
                            newPrice: item.newPrice,
                            priceGroup: item.priceGroup,
                            dimension: item.dimension,
                        });
                        map.set(key, existing);
                    }
                }

                // Zapisz do cache
                globalCache = {
                    data: map,
                    timestamp: now,
                    producerSlug,
                };

                // Zapisz do localStorage
                try {
                    const mapObj = Object.fromEntries(map);
                    localStorage.setItem(
                        `scheduled-changes-products-${producerSlug}`,
                        JSON.stringify({ data: mapObj, timestamp: now })
                    );
                } catch (e) {
                    // localStorage niedostępne
                }

                setChangesMap(map);
            }
        } catch {
            // Ignore fetch errors
        } finally {
            setLoading(false);
        }
    }, [producerSlug]);

    useEffect(() => {
        fetchChanges();

        // Nasłuchuj na zmiany w localStorage z innych zakładek
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === CACHE_INVALIDATION_KEY && e.newValue) {
                try {
                    const { producerSlug: invalidatedSlug } = JSON.parse(
                        e.newValue
                    );
                    // Odśwież jeśli dotyczy tego producenta lub wszystkich
                    if (
                        invalidatedSlug === "all" ||
                        invalidatedSlug === producerSlug
                    ) {
                        // Wyczyść globalny cache
                        globalCache = {
                            data: null,
                            timestamp: 0,
                            producerSlug: null,
                        };
                        fetchChanges();
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [fetchChanges, producerSlug]);

    // Funkcja pomocnicza do sprawdzenia czy produkt ma zaplanowane zmiany
    const getProductChanges = useCallback(
        (
            productName: string,
            categoryName?: string
        ): ProductScheduledChange[] => {
            const key = categoryName
                ? `${categoryName}__${productName}`
                : productName;
            return changesMap.get(key) || [];
        },
        [changesMap]
    );

    // Funkcja pomocnicza do sprawdzenia czy produkt ma jakiekolwiek zaplanowane zmiany
    const hasScheduledChanges = useCallback(
        (productName: string, categoryName?: string): boolean => {
            return getProductChanges(productName, categoryName).length > 0;
        },
        [getProductChanges]
    );

    // Średnia zmiana procentowa dla produktu
    const getAverageChange = useCallback(
        (productName: string, categoryName?: string): number => {
            const changes = getProductChanges(productName, categoryName);
            if (changes.length === 0) return 0;
            const sum = changes.reduce((acc, c) => acc + c.percentChange, 0);
            return Math.round((sum / changes.length) * 10) / 10;
        },
        [getProductChanges]
    );

    // Scal wiele zmian dla produktu w jedną strukturę
    const getMergedChanges = useCallback(
        (
            productName: string,
            categoryName?: string
        ): MergedProductChange | null => {
            const changes = getProductChanges(productName, categoryName);
            if (changes.length === 0) return null;

            // Sortuj po dacie (najbliższe pierwsze)
            const sortedChanges = [...changes].sort(
                (a, b) =>
                    new Date(a.scheduledDate).getTime() -
                    new Date(b.scheduledDate).getTime()
            );

            // Oblicz statystyki
            const totalPercentChange = changes.reduce(
                (sum, c) => sum + c.percentChange,
                0
            );
            const averagePercentChange =
                Math.round((totalPercentChange / changes.length) * 10) / 10;

            // Grupuj zmiany po dacie dla czytelniejszego wyświetlania
            const changesByDate = new Map<string, typeof changes>();
            for (const change of sortedChanges) {
                const dateKey = new Date(
                    change.scheduledDate
                ).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "short",
                });
                const existing = changesByDate.get(dateKey) || [];
                existing.push(change);
                changesByDate.set(dateKey, existing);
            }

            // Utwórz listę zmian do tooltipu
            const allChanges = sortedChanges.map((c) => ({
                date: new Date(c.scheduledDate).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "short",
                }),
                percentChange: c.percentChange,
                priceGroup: c.priceGroup,
                dimension: c.dimension,
            }));

            return {
                nextChangeDate: sortedChanges[0].scheduledDate,
                totalPercentChange: Math.round(totalPercentChange * 10) / 10,
                averagePercentChange,
                changesCount: changes.length,
                allChanges,
            };
        },
        [getProductChanges]
    );

    // Funkcja do wymuszenia odświeżenia (np. po zastosowaniu zmian)
    const refreshChanges = useCallback(() => {
        clearScheduledChangesCache(producerSlug);
        fetchChanges();
    }, [producerSlug, fetchChanges]);

    // Nasłuchuj na event invalidacji z tej samej zakładki
    useEffect(() => {
        const handleInvalidation = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (
                detail.producerSlug === "all" ||
                detail.producerSlug === producerSlug
            ) {
                fetchChanges();
            }
        };

        window.addEventListener(CACHE_INVALIDATED_EVENT, handleInvalidation);
        return () =>
            window.removeEventListener(
                CACHE_INVALIDATED_EVENT,
                handleInvalidation
            );
    }, [fetchChanges, producerSlug]);

    return {
        changesMap,
        loading,
        getProductChanges,
        hasScheduledChanges,
        getAverageChange,
        getMergedChanges,
        refreshChanges,
    };
}

// ============================================
// HOOK: useProducersWithPendingChanges
// Zwraca Set slugów producentów z pending changes (dla sidebara)
// ============================================

const PRODUCERS_CACHE_KEY = "scheduled-changes-producers";

export function useProducersWithPendingChanges() {
    const [producersWithChanges, setProducersWithChanges] = useState<
        Set<string>
    >(new Set());
    const [loading, setLoading] = useState(true);

    const fetchProducers = useCallback(async () => {
        // Sprawdź cache
        try {
            const cached = localStorage.getItem(PRODUCERS_CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) {
                    setProducersWithChanges(new Set(data));
                    setLoading(false);
                    return;
                }
            }
        } catch {
            // ignore
        }

        try {
            const response = await fetch(
                "/api/scheduled-changes?status=pending"
            );
            const result = await response.json();

            if (result.success) {
                // Zbierz unikalne slugi producentów z pending changes
                const slugs = new Set<string>();
                for (const change of result.changes) {
                    if (change.status === "pending") {
                        slugs.add(change.producerSlug);
                    }
                }

                // Zapisz do cache
                try {
                    localStorage.setItem(
                        PRODUCERS_CACHE_KEY,
                        JSON.stringify({
                            data: Array.from(slugs),
                            timestamp: Date.now(),
                        })
                    );
                } catch {
                    // ignore
                }

                setProducersWithChanges(slugs);
            }
        } catch {
            // Ignore fetch errors
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducers();

        // Nasłuchuj na invalidację cache (ta sama zakładka)
        const handleInvalidation = () => {
            localStorage.removeItem(PRODUCERS_CACHE_KEY);
            fetchProducers();
        };

        window.addEventListener(CACHE_INVALIDATED_EVENT, handleInvalidation);

        // Nasłuchuj na storage event (inne zakładki)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === CACHE_INVALIDATION_KEY) {
                localStorage.removeItem(PRODUCERS_CACHE_KEY);
                fetchProducers();
            }
        };
        window.addEventListener("storage", handleStorage);

        return () => {
            window.removeEventListener(
                CACHE_INVALIDATED_EVENT,
                handleInvalidation
            );
            window.removeEventListener("storage", handleStorage);
        };
    }, [fetchProducers]);

    return { producersWithChanges, loading };
}
