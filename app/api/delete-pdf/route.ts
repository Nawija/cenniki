import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json(
                { success: false, error: "Brak URL pliku" },
                { status: 400 }
            );
        }

        // Sprawdź czy to lokalny plik (zaczyna się od /pdf/)
        if (!url.startsWith("/pdf/")) {
            // To zewnętrzny link (Google Drive itp.) - nie usuwamy pliku
            return NextResponse.json({ success: true, deleted: false });
        }

        // Ścieżka do pliku
        const filePath = path.join(process.cwd(), "public", url);

        // Usuń plik
        await unlink(filePath);

        return NextResponse.json({ success: true, deleted: true });
    } catch (error: any) {
        // Jeśli plik nie istnieje - to OK
        if (error.code === "ENOENT") {
            return NextResponse.json({ success: true, deleted: false });
        }

        console.error("Delete error:", error);
        return NextResponse.json(
            { success: false, error: "Błąd podczas usuwania pliku" },
            { status: 500 }
        );
    }
}
