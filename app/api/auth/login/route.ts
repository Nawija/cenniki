import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const credentialsPath = path.join(process.cwd(), "data", "credentials.json");

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!fs.existsSync(credentialsPath)) {
            return NextResponse.json(
                { success: false, message: "Brak pliku konfiguracyjnego" },
                { status: 500 }
            );
        }

        const credentials = JSON.parse(
            fs.readFileSync(credentialsPath, "utf-8")
        );

        if (
            username === credentials.username &&
            password === credentials.password
        ) {
            // Generuj prosty token (data + random)
            const token = Buffer.from(
                `${username}:${Date.now()}:${Math.random().toString(36)}`
            ).toString("base64");

            return NextResponse.json({
                success: true,
                token,
                message: "Zalogowano pomyślnie",
            });
        }

        return NextResponse.json(
            { success: false, message: "Nieprawidłowy login lub hasło" },
            { status: 401 }
        );
    } catch {
        return NextResponse.json(
            { success: false, message: "Błąd serwera" },
            { status: 500 }
        );
    }
}
