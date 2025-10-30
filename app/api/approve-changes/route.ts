import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        const { manufacturer, data } = await request.json();

        if (!manufacturer || !data) {
            return NextResponse.json(
                { error: "manufacturer and data are required" },
                { status: 400 }
            );
        }

        const dataDir = path.join(process.cwd(), "data");

        // Upewnij się że folder data istnieje
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }

        // Kapitalizacja pierwszej litery dla nazwy pliku
        const fileName =
            manufacturer.charAt(0).toUpperCase() +
            manufacturer.slice(1).toLowerCase();
        const filePath = path.join(dataDir, `${fileName}.json`);

        // Zapisz zaakceptowane dane
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

        console.log(`✅ Zaakceptowano i zapisano: data/${fileName}.json`);

        return NextResponse.json({
            success: true,
            message: "Cennik został zapisany pomyślnie",
            filePath: `data/${fileName}.json`,
        });
    } catch (error) {
        console.error("❌ Błąd zapisu cennika:", error);
        return NextResponse.json(
            {
                error: "Błąd zapisu cennika",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
