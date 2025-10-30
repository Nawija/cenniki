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
