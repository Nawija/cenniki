import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const manufacturer = formData.get("manufacturer") as string;
        const category = formData.get("category") as string;
        const productName = formData.get("productName") as string;

        if (!file || !manufacturer) {
            return NextResponse.json(
                {
                    error: "Brak wymaganych danych: file, manufacturer",
                },
                { status: 400 }
            );
        }

        // Konwersja nazwy produktu na bezpieczną nazwę pliku
        // Najpierw normalizuj polskie znaki
        const nameToNormalize = productName || "";
        const normalizedName = nameToNormalize
            .normalize("NFD") // Rozdziel znaki diakrytyczne
            .replace(/\u0142/g, "l") // ł -> l
            .replace(/\u0141/g, "L") // Ł -> L
            .replace(/[\u0300-\u036f]/g, "") // Usuń znaki diakrytyczne (ó->o, ą->a, etc.)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");

        const safeFileName = normalizedName || `image-${Date.now()}`;

        // Ścieżka do folderu - obsługuj zarówno product name jak i category
        const manufacturerFolder = manufacturer
            .toLowerCase()
            .replace(/\s+/g, "-");
        const categoryFolder = category
            ? category.toLowerCase().replace(/\s+/g, "-")
            : "general";
        const imageDir = path.join(
            process.cwd(),
            "public",
            "images",
            manufacturerFolder,
            categoryFolder
        );

        // Utwórz folder jeśli nie istnieje
        await mkdir(imageDir, { recursive: true });

        // Ścieżka do pliku
        const fileName = `${safeFileName}.webp`;
        const filePath = path.join(imageDir, fileName);

        // Pobierz bufor z pliku
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Konwertuj na WebP używając sharp
        const webpBuffer = await sharp(buffer)
            .webp({ quality: 85 })
            .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
            .toBuffer();

        // Zapisz plik
        await writeFile(filePath, webpBuffer);

        // Zwróć ścieżkę do pliku (relatywną od public/)
        const imageUrl = `/images/${manufacturerFolder}/${categoryFolder}/${fileName}`;

        console.log(`✅ Zapisano zdjęcie: ${imageUrl}`);

        return NextResponse.json({
            success: true,
            path: imageUrl,
            imageUrl,
            message: "Zdjęcie zostało zapisane",
        });
    } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json(
            { error: "Błąd podczas zapisywania zdjęcia" },
            { status: 500 }
        );
    }
}
