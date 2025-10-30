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

Struktura wyjściowa zależy od typu produktu:

DLA KRZESEŁ, SIDEBOARDÓW i podobnych (z grupami cenowymi):
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "krzesła": {
      "NAZWA_PRODUKTU": {
        "image": "/images/${manufacturer || "producent"}/nazwa.webp",
        "material": "materiał (np. BUK / DĄB)",
        "prices": {
          "Grupa I": cena,
          "Grupa II": cena,
          "Grupa III": cena,
          "Grupa IV": cena
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

DLA STOŁÓW (z różnymi wymiarami i cenami):
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "stoły": {
      "NAZWA_PRODUKTU": {
        "image": "/images/${manufacturer || "producent"}/nazwa.webp",
        "material": "materiał (np. BUK / DĄB)",
        "previousName": "poprzednia nazwa jeśli jest",
        "sizes": [
          {
            "dimension": "wymiar stołu (np. Ø110x310, 120x80)",
            "prices": "cena jako string lub liczba"
          },
          {
            "dimension": "Ø130x330",
            "prices": "6900"
          }
        ],
        "description": [
          "informacja 1 (np. łączenie kolorów - blat/noga)",
          "informacja 2 (np. wkład oddzielnie 4x50)",
          "dodatkowe opcje i uwagi"
        ]
      }
    }
  }
}

WAŻNE ZASADY:
- TYTUŁ: Wyciągnij tytuł cennika z datą w formacie "CENNIK [MIESIĄC] [ROK]" (np. "CENNIK STYCZEŃ 2025")
- Nazwy produktów WIELKIMI LITERAMI
- Kategorie małymi literami (krzesła, stoły, narożniki, sofy, fotele, pufy, poduszki, itp.)

DLA KRZESEŁ/FOTELI/SIDEBOARDÓW:
- Używaj pola "prices" jako obiekt z grupami cenowymi (Grupa I, Grupa II, itd.)
- Ceny jako liczby (bez zł, PLN itp.)
- Opcje, notatki i informacje dodatkowe w tablicy "options"

DLA STOŁÓW:
- Używaj pola "sizes" jako tablica obiektów z wymiarem i ceną
- Pole "dimension" zawiera wymiar stołu (np. "Ø110x310", "120x80x75")
- Pole "prices" w każdym rozmiarze to string lub liczba (cena dla tego rozmiaru)
- Zamiast "options" używaj pola "description" - tablica stringów z dodatkowymi informacjami
- W "description" umieszczaj: informacje o wkładach, prowadnicach, opcjach kolorów, wykończeniach

OGÓLNE:
- Jeśli nie ma grup cenowych, użyj prostego formatu: "price": wartość
- Jeśli PDF zawiera zdjęcia produktów, spróbuj dopasować nazwy obrazów
- Zwróć uwagę na podwyżki cen, promocje, nowości
- Zachowaj wszystkie informacje o kolorach, materiałach, wykończeniach
- Jeśli produkt ma poprzednią nazwę, dodaj pole "previousName"
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

        // Automatyczny zapis do folderu data
        let savedToFile = false;
        if (manufacturer) {
            try {
                const dataDir = path.join(process.cwd(), "data");

                // Kapitalizacja pierwszej litery dla nazwy pliku
                const fileName =
                    manufacturer.charAt(0).toUpperCase() +
                    manufacturer.slice(1).toLowerCase();
                const filePath = path.join(dataDir, `${fileName}.json`);

                await fs.writeFile(
                    filePath,
                    JSON.stringify(parsedData, null, 2),
                    "utf-8"
                );
                savedToFile = true;
                console.log(`✅ Zapisano cennik do: data/${fileName}.json`);
            } catch (error) {
                console.error("❌ Błąd zapisu do pliku:", error);
            }
        }

        return NextResponse.json({
            success: true,
            data: parsedData,
            rawText: pdfText.substring(0, 500), // Pierwsze 500 znaków do weryfikacji
            saved: savedToFile,
            filePath: manufacturer
                ? `data/${
                      manufacturer.charAt(0).toUpperCase() +
                      manufacturer.slice(1).toLowerCase()
                  }.json`
                : null,
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
