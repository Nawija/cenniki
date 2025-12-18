// app/api/upload/route.ts
// API do uploadu zdjęć z optymalizacją

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const IMAGES_DIR = path.join(process.cwd(), "public", "images");

// Konfiguracja rozmiarów dla różnych typów obrazów
const SIZE_CONFIG: Record<string, { width: number; height?: number }> = {
    products: { width: 400 }, // Zdjęcia produktów
    logo: { width: 200, height: 200 }, // Loga producentów
    categories: { width: 400 }, // Kategorie
    technical: { width: 1000 }, // Rysunki techniczne (wyższa jakość)
    elements: { width: 100, height: 100 }, // Małe ikony elementów
    default: { width: 400 }, // Domyślny
};

// Jakość WebP dla różnych typów
const QUALITY_CONFIG: Record<string, number> = {
    products: 75,
    logo: 90,
    categories: 75,
    technical: 80,
    elements: 70, // Małe ikony - niższa jakość bo i tak małe
    default: 75,
};

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const producer = formData.get("producer") as string;
        const folder = formData.get("folder") as string; // np. "products", "logo", "categories"

        if (!file) {
            return NextResponse.json({ error: "Brak pliku" }, { status: 400 });
        }

        if (!producer) {
            return NextResponse.json(
                { error: "Brak nazwy producenta" },
                { status: 400 }
            );
        }

        // Stwórz folder dla producenta jeśli nie istnieje
        const producerDir = path.join(IMAGES_DIR, producer, folder || "");
        if (!fs.existsSync(producerDir)) {
            fs.mkdirSync(producerDir, { recursive: true });
        }

        // Generuj unikalną nazwę pliku (z rozszerzeniem .webp)
        const timestamp = Date.now();
        const originalName = file.name
            .replace(/\.[^/.]+$/, "") // Usuń oryginalne rozszerzenie
            .replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${timestamp}-${originalName}.webp`;
        const filePath = path.join(producerDir, fileName);

        // Pobierz bytes z pliku
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Pobierz konfigurację rozmiaru i jakości
        const sizeType = folder || "default";
        const sizeConfig = SIZE_CONFIG[sizeType] || SIZE_CONFIG.default;
        const quality = QUALITY_CONFIG[sizeType] || QUALITY_CONFIG.default;

        // Optymalizuj obraz za pomocą sharp
        let sharpInstance = sharp(buffer);

        // Pobierz metadata obrazu
        const metadata = await sharpInstance.metadata();

        // Resize tylko jeśli obraz jest większy niż docelowy rozmiar
        if (metadata.width && metadata.width > sizeConfig.width) {
            sharpInstance = sharpInstance.resize({
                width: sizeConfig.width,
                height: sizeConfig.height,
                fit: "inside", // Zachowaj proporcje
                withoutEnlargement: true, // Nie powiększaj małych obrazów
            });
        }

        // Konwertuj do WebP z optymalizacją
        const optimizedBuffer = await sharpInstance
            .webp({
                quality,
                effort: 6, // Wyższy effort = lepsza kompresja (0-6)
            })
            .toBuffer();

        // Zapisz zoptymalizowany plik
        fs.writeFileSync(filePath, optimizedBuffer);

        // Informacje o optymalizacji
        const originalSize = buffer.length;
        const optimizedSize = optimizedBuffer.length;
        const savedPercent = Math.round(
            (1 - optimizedSize / originalSize) * 100
        );

        // Zwróć ścieżkę publiczną
        const publicPath = `/images/${producer}${
            folder ? "/" + folder : ""
        }/${fileName}`;

        return NextResponse.json({
            success: true,
            path: publicPath,
            fileName,
            optimization: {
                originalSize,
                optimizedSize,
                savedPercent: Math.max(0, savedPercent),
                format: "webp",
            },
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            { error: "Nie udało się przesłać pliku" },
            { status: 500 }
        );
    }
}

// GET - lista obrazów producenta
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const producer = searchParams.get("producer");

        if (!producer) {
            return NextResponse.json(
                { error: "Brak nazwy producenta" },
                { status: 400 }
            );
        }

        const producerDir = path.join(IMAGES_DIR, producer);

        if (!fs.existsSync(producerDir)) {
            return NextResponse.json({ images: [] });
        }

        const images: string[] = [];

        function scanDir(dir: string, basePath: string) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    scanDir(filePath, `${basePath}/${file}`);
                } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
                    images.push(`${basePath}/${file}`);
                }
            }
        }

        scanDir(producerDir, `/images/${producer}`);

        return NextResponse.json({ images });
    } catch (error) {
        console.error("Error listing images:", error);
        return NextResponse.json(
            { error: "Nie udało się pobrać listy obrazów" },
            { status: 500 }
        );
    }
}
