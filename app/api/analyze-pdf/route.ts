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
    const basePrompt = `Przeanalizuj dokładnie ten cennik PDF i wyodrębnij wszystkie informacje o produktach.

WAŻNE INSTRUKCJE:
- Wyodrębnij WSZYSTKIE produkty z cennika
- Zachowaj dokładne nazwy produktów
- Wyodrębnij wszystkie wymiary i ceny
- Zwróć uwagę na grupy cenowe jeśli są
- Zachowaj strukturę kategorii jeśli istnieje
- Ceny zapisuj jako liczby (bez "zł", bez spacji)
- Bądź bardzo dokładny - każdy produkt i każda cena są ważne

`;

    switch (layoutType) {
        case "bomar":
            return (
                basePrompt +
                `
Format danych (typ Bomar - kategorie z produktami):
Zwróć JSON w formacie:
{
  "title": "Tytuł cennika",
  "categories": {
    "nazwa_kategorii": {
      "NAZWA_PRODUKTU": {
        "material": "materiał np. BUK / DĄB",
        "sizes": [
          { "dimension": "wymiar np. Ø100x200", "prices": "cena jako string" }
        ],
        "description": ["opis linia 1", "opis linia 2"]
      }
    }
  }
}

Aktualne dane do porównania:
${JSON.stringify(currentData, null, 2)}
`
            );

        case "mpnidzica":
            return (
                basePrompt +
                `
Format danych (typ MP-Nidzica - produkty z elementami i grupami cenowymi):
Zwróć JSON w formacie:
{
  "meta_data": {
    "title": "Tytuł",
    "catalog_year": "rok"
  },
  "products": [
    {
      "name": "Nazwa produktu",
      "elements": {
        "ELEMENT_1": { "prices": { "grupa1": 100, "grupa2": 120 } },
        "ELEMENT_2": { "prices": { "grupa1": 150, "grupa2": 180 } }
      }
    }
  ]
}

Aktualne dane do porównania:
${JSON.stringify(currentData, null, 2)}
`
            );

        case "puszman":
            return (
                basePrompt +
                `
Format danych (typ Puszman - lista modeli z grupami cenowymi):
Zwróć JSON w formacie:
{
  "Arkusz1": [
    {
      "MODEL": "Nazwa modelu",
      "grupa I": 1000,
      "grupa II": 1100,
      "grupa III": 1200,
      "KOLOR NOGI": "kolor lub null"
    }
  ]
}

Aktualne dane do porównania:
${JSON.stringify(currentData, null, 2)}
`
            );

        case "topline":
            return (
                basePrompt +
                `
Format danych (typ TopLine - kategorie z produktami, wymiary jako tekst):
Zwróć JSON w formacie:
{
  "title": "Tytuł cennika",
  "categories": {
    "nazwa_kategorii": {
      "NAZWA_PRODUKTU": {
        "dimensions": "wymiar 1\\nwymiar 2\\nwymiar 3",
        "description": "opis produktu",
        "price": 1000
      }
    }
  }
}

Aktualne dane do porównania:
${JSON.stringify(currentData, null, 2)}
`
            );

        default:
            return (
                basePrompt +
                `
Wyodrębnij wszystkie produkty i ceny w strukturze JSON.
Zachowaj logiczną strukturę kategorii jeśli istnieje.

Aktualne dane do porównania:
${JSON.stringify(currentData, null, 2)}
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

    // Sprawdź wszystkie kategorie
    const allCategories = new Set([
        ...Object.keys(currentCategories),
        ...Object.keys(newCategories),
    ]);

    for (const catName of allCategories) {
        const currentCat = currentCategories[catName] || {};
        const newCat = newCategories[catName] || {};

        const allProducts = new Set([
            ...Object.keys(currentCat),
            ...Object.keys(newCat),
        ]);

        for (const prodName of allProducts) {
            const currentProd = currentCat[prodName];
            const newProd = newCat[prodName];

            // Nowy produkt
            if (!currentProd && newProd) {
                changes.push({
                    type: "new_product",
                    product: prodName,
                    category: catName,
                    data: newProd,
                });
                continue;
            }

            // Usunięty produkt
            if (currentProd && !newProd) {
                changes.push({
                    type: "removed_product",
                    product: prodName,
                    category: catName,
                });
                continue;
            }

            // Porównaj ceny (sizes)
            if (currentProd.sizes && newProd.sizes) {
                for (const newSize of newProd.sizes) {
                    const currentSize = currentProd.sizes.find(
                        (s: any) => s.dimension === newSize.dimension
                    );

                    if (!currentSize) {
                        // Nowy rozmiar
                        changes.push({
                            type: "new_product",
                            product: `${prodName} (${newSize.dimension})`,
                            category: catName,
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
                                product: prodName,
                                category: catName,
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
                newProd.price !== undefined
            ) {
                const oldPrice = parsePrice(currentProd.price);
                const newPrice = parsePrice(newProd.price);

                if (oldPrice !== newPrice) {
                    const percentChange =
                        oldPrice > 0
                            ? Math.round(
                                  ((newPrice - oldPrice) / oldPrice) * 100
                              )
                            : 0;

                    changes.push({
                        type: "price_change",
                        product: prodName,
                        category: catName,
                        oldPrice: oldPrice,
                        newPrice: newPrice,
                        percentChange,
                    });
                }
            }

            // Porównaj materiał
            if (currentProd.material !== newProd.material && newProd.material) {
                changes.push({
                    type: "data_change",
                    product: prodName,
                    category: catName,
                    field: "material",
                    oldValue: currentProd.material,
                    newValue: newProd.material,
                });
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

    // Mapuj produkty po nazwie
    const currentMap = new Map(currentProducts.map((p: any) => [p.name, p]));
    const newMap = new Map(newProducts.map((p: any) => [p.name, p]));

    // Znajdź nowe i zmienione produkty
    for (const [name, newProd] of newMap) {
        const currentProd = currentMap.get(name);

        if (!currentProd) {
            changes.push({
                type: "new_product",
                product: name as string,
                data: newProd as Record<string, any>,
            });
            continue;
        }

        // Porównaj elementy
        const currentElements = (currentProd as any).elements || {};
        const newElements = (newProd as any).elements || {};

        for (const [elName, newEl] of Object.entries(newElements)) {
            const currentEl = currentElements[elName];
            const newElData = newEl as any;

            if (!currentEl) {
                changes.push({
                    type: "new_product",
                    product: `${name} - ${elName}`,
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
                        product: `${name} - ${elName}`,
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

    // Znajdź usunięte produkty
    for (const [name] of currentMap) {
        if (!newMap.has(name)) {
            changes.push({
                type: "removed_product",
                product: name as string,
            });
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

    // Mapuj produkty po MODEL
    const currentMap = new Map(currentProducts.map((p: any) => [p.MODEL, p]));
    const newMap = new Map(newProducts.map((p: any) => [p.MODEL, p]));

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
    for (const [model, newProd] of newMap) {
        const currentProd = currentMap.get(model);

        if (!currentProd) {
            changes.push({
                type: "new_product",
                product: model as string,
                data: newProd as Record<string, any>,
            });
            continue;
        }

        // Porównaj ceny grup
        for (const group of priceGroups) {
            const oldPrice = (currentProd as any)[group];
            const newPrice = (newProd as any)[group];

            if (oldPrice !== newPrice && (oldPrice || newPrice)) {
                changes.push({
                    type: "price_change",
                    product: model as string,
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
        if (
            (currentProd as any)["KOLOR NOGI"] !==
            (newProd as any)["KOLOR NOGI"]
        ) {
            changes.push({
                type: "data_change",
                product: model as string,
                field: "KOLOR NOGI",
                oldValue: (currentProd as any)["KOLOR NOGI"],
                newValue: (newProd as any)["KOLOR NOGI"],
            });
        }
    }

    // Znajdź usunięte produkty
    for (const [model] of currentMap) {
        if (!newMap.has(model)) {
            changes.push({
                type: "removed_product",
                product: model as string,
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
