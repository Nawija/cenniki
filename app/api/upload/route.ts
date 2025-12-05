// app/api/upload/route.ts
// API do uploadu zdjęć

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IMAGES_DIR = path.join(process.cwd(), "public", "images");

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const producer = formData.get("producer") as string;
        const folder = formData.get("folder") as string; // np. "products", "categories"

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

        // Generuj unikalną nazwę pliku
        const timestamp = Date.now();
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${timestamp}-${originalName}`;
        const filePath = path.join(producerDir, fileName);

        // Zapisz plik
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fs.writeFileSync(filePath, buffer);

        // Zwróć ścieżkę publiczną
        const publicPath = `/images/${producer}${
            folder ? "/" + folder : ""
        }/${fileName}`;

        return NextResponse.json({
            success: true,
            path: publicPath,
            fileName,
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
