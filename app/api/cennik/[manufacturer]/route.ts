import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ manufacturer: string }> }
) {
    try {
        const { manufacturer } = await params;

        // Kapitalizacja pierwszej litery
        const manufacturerName =
            manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1);

        const filePath = path.join(
            process.cwd(),
            "data",
            `${manufacturerName}.json`
        );

        // Sprawdź czy plik istnieje
        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { error: "Manufacturer not found" },
                { status: 404 }
            );
        }

        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching cennik:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch cennik",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
