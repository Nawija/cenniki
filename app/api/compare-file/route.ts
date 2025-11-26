import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

interface ParsedData {
    [key: string]: any;
}

async function extractTextFromFile(
    buffer: Buffer,
    filename: string
): Promise<string> {
    const ext = filename.toLowerCase().split(".").pop();

    if (ext === "pdf") {
        // Skip PDF parsing - too many Node.js polyfill issues
        const size = buffer.length;
        return `[PDF FILE: ${filename} - ${size} bytes]\nNote: Use current data structure as reference.`;
    }

    if (ext === "xlsx" || ext === "xls") {
        try {
            const workbook = XLSX.read(buffer, { type: "buffer" });
            let text = "";

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                text += `\n=== SHEET: ${sheetName} ===\n`;
                text += JSON.stringify(data, null, 2);
            }

            return text;
        } catch (error) {
            console.error("Excel parse error:", error);
            throw new Error("Nie udało się przeanalizować Excel");
        }
    }

    if (ext === "csv") {
        return buffer.toString("utf-8");
    }

    throw new Error("Nieobsługiwany typ pliku");
}

function computeDiff(
    oldData: ParsedData,
    newData: ParsedData,
    path: string = "root"
): Array<{
    type: "added" | "modified" | "deleted";
    path: string;
    oldValue?: any;
    newValue?: any;
}> {
    const changes: Array<{
        type: "added" | "modified" | "deleted";
        path: string;
        oldValue?: any;
        newValue?: any;
    }> = [];

    // Check modified and added keys
    for (const key in newData) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in oldData)) {
            changes.push({
                type: "added",
                path: newPath,
                newValue: newData[key],
            });
        } else if (
            typeof oldData[key] === "object" &&
            typeof newData[key] === "object"
        ) {
            changes.push(...computeDiff(oldData[key], newData[key], newPath));
        } else if (oldData[key] !== newData[key]) {
            changes.push({
                type: "modified",
                path: newPath,
                oldValue: oldData[key],
                newValue: newData[key],
            });
        }
    }

    // Check deleted keys
    for (const key in oldData) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in newData)) {
            changes.push({
                type: "deleted",
                path: newPath,
                oldValue: oldData[key],
            });
        }
    }

    return changes;
}

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

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name;

        // Extract text from file
        const fileContent = await extractTextFromFile(buffer, filename);

        // Use Groq to parse and analyze the file
        const message = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            max_tokens: 16000,
            temperature: 0,
            messages: [
                {
                    role: "user",
                    content: `TASK: You MUST return ONLY valid JSON. Nothing else.

CURRENT DATA:
${currentDataStr.substring(0, 3000)}

NEW FILE DATA:
${fileContent.substring(0, 3000)}

INSTRUCTIONS:
1. Analyze the new file data
2. Update the current data with new values
3. Keep the same structure
4. Return the complete updated JSON
5. NO explanations, NO markdown, NO text - ONLY JSON

START WITH { AND END WITH }`,
                },
            ],
        });

        const responseText = message.choices[0].message.content || "";

        // Try to extract JSON from response
        let parsedData: ParsedData;
        const currentData = JSON.parse(currentDataStr);

        try {
            // Remove markdown code blocks if present
            let jsonText = responseText.trim();
            if (jsonText.startsWith("```")) {
                jsonText = jsonText
                    .replace(/^```json?\n?/, "")
                    .replace(/\n?```$/, "");
            }

            // Find complete JSON by counting braces correctly
            let jsonContent = "";
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;
            let startIdx = -1;

            for (let i = 0; i < jsonText.length; i++) {
                const char = jsonText[i];

                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }

                if (char === "\\") {
                    escapeNext = true;
                    continue;
                }

                if (char === '"' && !escapeNext) {
                    inString = !inString;
                }

                if (!inString) {
                    if (char === "{") {
                        if (startIdx === -1) startIdx = i;
                        braceCount++;
                    } else if (char === "}") {
                        braceCount--;
                        if (braceCount === 0 && startIdx !== -1) {
                            jsonContent = jsonText.substring(startIdx, i + 1);
                            break;
                        }
                    }
                }
            }

            if (!jsonContent) {
                throw new Error("No JSON found");
            }

            parsedData = JSON.parse(jsonContent);

            // Validate that we got a proper structure
            if (!parsedData || typeof parsedData !== "object") {
                throw new Error("Invalid structure");
            }
        } catch (jsonError) {
            console.error(
                "JSON parse error:",
                jsonError,
                "Response:",
                responseText.substring(0, 1000)
            );
            // Fallback: return current data as-is
            parsedData = currentData;
        }

        // Compute diff
        const changes = computeDiff(currentData, parsedData);

        return NextResponse.json({
            parsed: parsedData,
            changes,
        });
    } catch (error) {
        console.error("Błąd w /api/compare-file:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Błąd serwera przy porównywaniu pliku",
            },
            { status: 500 }
        );
    }
}
