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
    priceGroup?: string; // Grupa cenowa (np. "A", "B", "Cena Brutto")
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

        console.log("\n\n========== PDF ANALYSIS START ==========");
        console.log("Producer:", producerSlug);
        console.log("Layout type:", layoutType);
        console.log("PDF file:", pdfFile?.name, pdfFile?.size, "bytes");

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

        // Najpierw sprawdź czy currentData zostało przekazane z klienta
        const currentDataFromClient = formData.get("currentData") as string;
        let currentData: Record<string, any> = {};

        if (currentDataFromClient) {
            try {
                currentData = JSON.parse(currentDataFromClient);
                console.log(
                    "Using currentData from client, products:",
                    currentData.products?.length || 0
                );
            } catch {
                console.log("Failed to parse currentData from client");
            }
        }

        // Fallback - wczytaj z pliku jeśli nie przekazano z klienta
        if (
            !currentData.products &&
            !currentData.categories &&
            !currentData.Arkusz1
        ) {
            const dataDir = path.join(process.cwd(), "data");
            const jsonFiles = fs.readdirSync(dataDir);
            const producerFile =
                jsonFiles.find(
                    (f) =>
                        normalizeName(f.replace(".json", "")) ===
                        normalizeName(producerSlug)
                ) || `${producerSlug}.json`;

            const jsonPath = path.join(dataDir, producerFile);

            if (fs.existsSync(jsonPath)) {
                currentData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
                console.log(
                    "Loaded from file:",
                    jsonPath,
                    "products:",
                    currentData.products?.length || 0
                );
            } else {
                console.log("File not found:", jsonPath);
            }
        }

        // PDF do base64
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

        // Prompt dla Gemini - przekazujemy istniejące produkty
        const prompt = buildExtractionPrompt(
            layoutType,
            currentData,
            producerSlug
        );

        // Wywołaj Gemini z automatycznym retry
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
        });

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

        // Debug - pokaż co AI wyciągnęło
        console.log("=== PDF Analysis Debug ===");
        console.log("Layout type:", layoutType);
        console.log("Producer:", producerSlug);
        console.log("PDF data products count:", pdfData.products?.length || 0);
        console.log(
            "Current data products count:",
            currentData.products?.length || 0
        );
        if (pdfData.products?.[0]) {
            console.log(
                "First PDF product:",
                JSON.stringify(pdfData.products[0], null, 2)
            );
        }
        if (currentData.products?.[0]) {
            console.log(
                "First current product:",
                currentData.products[0]?.name
            );
        }

        // Porównaj i merguj
        const { changes, mergedData } = compareAndMerge(
            currentData,
            pdfData,
            layoutType,
            producerSlug
        );

        console.log("Changes found:", changes.length);
        if (changes.length > 0) {
            console.log("First change:", JSON.stringify(changes[0], null, 2));
        }

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

function getExistingProductsList(
    layoutType: string,
    currentData: Record<string, any>
): string[] {
    const products: string[] = [];

    switch (layoutType) {
        case "bomar":
            for (const [_catName, prods] of Object.entries(
                currentData.categories || {}
            )) {
                for (const [prodName, prodData] of Object.entries(
                    prods as Record<string, any>
                )) {
                    const pd = prodData as any;
                    products.push(prodName);
                    if (pd.previousName && pd.previousName !== prodName) {
                        products.push(pd.previousName);
                    }
                }
            }
            break;

        case "mpnidzica":
            for (const prod of currentData.products || []) {
                products.push(prod.name);
                if (prod.previousName && prod.previousName !== prod.name) {
                    products.push(prod.previousName);
                }
            }
            break;

        case "puszman":
            for (const prod of currentData.Arkusz1 || []) {
                products.push(prod.MODEL);
                if (prod.previousName && prod.previousName !== prod.MODEL) {
                    products.push(prod.previousName);
                }
            }
            break;

        case "verikon":
            for (const [_catName, prods] of Object.entries(
                currentData.categories || {}
            )) {
                for (const [prodName, prodData] of Object.entries(
                    prods as Record<string, any>
                )) {
                    const pd = prodData as any;
                    products.push(prodName);
                    if (pd.previousName && pd.previousName !== prodName) {
                        products.push(pd.previousName);
                    }
                }
            }
            break;

        case "topline":
            for (const [_catName, prods] of Object.entries(
                currentData.categories || {}
            )) {
                for (const [prodName, prodData] of Object.entries(
                    prods as Record<string, any>
                )) {
                    const pd = prodData as any;
                    products.push(prodName);
                    if (pd.previousName && pd.previousName !== prodName) {
                        products.push(pd.previousName);
                    }
                }
            }
            break;

        case "bestmeble":
            for (const prod of currentData.products || []) {
                products.push(prod.MODEL);
                if (prod.previousName && prod.previousName !== prod.MODEL) {
                    products.push(prod.previousName);
                }
            }
            break;
    }

    return [...new Set(products)]; // Usuń duplikaty
}

// Pobierz grupy cenowe z danych producenta
function getPriceGroupsFromData(currentData: Record<string, any>, layoutType: string): string[] {
    // Najpierw sprawdź czy są zdefiniowane globalnie
    if (currentData.priceGroups && Array.isArray(currentData.priceGroups) && currentData.priceGroups.length > 0) {
        return currentData.priceGroups;
    }

    // Wykryj z produktów
    const groups = new Set<string>();

    // Dla mpnidzica / bestmeble - produkty z elements
    if (currentData.products) {
        for (const product of currentData.products) {
            // Z prices bezpośrednio
            if (product.prices) {
                Object.keys(product.prices).forEach(g => groups.add(g));
            }
            // Z elements
            if (Array.isArray(product.elements)) {
                for (const el of product.elements) {
                    if (el.prices) {
                        Object.keys(el.prices).forEach(g => groups.add(g));
                    }
                }
            }
        }
    }

    // Dla puszman - Arkusz1
    if (currentData.Arkusz1) {
        const puszmanGroups = ["grupa I", "grupa II", "grupa III", "grupa IV", "grupa V", "grupa VI"];
        for (const product of currentData.Arkusz1) {
            for (const g of puszmanGroups) {
                if (product[g] !== undefined) groups.add(g);
            }
        }
    }

    // Dla category-based (bomar, verikon, etc.)
    if (currentData.categories) {
        for (const [_, products] of Object.entries(currentData.categories)) {
            for (const [__, prodData] of Object.entries(products as Record<string, any>)) {
                const pd = prodData as any;
                if (pd.prices) {
                    Object.keys(pd.prices).forEach(g => groups.add(g));
                }
            }
        }
    }

    // Domyślne grupy jeśli nie znaleziono
    if (groups.size === 0) {
        if (layoutType === "puszman") {
            return ["grupa I", "grupa II", "grupa III", "grupa IV", "grupa V", "grupa VI"];
        }
        return ["A", "B", "C", "D"]; // Domyślne dla mpnidzica
    }

    return Array.from(groups);
}

function buildExtractionPrompt(
    layoutType: string,
    currentData: Record<string, any>,
    producerSlug?: string
): string {
    const existingProducts = getExistingProductsList(layoutType, currentData);

    const base = `Przeanalizuj ten cennik PDF i wyodrębnij TYLKO produkty które istnieją na poniższej liście.

WAŻNE - WYODRĘBNIJ TYLKO TE PRODUKTY (lista zawiera zarówno aktualne jak i poprzednie nazwy):
${existingProducts.map((p) => `- ${p}`).join("\n")}

ZASADY:
1. Szukaj produktów z powyższej listy - w PDF mogą mieć DOWOLNĄ z tych nazw
2. Ignoruj produkty które nie pasują do żadnego z powyższej listy
3. Zachowaj DOKŁADNE nazwy produktów jak w PDF (do matchowania ze starymi nazwami)
4. Ceny zapisuj jako LICZBY (nie stringi)
5. Bądź bardzo precyzyjny - wyodrębnij WSZYSTKIE pasujące produkty

`;

    // Halex ma specyficzny format mimo używania layoutu bomar
    if (producerSlug === "halex") {
        return `Przeanalizuj ten cennik PDF firmy Halex i wyodrębnij WSZYSTKIE produkty z cenami.

WAŻNE - rozpoznaj typ produktów w PDF:
- Jeśli to STOŁY - mają wymiary (np. "Ø110", "90x160") i ceny per wymiar
- Jeśli to KRZESŁA - mają grupy cenowe (Grupa I, II, III, IV, V) i ceny per grupa

ZASADY:
1. Wyodrębnij KAŻDY produkt z PDF
2. Nazwy produktów zapisuj DOKŁADNIE tak jak w PDF
3. Ceny zapisuj jako LICZBY (nie stringi)
4. Rozpoznaj czy to stoły czy krzesła i użyj odpowiedniego formatu

FORMAT JSON DLA STOŁÓW:
{
  "title": "tytuł cennika",
  "categories": {
    "Stoły": {
      "NAZWA_STOLU": {
        "sizes": [
          { "dimension": "Ø110", "prices": 3902 },
          { "dimension": "Ø110-160", "prices": 4613 }
        ]
      }
    }
  }
}

FORMAT JSON DLA KRZESEŁ:
{
  "title": "tytuł cennika",
  "categories": {
    "Krzesła": {
      "NAZWA_KRZESLA": {
        "material": "BUK lub DĄB lub METAL",
        "prices": {
          "Grupa I": 890,
          "Grupa II": 953,
          "Grupa III": 998,
          "Grupa IV": 1082,
          "Grupa V": 1145
        }
      }
    }
  }
}

WAŻNE:
- Dla stołów: sizes[].prices to LICZBA, dimension to wymiar
- Dla krzeseł: prices to obiekt z grupami cenowymi (Grupa I, II, III, IV, V)
- Wyodrębnij WSZYSTKIE produkty które znajdziesz w PDF

Zwróć TYLKO JSON.`;
    }

    switch (layoutType) {
        case "bomar":
            return (
                base +
                `FORMAT (Bomar - stoły i krzesła):
{
  "title": "tytuł cennika",
  "categories": {
    "stoły": {
      "NAZWA_STOLU": {
        "material": "BUK / DĄB",
        "sizes": [
          { "dimension": "Ø100x200", "price": 1234 },
          { "dimension": "Ø110x210", "price": 1345 }
        ]
      }
    },
    "krzesła": {
      "NAZWA_KRZESLA": {
        "material": "BUK / DĄB",
        "prices": {
          "Grupa I": 850,
          "Grupa II": 890,
          "Grupa III": 930,
          "Grupa IV": 970,
          "Grupa V": 1040
        }
      }
    }
  }
}

WAŻNE:
- Szukaj produktów z listy powyżej - mogą mieć INNE nazwy w PDF!
- Dla STOŁÓW: sizes[].price to LICZBA, dimension to wymiar (np. "Ø100x200")
- Dla KRZESEŁ: prices to obiekt z grupami cenowymi (Grupa I, II, III, IV, V)
- Wyodrębnij WSZYSTKIE krzesła i stoły z listy które znajdziesz w PDF
- Zachowaj DOKŁADNE nazwy z PDF (nawet jeśli są inne niż na liście)

Zwróć TYLKO JSON.`
            );

        case "mpnidzica": {
            const priceGroups = getPriceGroupsFromData(currentData, layoutType);
            const examplePrices = priceGroups.reduce((acc, g, i) => {
                acc[g] = 1234 + (i * 111);
                return acc;
            }, {} as Record<string, number>);

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
          "prices": ${JSON.stringify(examplePrices)}
        },
        {
          "code": "PUF V BB",
          "prices": ${JSON.stringify(examplePrices)}
        }
      ]
    }
  ]
}

Grupy cenowe to: ${priceGroups.join(", ")}

Zwróć TYLKO JSON.`
            );
        }

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

        case "verikon":
            return (
                base +
                `FORMAT (Verikon - fotele z grupami materiałowymi):
{
  "title": "tytuł cennika",
  "categories": {
    "Fotele": {
      "NAZWA_PRODUKTU": {
        "material": "4 Star Frosted Black",
        "prices": {
          "G1": 2650,
          "G2": 2830,
          "G3": 3060,
          "G4": 3200,
          "Skóra Hermes": 3560,
          "Skóra Toledo": 3690
        }
      }
    }
  }
}

WAŻNE:
- Grupy cenowe to: G1, G2, G3, G4, Skóra Hermes, Skóra Toledo
- Zapisuj ceny jako LICZBY (nie stringi)
- Jeśli cena = 0 lub brak ceny, zapisz 0
- Użyj ORYGINALNYCH nazw produktów z PDF (mogą się różnić od moich)

Zwróć TYLKO JSON.`
            );

        case "topline":
            return (
                base +
                `FORMAT (TopLine - sofy i wersalki z pojedynczą ceną):
{
  "title": "tytuł cennika z PDF",
  "categories": {
    "Produkty": {
      "ANDIAMO": {
        "price": 3720
      },
      "ARTE": {
        "price": 3820
      },
      "AZZURO": {
        "price": 3460
      }
    }
  }
}

WAŻNE - INSTRUKCJE:
1. Szukaj TYLKO produktów z listy powyżej (to są STARE nazwy używane w PDF)
2. Każdy produkt ma JEDNĄ cenę - zapisz ją jako LICZBĘ w polu "price"
3. Użyj DOKŁADNYCH nazw z PDF (np. "ANDIAMO", "ARTE", "AZZURO", "BOSTON", "FERRARA" itp.)
4. NIE zmieniaj nazw produktów - zapisz je dokładnie tak jak są w PDF
5. Ignoruj produkty których nie ma na liście

Zwróć TYLKO JSON.`
            );

        case "bestmeble": {
            const priceGroups = getPriceGroupsFromData(currentData, layoutType);
            const examplePrices = priceGroups.reduce((acc, g, i) => {
                acc[g] = 2010 + (i * 100);
                return acc;
            }, {} as Record<string, number>);

            return (
                base +
                `FORMAT (Best Meble - meble z ceną):
{
  "products": [
    {
      "MODEL": "CUBE sofa",
      "prices": ${JSON.stringify(examplePrices)}
    },
    {
      "MODEL": "CUBE wersalka",
      "prices": ${JSON.stringify(examplePrices)}
    }
  ]
}

WAŻNE - INSTRUKCJE:
1. Szukaj TYLKO produktów z listy powyżej
2. Każdy produkt ma ceny w grupach: ${priceGroups.join(", ")}
3. Użyj DOKŁADNYCH nazw z PDF
4. MODEL to nazwa produktu dokładnie jak w PDF
5. Ignoruj produkty których nie ma na liście

Zwróć TYLKO JSON.`
            );
        }

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
    layoutType: string,
    producerSlug?: string
): { changes: Change[]; mergedData: Record<string, any> } {
    // Halex ma specjalną logikę dopasowywania po wymiarach
    if (producerSlug === "halex") {
        return compareHalexData(currentData, pdfData);
    }

    switch (layoutType) {
        case "bomar":
            return compareBomarData(currentData, pdfData);
        case "mpnidzica":
            return compareMpNidzicaData(currentData, pdfData);
        case "puszman":
            return comparePuszmanData(currentData, pdfData);
        case "verikon":
            return compareVerikonData(currentData, pdfData);
        case "topline":
            return compareTopLineData(currentData, pdfData);
        case "bestmeble":
            return compareBestMebleData(currentData, pdfData);
        default:
            return { changes: [], mergedData: currentData };
    }
}

// ============================================
// HALEX - Stoły dopasowywane po wymiarach
// ============================================

function compareHalexData(
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

    // ============================================
    // CZĘŚĆ 1: STOŁY - dopasowanie po wymiarach
    // ============================================

    // Zbierz wszystkie wymiary z PDF z ich cenami
    const pdfDimensionPrices = new Map<
        string,
        { pdfProdName: string; dimension: string; price: number }[]
    >();

    for (const [_catName, products] of Object.entries(
        pdfData.categories || {}
    )) {
        for (const [pdfProdName, pdfProdData] of Object.entries(
            products as Record<string, any>
        )) {
            const pd = pdfProdData as any;
            for (const pdfSize of pd.sizes || []) {
                const dimNorm = normalizeName(pdfSize.dimension);
                const price = parsePrice(pdfSize.price || pdfSize.prices);

                if (!pdfDimensionPrices.has(dimNorm)) {
                    pdfDimensionPrices.set(dimNorm, []);
                }
                pdfDimensionPrices.get(dimNorm)!.push({
                    pdfProdName,
                    dimension: pdfSize.dimension,
                    price,
                });
            }
        }
    }

    // ============================================
    // CZĘŚĆ 2: KRZESŁA - dopasowanie po nazwach i grupach cenowych
    // ============================================

    // Mapa produktów z PDF: normalizedName -> { pdfProdName, prices, material }
    const pdfProductsMap = new Map<
        string,
        {
            pdfProdName: string;
            prices: Record<string, number>;
            material?: string;
        }
    >();

    for (const [_catName, products] of Object.entries(
        pdfData.categories || {}
    )) {
        for (const [pdfProdName, pdfProdData] of Object.entries(
            products as Record<string, any>
        )) {
            const pd = pdfProdData as any;
            // Tylko produkty z prices (krzesła)
            if (pd.prices && Object.keys(pd.prices).length > 0) {
                pdfProductsMap.set(normalizeName(pdfProdName), {
                    pdfProdName,
                    prices: pd.prices,
                    material: pd.material,
                });
            }
        }
    }

    // Przejdź przez nasze produkty
    for (const [catName, products] of Object.entries(
        currentData.categories || {}
    )) {
        for (const [myProdName, myProdData] of Object.entries(
            products as Record<string, any>
        )) {
            const myData = myProdData as any;

            // ============================================
            // STOŁY - dopasuj po wymiarach
            // ============================================
            for (
                let sizeIdx = 0;
                sizeIdx < (myData.sizes || []).length;
                sizeIdx++
            ) {
                const mySize = myData.sizes[sizeIdx];
                const dimNorm = normalizeName(mySize.dimension);
                const myPrice = parsePrice(mySize.prices);

                const pdfMatches = pdfDimensionPrices.get(dimNorm);

                if (pdfMatches && pdfMatches.length > 0) {
                    const pdfMatch = pdfMatches[0];
                    const newPrice = pdfMatch.price;

                    if (myPrice !== newPrice && newPrice > 0) {
                        const percentChange =
                            myPrice > 0
                                ? Math.round(
                                      ((newPrice - myPrice) / myPrice) * 100
                                  )
                                : 0;

                        changes.push({
                            type: "price_change",
                            id: generateId(),
                            product: myProdName,
                            myName: myProdName,
                            pdfName: pdfMatch.pdfProdName,
                            category: catName,
                            dimension: mySize.dimension,
                            oldPrice: myPrice,
                            newPrice: newPrice,
                            percentChange,
                            preservedData: {
                                image: myData.image,
                                description: myData.description,
                            },
                        });

                        if (
                            mergedData.categories?.[catName]?.[myProdName]
                                ?.sizes
                        ) {
                            mergedData.categories[catName][myProdName].sizes[
                                sizeIdx
                            ].prices = String(newPrice);
                        }
                    }
                }
            }

            // ============================================
            // KRZESŁA - dopasuj po nazwach i grupach cenowych
            // ============================================
            const myPrices = myData.prices || {};
            if (Object.keys(myPrices).length > 0) {
                // Szukaj dopasowania po nazwie lub previousName
                let pdfMatch = pdfProductsMap.get(normalizeName(myProdName));
                if (!pdfMatch && myData.previousName) {
                    pdfMatch = pdfProductsMap.get(
                        normalizeName(myData.previousName)
                    );
                }

                if (pdfMatch) {
                    const pdfPrices = pdfMatch.prices;

                    for (const [group, pdfPrice] of Object.entries(pdfPrices)) {
                        const newPrice = parsePrice(pdfPrice);
                        const oldPrice = parsePrice(myPrices[group]);

                        // Sprawdź czy mamy tę grupę cenową
                        if (group in myPrices) {
                            if (oldPrice !== newPrice && newPrice > 0) {
                                const percentChange =
                                    oldPrice > 0
                                        ? Math.round(
                                              ((newPrice - oldPrice) /
                                                  oldPrice) *
                                                  100
                                          )
                                        : 0;

                                changes.push({
                                    type: "price_change",
                                    id: generateId(),
                                    product: myProdName,
                                    myName: myProdName,
                                    pdfName: pdfMatch.pdfProdName,
                                    category: catName,
                                    dimension: group,
                                    oldPrice,
                                    newPrice,
                                    percentChange,
                                    preservedData: {
                                        image: myData.image,
                                        description: myData.description,
                                    },
                                });

                                if (
                                    mergedData.categories?.[catName]?.[
                                        myProdName
                                    ]?.prices
                                ) {
                                    mergedData.categories[catName][
                                        myProdName
                                    ].prices[group] = newPrice;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return { changes, mergedData };
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
    for (const [_catName, products] of Object.entries(
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
                    }
                    // Skip new sizes - only update existing ones
                }

                // Porównaj ceny grup cenowych (dla krzeseł)
                const myPrices = myData.prices || {};
                const pdfPrices = pd.prices || {};

                for (const [group, pdfPrice] of Object.entries(pdfPrices)) {
                    const newPrice = parsePrice(pdfPrice);
                    const oldPrice = parsePrice(myPrices[group]);

                    // Sprawdź czy mamy tę grupę cenową w naszym produkcie
                    if (group in myPrices) {
                        if (oldPrice !== newPrice && newPrice > 0) {
                            const percentChange =
                                oldPrice > 0
                                    ? Math.round(
                                          ((newPrice - oldPrice) / oldPrice) *
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
                                dimension: group,
                                oldPrice,
                                newPrice,
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
                                ]?.prices
                            ) {
                                mergedData.categories[match.category][
                                    match.myName
                                ].prices[group] = newPrice;
                            }
                        }
                    }
                    // Skip new price groups - only update existing ones
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
            }
            // Skip new products - only update existing ones
        }
    }

    return { changes, mergedData };
}

// ============================================
// VERIKON - Fotele z grupami materiałowymi
// ============================================

function compareVerikonData(
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

    // Mapa: previousName/myName -> { myName, category, data }
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
            // Dodaj pod previousName (oryginalna nazwa z cennika Verikon)
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

    // Przejdź przez PDF
    for (const [_catName, products] of Object.entries(
        pdfData.categories || {}
    )) {
        for (const [pdfProdName, pdfProdData] of Object.entries(
            products as Record<string, any>
        )) {
            const pdfNameNorm = normalizeName(pdfProdName);
            const match = myProductsMap.get(pdfNameNorm);
            const pd = pdfProdData as any;

            if (match) {
                const myData = match.data;

                // Porównaj ceny grup materiałowych (G1, G2, G3, G4, Skóra Hermes, Skóra Toledo)
                const myPrices = myData.prices || {};
                const pdfPrices = pd.prices || {};

                for (const [group, pdfPrice] of Object.entries(pdfPrices)) {
                    const newPrice = parsePrice(pdfPrice);
                    const oldPrice = parsePrice(myPrices[group]);

                    // Sprawdź czy mamy tę grupę cenową
                    if (group in myPrices) {
                        if (oldPrice !== newPrice && newPrice > 0) {
                            const percentChange =
                                oldPrice > 0
                                    ? Math.round(
                                          ((newPrice - oldPrice) / oldPrice) *
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
                                dimension: group,
                                oldPrice,
                                newPrice,
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
                                ]?.prices
                            ) {
                                mergedData.categories[match.category][
                                    match.myName
                                ].prices[group] = newPrice;
                            }
                        }
                    }
                }

                // Materiał / Baza
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
            }
            // Skip new products - only update existing ones
        }
    }

    return { changes, mergedData };
}

// ============================================
// TOPLINE - Sofy z pojedynczą ceną
// ============================================

function compareTopLineData(
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

    // Mapa: previousName/myName -> { myName, category, data }
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
            // Dodaj pod previousName (stara nazwa z PDF)
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

    // Zbierz produkty z PDF - mogą być w categories lub products
    const pdfProducts: Array<{ name: string; data: any }> = [];

    // Format 1: categories -> Produkty -> { name: data }
    if (pdfData.categories) {
        for (const [_catName, products] of Object.entries(pdfData.categories)) {
            for (const [pdfProdName, pdfProdData] of Object.entries(
                products as Record<string, any>
            )) {
                pdfProducts.push({ name: pdfProdName, data: pdfProdData });
            }
        }
    }

    // Format 2: products -> [{ name: "...", price: ... }]
    if (pdfData.products && Array.isArray(pdfData.products)) {
        for (const prod of pdfData.products) {
            if (prod.name) {
                pdfProducts.push({ name: prod.name, data: prod });
            }
        }
    }

    // Przejdź przez produkty z PDF
    for (const { name: pdfProdName, data: pd } of pdfProducts) {
        const pdfNameNorm = normalizeName(pdfProdName);
        const match = myProductsMap.get(pdfNameNorm);

        if (match) {
            const myData = match.data;

            // Porównaj cenę (TopLine ma pojedynczą cenę)
            const oldPrice = parsePrice(myData.price);
            const newPrice = parsePrice(pd.price);

            if (oldPrice !== newPrice && newPrice > 0) {
                const percentChange =
                    oldPrice > 0
                        ? Math.round(((newPrice - oldPrice) / oldPrice) * 100)
                        : 0;

                changes.push({
                    type: "price_change",
                    id: generateId(),
                    product: match.myName,
                    myName: match.myName,
                    pdfName: pdfProdName,
                    category: match.category,
                    oldPrice,
                    newPrice,
                    percentChange,
                    preservedData: {
                        image: myData.image,
                        description: myData.description,
                    },
                });

                // Aktualizuj cenę
                if (mergedData.categories?.[match.category]?.[match.myName]) {
                    mergedData.categories[match.category][match.myName].price =
                        newPrice;
                }
            }

            // Wymiary
            if (pd.dimensions && pd.dimensions !== myData.dimensions) {
                changes.push({
                    type: "data_change",
                    id: generateId(),
                    product: match.myName,
                    field: "dimensions",
                    oldValue: myData.dimensions,
                    newValue: pd.dimensions,
                });
                mergedData.categories[match.category][match.myName].dimensions =
                    pd.dimensions;
            }
        }
        // Skip new products - only update existing ones
    }

    return { changes, mergedData };
}

// ============================================
// BEST MEBLE - Produkty z pojedynczą ceną
// ============================================

function compareBestMebleData(
    currentData: Record<string, any>,
    pdfData: Record<string, any>
): { changes: Change[]; mergedData: Record<string, any> } {
    const changes: Change[] = [];
    const mergedData = JSON.parse(JSON.stringify(currentData));

    const currentProducts = currentData.products || [];
    const pdfProducts = pdfData.products || [];

    console.log("=== Best Meble Compare Debug ===");
    console.log("Current products:", currentProducts.length);
    console.log("PDF products:", pdfProducts.length);

    // Mapa: previousName/MODEL -> { index, data }
    const myProductsMap = new Map<string, { index: number; data: any }>();
    currentProducts.forEach((prod: any, idx: number) => {
        const normalizedModel = normalizeName(prod.MODEL);
        if (prod.previousName) {
            const normalizedPrevious = normalizeName(prod.previousName);
            myProductsMap.set(normalizedPrevious, { index: idx, data: prod });
        }
        myProductsMap.set(normalizedModel, { index: idx, data: prod });
    });

    for (const pdfProd of pdfProducts) {
        const pdfModel = normalizeName(pdfProd.MODEL);
        const match = myProductsMap.get(pdfModel);

        console.log(
            `PDF product: "${pdfProd.MODEL}" (norm: "${pdfModel}") - Match: ${
                match ? "YES" : "NO"
            }`
        );

        if (match) {
            const myProd = match.data;

            // Porównaj ceny (Best Meble używa prices.Cena)
            for (const [priceGroup, newPrice] of Object.entries(
                pdfProd.prices || {}
            )) {
                const oldPrice = myProd.prices?.[priceGroup] || 0;
                const newPriceNum = parsePrice(newPrice);

                console.log(
                    `  Price ${priceGroup}: old=${oldPrice}, new=${newPriceNum}`
                );

                if (oldPrice !== newPriceNum && newPriceNum > 0) {
                    const percentChange =
                        oldPrice > 0
                            ? Math.round(
                                  ((newPriceNum - oldPrice) / oldPrice) * 100
                              )
                            : 0;

                    console.log(
                        `  CHANGE DETECTED! ${oldPrice} -> ${newPriceNum} (${percentChange}%)`
                    );

                    changes.push({
                        type: "price_change",
                        id: generateId(),
                        product: myProd.MODEL,
                        myName: myProd.MODEL,
                        pdfName: pdfProd.MODEL,
                        priceGroup: priceGroup,
                        oldPrice: oldPrice,
                        newPrice: newPriceNum,
                        percentChange,
                        preservedData: {},
                    });

                    // Aktualizuj
                    if (!mergedData.products[match.index].prices) {
                        mergedData.products[match.index].prices = {};
                    }
                    mergedData.products[match.index].prices[priceGroup] =
                        newPriceNum;
                }
            }
        }
    }

    console.log("Total changes:", changes.length);
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

    console.log("=== MP Nidzica Compare Debug ===");
    console.log("Current products:", currentProducts.length);
    console.log("PDF products:", pdfProducts.length);

    if (pdfProducts.length === 0) {
        console.log("WARNING: No products extracted from PDF!");
        console.log(
            "PDF data received:",
            JSON.stringify(pdfData).substring(0, 500)
        );
    }

    // Mapa: previousName/name -> { index, data }
    const myProductsMap = new Map<string, { index: number; data: any }>();
    currentProducts.forEach((prod: any, idx: number) => {
        const normalizedName = normalizeName(prod.name);
        if (prod.previousName) {
            const normalizedPrevious = normalizeName(prod.previousName);
            myProductsMap.set(normalizedPrevious, {
                index: idx,
                data: prod,
            });
            console.log(
                `Mapped previous name: "${prod.previousName}" -> "${normalizedPrevious}"`
            );
        }
        myProductsMap.set(normalizedName, { index: idx, data: prod });
        console.log(`Mapped name: "${prod.name}" -> "${normalizedName}"`);
    });

    console.log("My products map size:", myProductsMap.size);

    const matchedIndices = new Set<number>();

    for (const pdfProd of pdfProducts) {
        const pdfName = normalizeName(pdfProd.name);
        const match = myProductsMap.get(pdfName);

        console.log(
            `PDF product: "${
                pdfProd.name
            }" (normalized: "${pdfName}") - Match: ${match ? "YES" : "NO"}`
        );

        if (!match) {
            // Spróbuj znaleźć podobny produkt
            const allKeys = [...myProductsMap.keys()];
            const similar = allKeys.filter(
                (k) => k.includes(pdfName) || pdfName.includes(k)
            );
            if (similar.length > 0) {
                console.log(`  Similar keys found: ${similar.join(", ")}`);
            }
        }

        if (match) {
            matchedIndices.add(match.index);
            const myProd = match.data;
            console.log(
                `  Matched with: "${myProd.name}", elements: ${
                    myProd.elements?.length || 0
                }`
            );

            // Mapa moich elementów: code -> { index, prices }
            const myElementsMap = new Map<
                string,
                { index: number; prices: any }
            >();
            (myProd.elements || []).forEach((el: any, idx: number) => {
                const normalizedCode = normalizeName(el.code);
                myElementsMap.set(normalizedCode, {
                    index: idx,
                    prices: el.prices,
                });
                console.log(
                    `    My element: "${el.code}" -> "${normalizedCode}"`
                );
            });

            for (const pdfEl of pdfProd.elements || []) {
                const codeNorm = normalizeName(pdfEl.code);
                const myEl = myElementsMap.get(codeNorm);

                console.log(
                    `    PDF element: "${
                        pdfEl.code
                    }" (norm: "${codeNorm}") - Match: ${myEl ? "YES" : "NO"}`
                );

                if (myEl) {
                    // Porównaj ceny grup
                    for (const [group, newPrice] of Object.entries(
                        pdfEl.prices || {}
                    )) {
                        const oldPrice = myEl.prices?.[group] || 0;
                        const newPriceNum = parsePrice(newPrice);

                        console.log(
                            `      Group ${group}: old=${oldPrice}, new=${newPriceNum}, diff=${
                                newPriceNum !== oldPrice
                            }`
                        );

                        if (oldPrice !== newPriceNum && newPriceNum > 0) {
                            const percentChange =
                                oldPrice > 0
                                    ? Math.round(
                                          ((newPriceNum - oldPrice) /
                                              oldPrice) *
                                              100
                                      )
                                    : 0;

                            console.log(
                                `      CHANGE DETECTED! ${oldPrice} -> ${newPriceNum} (${percentChange}%)`
                            );

                            changes.push({
                                type: "price_change",
                                id: generateId(),
                                product: myProd.name,
                                myName: myProd.name,
                                pdfName: pdfProd.name,
                                element: pdfEl.code,
                                dimension: group, // Sama litera grupy (A, B, C, D) bez prefixu
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
                }
                // Skip new elements - only update existing ones
            }
        }
        // Skip new products - only update existing ones
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
        }
        // Skip new products - only update existing ones
    }

    return { changes, mergedData };
}
