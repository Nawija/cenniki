/**
 * Shared utilities for scheduled price changes
 * Used by both client-side hooks and admin components
 */

// ============================================
// TYPES
// ============================================

export interface ScheduledChangeItem {
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

export interface ScheduledChangeSummary {
    totalChanges: number;
    priceIncrease: number;
    priceDecrease: number;
    avgChangePercent: number;
}

export interface CalculateChangesResult {
    changes: ScheduledChangeItem[];
    summary: ScheduledChangeSummary;
}

// ============================================
// PRICE CALCULATION HELPERS
// ============================================

/**
 * Calculate percent change between two prices
 */
function calcPercentChange(oldPrice: number, newPrice: number): number {
    if (oldPrice === 0) return newPrice > 0 ? 100 : 0;
    return Math.round(((newPrice - oldPrice) / oldPrice) * 100 * 10) / 10;
}

// ============================================
// LAYOUT-SPECIFIC PARSERS
// ============================================

/**
 * Parse Bomar/Halex/Furnirest layout (categories with products)
 */
function parseCategoriesLayout(
    currentData: any,
    updatedData: any,
    changes: ScheduledChangeItem[]
): void {
    if (!updatedData?.categories || !currentData?.categories) return;

    for (const [catName, products] of Object.entries(
        updatedData.categories as Record<string, any>
    )) {
        for (const [prodName, prodData] of Object.entries(
            products as Record<string, any>
        )) {
            const currentProd = currentData.categories?.[catName]?.[prodName];
            if (!currentProd) continue;

            // Check prices (groups like Grupa I, II...)
            if (prodData.prices && currentProd.prices) {
                for (const [group, price] of Object.entries(
                    prodData.prices as Record<string, number>
                )) {
                    const currentPrice = currentProd.prices[group];
                    if (currentPrice !== undefined && currentPrice !== price) {
                        changes.push({
                            id: `${catName}-${prodName}-${group}`,
                            product: prodName,
                            category: catName,
                            priceGroup: group,
                            oldPrice: Number(currentPrice),
                            newPrice: Number(price),
                            percentChange: calcPercentChange(
                                Number(currentPrice),
                                Number(price)
                            ),
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

                    if (newPrice && currentPrice && newPrice !== currentPrice) {
                        changes.push({
                            id: `${catName}-${prodName}-${newSize.dimension}`,
                            product: prodName,
                            category: catName,
                            dimension: newSize.dimension,
                            oldPrice: currentPrice,
                            newPrice,
                            percentChange: calcPercentChange(
                                currentPrice,
                                newPrice
                            ),
                        });
                    }
                }
            }
        }
    }
}

/**
 * Parse MP Nidzica layout (products array with elements)
 */
function parseProductsLayout(
    currentData: any,
    updatedData: any,
    changes: ScheduledChangeItem[]
): void {
    if (!updatedData?.products || !currentData?.products) return;

    for (const newProd of updatedData.products) {
        const currentProd = currentData.products.find(
            (p: any) => p.name === newProd.name
        );
        if (!currentProd) continue;

        if (newProd.elements && currentProd.elements) {
            for (const newEl of newProd.elements) {
                // Handle both formats: {name, price} and {code, prices}
                const elKey = newEl.code || newEl.name;
                const currentEl = currentProd.elements.find(
                    (e: any) => (e.code || e.name) === elKey
                );
                if (!currentEl) continue;

                // Format {code, prices} - object with price groups
                if (newEl.prices && typeof newEl.prices === "object") {
                    for (const [group, price] of Object.entries(
                        newEl.prices as Record<string, number>
                    )) {
                        const currentPrice = currentEl.prices?.[group];
                        if (
                            currentPrice !== undefined &&
                            currentPrice !== price
                        ) {
                            changes.push({
                                id: `${newProd.name}-${elKey}-${group}`,
                                product: newProd.name,
                                priceGroup: `${elKey} (${group})`,
                                oldPrice: Number(currentPrice),
                                newPrice: Number(price),
                                percentChange: calcPercentChange(
                                    Number(currentPrice),
                                    Number(price)
                                ),
                            });
                        }
                    }
                }
                // Format {name, price} - single price
                else if (
                    newEl.price !== undefined &&
                    currentEl.price !== undefined
                ) {
                    if (newEl.price !== currentEl.price) {
                        changes.push({
                            id: `${newProd.name}-${elKey}`,
                            product: newProd.name,
                            priceGroup: elKey,
                            oldPrice: Number(currentEl.price),
                            newPrice: Number(newEl.price),
                            percentChange: calcPercentChange(
                                Number(currentEl.price),
                                Number(newEl.price)
                            ),
                        });
                    }
                }
            }
        }
    }
}

/**
 * Parse Puszman layout (Arkusz1 array)
 */
function parsePuszmanLayout(
    currentData: any,
    updatedData: any,
    changes: ScheduledChangeItem[]
): void {
    if (!updatedData?.Arkusz1 || !currentData?.Arkusz1) return;

    const priceGroups = [
        "grupa I",
        "grupa II",
        "grupa III",
        "grupa IV",
        "grupa V",
        "grupa VI",
    ];

    for (const newProd of updatedData.Arkusz1) {
        const currentProd = currentData.Arkusz1.find(
            (p: any) => p.MODEL === newProd.MODEL
        );
        if (!currentProd) continue;

        for (const group of priceGroups) {
            if (
                newProd[group] !== undefined &&
                currentProd[group] !== undefined &&
                newProd[group] !== currentProd[group]
            ) {
                changes.push({
                    id: `${newProd.MODEL}-${group}`,
                    product: newProd.MODEL,
                    priceGroup: group,
                    oldPrice: Number(currentProd[group]),
                    newPrice: Number(newProd[group]),
                    percentChange: calcPercentChange(
                        Number(currentProd[group]),
                        Number(newProd[group])
                    ),
                });
            }
        }
    }
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Calculate changes between current data and updated data
 * Supports multiple producer layouts: Bomar/Halex, MP Nidzica, Puszman
 */
export function calculateChangesFromData(
    currentData: any,
    updatedData: any
): CalculateChangesResult {
    const changes: ScheduledChangeItem[] = [];

    // Parse all layouts
    parseCategoriesLayout(currentData, updatedData, changes);
    parseProductsLayout(currentData, updatedData, changes);
    parsePuszmanLayout(currentData, updatedData, changes);

    // Calculate summary
    const priceIncrease = changes.filter((c) => c.percentChange > 0).length;
    const priceDecrease = changes.filter((c) => c.percentChange < 0).length;
    const avgChangePercent =
        changes.length > 0
            ? Math.round(
                  (changes.reduce((sum, c) => sum + c.percentChange, 0) /
                      changes.length) *
                      10
              ) / 10
            : 0;

    return {
        changes,
        summary: {
            totalChanges: changes.length,
            priceIncrease,
            priceDecrease,
            avgChangePercent,
        },
    };
}

/**
 * Calculate only the changes array (for hooks that don't need summary)
 */
export function calculateChangesOnly(
    currentData: any,
    updatedData: any
): ScheduledChangeItem[] {
    return calculateChangesFromData(currentData, updatedData).changes;
}
