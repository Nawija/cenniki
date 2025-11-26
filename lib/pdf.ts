import pdfParse from "pdf-parse";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export interface PdfExtractionResult {
    rawText: string;
    tables?: any[];
    ocrUsed: boolean;
}

export async function extractPdfData(
    buffer: Buffer
): Promise<PdfExtractionResult> {
    /* ----------- 1) PRÓBA WYCIĄGNIĘCIA TEKSTU NATYWNIE ----------- */
    let text = "";
    let ocrUsed = false;

    try {
        const pdf = await pdfParse(buffer);
        text = pdf.text.trim();
    } catch (e) {
        console.warn("Native PDF parse failed, switching to OCR.");
    }

    const isScanned = !text || text.length < 30;

    /* ----------- 2) OCR (GROQ VISION) JEŚLI PDF JEST SKANEM ----------- */

    if (isScanned) {
        ocrUsed = true;

        const base64 = buffer.toString("base64");

        const vision = await groq.chat.completions.create({
            model: "llama-3.2-vision-preview",
            max_tokens: 4000,
            temperature: 0,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "input_image",
                            image_url: `data:application/pdf;base64,${base64}`,
                        },
                        {
                            type: "text",
                            text: "Extract ALL text from this scanned document. Return plain text only.",
                        },
                    ],
                },
            ],
        });

        text = vision.choices[0].message.content || "";
    }

    /* ----------- 3) DETEKCJA TABEL W TEKŚCIE ----------- */

    const tables = detectTablesFromText(text);

    return {
        rawText: text,
        tables: tables.length > 0 ? tables : undefined,
        ocrUsed,
    };
}

/* ------------------------ SIMPLE TABLE DETECTOR ------------------------ */

function detectTablesFromText(text: string) {
    const lines = text.split("\n").map((l) => l.trim());

    const candidates = lines.filter(
        (line) =>
            line.includes(";") || line.includes(",") || /\s{3,}/.test(line)
    );

    if (candidates.length < 2) return [];

    const table = candidates.map((row) => {
        if (row.includes(";")) return row.split(";").map((c) => c.trim());
        if (row.includes(",")) return row.split(",").map((c) => c.trim());
        return row.split(/\s{3,}/).map((c) => c.trim());
    });

    return [table];
}
