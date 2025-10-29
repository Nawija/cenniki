import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Groq from "groq-sdk";
import fs from "fs/promises";
import path from "path";

// Wybierz AI provider - Groq jest darmowy!
const USE_GROQ = process.env.GROQ_API_KEY ? true : false;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Funkcja do ekstrakcji tekstu z PDF używając pdf2json
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    const PDFParser = (await import("pdf2json")).default;

    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", (errData: any) =>
            reject(errData.parserError)
        );

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
                let text = "";
                if (pdfData.Pages) {
                    pdfData.Pages.forEach((page: any) => {
                        if (page.Texts) {
                            page.Texts.forEach((textItem: any) => {
                                if (textItem.R) {
                                    textItem.R.forEach((r: any) => {
                                        if (r.T) {
                                            text +=
                                                decodeURIComponent(r.T) + " ";
                                        }
                                    });
                                }
                            });
                            text += "\n";
                        }
                    });
                }
                resolve(text);
            } catch (error) {
                reject(error);
            }
        });

        pdfParser.parseBuffer(buffer);
    });
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("pdf") as File;
        const manufacturer = formData.get("manufacturer") as string;
        const saveToFile = formData.get("saveToFile") === "true";

        if (!file) {
            return NextResponse.json(
                { error: "Brak pliku PDF" },
                { status: 400 }
            );
        }

        // Konwersja pliku do bufora
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ekstrakcja tekstu z PDF
        let pdfText = await extractTextFromPDF(buffer);

        // Ograniczenie rozmiaru tekstu (Groq ma limit ~32k tokenów)
        // GPT-4 ma większy limit, ale dla bezpieczeństwa też obcinamy
        const MAX_CHARS = USE_GROQ ? 15000 : 30000; // Groq ma mniejszy limit

        if (pdfText.length > MAX_CHARS) {
            console.log(
                `PDF zbyt długi (${pdfText.length} znaków), skracam do ${MAX_CHARS}`
            );
            // Bierzemy początek (nagłówki) i środek (produkty)
            const headerChars = Math.floor(MAX_CHARS * 0.2);
            const contentChars = MAX_CHARS - headerChars;
            pdfText =
                pdfText.substring(0, headerChars) +
                "\n...[część tekstu pominięta]...\n" +
                pdfText.substring(pdfText.length - contentChars);
        }

        // Przygotowanie promptu dla AI
        const systemPrompt = `Jesteś ekspertem w analizie cenników mebli. Twoim zadaniem jest wyekstrahowanie danych z cennika i zwrócenie ich w formacie JSON.

Struktura wyjściowa powinna być zgodna z tym formatem:
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "nazwa_kategorii": {
      "NAZWA_PRODUKTU": {
        "image": "/images/${manufacturer || "producent"}/nazwa.webp",
        "material": "materiał (np. BUK / DĄB)",
        "dimensions": "wymiary jeśli są podane (np. 120x80x45 cm, szer. 200 cm, wys. 90 cm)",
        "prices": {
          "Grupa I": cena,
          "Grupa II": cena
        },
        "options": [
          "opcja 1",
          "opcja 2"
        ],
        "previousName": "poprzednia nazwa jeśli jest"
      }
    }
  }
}

WAŻNE:
- TYTUŁ: Wyciągnij tytuł cennika z datą w formacie "CENNIK [MIESIĄC] [ROK]" (np. "CENNIK STYCZEŃ 2025")
- Ceny zwracaj jako liczby (bez zł, PLN itp.)
- Nazwy produktów WIELKIMI LITERAMI
- Kategorie małymi literami (krzesła, stoły, narożniki, sofy, fotele, pufy, poduszki, itp.)
- Jeśli nie ma grup cenowych, użyj prostego formatu: "price": wartość
- WYMIARY: Jeśli są podane, dodaj pole "dimensions" z wymiarem w formacie tekstowym (np. "200x90x45 cm", "szer. 120 cm, głęb. 60 cm")
- Jeśli wymiary NIE są podane, NIE dodawaj pola "dimensions" (pomiń je całkowicie)
- Zachowaj wszystkie opcje, notatki i informacje dodatkowe w tablicy options
- Jeśli PDF zawiera zdjęcia produktów, spróbuj dopasować nazwy obrazów
- Zwróć uwagę na podwyżki cen, promocje, nowości
- Zachowaj wszystkie informacje o kolorach, materiałach, wykończeniach
ODPOWIEDŹ MUSI BYĆ POPRAWNYM JSON!`;

        const userPrompt = `Przeanalizuj poniższy cennik${
            manufacturer ? ` od producenta ${manufacturer}` : ""
        } i wyekstrahuj dane:\n\n${pdfText}`;

        // Użycie AI do strukturyzacji danych (Groq lub OpenAI)
        let completion;

        if (USE_GROQ) {
            // Groq - DARMOWY i SZYBKI!
            completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.1,
                response_format: { type: "json_object" },
            });
        } else {
            // OpenAI - płatny
            completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });
        }

        const result = completion.choices[0].message.content;
        const parsedData = JSON.parse(result || "{}");

        // Opcjonalnie: Zapis do pliku
        if (saveToFile && manufacturer) {
            const dataDir = path.join(process.cwd(), "data");
            const filePath = path.join(dataDir, `${manufacturer}.json`);

            await fs.writeFile(
                filePath,
                JSON.stringify(parsedData, null, 2),
                "utf-8"
            );
        }

        return NextResponse.json({
            success: true,
            data: parsedData,
            rawText: pdfText.substring(0, 500), // Pierwsze 500 znaków do weryfikacji
            saved: saveToFile && manufacturer,
        });
    } catch (error: any) {
        console.error("Błąd przetwarzania PDF:", error);
        return NextResponse.json(
            {
                error: "Błąd przetwarzania PDF",
                details: error.message,
            },
            { status: 500 }
        );
    }
}
