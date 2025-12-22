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

// Nowy typ: Zaplanowana zmiana faktora
export interface ScheduledFactorChange {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    createdAt: string;
    oldFactor: number;
    newFactor: number;
    percentChange: number;
    status: "pending" | "applied" | "cancelled";
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
    scheduledFactorChanges?: ScheduledFactorChange[];
}

// Cache w pamięci dla Server Components (per-request)
let cachedData: ScheduledChangesFile | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 1000; // 1 sekunda - krótki cache dla dev, w produkcji i tak jest static

function readScheduledChangesFile(): ScheduledChangesFile {
    const now = Date.now();

    // Sprawdź cache
    if (cachedData && now - cacheTime < CACHE_TTL) {
        return cachedData;
    }

    try {
        const filePath = path.join(
            process.cwd(),
            "data",
            "scheduled-changes.json"
        );

        if (!fs.existsSync(filePath)) {
            return { scheduledChanges: [], scheduledFactorChanges: [] };
        }

        const fileContent = fs.readFileSync(filePath, "utf-8");
        cachedData = JSON.parse(fileContent);
        cacheTime = now;

        return (
            cachedData || { scheduledChanges: [], scheduledFactorChanges: [] }
        );
    } catch {
        return { scheduledChanges: [], scheduledFactorChanges: [] };
    }
}

/**
 * Pobiera wszystkie scheduled changes z pliku JSON (server-side)
 */
export function getScheduledChanges(): ScheduledChange[] {
    return readScheduledChangesFile().scheduledChanges || [];
}

/**
 * Pobiera wszystkie scheduled factor changes z pliku JSON (server-side)
 */
export function getScheduledFactorChanges(): ScheduledFactorChange[] {
    return readScheduledChangesFile().scheduledFactorChanges || [];
}

/**
 * Pobiera pending scheduled changes (status === "pending")
 */
export function getPendingScheduledChanges(): ScheduledChange[] {
    return getScheduledChanges().filter((c) => c.status === "pending");
}

/**
 * Pobiera pending scheduled factor changes (status === "pending")
 */
export function getPendingScheduledFactorChanges(): ScheduledFactorChange[] {
    return getScheduledFactorChanges().filter((c) => c.status === "pending");
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
 * Pobiera pending factor change dla konkretnego producenta
 */
export function getPendingFactorChangeForProducer(
    producerSlug: string
): ScheduledFactorChange | null {
    return (
        getPendingScheduledFactorChanges().find(
            (c) => c.producerSlug === producerSlug
        ) || null
    );
}

/**
 * Pobiera Set slugów producentów z pending changes (dla sidebara)
 * Łączy zmiany cen i zmiany faktorów
 */
export function getProducersWithPendingChanges(): Set<string> {
    const priceChanges = getPendingScheduledChanges();
    const factorChanges = getPendingScheduledFactorChanges();
    const allSlugs = [
        ...priceChanges.map((c) => c.producerSlug),
        ...factorChanges.map((c) => c.producerSlug),
    ];
    return new Set(allSlugs);
}

/**
 * Pobiera tablicę slugów producentów z pending changes (dla serializacji)
 */
export function getProducersWithPendingChangesArray(): string[] {
    return Array.from(getProducersWithPendingChanges());
}

/**
 * Pobiera mapę zaplanowanych zmian faktorów (slug -> ScheduledFactorChange)
 */
export function getScheduledFactorChangesMap(): Record<
    string,
    ScheduledFactorChange
> {
    const changes = getPendingScheduledFactorChanges();
    const map: Record<string, ScheduledFactorChange> = {};
    for (const change of changes) {
        map[change.producerSlug] = change;
    }
    return map;
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
 * Typ dla danych scheduled factor change do wyświetlenia w banerze
 */
export interface ScheduledFactorChangeBannerData {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    oldFactor: number;
    newFactor: number;
    percentChange: number;
}

/**
 * Pobiera dane zmian faktorów do banera (uproszczone)
 */
export function getScheduledFactorChangesForBanner(
    producerSlug?: string
): ScheduledFactorChangeBannerData[] {
    const changes = getPendingScheduledFactorChanges();

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
            oldFactor: c.oldFactor,
            newFactor: c.newFactor,
            percentChange: c.percentChange,
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
