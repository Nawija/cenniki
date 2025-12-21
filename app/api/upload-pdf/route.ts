import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Konfiguracja GitHub
const GITHUB_USER = "nawija";
const GITHUB_REPO = "cenniki";
const GITHUB_BRANCH = "main";

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

        // Wygeneruj link raw do GitHub
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/public/pdf/tkaniny/${producer}/${safeName}`;

        // Nazwa wyświetlana (bez .pdf, zamień - na spacje)
        const displayName = safeName
            .replace(/\.pdf$/i, "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

        return NextResponse.json({
            success: true,
            url: rawUrl,
            name: displayName,
            localPath: `/pdf/tkaniny/${producer}/${safeName}`,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { success: false, error: "Błąd podczas zapisywania pliku" },
            { status: 500 }
        );
    }
}
