// app/api/scheduled-changes/route.ts
// API do zarządzania zaplanowanymi zmianami cen i faktorów

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sendProducerUpdateNotification } from "@/lib/mail";

const SCHEDULED_FILE = path.join(
    process.cwd(),
    "data",
    "scheduled-changes.json"
);
const PRODUCERS_FILE = path.join(process.cwd(), "data", "producers.json");

export interface ChangeItem {
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
    scheduledDate: string; // ISO date string
    createdAt: string;
    changes: ChangeItem[];
    summary: {
        totalChanges: number;
        priceIncrease: number;
        priceDecrease: number;
        avgChangePercent: number;
    };
    // USUNIĘTE: updatedData - teraz przechowujemy tylko changes
    // Dla kompatybilności wstecznej może istnieć, ale nie będzie używane
    updatedData?: Record<string, any>;
    status: "pending" | "applied" | "cancelled";
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

interface ScheduledChangesFile {
    scheduledChanges: ScheduledChange[];
    scheduledFactorChanges?: ScheduledFactorChange[];
}

function readScheduledChanges(): ScheduledChangesFile {
    try {
        if (fs.existsSync(SCHEDULED_FILE)) {
            const content = fs.readFileSync(SCHEDULED_FILE, "utf-8");
            const data = JSON.parse(content);
            return {
                scheduledChanges: data.scheduledChanges || [],
                scheduledFactorChanges: data.scheduledFactorChanges || [],
            };
        }
    } catch {
        // Ignore read errors
    }
    return { scheduledChanges: [], scheduledFactorChanges: [] };
}

function writeScheduledChanges(data: ScheduledChangesFile): void {
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function generateId(): string {
    return `sc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// NOWA FUNKCJA: Aplikuj zmiany do danych producenta
// Zamiast przechowywać całe updatedData, rekonstruujemy dane z tablicy changes
// ============================================
function applyChangesToData(currentData: any, changes: ChangeItem[]): any {
    // Deep clone aby nie modyfikować oryginału
    const newData = JSON.parse(JSON.stringify(currentData));

    for (const change of changes) {
        // Bomar/Halex/Furnirest layout (categories with products)
        if (newData.categories && change.category) {
            const category = newData.categories[change.category];
            if (category && category[change.product]) {
                const product = category[change.product];

                // Zmiana ceny w grupie cenowej (prices object)
                if (change.priceGroup && product.prices) {
                    product.prices[change.priceGroup] = change.newPrice;
                }

                // Zmiana ceny w rozmiarze (sizes array)
                if (change.dimension && product.sizes) {
                    const size = product.sizes.find(
                        (s: any) => s.dimension === change.dimension
                    );
                    if (size) {
                        if (
                            typeof size.prices === "object" &&
                            change.priceGroup
                        ) {
                            size.prices[change.priceGroup] = change.newPrice;
                        } else {
                            size.prices = change.newPrice;
                        }
                    }
                }
            }
        }

        // MP Nidzica / Zoya layout (products array with elements)
        if (newData.products && !change.category) {
            const product = newData.products.find(
                (p: any) => p.name === change.product
            );
            if (product && product.elements) {
                // Wyciągnij klucz elementu z priceGroup (format: "elementCode (grupaCenowa)" lub "elementName")
                let elementKey = change.priceGroup;
                let priceGroupKey: string | null = null;

                // Sprawdź czy format to "elementCode (grupaCenowa)"
                const match = change.priceGroup?.match(/^(.+?)\s*\((.+?)\)$/);
                if (match) {
                    elementKey = match[1];
                    priceGroupKey = match[2];
                }

                const element = product.elements.find(
                    (e: any) => (e.code || e.name) === elementKey
                );

                if (element) {
                    if (
                        priceGroupKey &&
                        element.prices &&
                        typeof element.prices === "object"
                    ) {
                        // Format {code, prices: {grupa: cena}}
                        element.prices[priceGroupKey] = change.newPrice;
                    } else if (element.price !== undefined) {
                        // Format {name, price}
                        element.price = change.newPrice;
                    }
                }
            }
        }

        // Puszman layout (Arkusz1 array)
        if (newData.Arkusz1 && change.priceGroup) {
            const product = newData.Arkusz1.find(
                (p: any) => p.MODEL === change.product
            );
            if (product && change.priceGroup) {
                product[change.priceGroup] = change.newPrice;
            }
        }
    }

    return newData;
}

// Funkcja do obliczania summary z tablicy changes
function calculateSummaryFromChanges(changes: ChangeItem[]): {
    totalChanges: number;
    priceIncrease: number;
    priceDecrease: number;
    avgChangePercent: number;
} {
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
        totalChanges: changes.length,
        priceIncrease,
        priceDecrease,
        avgChangePercent,
    };
}

// Funkcja do dynamicznego obliczania zmian między aktualnymi danymi a updatedData (kompatybilność wsteczna)
function calculateChangesFromData(
    currentData: any,
    updatedData: any
): {
    totalChanges: number;
    priceIncrease: number;
    priceDecrease: number;
    avgChangePercent: number;
} {
    const changes: { percentChange: number }[] = [];

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
                                percentChange:
                                    Math.round(percentChange * 10) / 10,
                            });
                        }
                    }
                }

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
                                percentChange:
                                    Math.round(percentChange * 10) / 10,
                            });
                        }
                    }
                }
            }
        }
    }

    // MP Nidzica / Zoya layout (products array with elements)
    if (updatedData?.products && currentData?.products) {
        for (const newProd of updatedData.products) {
            const currentProd = currentData.products.find(
                (p: any) => p.name === newProd.name
            );
            if (!currentProd) continue;

            if (newProd.elements && currentProd.elements) {
                for (const newEl of newProd.elements) {
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
                                    percentChange:
                                        Math.round(percentChange * 10) / 10,
                                });
                            }
                        }
                    }
                    // Format {name, price} - pojedyncza cena
                    else if (
                        newEl.price !== undefined &&
                        currentEl.price !== undefined &&
                        newEl.price !== currentEl.price
                    ) {
                        const percentChange =
                            ((Number(newEl.price) - Number(currentEl.price)) /
                                Number(currentEl.price)) *
                            100;
                        changes.push({
                            percentChange: Math.round(percentChange * 10) / 10,
                        });
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
                        percentChange: Math.round(percentChange * 10) / 10,
                    });
                }
            }
        }
    }

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
        totalChanges: changes.length,
        priceIncrease,
        priceDecrease,
        avgChangePercent,
    };
}

// GET - pobierz wszystkie zaplanowane zmiany (lub dla konkretnego producenta)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const producer = searchParams.get("producer");
    const status = searchParams.get("status") || "pending";
    const type = searchParams.get("type"); // "price" | "factor" | null (all)

    const data = readScheduledChanges();

    let changes = data.scheduledChanges;
    let factorChanges = data.scheduledFactorChanges || [];

    // Filtruj po statusie
    if (status !== "all") {
        changes = changes.filter((c) => c.status === status);
        factorChanges = factorChanges.filter((c) => c.status === status);
    }

    // Filtruj po producencie
    if (producer) {
        changes = changes.filter((c) => c.producerSlug === producer);
        factorChanges = factorChanges.filter(
            (c) => c.producerSlug === producer
        );
    }

    // Przelicz summary dla każdej zmiany (na wypadek gdyby były stare dane)
    const changesWithUpdatedSummary = changes.map((change) => {
        // Jeśli mamy tablicę changes, oblicz summary z niej
        if (change.changes && change.changes.length > 0) {
            return {
                ...change,
                summary: calculateSummaryFromChanges(change.changes),
                // Nie zwracaj updatedData w odpowiedzi - oszczędność transferu
                updatedData: undefined,
            };
        }
        return {
            ...change,
            updatedData: undefined,
        };
    });

    // Sortuj po dacie (najbliższe pierwsze)
    changesWithUpdatedSummary.sort(
        (a, b) =>
            new Date(a.scheduledDate).getTime() -
            new Date(b.scheduledDate).getTime()
    );

    factorChanges.sort(
        (a, b) =>
            new Date(a.scheduledDate).getTime() -
            new Date(b.scheduledDate).getTime()
    );

    // Filtruj po typie jeśli podano
    if (type === "price") {
        return NextResponse.json(
            {
                success: true,
                changes: changesWithUpdatedSummary,
                factorChanges: [],
            },
            {
                headers: {
                    "Cache-Control":
                        "public, s-maxage=60, stale-while-revalidate=120",
                },
            }
        );
    }

    if (type === "factor") {
        return NextResponse.json(
            {
                success: true,
                changes: [],
                factorChanges,
            },
            {
                headers: {
                    "Cache-Control":
                        "public, s-maxage=60, stale-while-revalidate=120",
                },
            }
        );
    }

    return NextResponse.json(
        {
            success: true,
            changes: changesWithUpdatedSummary,
            factorChanges,
        },
        {
            headers: {
                "Cache-Control":
                    "public, s-maxage=60, stale-while-revalidate=120",
            },
        }
    );
}

// POST - dodaj nową zaplanowaną zmianę
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type } = body; // "price" | "factor"

        // === NOWY TYP: Zmiana faktora ===
        if (type === "factor") {
            const {
                producerSlug,
                producerName,
                scheduledDate,
                oldFactor,
                newFactor,
            } = body;

            if (
                !producerSlug ||
                !scheduledDate ||
                oldFactor === undefined ||
                newFactor === undefined
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Brakujące wymagane pola (producerSlug, scheduledDate, oldFactor, newFactor)",
                    },
                    { status: 400 }
                );
            }

            const data = readScheduledChanges();

            // Sprawdź czy już istnieje zaplanowana zmiana faktora dla tego producenta
            const existingIndex = (data.scheduledFactorChanges || []).findIndex(
                (c) => c.producerSlug === producerSlug && c.status === "pending"
            );

            if (existingIndex !== -1) {
                // Nadpisz istniejącą zmianę
                data.scheduledFactorChanges![existingIndex] = {
                    ...data.scheduledFactorChanges![existingIndex],
                    scheduledDate,
                    oldFactor,
                    newFactor,
                    percentChange:
                        Math.round(
                            ((newFactor - oldFactor) / oldFactor) * 1000
                        ) / 10,
                };
                writeScheduledChanges(data);

                return NextResponse.json({
                    success: true,
                    factorChange: data.scheduledFactorChanges![existingIndex],
                    message: "Zaktualizowano istniejącą zmianę faktora",
                });
            }

            // Dodaj nową zmianę
            const newFactorChange: ScheduledFactorChange = {
                id: generateId(),
                producerSlug,
                producerName: producerName || producerSlug,
                scheduledDate,
                createdAt: new Date().toISOString(),
                oldFactor,
                newFactor,
                percentChange:
                    Math.round(((newFactor - oldFactor) / oldFactor) * 1000) /
                    10,
                status: "pending",
            };

            if (!data.scheduledFactorChanges) {
                data.scheduledFactorChanges = [];
            }
            data.scheduledFactorChanges.push(newFactorChange);
            writeScheduledChanges(data);

            return NextResponse.json({
                success: true,
                factorChange: newFactorChange,
            });
        }

        // === STANDARDOWY TYP: Zmiana cen ===
        const { producerSlug, producerName, scheduledDate, changes, summary } =
            body;

        // Walidacja - wymagamy tylko changes, NIE updatedData
        if (!producerSlug || !scheduledDate) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Brakujące wymagane pola (producerSlug, scheduledDate)",
                },
                { status: 400 }
            );
        }

        if (!changes || !Array.isArray(changes) || changes.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Brak zmian do zaplanowania. Upewnij się, że dokonano zmian w cenach.",
                },
                { status: 400 }
            );
        }

        const data = readScheduledChanges();

        // Oblicz summary jeśli nie podano
        const calculatedSummary =
            summary || calculateSummaryFromChanges(changes);

        const newChange: ScheduledChange = {
            id: generateId(),
            producerSlug,
            producerName: producerName || producerSlug,
            scheduledDate,
            createdAt: new Date().toISOString(),
            changes,
            summary: calculatedSummary,
            // NIE zapisujemy updatedData - oszczędność miejsca!
            status: "pending",
        };

        data.scheduledChanges.push(newChange);
        writeScheduledChanges(data);

        return NextResponse.json({
            success: true,
            change: newChange,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - usuń zaplanowaną zmianę
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "price" | "factor"

    if (!id) {
        return NextResponse.json(
            { success: false, error: "Brak ID zmiany" },
            { status: 400 }
        );
    }

    const data = readScheduledChanges();

    // Usuń zmianę faktora
    if (type === "factor") {
        const factorIndex = (data.scheduledFactorChanges || []).findIndex(
            (c) => c.id === id
        );

        if (factorIndex === -1) {
            return NextResponse.json(
                { success: false, error: "Nie znaleziono zmiany faktora" },
                { status: 404 }
            );
        }

        const producerSlug =
            data.scheduledFactorChanges![factorIndex].producerSlug;
        data.scheduledFactorChanges!.splice(factorIndex, 1);
        writeScheduledChanges(data);

        return NextResponse.json({
            success: true,
            producerSlug,
        });
    }

    // Usuń zmianę cen (domyślnie)
    const index = data.scheduledChanges.findIndex((c) => c.id === id);

    if (index === -1) {
        return NextResponse.json(
            { success: false, error: "Nie znaleziono zmiany" },
            { status: 404 }
        );
    }

    // Pobierz producerSlug przed usunięciem (do zwrócenia w odpowiedzi dla cache invalidation)
    const producerSlug = data.scheduledChanges[index].producerSlug;

    // Całkowicie usuń z tablicy (nie tylko oznaczaj jako cancelled)
    data.scheduledChanges.splice(index, 1);
    writeScheduledChanges(data);

    return NextResponse.json({
        success: true,
        producerSlug, // Zwróć slug do cache invalidation po stronie klienta
    });
}

// PATCH - aktualizuj lub zastosuj zaplanowaną zmianę
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, action, applyNow, scheduledDate, type } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Brak ID zmiany" },
                { status: 400 }
            );
        }

        const data = readScheduledChanges();

        // === OBSŁUGA ZMIANY FAKTORA ===
        if (type === "factor") {
            const factorChange = (data.scheduledFactorChanges || []).find(
                (c) => c.id === id
            );

            if (!factorChange) {
                return NextResponse.json(
                    { success: false, error: "Nie znaleziono zmiany faktora" },
                    { status: 404 }
                );
            }

            // Aktualizuj datę
            if (scheduledDate) {
                factorChange.scheduledDate = scheduledDate;
                writeScheduledChanges(data);
                return NextResponse.json({
                    success: true,
                    message: "Data została zaktualizowana",
                    producerSlug: factorChange.producerSlug,
                });
            }

            // Zastosuj teraz
            if (applyNow || action === "apply") {
                if (!fs.existsSync(PRODUCERS_FILE)) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Nie znaleziono pliku producers.json",
                        },
                        { status: 404 }
                    );
                }

                // Wczytaj producers.json
                const producersData = JSON.parse(
                    fs.readFileSync(PRODUCERS_FILE, "utf-8")
                );

                // Znajdź producenta i zaktualizuj faktor
                const producerIndex = producersData.findIndex(
                    (p: any) => p.slug === factorChange.producerSlug
                );

                if (producerIndex === -1) {
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Nie znaleziono producenta",
                        },
                        { status: 404 }
                    );
                }

                producersData[producerIndex].priceFactor =
                    factorChange.newFactor;

                // Zapisz producers.json
                fs.writeFileSync(
                    PRODUCERS_FILE,
                    JSON.stringify(producersData, null, 4),
                    "utf-8"
                );

                factorChange.status = "applied";
                writeScheduledChanges(data);

                // Wyślij powiadomienie email o zmianie faktora
                sendProducerUpdateNotification(factorChange.producerName, {
                    factorChange: {
                        oldFactor: factorChange.oldFactor,
                        newFactor: factorChange.newFactor,
                        percentChange: factorChange.percentChange,
                    },
                    priceIncreased: [],
                    priceDecreased: [],
                    addedModels: [],
                    removedModels: [],
                    addedElements: [],
                    removedElements: [],
                }).catch(() => {});

                return NextResponse.json({
                    success: true,
                    message: "Zmiana faktora została zastosowana",
                    producerSlug: factorChange.producerSlug,
                });
            }

            if (action === "cancel") {
                factorChange.status = "cancelled";
                writeScheduledChanges(data);

                return NextResponse.json({
                    success: true,
                    message: "Zmiana faktora została anulowana",
                    producerSlug: factorChange.producerSlug,
                });
            }

            return NextResponse.json(
                { success: false, error: "Brak akcji do wykonania" },
                { status: 400 }
            );
        }

        // === OBSŁUGA ZMIANY CEN (DOMYŚLNIE) ===
        const change = data.scheduledChanges.find((c) => c.id === id);

        if (!change) {
            return NextResponse.json(
                { success: false, error: "Nie znaleziono zmiany" },
                { status: 404 }
            );
        }

        // Aktualizuj datę
        if (scheduledDate) {
            change.scheduledDate = scheduledDate;
            writeScheduledChanges(data);
            return NextResponse.json({
                success: true,
                message: "Data została zaktualizowana",
                producerSlug: change.producerSlug,
            });
        }

        // Zastosuj teraz
        if (applyNow || action === "apply") {
            const producerFile = path.join(
                process.cwd(),
                "data",
                `${change.producerSlug}.json`
            );

            if (!fs.existsSync(producerFile)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Nie znaleziono pliku producenta",
                    },
                    { status: 404 }
                );
            }

            // Wczytaj aktualne dane producenta
            const currentData = JSON.parse(
                fs.readFileSync(producerFile, "utf-8")
            );

            // NOWA LOGIKA: Aplikuj zmiany z tablicy changes zamiast nadpisywać updatedData
            let newData: any;

            if (change.changes && change.changes.length > 0) {
                // Nowy sposób: rekonstruuj dane z tablicy changes
                newData = applyChangesToData(currentData, change.changes);
            } else if (change.updatedData) {
                // Fallback dla starych danych: użyj updatedData (kompatybilność wsteczna)
                newData = change.updatedData;
            } else {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Brak danych do zastosowania (changes lub updatedData)",
                    },
                    { status: 400 }
                );
            }

            // Zapisz zaktualizowane dane
            fs.writeFileSync(
                producerFile,
                JSON.stringify(newData, null, 2),
                "utf-8"
            );

            change.status = "applied";
            writeScheduledChanges(data);

            return NextResponse.json({
                success: true,
                message: "Zmiany zostały zastosowane",
                producerSlug: change.producerSlug,
            });
        }

        if (action === "cancel") {
            change.status = "cancelled";
            writeScheduledChanges(data);

            return NextResponse.json({
                success: true,
                message: "Zmiana została anulowana",
                producerSlug: change.producerSlug,
            });
        }

        return NextResponse.json(
            { success: false, error: "Brak akcji do wykonania" },
            { status: 400 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
