import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: Array<{ dimension: string; prices: string | number }>;
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
};

type CennikData = {
    title?: string;
    source_file?: string;
    categories: Record<string, Record<string, ProductData>>;
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            manufacturer,
            category,
            productName,
            updates,
        }: {
            manufacturer: string;
            category: string;
            productName: string;
            updates: {
                customName?: string | null;
                customPrice?: number | null;
                customPreviousName?: string | null;
                customImage?: string | null;
            };
        } = body;

        if (!manufacturer || !category || !productName) {
            return NextResponse.json(
                { error: "Brak wymaganych parametrów" },
                { status: 400 }
            );
        }

        // Znajdź plik JSON (z wielką literą)
        const fileName =
            manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1);
        const filePath = path.join(process.cwd(), "data", `${fileName}.json`);

        // Wczytaj obecne dane
        let cennikData: CennikData;
        try {
            const fileContent = await fs.readFile(filePath, "utf-8");
            cennikData = JSON.parse(fileContent);
        } catch (error) {
            return NextResponse.json(
                { error: "Nie znaleziono pliku cennika" },
                { status: 404 }
            );
        }

        // Znajdź produkt w kategorii
        if (!cennikData.categories[category]) {
            return NextResponse.json(
                { error: `Nie znaleziono kategorii: ${category}` },
                { status: 404 }
            );
        }

        if (!cennikData.categories[category][productName]) {
            return NextResponse.json(
                { error: `Nie znaleziono produktu: ${productName}` },
                { status: 404 }
            );
        }

        const product = cennikData.categories[category][productName];

        // Jeśli jest customImage, zaktualizuj pole image
        if (updates.customImage !== undefined && updates.customImage !== null) {
            product.image = updates.customImage;
        }

        // Jeśli jest customPreviousName, zaktualizuj pole previousName
        if (
            updates.customPreviousName !== undefined &&
            updates.customPreviousName !== null
        ) {
            product.previousName = updates.customPreviousName;
        }

        // Jeśli jest customPrice, zaktualizuj ceny
        // Zakładam, że jeśli produkt ma prices (Record<string, number>), to update każdej grupy
        // Jeśli ma sizes, to update prices w sizes
        if (updates.customPrice !== undefined && updates.customPrice !== null) {
            if (product.prices && typeof product.prices === "object") {
                // Produkt z grupami cenowymi - ustaw wszystkie na tę samą cenę
                // (możesz dostosować logikę jak chcesz)
                Object.keys(product.prices).forEach((key) => {
                    product.prices![key] = updates.customPrice!;
                });
            } else if (product.sizes && Array.isArray(product.sizes)) {
                // Produkt z rozmiarami - ustaw cenę dla wszystkich rozmiarów
                product.sizes.forEach((size) => {
                    size.prices = updates.customPrice!;
                });
            }
        }

        // Jeśli jest customName, zmień klucz produktu w kategorii
        if (updates.customName && updates.customName !== productName) {
            // Usuń stary klucz
            delete cennikData.categories[category][productName];
            // Dodaj nowy klucz z tą samą zawartością
            cennikData.categories[category][updates.customName] = product;
        }

        // Zapisz z powrotem do pliku
        await fs.writeFile(
            filePath,
            JSON.stringify(cennikData, null, 2),
            "utf-8"
        );

        console.log(
            `✅ Zaktualizowano produkt w JSON: ${category} / ${productName}`
        );

        return NextResponse.json({
            success: true,
            message: "Produkt został zaktualizowany w pliku JSON",
            filePath: `data/${fileName}.json`,
        });
    } catch (err) {
        console.error("Error updating product in JSON:", err);
        return NextResponse.json(
            { error: "Błąd podczas aktualizacji produktu" },
            { status: 500 }
        );
    }
}
