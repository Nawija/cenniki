// app/api/analyze-pdf/route.ts
// Inteligentna analiza PDF cennika z porównaniem do JSON

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ============================================
// TYPY
// ============================================

interface PriceChange {
    type: "price_change";
    id: string;
    product: string;
    myName: string; // Twoja nazwa produktu
    pdfName: string; // Nazwa z PDF
    element?: string;
    dimension?: string;
    category?: string;
    oldPrice: number;
    newPrice: number;
    percentChange: number;
    preservedData?: {
        image?: string;
        technicalImage?: string;
        description?: string[];
    };
}

interface NewProduct {
    type: "new_product";
    id: string;
    product: string;
    category?: string;
    elements?: string[];
    data: Record<string, any>;
}

interface NewElement {
    type: "new_element";
    id: string;
    product: string;
    myName: string;
    element: string;
    prices: Record<string, number>;
}

interface RemovedProduct {
    type: "removed_product";
    id: string;
    product: string;
    category?: string;
    hasData: boolean; // Czy ma zdjęcia/opisy które stracimy
}

interface DataChange {
    type: "data_change";
    id: string;
    product: string;
    field: string;
    oldValue: any;
    newValue: any;
}

type Change =
    | PriceChange
    | NewProduct
    | NewElement
    | RemovedProduct
    | DataChange;

interface AnalysisResult {
    success: boolean;
    changes: Change[];
    summary: {
        totalChanges: number;
        priceChanges: number;
        newProducts: number;
        newElements: number;
        removedProducts: number;
        dataChanges: number;
        priceIncrease: number;
        priceDecrease: number;
    };
    mergedData: Record<string, any>;
    error?: string;
}

// ============================================
// HELPERS
// ============================================

function normalizeName(name: string): string {
    if (!name) return "";
    return name
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}

function parsePrice(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
        return parseFloat(cleaned) || 0;
    }
    return 0;
}

function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
}

// ============================================
// MAIN API
// ============================================

export async function POST(
    request: NextRequest
): Promise<NextResponse<AnalysisResult>> {
    try {
        const formData = await request.formData();
        const pdfFile = formData.get("pdf") as File;
        const producerSlug = formData.get("producer") as string;
        const layoutType = formData.get("layoutType") as string;

        const emptyResult: AnalysisResult = {
            success: false,
            changes: [],
            summary: {
                totalChanges: 0,
                priceChanges: 0,
                newProducts: 0,
                newElements: 0,
                removedProducts: 0,
                dataChanges: 0,
                priceIncrease: 0,
                priceDecrease: 0,
            },
            mergedData: {},
            error: "",
        };

        if (!pdfFile || !producerSlug) {
            return NextResponse.json(
                {
                    ...emptyResult,
                    error: "Brak pliku PDF lub nazwy producenta",
                },
                { status: 400 }
            );
        }

        // Wczytaj aktualny JSON
        const dataDir = path.join(process.cwd(), "data");
        const jsonFiles = fs.readdirSync(dataDir);
        const producerFile =
            jsonFiles.find(
                (f) =>
                    normalizeName(f.replace(".json", "")) ===
                    normalizeName(producerSlug)
            ) || `${producerSlug}.json`;

        const jsonPath = path.join(dataDir, producerFile);
        let currentData: Record<string, any> = {};

        if (fs.existsSync(jsonPath)) {
            currentData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        }

        // PDF do base64
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

        // Prompt dla Gemini
        const prompt = buildExtractionPrompt(layoutType);

        // Wywołaj Gemini z automatycznym retry
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        let result;
        const maxRetries = 2;
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                break; // Sukces - wychodzimy z pętli
            } catch (apiError: any) {
                lastError = apiError;

                // Błędy które nie mają sensu retry
                if (
                    apiError.message?.includes("429") ||
                    apiError.message?.includes("quota")
                ) {
                    return NextResponse.json(
                        {
                            ...emptyResult,
                            error: "Przekroczono limit API Gemini. Poczekaj lub utwórz nowy klucz.",
                        },
                        { status: 429 }
                    );
                }

                // Błędy 503 - próbujemy ponownie
                const is503 =
                    apiError.message?.includes("503") ||
                    apiError.message?.includes("overloaded") ||
                    apiError.message?.includes("Service Unavailable") ||
                    apiError.status === 503;

                if (is503 && attempt < maxRetries) {
                    // Czekaj przed kolejną próbą (1s, 2s, 3s...)
                    await new Promise((resolve) =>
                        setTimeout(resolve, attempt * 1500)
                    );
                    continue;
                }

                if (is503) {
                    return NextResponse.json(
                        {
                            ...emptyResult,
                            error: `Model AI jest przeciążony. Próbowano ${maxRetries} razy. Spróbuj ponownie za chwilę.`,
                        },
                        { status: 503 }
                    );
                }

                throw apiError;
            }
        }

        if (!result) {
            throw lastError || new Error("Nieznany błąd podczas wywołania API");
        }

        const responseText = result.response.text();

        // Parsuj odpowiedź
        let pdfData: Record<string, any>;
        try {
            const jsonMatch = responseText.match(
                /```json\s*([\s\S]*?)\s*```/
            ) ||
                responseText.match(/```\s*([\s\S]*?)\s*```/) || [
                    null,
                    responseText,
                ];
            pdfData = JSON.parse((jsonMatch[1] || responseText).trim());
        } catch {
            console.error("Failed to parse:", responseText.substring(0, 500));
            return NextResponse.json(
                {
                    ...emptyResult,
                    error: "Nie udało się sparsować odpowiedzi AI. Spróbuj ponownie.",
                },
                { status: 500 }
            );
        }

        // Porównaj i merguj
        const { changes, mergedData } = compareAndMerge(
            currentData,
            pdfData,
            layoutType
        );

        // Policz statystyki
        const priceChanges = changes.filter(
            (c) => c.type === "price_change"
        ) as PriceChange[];
        const summary = {
            totalChanges: changes.length,
            priceChanges: priceChanges.length,
            newProducts: changes.filter((c) => c.type === "new_product").length,
            newElements: changes.filter((c) => c.type === "new_element").length,
            removedProducts: changes.filter((c) => c.type === "removed_product")
                .length,
            dataChanges: changes.filter((c) => c.type === "data_change").length,
            priceIncrease: priceChanges.filter((c) => c.percentChange > 0)
                .length,
            priceDecrease: priceChanges.filter((c) => c.percentChange < 0)
                .length,
        };

        return NextResponse.json({
            success: true,
            changes,
            summary,
            mergedData,
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
                    newElements: 0,
                    removedProducts: 0,
                    dataChanges: 0,
                    priceIncrease: 0,
                    priceDecrease: 0,
                },
                mergedData: {},
                error: error instanceof Error ? error.message : "Wystąpił błąd",
            },
            { status: 500 }
        );
    }
}

// ============================================
// PROMPT - Ekstrakcja danych z PDF
// ============================================

function buildExtractionPrompt(layoutType: string): string {
    const base = `Przeanalizuj DOKŁADNIE ten cennik PDF i wyodrębnij WSZYSTKIE produkty z ich cenami.

ZASADY:
1. Wyodrębnij KAŻDY produkt - nic nie pomijaj
2. Zachowaj DOKŁADNE nazwy produktów z PDF
3. Ceny zapisuj jako LICZBY (nie stringi)
4. Bądź bardzo precyzyjny

`;

    switch (layoutType) {
        case "bomar":
            return (
                base +
                `FORMAT (Bomar - stoły):
{
  "title": "tytuł cennika",
  "categories": {
    "stoły": {
      "NAZWA_PRODUKTU": {
        "material": "BUK / DĄB",
        "sizes": [
          { "dimension": "Ø100x200", "price": 1234 }
        ]
      }
    },
    "krzesła": { ... }
  }
}

Zwróć TYLKO JSON.`
            );

        case "mpnidzica":
            return (
                base +
                `FORMAT (MP-Nidzica - narożniki/sofy):
{
  "products": [
    {
      "name": "NAZWA MODELU",
      "elements": [
        {
          "code": "PUF",
          "prices": { "A": 1234, "B": 1345, "C": 1456, "D": 1567 }
        },
        {
          "code": "1BB",
          "prices": { "A": 2000, "B": 2100, "C": 2200, "D": 2300 }
        },
        {
          "code": "N (Narożnik)",
          "prices": { "A": 3000, "B": 3100, "C": 3200, "D": 3300 }
        }
      ]
    }
  ]
}

WAŻNE: Wyodrębnij WSZYSTKIE elementy każdego modelu (pufy, sofy, narożniki, moduły itp.)
Grupy cenowe to zazwyczaj: A, B, C, D (lub I, II, III...)

Zwróć TYLKO JSON.`
            );

        case "puszman":
            return (
                base +
                `FORMAT (Puszman):
{
  "products": [
    {
      "MODEL": "Nazwa Modelu",
      "grupa I": 1234,
      "grupa II": 1345,
      "grupa III": 1456,
      "grupa IV": 1567,
      "grupa V": 1678,
      "grupa VI": 1789,
      "KOLOR NOGI": "czarny"
    }
  ]
}

Zwróć TYLKO JSON.`
            );

        default:
            return base + `Zwróć dane w formacie JSON. Zwróć TYLKO JSON.`;
    }
}

// ============================================
// COMPARE & MERGE
// ============================================

function compareAndMerge(
    currentData: Record<string, any>,
    pdfData: Record<string, any>,
    layoutType: string
): { changes: Change[]; mergedData: Record<string, any> } {
    switch (layoutType) {
        case "bomar":
            return compareBomarData(currentData, pdfData);
        case "mpnidzica":
            return compareMpNidzicaData(currentData, pdfData);
        case "puszman":
            return comparePuszmanData(currentData, pdfData);
        default:
            return { changes: [], mergedData: currentData };
    }
}

// ============================================
// BOMAR - Stoły z wymiarami
// ============================================

function compareBomarData(
    currentData: Record<string, any>,
    pdfData: Record<string, any>
): { changes: Change[]; mergedData: Record<string, any> } {
    const changes: Change[] = [];
    const mergedData = JSON.parse(JSON.stringify(currentData));

    // Tytuł
    if (pdfData.title && pdfData.title !== currentData.title) {
        changes.push({
            type: "data_change",
            id: generateId(),
            product: "Cennik",
            field: "title",
            oldValue: currentData.title,
            newValue: pdfData.title,
        });
        mergedData.title = pdfData.title;
    }

    // Mapa: previousName/myName -> { myName, category, data, key }
    const myProductsMap = new Map<
        string,
        { myName: string; category: string; data: any }
    >();

    for (const [catName, products] of Object.entries(
        currentData.categories || {}
    )) {
        for (const [prodName, prodData] of Object.entries(
            products as Record<string, any>
        )) {
            const pd = prodData as any;
            // Dodaj pod previousName
            if (pd.previousName) {
                myProductsMap.set(normalizeName(pd.previousName), {
                    myName: prodName,
                    category: catName,
                    data: pd,
                });
            }
            // Dodaj też pod własną nazwą
            myProductsMap.set(normalizeName(prodName), {
                myName: prodName,
                category: catName,
                data: pd,
            });
        }
    }

    const matchedProducts = new Set<string>();

    // Przejdź przez PDF
    for (const [catName, products] of Object.entries(
        pdfData.categories || {}
    )) {
        for (const [pdfProdName, pdfProdData] of Object.entries(
            products as Record<string, any>
        )) {
            const pdfNameNorm = normalizeName(pdfProdName);
            const match = myProductsMap.get(pdfNameNorm);
            const pd = pdfProdData as any;

            if (match) {
                // MATCH ZNALEZIONY
                matchedProducts.add(`${match.category}__${match.myName}`);
                const myData = match.data;

                // Mapa moich rozmiarów
                const mySizesMap = new Map<
                    string,
                    { index: number; price: number }
                >();
                (myData.sizes || []).forEach((s: any, idx: number) => {
                    mySizesMap.set(normalizeName(s.dimension), {
                        index: idx,
                        price: parsePrice(s.prices),
                    });
                });

                // Porównaj rozmiary
                for (const pdfSize of pd.sizes || []) {
                    const dimNorm = normalizeName(pdfSize.dimension);
                    const mySize = mySizesMap.get(dimNorm);
                    const newPrice = parsePrice(
                        pdfSize.price || pdfSize.prices
                    );

                    if (mySize) {
                        if (mySize.price !== newPrice && newPrice > 0) {
                            const percentChange =
                                mySize.price > 0
                                    ? Math.round(
                                          ((newPrice - mySize.price) /
                                              mySize.price) *
                                              100
                                      )
                                    : 0;

                            changes.push({
                                type: "price_change",
                                id: generateId(),
                                product: match.myName,
                                myName: match.myName,
                                pdfName: pdfProdName,
                                category: match.category,
                                dimension: pdfSize.dimension,
                                oldPrice: mySize.price,
                                newPrice: newPrice,
                                percentChange,
                                preservedData: {
                                    image: myData.image,
                                    description: myData.description,
                                },
                            });

                            // Aktualizuj
                            if (
                                mergedData.categories?.[match.category]?.[
                                    match.myName
                                ]?.sizes
                            ) {
                                mergedData.categories[match.category][
                                    match.myName
                                ].sizes[mySize.index].prices = String(newPrice);
                            }
                        }
                    } else {
                        // NOWY ROZMIAR
                        changes.push({
                            type: "new_element",
                            id: generateId(),
                            product: match.myName,
                            myName: match.myName,
                            element: pdfSize.dimension,
                            prices: { price: newPrice },
                        });

                        if (
                            !mergedData.categories[match.category][match.myName]
                                .sizes
                        ) {
                            mergedData.categories[match.category][
                                match.myName
                            ].sizes = [];
                        }
                        mergedData.categories[match.category][
                            match.myName
                        ].sizes.push({
                            dimension: pdfSize.dimension,
                            prices: String(newPrice),
                        });
                    }
                }

                // Materiał
                if (pd.material && pd.material !== myData.material) {
                    changes.push({
                        type: "data_change",
                        id: generateId(),
                        product: match.myName,
                        field: "material",
                        oldValue: myData.material,
                        newValue: pd.material,
                    });
                    mergedData.categories[match.category][
                        match.myName
                    ].material = pd.material;
                }
            } else {
                // NOWY PRODUKT
                changes.push({
                    type: "new_product",
                    id: generateId(),
                    product: pdfProdName,
                    category: catName,
                    elements: (pd.sizes || []).map((s: any) => s.dimension),
                    data: pd,
                });

                if (!mergedData.categories) mergedData.categories = {};
                if (!mergedData.categories[catName])
                    mergedData.categories[catName] = {};
                mergedData.categories[catName][pdfProdName] = {
                    ...pd,
                    previousName: pdfProdName,
                    image: "",
                    sizes: (pd.sizes || []).map((s: any) => ({
                        dimension: s.dimension,
                        prices: String(parsePrice(s.price || s.prices)),
                    })),
                };
            }
        }
    }

    return { changes, mergedData };
}

// ============================================
// MP-NIDZICA - Narożniki/Sofy z elementami
// ============================================

function compareMpNidzicaData(
    currentData: Record<string, any>,
    pdfData: Record<string, any>
): { changes: Change[]; mergedData: Record<string, any> } {
    const changes: Change[] = [];
    const mergedData = JSON.parse(JSON.stringify(currentData));

    const currentProducts = currentData.products || [];
    const pdfProducts = pdfData.products || [];

    // Mapa: previousName/name -> { index, data }
    const myProductsMap = new Map<string, { index: number; data: any }>();
    currentProducts.forEach((prod: any, idx: number) => {
        if (prod.previousName) {
            myProductsMap.set(normalizeName(prod.previousName), {
                index: idx,
                data: prod,
            });
        }
        myProductsMap.set(normalizeName(prod.name), { index: idx, data: prod });
    });

    const matchedIndices = new Set<number>();

    for (const pdfProd of pdfProducts) {
        const pdfName = normalizeName(pdfProd.name);
        const match = myProductsMap.get(pdfName);

        if (match) {
            matchedIndices.add(match.index);
            const myProd = match.data;

            // Mapa moich elementów: code -> { index, prices }
            const myElementsMap = new Map<
                string,
                { index: number; prices: any }
            >();
            (myProd.elements || []).forEach((el: any, idx: number) => {
                myElementsMap.set(normalizeName(el.code), {
                    index: idx,
                    prices: el.prices,
                });
            });

            for (const pdfEl of pdfProd.elements || []) {
                const codeNorm = normalizeName(pdfEl.code);
                const myEl = myElementsMap.get(codeNorm);

                if (myEl) {
                    // Porównaj ceny grup
                    for (const [group, newPrice] of Object.entries(
                        pdfEl.prices || {}
                    )) {
                        const oldPrice = myEl.prices?.[group] || 0;
                        const newPriceNum = parsePrice(newPrice);

                        if (oldPrice !== newPriceNum && newPriceNum > 0) {
                            const percentChange =
                                oldPrice > 0
                                    ? Math.round(
                                          ((newPriceNum - oldPrice) /
                                              oldPrice) *
                                              100
                                      )
                                    : 0;

                            changes.push({
                                type: "price_change",
                                id: generateId(),
                                product: myProd.name,
                                myName: myProd.name,
                                pdfName: pdfProd.name,
                                element: pdfEl.code,
                                dimension: `Grupa ${group}`,
                                oldPrice: oldPrice,
                                newPrice: newPriceNum,
                                percentChange,
                                preservedData: {
                                    image: myProd.image,
                                    technicalImage: myProd.technicalImage,
                                },
                            });

                            // Aktualizuj
                            if (
                                !mergedData.products[match.index].elements[
                                    myEl.index
                                ].prices
                            ) {
                                mergedData.products[match.index].elements[
                                    myEl.index
                                ].prices = {};
                            }
                            mergedData.products[match.index].elements[
                                myEl.index
                            ].prices[group] = newPriceNum;
                        }
                    }
                } else {
                    // NOWY ELEMENT (np. nowy moduł narożnika)
                    changes.push({
                        type: "new_element",
                        id: generateId(),
                        product: myProd.name,
                        myName: myProd.name,
                        element: pdfEl.code,
                        prices: pdfEl.prices,
                    });

                    if (!mergedData.products[match.index].elements) {
                        mergedData.products[match.index].elements = [];
                    }
                    mergedData.products[match.index].elements.push({
                        code: pdfEl.code,
                        prices: pdfEl.prices,
                    });
                }
            }
        } else {
            // NOWY PRODUKT (np. nowy narożnik)
            changes.push({
                type: "new_product",
                id: generateId(),
                product: pdfProd.name,
                elements: (pdfProd.elements || []).map((e: any) => e.code),
                data: pdfProd,
            });

            if (!mergedData.products) mergedData.products = [];
            mergedData.products.push({
                name: pdfProd.name,
                previousName: pdfProd.name,
                image: "",
                technicalImage: "",
                elements: pdfProd.elements || [],
            });
        }
    }

    return { changes, mergedData };
}

// ============================================
// PUSZMAN - Grupy cenowe
// ============================================

function comparePuszmanData(
    currentData: Record<string, any>,
    pdfData: Record<string, any>
): { changes: Change[]; mergedData: Record<string, any> } {
    const changes: Change[] = [];
    const mergedData = JSON.parse(JSON.stringify(currentData));

    const currentProducts = currentData.Arkusz1 || [];
    const pdfProducts = pdfData.products || pdfData.Arkusz1 || [];

    const priceGroups = [
        "grupa I",
        "grupa II",
        "grupa III",
        "grupa IV",
        "grupa V",
        "grupa VI",
    ];

    // Mapa: previousName/MODEL -> { index, data }
    const myProductsMap = new Map<string, { index: number; data: any }>();
    currentProducts.forEach((prod: any, idx: number) => {
        if (prod.previousName) {
            myProductsMap.set(normalizeName(prod.previousName), {
                index: idx,
                data: prod,
            });
        }
        myProductsMap.set(normalizeName(prod.MODEL), {
            index: idx,
            data: prod,
        });
    });

    for (const pdfProd of pdfProducts) {
        const pdfModel = normalizeName(pdfProd.MODEL);
        const match = myProductsMap.get(pdfModel);

        if (match) {
            const myProd = match.data;

            // Porównaj ceny grup
            for (const group of priceGroups) {
                const oldPrice = parsePrice(myProd[group]);
                const newPrice = parsePrice(pdfProd[group]);

                if (oldPrice !== newPrice && newPrice > 0) {
                    const percentChange =
                        oldPrice > 0
                            ? Math.round(
                                  ((newPrice - oldPrice) / oldPrice) * 100
                              )
                            : 0;

                    changes.push({
                        type: "price_change",
                        id: generateId(),
                        product: myProd.MODEL,
                        myName: myProd.MODEL,
                        pdfName: pdfProd.MODEL,
                        dimension: group,
                        oldPrice,
                        newPrice,
                        percentChange,
                    });

                    mergedData.Arkusz1[match.index][group] = newPrice;
                }
            }

            // Kolor nogi
            if (
                pdfProd["KOLOR NOGI"] &&
                pdfProd["KOLOR NOGI"] !== myProd["KOLOR NOGI"]
            ) {
                changes.push({
                    type: "data_change",
                    id: generateId(),
                    product: myProd.MODEL,
                    field: "KOLOR NOGI",
                    oldValue: myProd["KOLOR NOGI"],
                    newValue: pdfProd["KOLOR NOGI"],
                });
                mergedData.Arkusz1[match.index]["KOLOR NOGI"] =
                    pdfProd["KOLOR NOGI"];
            }
        } else {
            // NOWY PRODUKT
            changes.push({
                type: "new_product",
                id: generateId(),
                product: pdfProd.MODEL,
                data: pdfProd,
            });

            if (!mergedData.Arkusz1) mergedData.Arkusz1 = [];
            mergedData.Arkusz1.push({
                ...pdfProd,
                previousName: pdfProd.MODEL,
                Column1: mergedData.Arkusz1.length + 1,
                discount: "",
                discountLabel: "",
            });
        }
    }

    return { changes, mergedData };
}
