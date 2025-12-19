import fs from "fs";
import path from "path";

// Typy
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

export interface ScheduledChange {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    createdAt: string;
    changes: ScheduledChangeItem[];
    summary: {
        totalChanges: number;
        priceIncrease: number;
        priceDecrease: number;
        avgChangePercent: number;
    };
    status: "pending" | "applied" | "cancelled";
}

interface ScheduledChangesFile {
    scheduledChanges: ScheduledChange[];
}

// Cache w pamięci dla Server Components (per-request)
let cachedData: ScheduledChangesFile | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 1000; // 1 sekunda - krótki cache dla dev, w produkcji i tak jest static

/**
 * Pobiera wszystkie scheduled changes z pliku JSON (server-side)
 */
export function getScheduledChanges(): ScheduledChange[] {
    const now = Date.now();

    // Sprawdź cache
    if (cachedData && now - cacheTime < CACHE_TTL) {
        return cachedData.scheduledChanges;
    }

    try {
        const filePath = path.join(
            process.cwd(),
            "data",
            "scheduled-changes.json"
        );

        if (!fs.existsSync(filePath)) {
            return [];
        }

        const fileContent = fs.readFileSync(filePath, "utf-8");
        cachedData = JSON.parse(fileContent);
        cacheTime = now;

        return cachedData?.scheduledChanges || [];
    } catch (error) {
        console.error("Error reading scheduled changes:", error);
        return [];
    }
}

/**
 * Pobiera pending scheduled changes (status === "pending")
 */
export function getPendingScheduledChanges(): ScheduledChange[] {
    return getScheduledChanges().filter((c) => c.status === "pending");
}

/**
 * Pobiera pending changes dla konkretnego producenta
 */
export function getPendingChangesForProducer(
    producerSlug: string
): ScheduledChange[] {
    return getPendingScheduledChanges().filter(
        (c) => c.producerSlug === producerSlug
    );
}

/**
 * Pobiera Set slugów producentów z pending changes (dla sidebara)
 */
export function getProducersWithPendingChanges(): Set<string> {
    const changes = getPendingScheduledChanges();
    return new Set(changes.map((c) => c.producerSlug));
}

/**
 * Pobiera tablicę slugów producentów z pending changes (dla serializacji)
 */
export function getProducersWithPendingChangesArray(): string[] {
    return Array.from(getProducersWithPendingChanges());
}

/**
 * Typ dla danych scheduled change do wyświetlenia w banerze
 */
export interface ScheduledChangeBannerData {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    summary: {
        totalChanges: number;
        priceIncrease: number;
        priceDecrease: number;
        avgChangePercent: number;
    };
}

/**
 * Pobiera dane do banera (uproszczone, bez pełnych changes)
 */
export function getScheduledChangesForBanner(
    producerSlug?: string
): ScheduledChangeBannerData[] {
    const changes = getPendingScheduledChanges();

    const filtered = producerSlug
        ? changes.filter((c) => c.producerSlug === producerSlug)
        : changes;

    // Filtruj tylko przyszłe zmiany
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return filtered
        .filter((c) => new Date(c.scheduledDate) >= now)
        .map((c) => ({
            id: c.id,
            producerSlug: c.producerSlug,
            producerName: c.producerName,
            scheduledDate: c.scheduledDate,
            summary: c.summary,
        }));
}

/**
 * Typ dla zindeksowanych zmian produktów (do żółtych kropek)
 */
export interface ProductScheduledChangeServer {
    scheduledDate: string;
    percentChange: number;
    oldPrice: number;
    newPrice: number;
    priceGroup?: string;
    dimension?: string;
}

/**
 * Tworzy mapę zmian produktów dla producenta (do przekazania do layoutu)
 * Klucz: "kategoria__produkt" lub "produkt"
 */
export function getProductChangesMap(
    producerSlug: string
): Record<string, ProductScheduledChangeServer[]> {
    const changes = getPendingChangesForProducer(producerSlug);
    const map: Record<string, ProductScheduledChangeServer[]> = {};

    for (const change of changes) {
        for (const item of change.changes) {
            const key = item.category
                ? `${item.category}__${item.product}`
                : item.product;

            if (!map[key]) {
                map[key] = [];
            }

            map[key].push({
                scheduledDate: change.scheduledDate,
                percentChange: item.percentChange,
                oldPrice: item.oldPrice,
                newPrice: item.newPrice,
                priceGroup: item.priceGroup,
                dimension: item.dimension,
            });
        }
    }

    return map;
}
