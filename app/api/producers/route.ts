// app/api/producers/route.ts
// API do zarządzania producentami

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sendProducerUpdateNotification } from "@/lib/mail";

const PRODUCERS_FILE = path.join(process.cwd(), "data", "producers.json");
const DATA_DIR = path.join(process.cwd(), "data");

// Ensure producers.json exists
function ensureProducersFile() {
    if (!fs.existsSync(PRODUCERS_FILE)) {
        // Read from producers.ts and convert to JSON
        const producers = [
            {
                slug: "bomar",
                displayName: "Bomar",
                dataFile: "Bomar.json",
                layoutType: "bomar",
                title: "Cennik Bomar",
                color: "#7a4b18",
                promotion: {
                    text: "Promocja -15% na krzesła",
                    from: "2025-12-01",
                    to: "2025-12-31",
                },
            },
            {
                slug: "mp-nidzica",
                displayName: "MP Nidzica",
                dataFile: "mp.json",
                layoutType: "mpnidzica",
                title: "CENNIK 06.12.25",
                color: "#7a1822",
                promotion: {
                    text: "Promocja -20% na wszystkie produkty",
                    from: "2025-12-01",
                    to: "2025-12-05",
                },
            },
            {
                slug: "puszman",
                displayName: "Puszman",
                dataFile: "puszman.json",
                layoutType: "puszman",
                title: "CENNIK 23.11.25",
                color: "#7a3318",
            },
        ];
        fs.writeFileSync(PRODUCERS_FILE, JSON.stringify(producers, null, 2));
    }
}

function getProducers() {
    ensureProducersFile();
    const data = fs.readFileSync(PRODUCERS_FILE, "utf-8");
    return JSON.parse(data);
}

function saveProducers(producers: any[]) {
    fs.writeFileSync(PRODUCERS_FILE, JSON.stringify(producers, null, 2));
}

// GET - pobierz wszystkich producentów
export async function GET() {
    try {
        const producers = getProducers();
        // Cache na 5 minut, stale-while-revalidate na 1 godzinę
        return NextResponse.json(producers, {
            headers: {
                "Cache-Control":
                    "public, s-maxage=300, stale-while-revalidate=3600",
            },
        });
    } catch {
        return NextResponse.json(
            { error: "Nie udało się pobrać producentów" },
            { status: 500 }
        );
    }
}

// POST - dodaj nowego producenta
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug, displayName, layoutType, title, color, promotion } = body;

        if (!slug || !displayName || !layoutType) {
            return NextResponse.json(
                { error: "Brak wymaganych pól: slug, displayName, layoutType" },
                { status: 400 }
            );
        }

        const producers = getProducers();

        // Sprawdź czy slug już istnieje
        if (producers.find((p: any) => p.slug === slug)) {
            return NextResponse.json(
                { error: "Producent o tym slug już istnieje" },
                { status: 400 }
            );
        }

        const dataFile = `${slug}.json`;

        // Stwórz pusty plik JSON dla producenta
        const emptyData = getEmptyDataForLayout(layoutType);
        const dataPath = path.join(DATA_DIR, dataFile);
        fs.writeFileSync(dataPath, JSON.stringify(emptyData, null, 2));

        // Dodaj producenta
        const newProducer = {
            slug,
            displayName,
            dataFile,
            layoutType,
            title: title || `Cennik ${displayName}`,
            color: color || "#6b7280",
            ...(promotion && { promotion }),
        };

        producers.push(newProducer);
        saveProducers(producers);

        return NextResponse.json(newProducer, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Nie udało się utworzyć producenta" },
            { status: 500 }
        );
    }
}

// PUT - aktualizuj producenta
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug, ...updates } = body;

        if (!slug) {
            return NextResponse.json(
                { error: "Brak slug producenta" },
                { status: 400 }
            );
        }

        const producers = getProducers();
        const index = producers.findIndex((p: any) => p.slug === slug);

        if (index === -1) {
            return NextResponse.json(
                { error: "Producent nie został znaleziony" },
                { status: 404 }
            );
        }

        const oldProducer = producers[index];

        // Aktualizuj producenta (bez zmiany slug i dataFile)
        producers[index] = {
            ...producers[index],
            ...updates,
            slug: producers[index].slug,
            dataFile: producers[index].dataFile,
        };

        saveProducers(producers);

        // Sprawdź czy zmienił się faktor i wyślij powiadomienie
        const oldFactor = oldProducer.priceFactor;
        const newFactor = producers[index].priceFactor;

        if (
            oldFactor !== undefined &&
            newFactor !== undefined &&
            oldFactor !== newFactor
        ) {
            const percentChange =
                oldFactor > 0
                    ? Math.round(
                          ((newFactor - oldFactor) / oldFactor) * 100 * 10
                      ) / 10
                    : 0;

            sendProducerUpdateNotification(
                producers[index].displayName || producers[index].slug,
                {
                    factorChange: {
                        oldFactor,
                        newFactor,
                        percentChange,
                    },
                    priceIncreased: [],
                    priceDecreased: [],
                    addedModels: [],
                    removedModels: [],
                    addedElements: [],
                    removedElements: [],
                }
            ).catch(() => {});
        }

        return NextResponse.json(producers[index]);
    } catch {
        return NextResponse.json(
            { error: "Nie udało się zaktualizować producenta" },
            { status: 500 }
        );
    }
}

// DELETE - usuń producenta
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get("slug");

        if (!slug) {
            return NextResponse.json(
                { error: "Brak slug producenta" },
                { status: 400 }
            );
        }

        const producers = getProducers();
        const index = producers.findIndex((p: any) => p.slug === slug);

        if (index === -1) {
            return NextResponse.json(
                { error: "Producent nie został znaleziony" },
                { status: 404 }
            );
        }

        // Usuń plik danych (opcjonalnie)
        const dataFile = producers[index].dataFile;
        const dataPath = path.join(DATA_DIR, dataFile);
        if (fs.existsSync(dataPath)) {
            // Możesz odkomentować aby usuwać pliki
            // fs.unlinkSync(dataPath);
        }

        producers.splice(index, 1);
        saveProducers(producers);

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Nie udało się usunąć producenta" },
            { status: 500 }
        );
    }
}

function getEmptyDataForLayout(layoutType: string) {
    switch (layoutType) {
        case "bomar":
            return {
                title: "Nowy cennik",
                categories: {},
            };
        case "mpnidzica":
            return {
                meta_data: {
                    company: "",
                    valid_from: "",
                    contact_orders: "",
                    contact_claims: "",
                },
                products: [],
            };
        case "puszman":
            return {
                Arkusz1: [],
            };
        case "topline":
            return {
                title: "Nowy cennik",
                categories: {},
            };
        case "furnirest":
            return {
                title: "Nowy cennik",
                categories: {},
            };
        default:
            return {};
    }
}
