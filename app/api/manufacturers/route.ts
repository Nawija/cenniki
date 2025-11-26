import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const dataDir = path.join(process.cwd(), "data");
        const files = fs.readdirSync(dataDir);

        const manufacturers = files
            .filter((file) => file.endsWith(".json"))
            .map((file) => file.replace(".json", ""));

        return NextResponse.json({ manufacturers });
    } catch (error) {
        console.error("Error fetching manufacturers:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch manufacturers",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { name, data } = await request.json();

        if (!name || !data) {
            return NextResponse.json(
                { error: "Brakuje nazwy lub danych" },
                { status: 400 }
            );
        }

        const dataDir = path.join(process.cwd(), "data");
        // Normalizacja: "mp-nidzica" → "Mp-Nidzica"
        const fileName = name
            .split("-")
            .map(
                (part) =>
                    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join("-");
        const filePath = path.join(dataDir, `${fileName}.json`);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        return NextResponse.json(
            { message: "Producent dodany/zaktualizowany", fileName },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error saving manufacturer:", error);
        return NextResponse.json(
            { error: "Błąd podczas zapisywania producenta" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { name } = await request.json();

        if (!name) {
            return NextResponse.json(
                { error: "Brakuje nazwy producenta" },
                { status: 400 }
            );
        }

        const dataDir = path.join(process.cwd(), "data");
        // Normalizacja: "mp-nidzica" → "Mp-Nidzica"
        const fileName = name
            .split("-")
            .map(
                (part) =>
                    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join("-");
        const filePath = path.join(dataDir, `${fileName}.json`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return NextResponse.json(
                { message: "Producent usunięty" },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { error: "Producent nie znaleziony" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error deleting manufacturer:", error);
        return NextResponse.json(
            { error: "Błąd podczas usuwania producenta" },
            { status: 500 }
        );
    }
}
