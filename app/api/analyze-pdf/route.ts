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

        // removed
        // removed
        // removed
        // removed

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
                // removed
            } catch {
                // removed
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
                // removed
            } else {
                // removed
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
            model: "gemini-2.5-flash",
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
        // removed
        // removed
        // removed
        // removed
        // removed
        if (pdfData.products?.[0]) {
            // removed
        }
        if (currentData.products?.[0]) {
            // removed
        }

        // Porównaj i merguj
        const { changes, mergedData } = compareAndMerge(
            currentData,
            pdfData,
            layoutType,
            producerSlug
        );

        // removed
        if (changes.length > 0) {
            // removed
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
                "G2",
                "G4",
                "G6",
                "G8",
                "Hermes",
                "Toledo",
            ];
            lines.push(`=== FOTELE VERIKON ===`);
            lines.push(`Grupy cenowe (KOLUMNY): ${priceGroups.join(", ")}`);
            lines.push(`\nSzukaj w PDF STARYCH nazw produktów (previousName).`);
            lines.push(`Sprawdź cenę w KAŻDEJ grupie materiałowej.\n`);
            lines.push(`LISTA PRODUKTÓW DO ZNALEZIENIA:\n`);

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
                        `SZUKAJ: "${pdfName}" → aktualne ceny: ${priceStr}`
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
            const productCategories = currentData.productCategories || [];
            lines.push(`=== PRODUKTY FURNIREST ===`);
            lines.push(
                `Kategorie produktów: ${productCategories.join(", ") || "brak"}`
            );
            lines.push(
                `\n⚠️ WAŻNE: Każdy produkt może mieć INNE kolumny cenowe!`
            );
            lines.push(
                `STOŁY - mają wymiary w code np. "ALPI 80 x 120 N (76/80/120)" z cenami BUK, DĄB itp.`
            );
            lines.push(
                `KRZESŁA - mają grupy w code np. "GRUPA 1", "GRUPA 2", "GRUPA 3", "GRUPA 4"`
            );
            lines.push(
                `         Niektóre krzesła mają "Metal Czarny", inne mają "BUK"/"DĄB"\n`
            );

            // Grupuj produkty po kategoriach
            const productsByCategory = new Map<string, any[]>();
            for (const prod of currentData.products || []) {
                const cat = prod.category || "Inne";
                if (!productsByCategory.has(cat)) {
                    productsByCategory.set(cat, []);
                }
                productsByCategory.get(cat)!.push(prod);
            }

            for (const [category, prods] of productsByCategory) {
                lines.push(`\n=== ${category.toUpperCase()} ===`);
                for (const prod of prods) {
                    const pdfName = prod.previousName || prod.name;
                    lines.push(
                        `\n--- "${pdfName}" (moja nazwa: "${prod.name}") ---`
                    );
                    if (prod.description) {
                        lines.push(`Opis: ${prod.description}`);
                    }
                    // Pobierz unikalne grupy cenowe dla tego produktu
                    const productPriceGroups = new Set<string>();
                    for (const el of prod.elements || []) {
                        for (const key of Object.keys(el.prices || {})) {
                            productPriceGroups.add(key);
                        }
                    }
                    const priceGroupsArr = Array.from(productPriceGroups);
                    lines.push(`Kolumny cenowe: ${priceGroupsArr.join(", ")}`);
                    lines.push(`Elementy:`);
                    for (const el of prod.elements || []) {
                        const priceStr = priceGroupsArr
                            .map((g) => `${g}:${el.prices?.[g] ?? "-"}`)
                            .join(", ");
                        lines.push(`  "${el.code}": ${priceStr}`);
                    }
                }
            }
            break;
        }

        case "halex": {
            // STOŁY
            const tables =
                currentData.categories?.["Stoły"] ||
                currentData.categories?.["stoły"] ||
                {};
            if (Object.keys(tables).length > 0) {
                lines.push(`=== STOŁY HALEX ===`);
                lines.push(`Każdy stół ma wymiary z cenami.\n`);

                for (const [name, data] of Object.entries(tables)) {
                    const d = data as any;
                    const pdfName = d.previousName || name;
                    lines.push(`\nStół: "${pdfName}" (moja nazwa: "${name}"):`);
                    lines.push(`Aktualne wymiary i ceny:`);
                    for (const size of d.sizes || []) {
                        const price =
                            typeof size.prices === "number" ? size.prices : 0;
                        lines.push(`  - ${size.dimension}: ${price} zł`);
                    }
                }
            }

            // KRZESŁA
            const chairs =
                currentData.categories?.["Krzesla"] ||
                currentData.categories?.["krzesła"] ||
                currentData.categories?.["Krzesła"] ||
                {};
            if (Object.keys(chairs).length > 0) {
                lines.push(`\n\n=== KRZESŁA HALEX ===`);

                // Pobierz grupy cenowe z pierwszego krzesła
                const firstChair = Object.values(chairs)[0] as any;
                const priceGroups = Object.keys(firstChair?.prices || {});
                lines.push(`Grupy cenowe: ${priceGroups.join(", ")}`);

                // Sprawdź czy są warianty materiałowe
                const samplePrice = firstChair?.prices?.[priceGroups[0]];
                const hasVariants =
                    typeof samplePrice === "object" && samplePrice !== null;

                if (hasVariants) {
                    lines.push(
                        `\nUWAGA: Każde krzesło może mieć różne WARIANTY MATERIAŁOWE (np. BUK, DĄB, METAL)`
                    );
                    lines.push(
                        `Dla każdego krzesła sprawdź jakie warianty są dostępne w PDF!\n`
                    );
                }

                for (const [name, data] of Object.entries(chairs)) {
                    const d = data as any;
                    const pdfName = d.previousName || name;
                    lines.push(
                        `\nKrzesło: "${pdfName}" (moja nazwa: "${name}")`
                    );
                    lines.push(`Materiał: ${d.material || "nieznany"}`);
                    lines.push(`Aktualne ceny:`);

                    for (const [group, price] of Object.entries(
                        d.prices || {}
                    )) {
                        if (typeof price === "object" && price !== null) {
                            // Ceny z wariantami
                            const variants = Object.entries(
                                price as Record<string, number>
                            )
                                .map(([v, p]) => `${v}:${p}`)
                                .join(", ");
                            lines.push(`  - ${group}: ${variants}`);
                        } else {
                            // Pojedyncza cena
                            lines.push(`  - ${group}: ${price} zł`);
                        }
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

    // Halex ma specyficzny format - stoły z wymiarami, krzesła z grupami i wariantami
    if (producerSlug === "halex") {
        // Dynamicznie zbierz informacje o stołach i krzesłach
        const tables =
            currentData.categories?.["Stoły"] ||
            currentData.categories?.["stoły"] ||
            {};
        const chairs =
            currentData.categories?.["Krzesla"] ||
            currentData.categories?.["krzesła"] ||
            currentData.categories?.["Krzesła"] ||
            {};

        // Zbierz grupy cenowe z krzeseł
        const firstChair = Object.values(chairs)[0] as any;
        const priceGroups = Object.keys(firstChair?.prices || {});

        // Zbierz wszystkie warianty materiałowe per krzesło
        const chairVariantsMap = new Map<string, string[]>();
        for (const [name, data] of Object.entries(chairs)) {
            const d = data as any;
            const pdfName = d.previousName || name;
            const variants = new Set<string>();

            for (const price of Object.values(d.prices || {})) {
                if (typeof price === "object" && price !== null) {
                    Object.keys(price as Record<string, number>).forEach((v) =>
                        variants.add(v)
                    );
                }
            }

            if (variants.size > 0) {
                chairVariantsMap.set(pdfName, Array.from(variants));
            }
        }

        // Przykłady stołów
        const tableExamples: string[] = [];
        let tableCount = 0;
        for (const [name, data] of Object.entries(tables)) {
            if (tableCount >= 2) break;
            const d = data as any;
            const pdfName = d.previousName || name;
            const sizesExample = (d.sizes || [])
                .slice(0, 2)
                .map(
                    (s: any) =>
                        `{ "dimension": "${s.dimension}", "price": ${
                            typeof s.prices === "number" ? s.prices : 0
                        } }`
                )
                .join(",\n            ");

            tableExamples.push(`    {
      "type": "table",
      "pdfName": "${pdfName}",
      "sizes": [
            ${sizesExample}
      ]
    }`);
            tableCount++;
        }

        // Przykłady krzeseł - jedno z wariantami, jedno bez
        const chairExamples: string[] = [];
        let chairWithVariants: string | null = null;
        let chairSimple: string | null = null;

        for (const [name, data] of Object.entries(chairs)) {
            const d = data as any;
            const pdfName = d.previousName || name;
            const variants = chairVariantsMap.get(pdfName);

            if (variants && variants.length > 0 && !chairWithVariants) {
                // Krzesło z wariantami
                const pricesExample: Record<
                    string,
                    Record<string, number>
                > = {};
                priceGroups.forEach((g) => {
                    pricesExample[g] = {};
                    variants.forEach((v) => {
                        pricesExample[g][v] = 0;
                    });
                });

                chairWithVariants = `    {
      "type": "chair",
      "pdfName": "${pdfName}",
      "variants": ${JSON.stringify(variants)},
      "prices": ${JSON.stringify(pricesExample, null, 8).replace(
          /\n/g,
          "\n      "
      )}
    }`;
            } else if (!variants && !chairSimple) {
                // Krzesło bez wariantów (pojedyncze ceny)
                const pricesExample: Record<string, number> = {};
                priceGroups.forEach((g) => {
                    pricesExample[g] = 0;
                });

                chairSimple = `    {
      "type": "chair",
      "pdfName": "${pdfName}",
      "prices": ${JSON.stringify(pricesExample)}
    }`;
            }

            if (chairWithVariants && chairSimple) break;
        }

        if (chairWithVariants) chairExamples.push(chairWithVariants);
        if (chairSimple) chairExamples.push(chairSimple);

        // Zbuduj listę krzeseł z ich wariantami
        const chairVariantsList: string[] = [];
        for (const [pdfName, variants] of chairVariantsMap) {
            chairVariantsList.push(
                `- "${pdfName}": warianty [${variants.join(", ")}]`
            );
        }

        return (
            baseInstructions +
            `
INSTRUKCJA DLA HALEX:

=== STOŁY ===
1. Znajdź KAŻDY stół z mojej listy w PDF
2. Dla każdego stołu wyodrębnij WSZYSTKIE wymiary i ich ceny
3. Wymiary zapisuj dokładnie jak w PDF (np. "Ø110", "Ø110-160", "160-260 x 90 h76")

=== KRZESŁA ===
1. Znajdź KAŻDE krzesło z mojej listy w PDF
2. KRYTYCZNE - Używaj DOKŁADNIE tych nazw grup cenowych (kopiuj bez zmian!):
   ${priceGroups.map((g) => `"${g}"`).join(", ")}
   
   ❌ NIE ZMIENIAJ nazw grup! 
   ❌ Nie pisz: "GRUPA I", "I gr", "Gr. I", "grupa 1", "GR I"
   ✅ Pisz DOKŁADNIE: ${priceGroups
       .slice(0, 3)
       .map((g) => `"${g}"`)
       .join(", ")} itd.
   
3. Każde krzesło może mieć RÓŻNE warianty materiałowe!
   - Sprawdź w PDF jakie warianty są dla danego krzesła (np. BUK, DĄB, METAL)
   - Jeśli krzesło ma warianty, podaj ceny dla KAŻDEGO wariantu osobno

KRZESŁA Z ICH WARIANTAMI:
${
    chairVariantsList.length > 0
        ? chairVariantsList.join("\n")
        : "(brak zdefiniowanych wariantów - sprawdź w PDF)"
}

FORMAT JSON:
{
  "products": [
${tableExamples.join(",\n")},
${chairExamples.join(",\n")}
  ]
}

ZASADY:
- "type": "table" dla stołów, "chair" dla krzeseł
- Dla stołów: "sizes" z "dimension" i "price"
- Dla krzeseł BEZ wariantów: "prices" jako obiekt { ${priceGroups
                .slice(0, 2)
                .map((g) => `"${g}": 123`)
                .join(", ")}, ... }
- Dla krzeseł Z wariantami: "variants" jako tablica + "prices" jako { ${
                priceGroups.length > 0
                    ? `"${priceGroups[0]}": { "BUK": 123, "DĄB": 456 }`
                    : '"Grupa I": { "BUK": 123 }'
            }, ... }
- KLUCZE GRUP CENOWYCH muszą być IDENTYCZNE z tymi: ${priceGroups
                .map((g) => `"${g}"`)
                .join(", ")}
- Ceny jako LICZBY (bez "zł")
- Jeśli cena nieznana = 0

Zwróć TYLKO JSON, bez markdown.`
        );
    }

    // Furnirest ma specyficzny format - stoły z wymiarami i krzesła z grupami
    // Każdy produkt może mieć INNE kolumny cenowe!
    if (producerSlug === "furnirest") {
        // Zbierz wszystkie unikalne kolumny cenowe per produkt
        const productPriceGroups = new Map<string, string[]>();
        for (const prod of currentData.products || []) {
            const pdfName = prod.previousName || prod.name;
            const groups = new Set<string>();
            for (const el of prod.elements || []) {
                for (const key of Object.keys(el.prices || {})) {
                    groups.add(key);
                }
            }
            productPriceGroups.set(pdfName, Array.from(groups));
        }

        // Zbuduj dynamiczne instrukcje
        const exampleProducts: string[] = [];
        let stoleExample: any = null;
        let krzeselBukExample: any = null;
        let krzeselMetalExample: any = null;

        for (const prod of currentData.products || []) {
            const pdfName = prod.previousName || prod.name;
            const category = prod.category || "";
            const groups = productPriceGroups.get(pdfName) || [];

            if (category === "Stoły" && !stoleExample) {
                stoleExample = { pdfName, groups };
            } else if (
                category === "Krzesła" &&
                !krzeselBukExample &&
                groups.includes("BUK")
            ) {
                krzeselBukExample = { pdfName, groups };
            } else if (
                category === "Krzesła" &&
                !krzeselMetalExample &&
                groups.includes("Metal Czarny")
            ) {
                krzeselMetalExample = { pdfName, groups };
            }
        }

        // Buduj przykłady JSON
        if (stoleExample) {
            exampleProducts.push(`    {
      "pdfName": "${stoleExample.pdfName}",
      "elements": [
        {
          "code": "WYMIAR np. ${stoleExample.pdfName} 80 x 120 N (76/80/120)",
          "prices": { ${stoleExample.groups
              .map((g: string) => `"${g}": 0`)
              .join(", ")} }
        }
      ]
    }`);
        }

        if (krzeselBukExample) {
            exampleProducts.push(`    {
      "pdfName": "${krzeselBukExample.pdfName}",
      "elements": [
        { "code": "GRUPA 1", "prices": { ${krzeselBukExample.groups
            .map((g: string) => `"${g}": 0`)
            .join(", ")} } },
        { "code": "GRUPA 2", "prices": { ${krzeselBukExample.groups
            .map((g: string) => `"${g}": 0`)
            .join(", ")} } }
      ]
    }`);
        }

        if (krzeselMetalExample) {
            exampleProducts.push(`    {
      "pdfName": "${krzeselMetalExample.pdfName}",
      "elements": [
        { "code": "GRUPA 1", "prices": { ${krzeselMetalExample.groups
            .map((g: string) => `"${g}": 0`)
            .join(", ")} } },
        { "code": "GRUPA 2", "prices": { ${krzeselMetalExample.groups
            .map((g: string) => `"${g}": 0`)
            .join(", ")} } }
      ]
    }`);
        }

        // Lista produktów z ich kolumnami cenowymi
        const productColumnsList: string[] = [];
        for (const [pdfName, groups] of productPriceGroups) {
            productColumnsList.push(`  - "${pdfName}": ${groups.join(", ")}`);
        }

        return (
            baseInstructions +
            `
INSTRUKCJA DLA FURNIREST (stoły i krzesła):

⚠️ UWAGA: Każdy produkt może mieć INNE kolumny cenowe!
Sprawdź dokładnie jakie kolumny są dla danego produktu w PDF.

STOŁY: wymiary w code np. "ALPI 80 x 120 N (76/80/120)"
KRZESŁA: grupy w code np. "GRUPA 1", "GRUPA 2", "GRUPA 3", "GRUPA 4"

PRODUKTY I ICH KOLUMNY CENOWE:
${productColumnsList.join("\n")}

FORMAT JSON:
{
  "products": [
${exampleProducts.join(",\n")}
  ]
}

KLUCZOWE: 
- Użyj dokładnie tych nazw kolumn cenowych, które są w REFERENCES dla danego produktu
- Kod elementu stołu = pełny wymiar z PDF
- Kod elementu krzesła = "GRUPA 1", "GRUPA 2" itd.
- Szukaj produktów po previousName (stara nazwa z PDF)
- NIE dodawaj kolumn, których produkt nie ma!

Zwróć TYLKO JSON.`
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

        case "verikon": {
            // Dynamicznie buduj mapowanie nazw z danych
            const nameMapping: string[] = [];
            const pdfNames: string[] = [];

            for (const [_catName, products] of Object.entries(
                currentData.categories || {}
            )) {
                for (const [newName, prodData] of Object.entries(
                    products as Record<string, any>
                )) {
                    const pd = prodData as any;
                    if (pd.previousName && pd.previousName !== newName) {
                        nameMapping.push(`- ${pd.previousName} -> ${newName}`);
                        pdfNames.push(pd.previousName);
                    } else {
                        pdfNames.push(newName);
                    }
                }
            }

            return (
                baseInstructions +
                `
INSTRUKCJA DLA VERIKON:
1. Fotele mają ceny w grupach materiałowych: G1, G2, G3, G4, Skóra Hermes, Skóra Toledo
2. Sprawdź KAŻDĄ kolumnę cenową w tabeli
3. W PDF szukaj nazw produktów - w bazie są zapisane jako previousName (stare nazwy)
4. WAŻNE: Nazwy produktów w PDF to STARE nazwy, NIE nowe
5. Jeśli brak ceny dla skóry w PDF, wpisz 0
6. Ceny są podane w EUR - przepisz je bez przeliczania

MAPOWANIE NAZW (previousName z PDF -> nowaNazwa w bazie):
${
    nameMapping.length > 0
        ? nameMapping.join("\n")
        : "(brak mapowań - używaj nazw bezpośrednio)"
}

SZUKAJ W PDF TYCH NAZW:
${pdfNames.map((n) => `"${n}"`).join(", ")}

FORMAT JSON - używaj STARYCH nazw (z PDF) jako pdfName:
{
  "products": [
    {
      "pdfName": "NAZWA_Z_PDF",
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

Zwróć TYLKO JSON z wszystkimi produktami z PDF.`
            );
        }

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

        case "furnirest": {
            const priceGroups = getPriceGroupsFromData(currentData, layoutType);
            return (
                baseInstructions +
                `
INSTRUKCJA DLA FURNIREST:
1. Produkty dzielą się na STOŁY i KRZESŁA
2. STOŁY - mają wymiary w nazwie np. "ALPI 80 x 120 N (76/80/120)", "BELLA 95 (76/95-175)"
3. KRZESŁA - mają grupy cenowe np. "GRUPA 1", "GRUPA 2", "GRUPA 3", "GRUPA 4"
4. Ceny zależą od materiału: ${priceGroups.join(", ")}
5. Element to wymiar stołu LUB grupa krzesła

FORMAT JSON:
{
  "products": [
    {
      "pdfName": "ALPI",
      "elements": [
        {
          "code": "ALPI 80 x 120 N (76/80/120)",
          "prices": { ${priceGroups.map((g) => `"${g}": 0`).join(", ")} }
        },
        {
          "code": "ALPI 90 x 130 (76/90/130-206)",
          "prices": { ${priceGroups.map((g) => `"${g}": 0`).join(", ")} }
        }
      ]
    },
    {
      "pdfName": "Tulip",
      "elements": [
        {
          "code": "GRUPA 1",
          "prices": { ${priceGroups.map((g) => `"${g}": 0`).join(", ")} }
        },
        {
          "code": "GRUPA 2",
          "prices": { ${priceGroups.map((g) => `"${g}": 0`).join(", ")} }
        }
      ]
    }
  ]
}

WAŻNE:
- Stoły w PDF mogą mieć różne formaty wymiarów - użyj DOKŁADNIE jak w PDF
- Dla krzeseł szukaj tabelki z grupami cenowymi (GRUPA 1, 2, 3, 4)
- Nie wszystkie materiały muszą mieć cenę - wstaw 0 jeśli brak

Zwróć TYLKO JSON.`
            );
        }

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
// HALEX - Stoły z wymiarami, Krzesła z grupami i wariantami
// ============================================

function compareHalexData(
    currentData: Record<string, any>,
    pdfData: Record<string, any>
): { changes: Change[]; mergedData: Record<string, any> } {
    const changes: Change[] = [];
    const mergedData = JSON.parse(JSON.stringify(currentData));

    // removed

    // Helper do mapowania nazwy grupy z PDF na nazwę z JSON
    // Obsługuje różne warianty: "GRUPA I", "I gr", "Gr. I" -> "Grupa I"
    const normalizeGroupName = (
        pdfGroup: string,
        existingGroups: string[]
    ): string | null => {
        // Najpierw sprawdź dokładne dopasowanie
        if (existingGroups.includes(pdfGroup)) {
            return pdfGroup;
        }

        // Normalizuj dla porównania
        const pdfNorm = pdfGroup.toLowerCase().replace(/\s+/g, " ").trim();

        for (const existing of existingGroups) {
            const existingNorm = existing
                .toLowerCase()
                .replace(/\s+/g, " ")
                .trim();

            // Dokładne dopasowanie po normalizacji
            if (pdfNorm === existingNorm) {
                return existing;
            }

            // Sprawdź czy to ta sama grupa z innym formatowaniem
            // "Grupa I" vs "GRUPA I" vs "I gr" vs "Gr. I" vs "gr I"
            const pdfRoman = extractRomanNumeral(pdfNorm);
            const existingRoman = extractRomanNumeral(existingNorm);

            if (pdfRoman && existingRoman && pdfRoman === existingRoman) {
                // Oba mają tę samą liczbę rzymską - sprawdź czy to "grupa"
                if (
                    (pdfNorm.includes("grup") || pdfNorm.includes("gr")) &&
                    (existingNorm.includes("grup") ||
                        existingNorm.includes("gr"))
                ) {
                    return existing;
                }
            }

            // Specjalny przypadek dla "tk.pow" / "tk pow" / "tkpow"
            if (
                pdfNorm.includes("tk") &&
                pdfNorm.includes("pow") &&
                existingNorm.includes("tk") &&
                existingNorm.includes("pow")
            ) {
                return existing;
            }
        }

        return null;
    };

    // Helper do wyciągnięcia liczby rzymskiej z tekstu
    const extractRomanNumeral = (text: string): string | null => {
        const romanMatch = text.match(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/i);
        return romanMatch ? romanMatch[1].toUpperCase() : null;
    };

    // Mapa moich produktów: previousName/myName -> { myName, category, data }
    const myProductsMap = new Map<
        string,
        { myName: string; category: string; data: any }
    >();

    // Mapa moich wymiarów (stoły): normalizedDimension -> { prodName, category, sizeIndex, price }
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

            // Zapisz wymiary (tylko dla stołów)
            if (pd.sizes && pd.sizes.length > 0) {
                (pd.sizes || []).forEach((s: any, idx: number) => {
                    const dimNorm = normalizeName(s.dimension);
                    myDimensionsMap.set(
                        `${normalizeName(prodName)}__${dimNorm}`,
                        {
                            prodName,
                            category: catName,
                            sizeIndex: idx,
                            price: parsePrice(s.prices),
                        }
                    );
                });
            }
        }
    }

    // Przetwarzaj produkty z PDF
    for (const pdfProd of pdfData.products || []) {
        const pdfNameRaw = pdfProd.pdfName || pdfProd.name;
        const pdfNameNorm = normalizeName(pdfNameRaw);
        const match = myProductsMap.get(pdfNameNorm);
        const prodType = pdfProd.type || (pdfProd.sizes ? "table" : "chair");

        // removed

        if (!match) continue;

        const myData = match.data;

        // ========== STOŁY ==========
        if (prodType === "table" && pdfProd.sizes) {
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

                        // removed

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
                            ].sizes[myDim.sizeIndex].prices = newPrice;
                        }
                    }
                }
            }
        }

        // ========== KRZESŁA ==========
        if (prodType === "chair" && pdfProd.prices) {
            const pdfVariants = pdfProd.variants || [];
            const hasVariants = pdfVariants.length > 0;

            // Pobierz istniejące grupy cenowe z produktu
            const existingPriceGroups = Object.keys(myData.prices || {});

            for (const [pdfGroupName, pdfPrice] of Object.entries(
                pdfProd.prices || {}
            )) {
                // Zmapuj nazwę grupy z PDF na nazwę z JSON
                const mappedGroupName = normalizeGroupName(
                    pdfGroupName,
                    existingPriceGroups
                );

                if (!mappedGroupName) {
                    // removed
                    continue;
                }

                const groupName = mappedGroupName;
                const myGroupPrice = myData.prices?.[groupName];

                if (
                    hasVariants &&
                    typeof pdfPrice === "object" &&
                    pdfPrice !== null
                ) {
                    // Krzesło z wariantami - porównaj każdy wariant
                    for (const [variant, newPrice] of Object.entries(
                        pdfPrice as Record<string, number>
                    )) {
                        const parsedNewPrice = parsePrice(newPrice);

                        // Pobierz starą cenę dla tego wariantu
                        let oldPrice = 0;
                        if (
                            typeof myGroupPrice === "object" &&
                            myGroupPrice !== null
                        ) {
                            oldPrice = parsePrice(
                                (myGroupPrice as Record<string, number>)[
                                    variant
                                ] || 0
                            );
                        } else if (typeof myGroupPrice === "number") {
                            oldPrice = myGroupPrice;
                        }

                        if (oldPrice !== parsedNewPrice && parsedNewPrice > 0) {
                            const percentChange =
                                oldPrice > 0
                                    ? Math.round(
                                          ((parsedNewPrice - oldPrice) /
                                              oldPrice) *
                                              100
                                      )
                                    : 0;

                            // removed

                            changes.push({
                                type: "price_change",
                                id: generateId(),
                                product: match.myName,
                                myName: match.myName,
                                pdfName: pdfNameRaw,
                                category: match.category,
                                priceGroup: `${groupName} (${variant})`,
                                oldPrice,
                                newPrice: parsedNewPrice,
                                percentChange,
                                preservedData: {
                                    image: myData.image,
                                    description: myData.description,
                                },
                            });

                            // Aktualizuj merged data
                            if (
                                mergedData.categories?.[match.category]?.[
                                    match.myName
                                ]?.prices
                            ) {
                                if (
                                    !mergedData.categories[match.category][
                                        match.myName
                                    ].prices[groupName]
                                ) {
                                    mergedData.categories[match.category][
                                        match.myName
                                    ].prices[groupName] = {};
                                }
                                if (
                                    typeof mergedData.categories[
                                        match.category
                                    ][match.myName].prices[groupName] ===
                                    "object"
                                ) {
                                    mergedData.categories[match.category][
                                        match.myName
                                    ].prices[groupName][variant] =
                                        parsedNewPrice;
                                } else {
                                    // Konwertuj na obiekt z wariantami
                                    mergedData.categories[match.category][
                                        match.myName
                                    ].prices[groupName] = {
                                        [variant]: parsedNewPrice,
                                    };
                                }
                            }
                        }
                    }
                } else {
                    // Krzesło bez wariantów - pojedyncza cena
                    const parsedNewPrice = parsePrice(pdfPrice);
                    let oldPrice = 0;

                    if (
                        typeof myGroupPrice === "object" &&
                        myGroupPrice !== null
                    ) {
                        // Jeśli stare dane mają warianty, weź pierwszy
                        const firstVariant = Object.values(
                            myGroupPrice as Record<string, number>
                        )[0];
                        oldPrice = parsePrice(firstVariant || 0);
                    } else {
                        oldPrice = parsePrice(myGroupPrice || 0);
                    }

                    if (oldPrice !== parsedNewPrice && parsedNewPrice > 0) {
                        const percentChange =
                            oldPrice > 0
                                ? Math.round(
                                      ((parsedNewPrice - oldPrice) / oldPrice) *
                                          100
                                  )
                                : 0;

                        // removed

                        changes.push({
                            type: "price_change",
                            id: generateId(),
                            product: match.myName,
                            myName: match.myName,
                            pdfName: pdfNameRaw,
                            category: match.category,
                            priceGroup: groupName,
                            oldPrice,
                            newPrice: parsedNewPrice,
                            percentChange,
                            preservedData: {
                                image: myData.image,
                                description: myData.description,
                            },
                        });

                        // Aktualizuj merged data
                        if (
                            mergedData.categories?.[match.category]?.[
                                match.myName
                            ]?.prices
                        ) {
                            mergedData.categories[match.category][
                                match.myName
                            ].prices[groupName] = parsedNewPrice;
                        }
                    }
                }
            }
        }
    }

    // removed
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

    // removed
    // removed
    // removed

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

        // removed

        if (match) {
            const myProd = match.data;

            // Porównaj ceny (Best Meble używa prices.Cena)
            for (const [priceGroup, newPrice] of Object.entries(
                pdfProd.prices || {}
            )) {
                const oldPrice = myProd.prices?.[priceGroup] || 0;
                const newPriceNum = parsePrice(newPrice);

                // removed

                if (oldPrice !== newPriceNum && newPriceNum > 0) {
                    const percentChange =
                        oldPrice > 0
                            ? Math.round(
                                  ((newPriceNum - oldPrice) / oldPrice) * 100
                              )
                            : 0;

                    // removed

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

    // removed
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

    // removed
    // removed
    // removed

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

        // removed

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

                            // removed

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

    // removed
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

    // removed
    // removed
    // removed

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

        // removed

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

                    // removed

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

    // removed
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

    // removed

    // Mapa: previousName/myName -> { productIndex, product }
    const myProductsMap = new Map<
        string,
        { productIndex: number; product: any }
    >();

    for (let i = 0; i < (currentData.products || []).length; i++) {
        const prod = currentData.products[i];
        if (prod.previousName) {
            myProductsMap.set(normalizeName(prod.previousName), {
                productIndex: i,
                product: prod,
            });
        }
        myProductsMap.set(normalizeName(prod.name), {
            productIndex: i,
            product: prod,
        });
    }

    // Porównaj produkty z PDF
    for (const pdfProd of pdfData.products || []) {
        const pdfNameRaw = pdfProd.pdfName || pdfProd.name;
        const pdfNameNorm = normalizeName(pdfNameRaw);
        const match = myProductsMap.get(pdfNameNorm);

        // removed

        if (match) {
            const myProd = match.product;

            // Pobierz dynamicznie grupy cenowe dla tego konkretnego produktu
            const productPriceGroups = new Set<string>();
            for (const el of myProd.elements || []) {
                for (const key of Object.keys(el.prices || {})) {
                    productPriceGroups.add(key);
                }
            }
            const priceGroupsArr = Array.from(productPriceGroups);

            // Mapa moich elementów: normalizedCode -> { elementIndex, element }
            const myElementsMap = new Map<
                string,
                { elementIndex: number; element: any }
            >();
            (myProd.elements || []).forEach((el: any, idx: number) => {
                myElementsMap.set(normalizeName(el.code), {
                    elementIndex: idx,
                    element: el,
                });
            });

            // Sprawdź elementy z PDF
            for (const pdfEl of pdfProd.elements || []) {
                const codeNorm = normalizeName(pdfEl.code);
                const myEl = myElementsMap.get(codeNorm);

                if (myEl) {
                    // Porównaj ceny dla grup cenowych tego produktu
                    for (const group of priceGroupsArr) {
                        const pdfPrice = pdfEl.prices?.[group];
                        if (pdfPrice === undefined) continue;

                        const oldPrice = parsePrice(
                            myEl.element.prices?.[group] || 0
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

                            // removed

                            changes.push({
                                type: "price_change",
                                id: generateId(),
                                product: myProd.name,
                                myName: myProd.name,
                                pdfName: pdfNameRaw,
                                element: pdfEl.code,
                                priceGroup: group,
                                oldPrice,
                                newPrice,
                                percentChange,
                                preservedData: {
                                    image: myProd.image,
                                    description: myProd.description,
                                },
                            });

                            // Aktualizuj
                            if (
                                mergedData.products?.[match.productIndex]
                                    ?.elements?.[myEl.elementIndex]?.prices
                            ) {
                                mergedData.products[
                                    match.productIndex
                                ].elements[myEl.elementIndex].prices[group] =
                                    newPrice;
                            }
                        }
                    }
                } else {
                    // removed
                }
            }
        }
    }

    // removed
    return { changes, mergedData };
}
