import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

interface ParsedData {
    [key: string]: any;
}

/* --------------------------- FILE PARSING --------------------------- */

async function extractTextFromFile(
    buffer: Buffer,
    filename: string
): Promise<string | null> {
    const ext = filename.split(".").pop()?.toLowerCase();
    console.log(`Detected file extension: ${ext}`);

    switch (ext) {
        case "pdf":
            return null;

        case "xlsx":
        case "xls":
            return parseExcel(buffer);

        case "csv":
            return buffer.toString("utf-8");

        default:
            return null;
    }
}

function parseExcel(buffer: Buffer): string {
    try {
        const workbook = XLSX.read(buffer, { type: "buffer" });
        return workbook.SheetNames.map((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            return `\n=== SHEET: ${sheetName} ===\n${JSON.stringify(
                json,
                null,
                2
            )}`;
        }).join("\n");
    } catch (err) {
        console.error("Excel parse error:", err);
        throw new Error("Nie udało się przeanalizować pliku Excel");
    }
}

/* --------------------------- JSON UTILITIES --------------------------- */

function safeExtractJson(text: string): any {
    let cleaned = text.trim();

    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```json?\s*/, "").replace(/```$/, "");
    }

    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("Brak JSON w odpowiedzi modelu");
    }

    const jsonText = cleaned.slice(jsonStart, jsonEnd + 1);

    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Invalid JSON block:", jsonText);
        throw new Error("Niepoprawny JSON zwrócony przez model");
    }
}

/* --------------------------- DIFF ENGINE --------------------------- */

function computeDiff(oldObj: ParsedData, newObj: ParsedData, prefix = "") {
    const changes: any[] = [];

    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of keys) {
        const path = prefix ? `${prefix}.${key}` : key;
        const oldVal = oldObj[key];
        const newVal = newObj[key];

        if (!(key in oldObj)) {
            changes.push({ type: "added", path, newValue: newVal });
        } else if (!(key in newObj)) {
            changes.push({ type: "deleted", path, oldValue: oldVal });
        } else if (isObject(oldVal) && isObject(newVal)) {
            changes.push(...computeDiff(oldVal, newVal, path));
        } else if (oldVal !== newVal) {
            changes.push({
                type: "modified",
                path,
                oldValue: oldVal,
                newValue: newVal,
            });
        }
    }

    return changes;
}

const isObject = (value: any) =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/* --------------------------- MAIN ROUTE --------------------------- */

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const manufacturer = formData.get("manufacturer") as string;
        const currentDataStr = formData.get("currentData") as string;

        if (!file || !manufacturer || !currentDataStr) {
            return NextResponse.json(
                { error: "Brakuje wymaganych parametrów" },
                { status: 400 }
            );
        }

        const filename = file.name;
        const buffer = Buffer.from(await file.arrayBuffer());

        const fileContent = await extractTextFromFile(buffer, filename);

        if (!fileContent) {
            return NextResponse.json(
                {
                    error: "Nie można analizować tego typu pliku",
                    info: "Obsługiwane: Excel, CSV (PDF niewspierany)",
                },
                { status: 400 }
            );
        }

        /* ------------------ AI MERGE ------------------ */
        const groqResp = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            max_tokens: 8000,
            messages: [
                {
                    role: "system",
                    content:
                        "Return ONLY valid JSON. No explanation. No markdown.",
                },
                {
                    role: "user",
                    content: `Scal dane. Zachowaj strukturę z CURRENT DATA, uzupełnij wartościami z NEW DATA.
CURRENT:
${currentDataStr.slice(0, 2000)}

NEW:
${fileContent.slice(0, 2000)}`,
                },
            ],
        });

        const aiText = groqResp.choices[0].message.content ?? "";
        const mergedData = safeExtractJson(aiText);
        const currentData = JSON.parse(currentDataStr);

        /* ------------------ DIFF ------------------ */
        const changes = computeDiff(currentData, mergedData);

        return NextResponse.json({
            parsed: mergedData,
            changes,
            info: changes.length === 0 ? "Brak zmian" : undefined,
        });
    } catch (err: any) {
        console.error("Error in /api/compare-file:", err);
        return NextResponse.json(
            {
                error:
                    err.message ?? "Serwer nieoczekiwanie przerwał działanie",
            },
            { status: 500 }
        );
    }
}
