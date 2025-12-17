"use client";

import { useState, useEffect, useCallback } from "react";

interface ScheduledChangeItem {
    id: string;
    product: string;
    category?: string;
    element?: string;
    dimension?: string;
    priceGroup?: string;
    oldPrice: number;
    newPrice: number;
    percentChange: number;
}

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

// Typ dla mapy zmian produktów
// Klucz: "kategoria__produkt" lub "produkt"
export type ScheduledChangesMap = Map<string, ProductScheduledChange[]>;

// Funkcja do obliczania zmian z updatedData porównując z aktualnymi danymi
function calculateChangesFromData(
    currentData: any,
    updatedData: any
): ScheduledChangeItem[] {
    const changes: ScheduledChangeItem[] = [];

    // Bomar/Halex/Furnirest layout (categories with products)
    if (updatedData?.categories && currentData?.categories) {
        for (const [catName, products] of Object.entries(
            updatedData.categories as Record<string, any>
        )) {
            for (const [prodName, prodData] of Object.entries(
                products as Record<string, any>
            )) {
                const currentProd =
                    currentData.categories?.[catName]?.[prodName];
                if (!currentProd) continue;

                // Check prices (groups like Grupa I, II...)
                if (prodData.prices && currentProd.prices) {
                    for (const [group, price] of Object.entries(
                        prodData.prices as Record<string, number>
                    )) {
                        const currentPrice = currentProd.prices[group];
                        if (
                            currentPrice !== undefined &&
                            currentPrice !== price
                        ) {
                            const percentChange =
                                ((Number(price) - Number(currentPrice)) /
                                    Number(currentPrice)) *
                                100;
                            changes.push({
                                id: `${catName}-${prodName}-${group}`,
                                product: prodName,
                                category: catName,
                                priceGroup: group,
                                oldPrice: Number(currentPrice),
                                newPrice: Number(price),
                                percentChange:
                                    Math.round(percentChange * 10) / 10,
                            });
                        }
                    }
                }

                // Check sizes (dimension-based prices)
                if (prodData.sizes && currentProd.sizes) {
                    for (const newSize of prodData.sizes) {
                        const currentSize = currentProd.sizes.find(
                            (s: any) => s.dimension === newSize.dimension
                        );
                        if (!currentSize) continue;

                        const newPrice =
                            typeof newSize.prices === "object"
                                ? null
                                : Number(newSize.prices);
                        const currentPrice =
                            typeof currentSize.prices === "object"
                                ? null
                                : Number(currentSize.prices);

                        if (
                            newPrice &&
                            currentPrice &&
                            newPrice !== currentPrice
                        ) {
                            const percentChange =
                                ((newPrice - currentPrice) / currentPrice) *
                                100;
                            changes.push({
                                id: `${catName}-${prodName}-${newSize.dimension}`,
                                product: prodName,
                                category: catName,
                                dimension: newSize.dimension,
                                oldPrice: currentPrice,
                                newPrice,
                                percentChange:
                                    Math.round(percentChange * 10) / 10,
                            });
                        }
                    }
                }
            }
        }
    }

    // MP Nidzica layout (products array)
    if (updatedData?.products && currentData?.products) {
        for (const newProd of updatedData.products) {
            const currentProd = currentData.products.find(
                (p: any) => p.name === newProd.name
            );
            if (!currentProd) continue;

            if (newProd.elements && currentProd.elements) {
                for (const newEl of newProd.elements) {
                    // Obsługa obu formatów: {name, price} i {code, prices}
                    const elKey = newEl.code || newEl.name;
                    const currentEl = currentProd.elements.find(
                        (e: any) => (e.code || e.name) === elKey
                    );
                    if (!currentEl) continue;

                    // Format {code, prices} - obiekt z grupami cenowymi
                    if (newEl.prices && typeof newEl.prices === "object") {
                        for (const [group, price] of Object.entries(
                            newEl.prices as Record<string, number>
                        )) {
                            const currentPrice = currentEl.prices?.[group];
                            if (
                                currentPrice !== undefined &&
                                currentPrice !== price
                            ) {
                                const percentChange =
                                    ((Number(price) - Number(currentPrice)) /
                                        Number(currentPrice)) *
                                    100;
                                changes.push({
                                    id: `${newProd.name}-${elKey}-${group}`,
                                    product: newProd.name,
                                    priceGroup: `${elKey} (${group})`,
                                    oldPrice: Number(currentPrice),
                                    newPrice: Number(price),
                                    percentChange:
                                        Math.round(percentChange * 10) / 10,
                                });
                            }
                        }
                    }
                    // Format {name, price} - pojedyncza cena
                    else if (
                        newEl.price !== undefined &&
                        currentEl.price !== undefined
                    ) {
                        if (newEl.price !== currentEl.price) {
                            const percentChange =
                                ((Number(newEl.price) -
                                    Number(currentEl.price)) /
                                    Number(currentEl.price)) *
                                100;
                            changes.push({
                                id: `${newProd.name}-${elKey}`,
                                product: newProd.name,
                                priceGroup: elKey,
                                oldPrice: Number(currentEl.price),
                                newPrice: Number(newEl.price),
                                percentChange:
                                    Math.round(percentChange * 10) / 10,
                            });
                        }
                    }
                }
            }
        }
    }

    // Puszman layout (Arkusz1 array)
    if (updatedData?.Arkusz1 && currentData?.Arkusz1) {
        for (const newProd of updatedData.Arkusz1) {
            const currentProd = currentData.Arkusz1.find(
                (p: any) => p.MODEL === newProd.MODEL
            );
            if (!currentProd) continue;

            // Puszman używa "grupa I", "grupa II", itd.
            const priceGroups = [
                "grupa I",
                "grupa II",
                "grupa III",
                "grupa IV",
                "grupa V",
                "grupa VI",
            ];
            for (const group of priceGroups) {
                if (
                    newProd[group] !== undefined &&
                    currentProd[group] !== undefined &&
                    newProd[group] !== currentProd[group]
                ) {
                    const percentChange =
                        ((Number(newProd[group]) - Number(currentProd[group])) /
                            Number(currentProd[group])) *
                        100;
                    changes.push({
                        id: `${newProd.MODEL}-${group}`,
                        product: newProd.MODEL,
                        priceGroup: group,
                        oldPrice: Number(currentProd[group]),
                        newPrice: Number(newProd[group]),
                        percentChange: Math.round(percentChange * 10) / 10,
                    });
                }
            }
        }
    }

    return changes;
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

        // Sprawdź sessionStorage
        try {
            const cached = sessionStorage.getItem(
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
            // sessionStorage niedostępne
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
                        changeItems = calculateChangesFromData(
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

                // Zapisz do sessionStorage
                try {
                    const mapObj = Object.fromEntries(map);
                    sessionStorage.setItem(
                        `scheduled-changes-products-${producerSlug}`,
                        JSON.stringify({ data: mapObj, timestamp: now })
                    );
                } catch (e) {
                    // sessionStorage niedostępne
                }

                setChangesMap(map);
            }
        } catch (error) {
            console.error("Error fetching scheduled changes:", error);
        } finally {
            setLoading(false);
        }
    }, [producerSlug]);

    useEffect(() => {
        fetchChanges();
    }, [fetchChanges]);

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

    return {
        changesMap,
        loading,
        getProductChanges,
        hasScheduledChanges,
        getAverageChange,
    };
}
