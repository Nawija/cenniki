// app/api/analyze-pdf/route.ts
// API do analizy PDF cennika z wykorzystaniem Google Gemini

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Interfejsy dla zmian
interface PriceChange {
    type: "price_change";
    product: string;
    category?: string;
    dimension?: string;
    oldPrice: number | string;
    newPrice: number | string;
    percentChange?: number;
}

interface NewProduct {
    type: "new_product";
    product: string;
    category?: string;
    data: Record<string, any>;
}

interface RemovedProduct {
    type: "removed_product";
    product: string;
    category?: string;
}

interface DataChange {
    type: "data_change";
    product: string;
    category?: string;
    field: string;
    oldValue: any;
    newValue: any;
}

type Change = PriceChange | NewProduct | RemovedProduct | DataChange;

interface AnalysisResult {
    success: boolean;
    changes: Change[];
    summary: {
        totalChanges: number;
        priceChanges: number;
        newProducts: number;
        removedProducts: number;
        dataChanges: number;
    };
    extractedData: Record<string, any>;
    error?: string;
}

export async function POST(
    request: NextRequest
): Promise<NextResponse<AnalysisResult>> {
    try {
        const formData = await request.formData();
        const pdfFile = formData.get("pdf") as File;
        const producerSlug = formData.get("producer") as string;
        const layoutType = formData.get("layoutType") as string;

        if (!pdfFile) {
            return NextResponse.json(
                {
                    success: false,
                    changes: [],
                    summary: {
                        totalChanges: 0,
                        priceChanges: 0,
                        newProducts: 0,
                        removedProducts: 0,
                        dataChanges: 0,
                    },
                    extractedData: {},
                    error: "Brak pliku PDF",
                },
                { status: 400 }
            );
        }

        if (!producerSlug) {
            return NextResponse.json(
                {
                    success: false,
                    changes: [],
                    summary: {
                        totalChanges: 0,
                        priceChanges: 0,
                        newProducts: 0,
                        removedProducts: 0,
                        dataChanges: 0,
                    },
                    extractedData: {},
                    error: "Brak nazwy producenta",
                },
                { status: 400 }
            );
        }

        // Wczytaj aktualny plik JSON producenta
        const dataDir = path.join(process.cwd(), "data");
        const jsonFiles = fs.readdirSync(dataDir);
        const producerFile =
            jsonFiles.find(
                (f) =>
                    f
                        .toLowerCase()
                        .replace(".json", "")
                        .replace(/[^a-z0-9]/g, "") ===
                    producerSlug.toLowerCase().replace(/[^a-z0-9]/g, "")
            ) || `${producerSlug}.json`;

        const jsonPath = path.join(dataDir, producerFile);

        let currentData: Record<string, any> = {};
        if (fs.existsSync(jsonPath)) {
            const jsonContent = fs.readFileSync(jsonPath, "utf-8");
            currentData = JSON.parse(jsonContent);
        }

        // Konwertuj PDF do base64
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

        // Przygotuj prompt dla Gemini w zależności od typu layoutu
        const prompt = buildPromptForLayout(layoutType, currentData);

        // Wywołaj Gemini API z PDF
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        let result;
        try {
            result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: pdfBase64,
                    },
                },
                { text: prompt },
            ]);
        } catch (apiError: any) {
            // Sprawdź czy to błąd limitu
            if (
                apiError.message?.includes("429") ||
                apiError.message?.includes("quota")
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        changes: [],
                        summary: {
                            totalChanges: 0,
                            priceChanges: 0,
                            newProducts: 0,
                            removedProducts: 0,
                            dataChanges: 0,
                        },
                        extractedData: {},
                        error: "Przekroczono dzienny limit API Gemini. Poczekaj do jutra lub utwórz nowy klucz API w Google AI Studio (https://aistudio.google.com/apikey).",
                    },
                    { status: 429 }
                );
            }
            throw apiError;
        }

        const responseText = result.response.text();

        // Parsuj odpowiedź JSON z Gemini
        let extractedData: Record<string, any>;
        try {
            // Wyciągnij JSON z odpowiedzi (może być otoczony markdown ```json ... ```)
            const jsonMatch = responseText.match(
                /```json\s*([\s\S]*?)\s*```/
            ) ||
                responseText.match(/```\s*([\s\S]*?)\s*```/) || [
                    null,
                    responseText,
                ];
            const jsonStr = jsonMatch[1] || responseText;
            extractedData = JSON.parse(jsonStr.trim());
        } catch (parseError) {
            console.error("Error parsing Gemini response:", parseError);
            console.error("Response text:", responseText);
            return NextResponse.json(
                {
                    success: false,
                    changes: [],
                    summary: {
                        totalChanges: 0,
                        priceChanges: 0,
                        newProducts: 0,
                        removedProducts: 0,
                        dataChanges: 0,
                    },
                    extractedData: {},
                    error: "Nie udało się sparsować odpowiedzi AI. Spróbuj ponownie.",
                },
                { status: 500 }
            );
        }

        // Porównaj dane
        const changes = compareData(currentData, extractedData, layoutType);

        const summary = {
            totalChanges: changes.length,
            priceChanges: changes.filter((c) => c.type === "price_change")
                .length,
            newProducts: changes.filter((c) => c.type === "new_product").length,
            removedProducts: changes.filter((c) => c.type === "removed_product")
                .length,
            dataChanges: changes.filter((c) => c.type === "data_change").length,
        };

        return NextResponse.json({
            success: true,
            changes,
            summary,
            extractedData,
        });
    } catch (error) {
        console.error("Error analyzing PDF:", error);
        return NextResponse.json(
            {
                success: false,
                changes: [],
                summary: {
                    totalChanges: 0,
                    priceChanges: 0,
                    newProducts: 0,
                    removedProducts: 0,
                    dataChanges: 0,
                },
                extractedData: {},
                error:
                    error instanceof Error
                        ? error.message
                        : "Wystąpił błąd podczas analizy",
            },
            { status: 500 }
        );
    }
}

function buildPromptForLayout(
    layoutType: string,
    currentData: Record<string, any>
): string {
    const currentDataJson = JSON.stringify(currentData, null, 2);
    
    const basePrompt = `Przeanalizuj dokładnie ten cennik PDF producenta i zaktualizuj dane w moim JSON.

KLUCZOWE ZASADY:
1. Mój aktualny JSON zawiera produkty z MOIMI własnymi nazwami (klucze produktów)
2. Pole "previousName" w moim JSON to ORYGINALNA nazwa producenta z PDF
3. Dopasuj produkty z PDF do mojego JSON używając pola "previousName"
4. ZACHOWAJ moje nazwy produktów (klucze) - NIE zmieniaj ich na nazwy z PDF
5. Zaktualizuj TYLKO ceny i wymiary na podstawie PDF
6. ZACHOWAJ wszystkie inne pola (image, previousName, discount, discountLabel, description, itp.)
7. Ceny zapisuj jako stringi dla pola "prices" w sizes, lub jako liczby gdzie są liczby
8. Bądź bardzo dokładny - każda cena jest ważna

`;

    switch (layoutType) {
        case "bomar":
            return (
                basePrompt +
                `
STRUKTURA DANYCH (Bomar):
Mój aktualny JSON poniżej. Zaktualizuj TYLKO ceny w "sizes" na podstawie PDF.
Dopasuj produkty przez "previousName" (oryginalna nazwa z PDF).
Zwróć IDENTYCZNĄ strukturę z zaktualizowanymi cenami.

MÓJ AKTUALNY JSON (zachowaj tę strukturę, zmień tylko ceny):
${currentDataJson}

Zwróć pełny zaktualizowany JSON w identycznej strukturze.
`
            );

        case "mpnidzica":
            return (
                basePrompt +
                `
STRUKTURA DANYCH (MP-Nidzica):
Mój aktualny JSON poniżej. Zaktualizuj TYLKO ceny w "elements.*.prices" na podstawie PDF.
Dopasuj produkty przez "previousName" lub "name".
Zwróć IDENTYCZNĄ strukturę z zaktualizowanymi cenami.

MÓJ AKTUALNY JSON (zachowaj tę strukturę, zmień tylko ceny):
${currentDataJson}

Zwróć pełny zaktualizowany JSON w identycznej strukturze.
`
            );

        case "puszman":
            return (
                basePrompt +
                `
STRUKTURA DANYCH (Puszman):
Mój aktualny JSON poniżej. Zaktualizuj TYLKO ceny grup (grupa I, II, III...) na podstawie PDF.
Dopasuj produkty przez "previousName" lub "MODEL".
Zwróć IDENTYCZNĄ strukturę z zaktualizowanymi cenami.

MÓJ AKTUALNY JSON (zachowaj tę strukturę, zmień tylko ceny):
${currentDataJson}

Zwróć pełny zaktualizowany JSON w identycznej strukturze.
`
            );

        case "topline":
            return (
                basePrompt +
                `
STRUKTURA DANYCH (TopLine):
Mój aktualny JSON poniżej. Zaktualizuj TYLKO ceny "price" na podstawie PDF.
Dopasuj produkty przez "previousName" lub nazwę produktu.
Zwróć IDENTYCZNĄ strukturę z zaktualizowanymi cenami.

MÓJ AKTUALNY JSON (zachowaj tę strukturę, zmień tylko ceny):
${currentDataJson}

Zwróć pełny zaktualizowany JSON w identycznej strukturze.
`
            );

        default:
            return (
                basePrompt +
                `
Mój aktualny JSON poniżej. Zaktualizuj ceny na podstawie PDF.
Zachowaj identyczną strukturę.

MÓJ AKTUALNY JSON:
${currentDataJson}

Zwróć pełny zaktualizowany JSON.
`
            );
    }
}

function compareData(
    currentData: Record<string, any>,
    newData: Record<string, any>,
    layoutType: string
): Change[] {
    const changes: Change[] = [];

    switch (layoutType) {
        case "bomar":
        case "topline":
            compareCategoryBasedData(currentData, newData, changes);
            break;
        case "mpnidzica":
            compareMpNidzicaData(currentData, newData, changes);
            break;
        case "puszman":
            comparePuszmanData(currentData, newData, changes);
            break;
        default:
            // Ogólne porównanie
            compareGenericData(currentData, newData, changes);
    }

    return changes;
}

function compareCategoryBasedData(
    currentData: Record<string, any>,
    newData: Record<string, any>,
    changes: Change[]
): void {
    const currentCategories = currentData.categories || {};
    const newCategories = newData.categories || {};

    // Porównaj tytuł
    if (currentData.title !== newData.title && newData.title) {
        changes.push({
            type: "data_change",
            product: "Cennik",
            field: "title",
            oldValue: currentData.title,
            newValue: newData.title,
        });
    }

    // Buduj mapę: previousName -> {myName, category, data} dla szybkiego wyszukiwania
    const previousNameMap = new Map<
        string,
        { myName: string; category: string; data: any }
    >();
    for (const [catName, catProducts] of Object.entries(currentCategories)) {
        for (const [prodName, prodData] of Object.entries(
            catProducts as Record<string, any>
        )) {
            const prevName = (prodData.previousName || prodName)
                .toLowerCase()
                .trim();
            previousNameMap.set(prevName, {
                myName: prodName,
                category: catName,
                data: prodData,
            });
            // Dodaj też bez polskich znaków
            const normalizedName = prevName
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
            if (normalizedName !== prevName) {
                previousNameMap.set(normalizedName, {
                    myName: prodName,
                    category: catName,
                    data: prodData,
                });
            }
        }
    }

    // Zbiór przetworzonych produktów z aktualnych danych
    const matchedProducts = new Set<string>();

    // Sprawdź produkty z PDF
    for (const [catName, catProducts] of Object.entries(newCategories)) {
        for (const [pdfProdName, pdfProdData] of Object.entries(
            catProducts as Record<string, any>
        )) {
            const pdfNameNormalized = pdfProdName.toLowerCase().trim();
            const pdfNameNoAccents = pdfNameNormalized
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            // Szukaj produktu po previousName
            const currentMatch =
                previousNameMap.get(pdfNameNormalized) ||
                previousNameMap.get(pdfNameNoAccents);

            if (!currentMatch) {
                // Nowy produkt - nie ma go w aktualnych danych
                changes.push({
                    type: "new_product",
                    product: pdfProdName,
                    category: catName,
                    data: pdfProdData,
                });
                continue;
            }

            // Oznacz jako przetworzony
            matchedProducts.add(
                `${currentMatch.category}__${currentMatch.myName}`
            );

            const currentProd = currentMatch.data;
            const myName = currentMatch.myName; // Twoja nazwa (nie z PDF)

            // Porównaj ceny (sizes)
            if (currentProd.sizes && (pdfProdData as any).sizes) {
                for (const newSize of (pdfProdData as any).sizes) {
                    const currentSize = currentProd.sizes.find(
                        (s: any) => s.dimension === newSize.dimension
                    );

                    if (!currentSize) {
                        // Nowy rozmiar
                        changes.push({
                            type: "new_product",
                            product: `${myName} (${newSize.dimension})`,
                            category: currentMatch.category,
                            data: newSize,
                        });
                    } else {
                        const oldPrice = parsePrice(currentSize.prices);
                        const newPrice = parsePrice(newSize.prices);

                        if (oldPrice !== newPrice) {
                            const percentChange =
                                oldPrice > 0
                                    ? Math.round(
                                          ((newPrice - oldPrice) / oldPrice) *
                                              100
                                      )
                                    : 0;

                            changes.push({
                                type: "price_change",
                                product: myName,
                                category: currentMatch.category,
                                dimension: newSize.dimension,
                                oldPrice: oldPrice,
                                newPrice: newPrice,
                                percentChange,
                            });
                        }
                    }
                }
            }

            // Porównaj pojedynczą cenę (price)
            if (
                currentProd.price !== undefined ||
                (pdfProdData as any).price !== undefined
            ) {
                const oldPrice = parsePrice(currentProd.price);
                const newPrice = parsePrice((pdfProdData as any).price);

                if (oldPrice !== newPrice) {
                    const percentChange =
                        oldPrice > 0
                            ? Math.round(
                                  ((newPrice - oldPrice) / oldPrice) * 100
                              )
                            : 0;

                    changes.push({
                        type: "price_change",
                        product: myName,
                        category: currentMatch.category,
                        oldPrice: oldPrice,
                        newPrice: newPrice,
                        percentChange,
                    });
                }
            }

            // Porównaj materiał
            if (
                currentProd.material !== (pdfProdData as any).material &&
                (pdfProdData as any).material
            ) {
                changes.push({
                    type: "data_change",
                    product: myName,
                    category: currentMatch.category,
                    field: "material",
                    oldValue: currentProd.material,
                    newValue: (pdfProdData as any).material,
                });
            }
        }
    }

    // Sprawdź czy jakieś produkty z aktualnych danych nie zostały znalezione w PDF
    // (mogą być usunięte z cennika producenta)
    for (const [catName, catProducts] of Object.entries(currentCategories)) {
        for (const [prodName] of Object.entries(
            catProducts as Record<string, any>
        )) {
            const key = `${catName}__${prodName}`;
            if (!matchedProducts.has(key)) {
                // Ten produkt nie był w PDF - może być usunięty
                // Ale nie oznaczamy jako usunięty bo może PDF nie zawierał wszystkich kategorii
                // changes.push({
                //     type: "removed_product",
                //     product: prodName,
                //     category: catName,
                // });
            }
        }
    }
}

function compareMpNidzicaData(
    currentData: Record<string, any>,
    newData: Record<string, any>,
    changes: Change[]
): void {
    const currentProducts = currentData.products || [];
    const newProducts = newData.products || [];

    // Buduj mapę: previousName -> {myName, data} dla szybkiego wyszukiwania
    const previousNameMap = new Map<string, { myName: string; data: any }>();
    for (const prod of currentProducts) {
        const prevName = (prod.previousName || prod.name).toLowerCase().trim();
        previousNameMap.set(prevName, { myName: prod.name, data: prod });
        // Dodaj też bez polskich znaków
        const normalizedName = prevName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        if (normalizedName !== prevName) {
            previousNameMap.set(normalizedName, {
                myName: prod.name,
                data: prod,
            });
        }
    }

    // Zbiór przetworzonych produktów
    const matchedProducts = new Set<string>();

    // Znajdź nowe i zmienione produkty
    for (const newProd of newProducts) {
        const pdfName = (newProd.name || "").toLowerCase().trim();
        const pdfNameNoAccents = pdfName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        const currentMatch =
            previousNameMap.get(pdfName) ||
            previousNameMap.get(pdfNameNoAccents);

        if (!currentMatch) {
            changes.push({
                type: "new_product",
                product: newProd.name as string,
                data: newProd as Record<string, any>,
            });
            continue;
        }

        matchedProducts.add(currentMatch.myName);
        const currentProd = currentMatch.data;
        const myName = currentMatch.myName;

        // Porównaj elementy
        const currentElements = currentProd.elements || {};
        const newElements = newProd.elements || {};

        for (const [elName, newEl] of Object.entries(newElements)) {
            const currentEl = currentElements[elName];
            const newElData = newEl as any;

            if (!currentEl) {
                changes.push({
                    type: "new_product",
                    product: `${myName} - ${elName}`,
                    data: newElData,
                });
                continue;
            }

            // Porównaj ceny grup
            const currentPrices = (currentEl as any).prices || {};
            const newPrices = newElData.prices || {};

            for (const [group, newPrice] of Object.entries(newPrices)) {
                const oldPrice = currentPrices[group];
                if (oldPrice !== newPrice) {
                    changes.push({
                        type: "price_change",
                        product: `${myName} - ${elName}`,
                        dimension: group,
                        oldPrice: oldPrice || 0,
                        newPrice: newPrice as number,
                        percentChange: oldPrice
                            ? Math.round(
                                  (((newPrice as number) - oldPrice) /
                                      oldPrice) *
                                      100
                              )
                            : 0,
                    });
                }
            }
        }
    }
}

function comparePuszmanData(
    currentData: Record<string, any>,
    newData: Record<string, any>,
    changes: Change[]
): void {
    const currentProducts = currentData.Arkusz1 || [];
    const newProducts = newData.Arkusz1 || [];

    // Buduj mapę: previousName/MODEL -> {myModel, data} dla szybkiego wyszukiwania
    const previousNameMap = new Map<string, { myModel: string; data: any }>();
    for (const prod of currentProducts) {
        const prevName = (prod.previousName || prod.MODEL || "")
            .toLowerCase()
            .trim();
        previousNameMap.set(prevName, { myModel: prod.MODEL, data: prod });
        // Dodaj też bez polskich znaków
        const normalizedName = prevName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        if (normalizedName !== prevName) {
            previousNameMap.set(normalizedName, {
                myModel: prod.MODEL,
                data: prod,
            });
        }
    }

    // Grupy cenowe
    const priceGroups = [
        "grupa I",
        "grupa II",
        "grupa III",
        "grupa IV",
        "grupa V",
        "grupa VI",
    ];

    // Znajdź nowe i zmienione produkty
    for (const newProd of newProducts) {
        const pdfModel = (newProd.MODEL || "").toLowerCase().trim();
        const pdfModelNoAccents = pdfModel
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        const currentMatch =
            previousNameMap.get(pdfModel) ||
            previousNameMap.get(pdfModelNoAccents);

        if (!currentMatch) {
            changes.push({
                type: "new_product",
                product: newProd.MODEL as string,
                data: newProd as Record<string, any>,
            });
            continue;
        }

        const currentProd = currentMatch.data;
        const myModel = currentMatch.myModel;

        // Porównaj ceny grup
        for (const group of priceGroups) {
            const oldPrice = currentProd[group];
            const newPrice = newProd[group];

            if (oldPrice !== newPrice && (oldPrice || newPrice)) {
                changes.push({
                    type: "price_change",
                    product: myModel as string,
                    dimension: group,
                    oldPrice: oldPrice || 0,
                    newPrice: newPrice || 0,
                    percentChange: oldPrice
                        ? Math.round(((newPrice - oldPrice) / oldPrice) * 100)
                        : 0,
                });
            }
        }

        // Porównaj kolor nogi
        if (currentProd["KOLOR NOGI"] !== newProd["KOLOR NOGI"]) {
            changes.push({
                type: "data_change",
                product: myModel as string,
                field: "KOLOR NOGI",
                oldValue: currentProd["KOLOR NOGI"],
                newValue: newProd["KOLOR NOGI"],
            });
        }
    }
}

function compareGenericData(
    currentData: Record<string, any>,
    newData: Record<string, any>,
    changes: Change[]
): void {
    // Prosta rekursywna porównywarka
    function compare(current: any, newVal: any, path: string) {
        if (typeof newVal !== typeof current) {
            changes.push({
                type: "data_change",
                product: path,
                field: "value",
                oldValue: current,
                newValue: newVal,
            });
            return;
        }

        if (typeof newVal === "object" && newVal !== null) {
            if (Array.isArray(newVal)) {
                // Dla tablic - prosta porównywarka długości
                if (
                    !Array.isArray(current) ||
                    current.length !== newVal.length
                ) {
                    changes.push({
                        type: "data_change",
                        product: path,
                        field: "array",
                        oldValue: current,
                        newValue: newVal,
                    });
                }
            } else {
                for (const key of Object.keys(newVal)) {
                    compare(current?.[key], newVal[key], `${path}.${key}`);
                }
            }
        } else if (current !== newVal) {
            // Sprawdź czy to cena
            const numCurrent = parsePrice(current);
            const numNew = parsePrice(newVal);

            if (!isNaN(numCurrent) && !isNaN(numNew) && numCurrent !== numNew) {
                changes.push({
                    type: "price_change",
                    product: path,
                    oldPrice: numCurrent,
                    newPrice: numNew,
                    percentChange: numCurrent
                        ? Math.round(((numNew - numCurrent) / numCurrent) * 100)
                        : 0,
                });
            } else {
                changes.push({
                    type: "data_change",
                    product: path,
                    field: "value",
                    oldValue: current,
                    newValue: newVal,
                });
            }
        }
    }

    compare(currentData, newData, "root");
}

function parsePrice(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
        return parseFloat(cleaned) || 0;
    }
    return 0;
}
