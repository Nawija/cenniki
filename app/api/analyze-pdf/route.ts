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
function getPriceGroupsFromData(
    currentData: Record<string, any>,
    layoutType: string
): string[] {
    // Najpierw sprawdź czy są zdefiniowane globalnie
    if (
        currentData.priceGroups &&
        Array.isArray(currentData.priceGroups) &&
        currentData.priceGroups.length > 0
    ) {
        return currentData.priceGroups;
    }

    // Wykryj z produktów
    const groups = new Set<string>();

    // Dla mpnidzica / bestmeble - produkty z elements
    if (currentData.products) {
        for (const product of currentData.products) {
            // Z prices bezpośrednio
            if (product.prices) {
                Object.keys(product.prices).forEach((g) => groups.add(g));
            }
            // Z elements
            if (Array.isArray(product.elements)) {
                for (const el of product.elements) {
                    if (el.prices) {
                        Object.keys(el.prices).forEach((g) => groups.add(g));
                    }
                }
            }
        }
    }

    // Dla puszman - Arkusz1
    if (currentData.Arkusz1) {
        const puszmanGroups = [
            "grupa I",
            "grupa II",
            "grupa III",
            "grupa IV",
            "grupa V",
            "grupa VI",
        ];
        for (const product of currentData.Arkusz1) {
            for (const g of puszmanGroups) {
                if (product[g] !== undefined) groups.add(g);
            }
        }
    }

    // Dla category-based (bomar, verikon, etc.)
    if (currentData.categories) {
        for (const [_, products] of Object.entries(currentData.categories)) {
            for (const [__, prodData] of Object.entries(
                products as Record<string, any>
            )) {
                const pd = prodData as any;
                if (pd.prices) {
                    Object.keys(pd.prices).forEach((g) => groups.add(g));
                }
            }
        }
    }

    // Domyślne grupy jeśli nie znaleziono
    if (groups.size === 0) {
        if (layoutType === "puszman") {
            return [
                "grupa I",
                "grupa II",
                "grupa III",
                "grupa IV",
                "grupa V",
                "grupa VI",
            ];
        }
        return ["A", "B", "C", "D"]; // Domyślne dla mpnidzica
    }

    return Array.from(groups);
}

// ============================================
// GENEROWANIE SZCZEGÓŁOWEJ REFERENCJI DLA AI
// ============================================

function generateDetailedProductReference(
    layoutType: string,
    currentData: Record<string, any>
): string {
    const lines: string[] = [];

    switch (layoutType) {
        case "bomar": {
            // STOŁY
            const tables = currentData.categories?.["stoły"] || {};
            if (Object.keys(tables).length > 0) {
                lines.push("=== STOŁY (szukaj po wymiarach) ===");
                for (const [name, data] of Object.entries(tables)) {
                    const d = data as any;
                    const pdfName = d.previousName || name;
                    lines.push(`\nStół: "${pdfName}" (moja nazwa: "${name}")`);
                    lines.push("Wymiary i aktualne ceny:");
                    for (const size of d.sizes || []) {
                        const price =
                            typeof size.prices === "string"
                                ? size.prices
                                : size.price;
                        lines.push(`  - ${size.dimension}: ${price} zł`);
                    }
                }
            }

            // KRZESŁA
            const chairs = currentData.categories?.["krzesła"] || {};
            if (Object.keys(chairs).length > 0) {
                lines.push("\n=== KRZESŁA (szukaj po grupach cenowych) ===");
                lines.push(
                    "Grupy cenowe: Grupa I, Grupa II, Grupa III, Grupa IV, Grupa V"
                );
                for (const [name, data] of Object.entries(chairs)) {
                    const d = data as any;
                    const pdfName = d.previousName || name;
                    lines.push(
                        `\nKrzesło: "${pdfName}" (moja nazwa: "${name}")`
                    );
                    lines.push("Aktualne ceny:");
                    for (const [group, price] of Object.entries(
                        d.prices || {}
                    )) {
                        lines.push(`  - ${group}: ${price} zł`);
                    }
                }
            }
            break;
        }

        case "mpnidzica": {
            const priceGroups = getPriceGroupsFromData(currentData, layoutType);
            lines.push(`=== PRODUKTY MP-NIDZICA ===`);
            lines.push(`Grupy cenowe (KOLUMNY): ${priceGroups.join(", ")}`);
            lines.push(
                `\nKażdy produkt ma ELEMENTY z kodami (np. PUF, 1BB, 2 P/L, SZ P/L)`
            );
            lines.push(
                `Dla każdego elementu sprawdź cenę w KAŻDEJ grupie cenowej.\n`
            );

            for (const prod of currentData.products || []) {
                const pdfName = prod.previousName || prod.name;
                lines.push(
                    `\n--- Produkt: "${pdfName}" (moja nazwa: "${prod.name}") ---`
                );
                lines.push(`Elementy do sprawdzenia:`);
                for (const el of prod.elements || []) {
                    const priceStr = priceGroups
                        .map((g) => `${g}:${el.prices?.[g] || 0}`)
                        .join(", ");
                    lines.push(`  "${el.code}": ${priceStr}`);
                }
            }
            break;
        }

        case "puszman": {
            const priceGroups = [
                "grupa I",
                "grupa II",
                "grupa III",
                "grupa IV",
                "grupa V",
                "grupa VI",
            ];
            lines.push(`=== PRODUKTY PUSZMAN ===`);
            lines.push(`Grupy cenowe (KOLUMNY): ${priceGroups.join(", ")}`);
            lines.push(
                `\nSprawdź KAŻDĄ kolumnę cenową dla każdego produktu.\n`
            );

            for (const prod of currentData.Arkusz1 || []) {
                const pdfName = prod.previousName || prod.MODEL;
                const priceStr = priceGroups
                    .map((g) => `${g}:${prod[g] || 0}`)
                    .join(", ");
                lines.push(
                    `"${pdfName}" (MODEL: "${prod.MODEL}"): ${priceStr}`
                );
            }
            break;
        }

        case "verikon": {
            const priceGroups = [
                "G1",
                "G2",
                "G3",
                "G4",
                "Skóra Hermes",
                "Skóra Toledo",
            ];
            lines.push(`=== FOTELE VERIKON ===`);
            lines.push(`Grupy cenowe (KOLUMNY): ${priceGroups.join(", ")}`);
            lines.push(`\nSprawdź cenę w KAŻDEJ grupie materiałowej.\n`);

            for (const [catName, products] of Object.entries(
                currentData.categories || {}
            )) {
                for (const [name, data] of Object.entries(
                    products as Record<string, any>
                )) {
                    const d = data as any;
                    const pdfName = d.previousName || name;
                    const priceStr = priceGroups
                        .map((g) => `${g}:${d.prices?.[g] || 0}`)
                        .join(", ");
                    lines.push(
                        `"${pdfName}" (moja nazwa: "${name}"): ${priceStr}`
                    );
                }
            }
            break;
        }

        case "topline": {
            lines.push(`=== PRODUKTY TOP-LINE ===`);
            lines.push(`Każdy produkt ma JEDNĄ cenę (grupa A).\n`);

            for (const prod of currentData.products || []) {
                const pdfName = prod.previousName || prod.name;
                const price = prod.elements?.[0]?.prices?.["A"] || 0;
                lines.push(
                    `"${pdfName}" (moja nazwa: "${prod.name}"): ${price} zł`
                );
            }
            break;
        }

        case "furnirest": {
            lines.push(`=== STOŁY FURNIREST ===`);
            lines.push(`Każdy wymiar ma 2 ceny: BUK i DĄB\n`);

            for (const [catName, products] of Object.entries(
                currentData.categories || {}
            )) {
                for (const [name, data] of Object.entries(
                    products as Record<string, any>
                )) {
                    const d = data as any;
                    const pdfName = d.previousName || name;
                    lines.push(`\n"${pdfName}" (moja nazwa: "${name}"):`);
                    for (const size of d.sizes || []) {
                        const bukPrice = size.prices?.BUK || 0;
                        const dabPrice =
                            size.prices?.DĄB || size.prices?.DAB || 0;
                        lines.push(
                            `  ${size.dimension}: BUK=${bukPrice}, DĄB=${dabPrice}`
                        );
                    }
                }
            }
            break;
        }

        case "halex": {
            lines.push(`=== STOŁY HALEX ===`);
            lines.push(`Każdy stół ma wymiary z cenami.\n`);

            for (const [catName, products] of Object.entries(
                currentData.categories || {}
            )) {
                for (const [name, data] of Object.entries(
                    products as Record<string, any>
                )) {
                    const d = data as any;
                    const pdfName = d.previousName || name;
                    lines.push(`\n"${pdfName}" (moja nazwa: "${name}"):`);
                    for (const size of d.sizes || []) {
                        const price =
                            typeof size.prices === "string"
                                ? size.prices
                                : size.prices;
                        lines.push(`  ${size.dimension}: ${price} zł`);
                    }
                }
            }
            break;
        }

        case "bestmeble": {
            const priceGroups = getPriceGroupsFromData(currentData, layoutType);
            lines.push(`=== PRODUKTY BEST MEBLE ===`);
            lines.push(`Grupy cenowe: ${priceGroups.join(", ")}\n`);

            for (const prod of currentData.products || []) {
                const pdfName = prod.previousName || prod.MODEL;
                const priceStr = priceGroups
                    .map((g) => `${g}:${prod.prices?.[g] || 0}`)
                    .join(", ");
                lines.push(
                    `"${pdfName}" (MODEL: "${prod.MODEL}"): ${priceStr}`
                );
            }
            break;
        }
    }

    return lines.join("\n");
}

function buildExtractionPrompt(
    layoutType: string,
    currentData: Record<string, any>,
    producerSlug?: string
): string {
    const productReference = generateDetailedProductReference(
        layoutType,
        currentData
    );

    const baseInstructions = `Jesteś ekspertem od ekstrakcji danych z cenników PDF. Twoim zadaniem jest PRECYZYJNE wyodrębnienie cen z PDF i porównanie ich z moimi aktualnymi danymi.

KRYTYCZNE ZASADY:
1. Analizuj PDF KOLUMNA PO KOLUMNIE - sprawdź KAŻDĄ grupę cenową osobno
2. Szukaj TYLKO produktów z poniższej listy referencyjnej
3. Używaj nazw produktów DOKŁADNIE tak jak są w PDF (previousName)
4. Ceny zapisuj jako LICZBY (nie stringi z "zł")
5. Jeśli cena = 0 lub nie znaleziona, wpisz 0
6. Bądź BARDZO precyzyjny - każda komórka cennika ma znaczenie

MOJA AKTUALNA BAZA PRODUKTÓW (sprawdź czy ceny się zgadzają):
${productReference}

`;

    // Halex ma specyficzny format
    if (producerSlug === "halex") {
        return (
            baseInstructions +
            `
INSTRUKCJA DLA HALEX:
1. Znajdź KAŻDY stół z mojej listy w PDF
2. Dla każdego stołu wyodrębnij WSZYSTKIE wymiary i ich ceny
3. Wymiary zapisuj dokładnie jak w PDF (np. "Ø110", "Ø110-160")

FORMAT JSON:
{
  "products": [
    {
      "pdfName": "NAZWA Z PDF",
      "sizes": [
        { "dimension": "Ø110", "price": 3902 },
        { "dimension": "Ø110-160", "price": 4613 }
      ]
    }
  ]
}

Zwróć TYLKO JSON, bez markdown.`
        );
    }

    switch (layoutType) {
        case "bomar":
            return (
                baseInstructions +
                `
INSTRUKCJA DLA BOMAR:
1. W PDF szukaj produktów po ich previousName (stara nazwa)
2. STOŁY: wyodrębnij wszystkie wymiary i ceny
3. KRZESŁA: wyodrębnij ceny dla KAŻDEJ grupy (Grupa I do V)
4. Sprawdź KAŻDĄ kolumnę cennika!

FORMAT JSON:
{
  "tables": [
    {
      "pdfName": "NAZWA Z PDF",
      "sizes": [
        { "dimension": "Ø100x200", "price": 4130 },
        { "dimension": "Ø110x210", "price": 4550 }
      ]
    }
  ],
  "chairs": [
    {
      "pdfName": "NAZWA Z PDF",
      "prices": {
        "Grupa I": 850,
        "Grupa II": 890,
        "Grupa III": 930,
        "Grupa IV": 970,
        "Grupa V": 1040
      }
    }
  ]
}

WAŻNE: Użyj DOKŁADNYCH nazw z PDF. Zwróć TYLKO JSON.`
            );

        case "mpnidzica": {
            const priceGroups = getPriceGroupsFromData(currentData, layoutType);
            return (
                baseInstructions +
                `
INSTRUKCJA DLA MP-NIDZICA:
1. Każdy produkt ma ELEMENTY (kody jak: PUF, 1BB, 2 P/L, SZ P/L, N, itp.)
2. Każdy element ma ceny w grupach: ${priceGroups.join(", ")}
3. Analizuj WIERSZ PO WIERSZU - każdy element to osobny wiersz
4. Analizuj KOLUMNA PO KOLUMNIE - każda grupa cenowa to osobna kolumna
5. Używaj nazw produktów z PDF (previousName)

FORMAT JSON:
{
  "products": [
    {
      "pdfName": "NAZWA PRODUKTU Z PDF",
      "elements": [
        {
          "code": "PUF",
          "prices": { ${priceGroups.map((g) => `"${g}": 0`).join(", ")} }
        },
        {
          "code": "1BB",
          "prices": { ${priceGroups.map((g) => `"${g}": 0`).join(", ")} }
        }
      ]
    }
  ]
}

KLUCZOWE: Kod elementu musi być DOKŁADNY (np. "PUF V BB", "1W P/L", "2 P/L+N+1WP/L").
Zwróć TYLKO JSON.`
            );
        }

        case "puszman":
            return (
                baseInstructions +
                `
INSTRUKCJA DLA PUSZMAN:
1. Cennik ma format tabelaryczny z kolumnami: MODEL, grupa I, grupa II, grupa III, grupa IV, grupa V, grupa VI
2. Sprawdź KAŻDĄ kolumnę cenową dla każdego produktu
3. Używaj nazw modeli DOKŁADNIE jak w PDF (previousName)
4. Każdy produkt to jeden wiersz z 6 cenami

FORMAT JSON:
{
  "products": [
    {
      "pdfName": "Apollo narożnik",
      "MODEL": "Apollo narożnik",
      "grupa I": 2580,
      "grupa II": 2730,
      "grupa III": 2999,
      "grupa IV": 3450,
      "grupa V": 3899,
      "grupa VI": 4350
    }
  ]
}

WAŻNE: Sprawdź cenę w KAŻDEJ z 6 grup! Zwróć TYLKO JSON.`
            );

        case "verikon":
            return (
                baseInstructions +
                `
INSTRUKCJA DLA VERIKON:
1. Fotele mają ceny w grupach materiałowych: G1, G2, G3, G4, Skóra Hermes, Skóra Toledo
2. Sprawdź KAŻDĄ kolumnę cenową
3. Używaj nazw produktów z PDF (previousName)
4. Jeśli brak ceny dla skóry, wpisz 0

FORMAT JSON:
{
  "products": [
    {
      "pdfName": "NAZWA Z PDF",
      "prices": {
        "G1": 1221,
        "G2": 1304,
        "G3": 1408,
        "G4": 1471,
        "Skóra Hermes": 1638,
        "Skóra Toledo": 1696
      }
    }
  ]
}

Zwróć TYLKO JSON.`
            );

        case "topline":
            return (
                baseInstructions +
                `
INSTRUKCJA DLA TOP-LINE:
1. Każdy produkt ma JEDNĄ cenę (kolumna "Cena" lub grupa A)
2. Szukaj produktów po previousName (stare nazwy w PDF)
3. Nazwy mogą być jak: "ANDIAMO kanapa z funkcją", "ARTE II narożnik", "BOSTON wersalka"

FORMAT JSON:
{
  "products": [
    {
      "pdfName": "ANDIAMO kanapa z funkcją",
      "price": 3720
    },
    {
      "pdfName": "ARTE II narożnik",
      "price": 4850
    }
  ]
}

Zwróć TYLKO JSON.`
            );

        case "furnirest":
            return (
                baseInstructions +
                `
INSTRUKCJA DLA FURNIREST:
1. Stoły mają wymiary z 2 cenami: BUK i DĄB
2. Wymiar to np. "ALPI 80 x 120 N (76/80/120)" lub "BELLA 95 (76/95-175)"
3. Sprawdź OBYDWIE kolumny cenowe (BUK i DĄB)

FORMAT JSON:
{
  "products": [
    {
      "pdfName": "NAZWA Z PDF",
      "sizes": [
        {
          "dimension": "ALPI 80 x 120 N (76/80/120)",
          "prices": { "BUK": 1800, "DĄB": 2200 }
        }
      ]
    }
  ]
}

Zwróć TYLKO JSON.`
            );

        case "bestmeble": {
            const priceGroups = getPriceGroupsFromData(currentData, layoutType);
            return (
                baseInstructions +
                `
INSTRUKCJA DLA BEST MEBLE:
1. Produkty mają ceny w grupach: ${priceGroups.join(", ")}
2. MODEL to nazwa produktu dokładnie jak w PDF
3. Sprawdź KAŻDĄ kolumnę cenową

FORMAT JSON:
{
  "products": [
    {
      "pdfName": "CUBE sofa",
      "MODEL": "CUBE sofa",
      "prices": { ${priceGroups.map((g) => `"${g}": 0`).join(", ")} }
    }
  ]
}

Zwróć TYLKO JSON.`
            );
        }

        default:
            return (
                baseInstructions +
                `Wyodrębnij dane w formacie JSON. Zwróć TYLKO JSON.`
            );
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
        case "furnirest":
            return compareFurnirestData(currentData, pdfData);
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

    console.log("=== Halex Compare Debug ===");

    // Mapa moich produktów: previousName/myName -> { myName, category, data, sizeIndex }
    const myProductsMap = new Map<
        string,
        { myName: string; category: string; data: any }
    >();

    // Mapa moich wymiarów: normalizedDimension -> { prodName, category, sizeIndex, price }
    const myDimensionsMap = new Map<
        string,
        { prodName: string; category: string; sizeIndex: number; price: number }
    >();

    for (const [catName, products] of Object.entries(
        currentData.categories || {}
    )) {
        for (const [prodName, prodData] of Object.entries(
            products as Record<string, any>
        )) {
            const pd = prodData as any;

            if (pd.previousName) {
                myProductsMap.set(normalizeName(pd.previousName), {
                    myName: prodName,
                    category: catName,
                    data: pd,
                });
            }
            myProductsMap.set(normalizeName(prodName), {
                myName: prodName,
                category: catName,
                data: pd,
            });

            // Zapisz wymiary
            (pd.sizes || []).forEach((s: any, idx: number) => {
                const dimNorm = normalizeName(s.dimension);
                myDimensionsMap.set(`${normalizeName(prodName)}__${dimNorm}`, {
                    prodName,
                    category: catName,
                    sizeIndex: idx,
                    price: parsePrice(s.prices),
                });
            });
        }
    }

    // NOWY FORMAT: products[] z pdfName i sizes
    for (const pdfProd of pdfData.products || []) {
        const pdfNameRaw = pdfProd.pdfName || pdfProd.name;
        const pdfNameNorm = normalizeName(pdfNameRaw);
        const match = myProductsMap.get(pdfNameNorm);

        console.log(
            `PDF product: "${pdfNameRaw}" (norm: "${pdfNameNorm}") - Match: ${
                match ? "YES" : "NO"
            }`
        );

        if (match) {
            const myData = match.data;

            for (const pdfSize of pdfProd.sizes || []) {
                const dimNorm = normalizeName(pdfSize.dimension);
                const key = `${normalizeName(match.myName)}__${dimNorm}`;
                const myDim = myDimensionsMap.get(key);

                if (myDim) {
                    const newPrice = parsePrice(
                        pdfSize.price || pdfSize.prices
                    );
                    const oldPrice = myDim.price;

                    if (oldPrice !== newPrice && newPrice > 0) {
                        const percentChange =
                            oldPrice > 0
                                ? Math.round(
                                      ((newPrice - oldPrice) / oldPrice) * 100
                                  )
                                : 0;

                        console.log(
                            `  ${pdfSize.dimension}: ${oldPrice} -> ${newPrice} (${percentChange}%)`
                        );

                        changes.push({
                            type: "price_change",
                            id: generateId(),
                            product: match.myName,
                            myName: match.myName,
                            pdfName: pdfNameRaw,
                            category: match.category,
                            dimension: pdfSize.dimension,
                            oldPrice,
                            newPrice,
                            percentChange,
                            preservedData: {
                                image: myData.image,
                                description: myData.description,
                            },
                        });

                        if (
                            mergedData.categories?.[match.category]?.[
                                match.myName
                            ]?.sizes
                        ) {
                            mergedData.categories[match.category][
                                match.myName
                            ].sizes[myDim.sizeIndex].prices = String(newPrice);
                        }
                    }
                }
            }
        }
    }

    // STARY FORMAT (fallback): categories
    if (
        (!pdfData.products || pdfData.products.length === 0) &&
        pdfData.categories
    ) {
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

                    for (const pdfSize of pd.sizes || []) {
                        const dimNorm = normalizeName(pdfSize.dimension);
                        const key = `${normalizeName(
                            match.myName
                        )}__${dimNorm}`;
                        const myDim = myDimensionsMap.get(key);

                        if (myDim) {
                            const newPrice = parsePrice(
                                pdfSize.price || pdfSize.prices
                            );
                            const oldPrice = myDim.price;

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
                                    product: match.myName,
                                    myName: match.myName,
                                    pdfName: pdfProdName,
                                    category: match.category,
                                    dimension: pdfSize.dimension,
                                    oldPrice,
                                    newPrice,
                                    percentChange,
                                    preservedData: {
                                        image: myData.image,
                                        description: myData.description,
                                    },
                                });

                                if (
                                    mergedData.categories?.[match.category]?.[
                                        match.myName
                                    ]?.sizes
                                ) {
                                    mergedData.categories[match.category][
                                        match.myName
                                    ].sizes[myDim.sizeIndex].prices =
                                        String(newPrice);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    console.log("Total changes:", changes.length);
    return { changes, mergedData };
}

// ============================================
// BOMAR - Stoły z wymiarami, Krzesła z grupami
// ============================================

function compareBomarData(
    currentData: Record<string, any>,
    pdfData: Record<string, any>
): { changes: Change[]; mergedData: Record<string, any> } {
    const changes: Change[] = [];
    const mergedData = JSON.parse(JSON.stringify(currentData));

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
            if (pd.previousName) {
                myProductsMap.set(normalizeName(pd.previousName), {
                    myName: prodName,
                    category: catName,
                    data: pd,
                });
            }
            myProductsMap.set(normalizeName(prodName), {
                myName: prodName,
                category: catName,
                data: pd,
            });
        }
    }

    // NOWY FORMAT: tables[] i chairs[]
    // STOŁY
    for (const pdfTable of pdfData.tables || []) {
        const pdfNameNorm = normalizeName(pdfTable.pdfName || pdfTable.name);
        const match = myProductsMap.get(pdfNameNorm);

        if (match && match.category === "stoły") {
            const myData = match.data;
            const mySizesMap = new Map<
                string,
                { index: number; price: number }
            >();
            (myData.sizes || []).forEach((s: any, idx: number) => {
                mySizesMap.set(normalizeName(s.dimension), {
                    index: idx,
                    price: parsePrice(s.prices || s.price),
                });
            });

            for (const pdfSize of pdfTable.sizes || []) {
                const dimNorm = normalizeName(pdfSize.dimension);
                const mySize = mySizesMap.get(dimNorm);
                const newPrice = parsePrice(pdfSize.price || pdfSize.prices);

                if (mySize && mySize.price !== newPrice && newPrice > 0) {
                    const percentChange =
                        mySize.price > 0
                            ? Math.round(
                                  ((newPrice - mySize.price) / mySize.price) *
                                      100
                              )
                            : 0;

                    changes.push({
                        type: "price_change",
                        id: generateId(),
                        product: match.myName,
                        myName: match.myName,
                        pdfName: pdfTable.pdfName,
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

                    if (
                        mergedData.categories?.[match.category]?.[match.myName]
                            ?.sizes
                    ) {
                        mergedData.categories[match.category][
                            match.myName
                        ].sizes[mySize.index].prices = String(newPrice);
                    }
                }
            }
        }
    }

    // KRZESŁA
    for (const pdfChair of pdfData.chairs || []) {
        const pdfNameNorm = normalizeName(pdfChair.pdfName || pdfChair.name);
        const match = myProductsMap.get(pdfNameNorm);

        if (match && match.category === "krzesła") {
            const myData = match.data;
            const myPrices = myData.prices || {};
            const pdfPrices = pdfChair.prices || {};

            for (const [group, pdfPrice] of Object.entries(pdfPrices)) {
                const newPrice = parsePrice(pdfPrice);
                const oldPrice = parsePrice(myPrices[group]);

                if (
                    group in myPrices &&
                    oldPrice !== newPrice &&
                    newPrice > 0
                ) {
                    const percentChange =
                        oldPrice > 0
                            ? Math.round(
                                  ((newPrice - oldPrice) / oldPrice) * 100
                              )
                            : 0;

                    changes.push({
                        type: "price_change",
                        id: generateId(),
                        product: match.myName,
                        myName: match.myName,
                        pdfName: pdfChair.pdfName,
                        category: match.category,
                        priceGroup: group,
                        oldPrice,
                        newPrice,
                        percentChange,
                        preservedData: {
                            image: myData.image,
                            description: myData.description,
                        },
                    });

                    if (
                        mergedData.categories?.[match.category]?.[match.myName]
                            ?.prices
                    ) {
                        mergedData.categories[match.category][
                            match.myName
                        ].prices[group] = newPrice;
                    }
                }
            }
        }
    }

    // STARY FORMAT (fallback): categories
    if (!pdfData.tables && !pdfData.chairs && pdfData.categories) {
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

                    // Stoły - rozmiary
                    if (pd.sizes && myData.sizes) {
                        const mySizesMap = new Map<
                            string,
                            { index: number; price: number }
                        >();
                        myData.sizes.forEach((s: any, idx: number) => {
                            mySizesMap.set(normalizeName(s.dimension), {
                                index: idx,
                                price: parsePrice(s.prices || s.price),
                            });
                        });

                        for (const pdfSize of pd.sizes) {
                            const dimNorm = normalizeName(pdfSize.dimension);
                            const mySize = mySizesMap.get(dimNorm);
                            const newPrice = parsePrice(
                                pdfSize.price || pdfSize.prices
                            );

                            if (
                                mySize &&
                                mySize.price !== newPrice &&
                                newPrice > 0
                            ) {
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

                                if (
                                    mergedData.categories?.[match.category]?.[
                                        match.myName
                                    ]?.sizes
                                ) {
                                    mergedData.categories[match.category][
                                        match.myName
                                    ].sizes[mySize.index].prices =
                                        String(newPrice);
                                }
                            }
                        }
                    }

                    // Krzesła - grupy cenowe
                    if (pd.prices && myData.prices) {
                        for (const [group, pdfPrice] of Object.entries(
                            pd.prices
                        )) {
                            const newPrice = parsePrice(pdfPrice);
                            const oldPrice = parsePrice(myData.prices[group]);

                            if (
                                group in myData.prices &&
                                oldPrice !== newPrice &&
                                newPrice > 0
                            ) {
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
                                    product: match.myName,
                                    myName: match.myName,
                                    pdfName: pdfProdName,
                                    category: match.category,
                                    priceGroup: group,
                                    oldPrice,
                                    newPrice,
                                    percentChange,
                                    preservedData: {
                                        image: myData.image,
                                        description: myData.description,
                                    },
                                });

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
                }
            }
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
            if (pd.previousName) {
                myProductsMap.set(normalizeName(pd.previousName), {
                    myName: prodName,
                    category: catName,
                    data: pd,
                });
            }
            myProductsMap.set(normalizeName(prodName), {
                myName: prodName,
                category: catName,
                data: pd,
            });
        }
    }

    // NOWY FORMAT: products[]
    for (const pdfProd of pdfData.products || []) {
        const pdfNameNorm = normalizeName(pdfProd.pdfName || pdfProd.name);
        const match = myProductsMap.get(pdfNameNorm);

        if (match) {
            const myData = match.data;
            const myPrices = myData.prices || {};
            const pdfPrices = pdfProd.prices || {};

            for (const [group, pdfPrice] of Object.entries(pdfPrices)) {
                const newPrice = parsePrice(pdfPrice);
                const oldPrice = parsePrice(myPrices[group]);

                if (
                    group in myPrices &&
                    oldPrice !== newPrice &&
                    newPrice > 0
                ) {
                    const percentChange =
                        oldPrice > 0
                            ? Math.round(
                                  ((newPrice - oldPrice) / oldPrice) * 100
                              )
                            : 0;

                    changes.push({
                        type: "price_change",
                        id: generateId(),
                        product: match.myName,
                        myName: match.myName,
                        pdfName: pdfProd.pdfName,
                        category: match.category,
                        priceGroup: group,
                        oldPrice,
                        newPrice,
                        percentChange,
                        preservedData: {
                            image: myData.image,
                            description: myData.description,
                        },
                    });

                    if (
                        mergedData.categories?.[match.category]?.[match.myName]
                            ?.prices
                    ) {
                        mergedData.categories[match.category][
                            match.myName
                        ].prices[group] = newPrice;
                    }
                }
            }
        }
    }

    // STARY FORMAT (fallback): categories
    if (
        (!pdfData.products || pdfData.products.length === 0) &&
        pdfData.categories
    ) {
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
                    const myPrices = myData.prices || {};
                    const pdfPrices = pd.prices || {};

                    for (const [group, pdfPrice] of Object.entries(pdfPrices)) {
                        const newPrice = parsePrice(pdfPrice);
                        const oldPrice = parsePrice(myPrices[group]);

                        if (
                            group in myPrices &&
                            oldPrice !== newPrice &&
                            newPrice > 0
                        ) {
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
                                priceGroup: group,
                                oldPrice,
                                newPrice,
                                percentChange,
                                preservedData: {
                                    image: myData.image,
                                    description: myData.description,
                                },
                            });

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
            }
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

    // Mapa: previousName/myName -> { index, data }
    const myProductsMap = new Map<string, { index: number; data: any }>();

    (currentData.products || []).forEach((prod: any, idx: number) => {
        if (prod.previousName) {
            myProductsMap.set(normalizeName(prod.previousName), {
                index: idx,
                data: prod,
            });
        }
        myProductsMap.set(normalizeName(prod.name), { index: idx, data: prod });
    });

    // NOWY FORMAT: products[] z pdfName i price
    for (const pdfProd of pdfData.products || []) {
        const pdfNameNorm = normalizeName(pdfProd.pdfName || pdfProd.name);
        const match = myProductsMap.get(pdfNameNorm);

        if (match) {
            const myData = match.data;
            const oldPrice = parsePrice(
                myData.elements?.[0]?.prices?.["A"] || 0
            );
            const newPrice = parsePrice(pdfProd.price);

            if (oldPrice !== newPrice && newPrice > 0) {
                const percentChange =
                    oldPrice > 0
                        ? Math.round(((newPrice - oldPrice) / oldPrice) * 100)
                        : 0;

                changes.push({
                    type: "price_change",
                    id: generateId(),
                    product: myData.name,
                    myName: myData.name,
                    pdfName: pdfProd.pdfName,
                    priceGroup: "A",
                    oldPrice,
                    newPrice,
                    percentChange,
                    preservedData: {
                        image: myData.image,
                        description: myData.description,
                    },
                });

                // Aktualizuj
                if (mergedData.products[match.index]?.elements?.[0]?.prices) {
                    mergedData.products[match.index].elements[0].prices["A"] =
                        newPrice;
                }
            }
        }
    }

    // STARY FORMAT (fallback): categories
    if (
        (!pdfData.products || pdfData.products.length === 0) &&
        pdfData.categories
    ) {
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
                    const oldPrice = parsePrice(
                        myData.elements?.[0]?.prices?.["A"] || 0
                    );
                    const newPrice = parsePrice(pd.price);

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
                            product: myData.name,
                            myName: myData.name,
                            pdfName: pdfProdName,
                            priceGroup: "A",
                            oldPrice,
                            newPrice,
                            percentChange,
                            preservedData: {
                                image: myData.image,
                                description: myData.description,
                            },
                        });

                        if (
                            mergedData.products[match.index]?.elements?.[0]
                                ?.prices
                        ) {
                            mergedData.products[match.index].elements[0].prices[
                                "A"
                            ] = newPrice;
                        }
                    }
                }
            }
        }
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

    // Mapa: previousName/name -> { index, data }
    const myProductsMap = new Map<string, { index: number; data: any }>();
    currentProducts.forEach((prod: any, idx: number) => {
        const normalizedName = normalizeName(prod.name);
        if (prod.previousName) {
            myProductsMap.set(normalizeName(prod.previousName), {
                index: idx,
                data: prod,
            });
        }
        myProductsMap.set(normalizedName, { index: idx, data: prod });
    });

    for (const pdfProd of pdfProducts) {
        // Nowy format używa pdfName, stary używa name
        const pdfNameRaw = pdfProd.pdfName || pdfProd.name;
        const pdfName = normalizeName(pdfNameRaw);
        const match = myProductsMap.get(pdfName);

        console.log(
            `PDF product: "${pdfNameRaw}" (norm: "${pdfName}") - Match: ${
                match ? "YES" : "NO"
            }`
        );

        if (match) {
            const myProd = match.data;

            // Mapa moich elementów: normalizedCode -> { index, prices }
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
                        const oldPrice = parsePrice(myEl.prices?.[group] || 0);
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

                            console.log(
                                `  Element "${pdfEl.code}" ${group}: ${oldPrice} -> ${newPriceNum} (${percentChange}%)`
                            );

                            changes.push({
                                type: "price_change",
                                id: generateId(),
                                product: myProd.name,
                                myName: myProd.name,
                                pdfName: pdfNameRaw,
                                element: pdfEl.code,
                                priceGroup: group,
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
            }
        }
    }

    console.log("Total changes:", changes.length);
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

    console.log("=== Puszman Compare Debug ===");
    console.log("Current products:", currentProducts.length);
    console.log("PDF products:", pdfProducts.length);

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
        // Nowy format używa pdfName, stary używa MODEL
        const pdfNameRaw = pdfProd.pdfName || pdfProd.MODEL;
        const pdfModel = normalizeName(pdfNameRaw);
        const match = myProductsMap.get(pdfModel);

        console.log(
            `PDF product: "${pdfNameRaw}" (norm: "${pdfModel}") - Match: ${
                match ? "YES" : "NO"
            }`
        );

        if (match) {
            const myProd = match.data;

            // Porównaj ceny grup - kolumna po kolumnie
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

                    console.log(
                        `  ${group}: ${oldPrice} -> ${newPrice} (${percentChange}%)`
                    );

                    changes.push({
                        type: "price_change",
                        id: generateId(),
                        product: myProd.MODEL,
                        myName: myProd.MODEL,
                        pdfName: pdfNameRaw,
                        priceGroup: group,
                        oldPrice,
                        newPrice,
                        percentChange,
                    });

                    mergedData.Arkusz1[match.index][group] = newPrice;
                }
            }
        }
    }

    console.log("Total changes:", changes.length);
    return { changes, mergedData };
}

// ============================================
// FURNIREST - Stoły z cenami BUK/DĄB
// ============================================

function compareFurnirestData(
    currentData: Record<string, any>,
    pdfData: Record<string, any>
): { changes: Change[]; mergedData: Record<string, any> } {
    const changes: Change[] = [];
    const mergedData = JSON.parse(JSON.stringify(currentData));

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
            if (pd.previousName) {
                myProductsMap.set(normalizeName(pd.previousName), {
                    myName: prodName,
                    category: catName,
                    data: pd,
                });
            }
            myProductsMap.set(normalizeName(prodName), {
                myName: prodName,
                category: catName,
                data: pd,
            });
        }
    }

    console.log("=== Furnirest Compare Debug ===");

    // NOWY FORMAT: products[] z pdfName i sizes
    for (const pdfProd of pdfData.products || []) {
        const pdfNameRaw = pdfProd.pdfName || pdfProd.name;
        const pdfNameNorm = normalizeName(pdfNameRaw);
        const match = myProductsMap.get(pdfNameNorm);

        console.log(
            `PDF product: "${pdfNameRaw}" (norm: "${pdfNameNorm}") - Match: ${
                match ? "YES" : "NO"
            }`
        );

        if (match) {
            const myData = match.data;

            // Mapa moich rozmiarów: normalizedDimension -> { index, prices }
            const mySizesMap = new Map<
                string,
                { index: number; prices: any }
            >();
            (myData.sizes || []).forEach((s: any, idx: number) => {
                mySizesMap.set(normalizeName(s.dimension), {
                    index: idx,
                    prices: s.prices,
                });
            });

            for (const pdfSize of pdfProd.sizes || []) {
                const dimNorm = normalizeName(pdfSize.dimension);
                const mySize = mySizesMap.get(dimNorm);

                if (mySize) {
                    // Porównaj ceny BUK i DĄB
                    for (const material of ["BUK", "DĄB", "DAB"]) {
                        const pdfPrice = pdfSize.prices?.[material];
                        if (pdfPrice === undefined) continue;

                        const materialKey =
                            material === "DAB" ? "DĄB" : material;
                        const oldPrice = parsePrice(
                            mySize.prices?.[materialKey] || 0
                        );
                        const newPrice = parsePrice(pdfPrice);

                        if (oldPrice !== newPrice && newPrice > 0) {
                            const percentChange =
                                oldPrice > 0
                                    ? Math.round(
                                          ((newPrice - oldPrice) / oldPrice) *
                                              100
                                      )
                                    : 0;

                            console.log(
                                `  ${pdfSize.dimension} ${materialKey}: ${oldPrice} -> ${newPrice} (${percentChange}%)`
                            );

                            changes.push({
                                type: "price_change",
                                id: generateId(),
                                product: match.myName,
                                myName: match.myName,
                                pdfName: pdfNameRaw,
                                category: match.category,
                                dimension: pdfSize.dimension,
                                priceGroup: materialKey,
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
                                ]?.sizes?.[mySize.index]?.prices
                            ) {
                                mergedData.categories[match.category][
                                    match.myName
                                ].sizes[mySize.index].prices[materialKey] =
                                    newPrice;
                            }
                        }
                    }
                }
            }
        }
    }

    console.log("Total changes:", changes.length);
    return { changes, mergedData };
}
