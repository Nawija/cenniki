// app/api/scheduled-changes/apply/route.ts
// Automatyczne zastosowanie zaplanowanych zmian które osiągnęły datę

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sendProducerUpdateNotification, detectModelChanges } from "@/lib/mail";

const SCHEDULED_FILE = path.join(
    process.cwd(),
    "data",
    "scheduled-changes.json"
);

interface ChangeItem {
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
    changes: ChangeItem[];
    summary: any;
    updatedData?: Record<string, any>; // Opcjonalne - dla kompatybilności wstecznej
    status: "pending" | "applied" | "cancelled";
}

interface ScheduledChangesFile {
    scheduledChanges: ScheduledChange[];
}

function readScheduledChanges(): ScheduledChangesFile {
    try {
        if (fs.existsSync(SCHEDULED_FILE)) {
            const content = fs.readFileSync(SCHEDULED_FILE, "utf-8");
            return JSON.parse(content);
        }
    } catch {
        // Ignore read errors
    }
    return { scheduledChanges: [] };
}

function writeScheduledChanges(data: ScheduledChangesFile): void {
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Funkcja do aplikowania zmian z tablicy changes do danych producenta
function applyChangesToData(currentData: any, changes: ChangeItem[]): any {
    const newData = JSON.parse(JSON.stringify(currentData));

    for (const change of changes) {
        // Bomar/Halex/Furnirest layout (categories with products)
        if (newData.categories && change.category) {
            const category = newData.categories[change.category];
            if (category && category[change.product]) {
                const product = category[change.product];

                if (change.priceGroup && product.prices) {
                    product.prices[change.priceGroup] = change.newPrice;
                }

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
                let elementKey = change.priceGroup;
                let priceGroupKey: string | null = null;

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
                        element.prices[priceGroupKey] = change.newPrice;
                    } else if (element.price !== undefined) {
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

// POST - zastosuj wszystkie zmiany które osiągnęły datę
export async function POST(request: NextRequest) {
    try {
        const data = readScheduledChanges();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const appliedChanges: string[] = [];
        const errors: string[] = [];

        for (const change of data.scheduledChanges) {
            if (change.status !== "pending") continue;

            const changeDate = new Date(change.scheduledDate);
            changeDate.setHours(0, 0, 0, 0);

            // Sprawdź czy data zmiany już nadeszła (lub jest dzisiaj)
            if (changeDate <= now) {
                try {
                    // Zastosuj zmiany do pliku producenta
                    const producerFile = path.join(
                        process.cwd(),
                        "data",
                        `${change.producerSlug}.json`
                    );

                    if (fs.existsSync(producerFile)) {
                        // Wczytaj aktualne dane producenta
                        const currentData = JSON.parse(
                            fs.readFileSync(producerFile, "utf-8")
                        );

                        // NOWA LOGIKA: Aplikuj zmiany z tablicy changes
                        let newData: any;

                        if (change.changes && change.changes.length > 0) {
                            // Nowy sposób: rekonstruuj dane z tablicy changes
                            newData = applyChangesToData(
                                currentData,
                                change.changes
                            );
                        } else if (change.updatedData) {
                            // Fallback dla starych danych
                            newData = change.updatedData;
                        } else {
                            errors.push(
                                `${change.producerName}: Brak danych do zastosowania`
                            );
                            continue;
                        }

                        fs.writeFileSync(
                            producerFile,
                            JSON.stringify(newData, null, 2),
                            "utf-8"
                        );
                        change.status = "applied";
                        appliedChanges.push(
                            `${change.producerName}: ${change.summary.totalChanges} zmian`
                        );

                        // Wyślij powiadomienie email o zmianach
                        const modelChanges = detectModelChanges(
                            currentData,
                            newData
                        );
                        sendProducerUpdateNotification(
                            change.producerName,
                            modelChanges
                        ).catch(() => {});
                    } else {
                        errors.push(
                            `Nie znaleziono pliku dla ${change.producerName}`
                        );
                    }
                } catch (error: any) {
                    errors.push(`${change.producerName}: ${error.message}`);
                }
            }
        }

        writeScheduledChanges(data);

        return NextResponse.json({
            success: true,
            applied: appliedChanges,
            errors,
            message:
                appliedChanges.length > 0
                    ? `Zastosowano ${appliedChanges.length} zaplanowanych zmian`
                    : "Brak zmian do zastosowania",
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// GET - sprawdź ile zmian jest do zastosowania
export async function GET() {
    const data = readScheduledChanges();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const pendingToApply = data.scheduledChanges.filter((c) => {
        if (c.status !== "pending") return false;
        const changeDate = new Date(c.scheduledDate);
        changeDate.setHours(0, 0, 0, 0);
        return changeDate <= now;
    });

    return NextResponse.json({
        success: true,
        pendingCount: pendingToApply.length,
        pending: pendingToApply.map((c) => ({
            id: c.id,
            producer: c.producerName,
            scheduledDate: c.scheduledDate,
            changes: c.summary.totalChanges,
        })),
    });
}
