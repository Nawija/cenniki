import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const producer = formData.get("producer") as string | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "Brak pliku" },
                { status: 400 }
            );
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json(
                { success: false, error: "Tylko pliki PDF" },
                { status: 400 }
            );
        }

        if (!producer) {
            return NextResponse.json(
                { success: false, error: "Brak producenta" },
                { status: 400 }
            );
        }

        // Bezpieczna nazwa pliku
        const safeName = file.name
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, "-")
            .replace(/-+/g, "-");

        // Ścieżka do zapisu
        const folderPath = path.join(
            process.cwd(),
            "public",
            "pdf",
            "tkaniny",
            producer
        );
        const filePath = path.join(folderPath, safeName);

        // Utwórz folder jeśli nie istnieje
        await mkdir(folderPath, { recursive: true });

        // Zapisz plik
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Link do pliku - używamy własnej domeny (Vercel serwuje z /public)
        // W produkcji będzie: https://twoja-domena.vercel.app/pdf/tkaniny/...
        // Lokalnie: http://localhost:3000/pdf/tkaniny/...
        const pdfPath = `/pdf/tkaniny/${producer}/${safeName}`;

        // Nazwa wyświetlana (bez .pdf, zamień - na spacje)
        const displayName = safeName
            .replace(/\.pdf$/i, "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

        return NextResponse.json({
            success: true,
            url: pdfPath,
            name: displayName,
            localPath: pdfPath,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { success: false, error: "Błąd podczas zapisywania pliku" },
            { status: 500 }
        );
    }
}
