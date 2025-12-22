import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const credentialsPath = path.join(process.cwd(), "data", "credentials.json");

interface User {
    username: string;
    password: string;
    role: "user" | "admin";
}

interface CredentialsFile {
    users: User[];
}

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!fs.existsSync(credentialsPath)) {
            return NextResponse.json(
                { success: false, message: "Brak pliku konfiguracyjnego" },
                { status: 500 }
            );
        }

        const credentials: CredentialsFile = JSON.parse(
            fs.readFileSync(credentialsPath, "utf-8")
        );

        // Znajdź użytkownika
        const user = credentials.users?.find(
            (u) => u.username === username && u.password === password
        );

        if (user) {
            // Generuj prosty token (data + random + role)
            const token = Buffer.from(
                `${username}:${
                    user.role
                }:${Date.now()}:${Math.random().toString(36)}`
            ).toString("base64");

            return NextResponse.json({
                success: true,
                token,
                role: user.role,
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
