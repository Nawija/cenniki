import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import fs from "fs/promises";
import path from "path";
import { producenciConfig } from "@/producenci";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Typy dla pdf2json
type PDFTextR = {
    T: string;
};

type PDFTextItem = {
    R?: PDFTextR[];
};

type PDFPage = {
    Texts?: PDFTextItem[];
};

type PDFData = {
    Pages?: PDFPage[];
};

type PDFErrorData = {
    parserError?: Error;
};

// Funkcja do ekstrakcji tekstu z PDF używając pdf2json
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    const PDFParser = (await import("pdf2json")).default;

    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", (errData: PDFErrorData) =>
            reject(errData.parserError)
        );

        pdfParser.on("pdfParser_dataReady", (pdfData: PDFData) => {
            try {
                let text = "";
                if (pdfData.Pages) {
                    pdfData.Pages.forEach((page) => {
                        if (page.Texts) {
                            page.Texts.forEach((textItem) => {
                                if (textItem.R) {
                                    textItem.R.forEach((r) => {
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
        const MAX_CHARS = 15000;

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
        // Sprawdź czy producent ma custom prompt
        // Normalizuj nazwę - spacje na myślniki, lowercase
        const manufacturerNormalized = manufacturer
            ?.toLowerCase()
            .trim()
            .replace(/\s+/g, "-");

        console.log("🔍 DEBUG: manufacturer =", manufacturer);
        console.log(
            "🔍 DEBUG: manufacturerNormalized =",
            manufacturerNormalized
        );

        const producentConfig = producenciConfig.find(
            (p) => p.name === manufacturerNormalized
        );

        console.log(
            "🔍 DEBUG: producentConfig =",
            producentConfig?.displayName || "NIE ZNALEZIONO"
        );
        console.log(
            "🔍 DEBUG: displayType =",
            producentConfig?.displayType || "brak"
        );
        console.log(
            "🔍 DEBUG: ma custom prompt =",
            !!producentConfig?.aiPrompt
        );

        // Wczytaj istniejący JSON producenta do kontekstu porównania (skrót do promptu)
        let existingDataForPrompt: any = null;
        let existingDataSnippet = "";
        try {
            if (manufacturerNormalized) {
                const dataDir = path.join(process.cwd(), "data");
                const fileName =
                    manufacturer.charAt(0).toUpperCase() +
                    manufacturer.slice(1).toLowerCase();
                const filePath = path.join(dataDir, `${fileName}.json`);
                const existingContent = await fs.readFile(filePath, "utf-8");
                existingDataForPrompt = JSON.parse(existingContent);
                const asString = JSON.stringify(existingDataForPrompt);
                existingDataSnippet =
                    asString.length > 12000
                        ? asString.slice(0, 6000) +
                          "\n...[TRIM]...\n" +
                          asString.slice(-6000)
                        : asString;
            }
        } catch {
            // brak istniejącego pliku jest ok
        }

        const defaultSystemPrompt = `Jesteś ekspertem w analizie cenników mebli. Twoim zadaniem jest wyekstrahowanie danych z cennika i zwrócenie ich w formacie JSON.

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

    // Ustaw tryb DIFF: AI ma zwrócić tylko zmiany względem istniejącego JSON
    const diffModePrompt = `\n\nTRYB DIFF (WAŻNE):\n- Porównaj PDF z przekazanym EXISTING_JSON tego producenta.\n- ZWRÓĆ TYLKO ZMIENIONE FRAGMENTY w formacie:\n{\n  \"title\"?: \"nowy tytuł jeśli zmieniony\",\n  \"categories\": {\n    \"kategoria\": { \"PRODUKT\": { tylko pola cenowe: prices | sizes | elements } }\n  }\n}\n- Jeśli brak zmian, zwróć: { \"categories\": {} }.\n- NIE dodawaj image/material/options/description (chyba że są kluczowe dla producenta).\n- Dla MP Nidzica ZAWSZE używaj pola elements -> grupy -> litery A/B/C/D.\n- Dla nowych produktów zwróć minimalny, producent-specyficzny zestaw danych (np. elements dla MP Nidzica, prices/sizes dla Bomar).`;

    const systemPrompt = `${producentConfig?.aiPrompt || defaultSystemPrompt}${diffModePrompt}`;

        if (producentConfig?.aiPrompt) {
            console.log(
                "✅ Używam CUSTOM promptu dla:",
                producentConfig.displayName
            );
        } else {
            console.log(
                "⚠️ Używam DOMYŚLNEGO promptu (brak custom dla:",
                manufacturer,
                ")"
            );
        }

        const userPrompt = `MATERIAŁ WEJŚCIOWY\n[PDF_TEXT]\n${pdfText}\n\n[EXISTING_JSON]\n${existingDataSnippet || "<brak>"}\n\nZADANIE: Zastosuj TRYB DIFF i zwróć tylko zmiany względem EXISTING_JSON.`;

        // Użycie Groq AI (darmowe, 6000 req/dzień)
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const result = completion.choices[0].message.content;
        const newData = JSON.parse(result || "{}");

        // Inicjalizacja logu zmian
        const changeLog = {
            newCategories: [] as string[],
            newProducts: [] as Array<{
                category: string;
                name: string;
                oldData: null;
                newData: Record<string, unknown>;
            }>,
            updatedPrices: [] as Array<{
                category: string;
                name: string;
                changes: string;
                oldData: Record<string, unknown>;
                newData: Record<string, unknown>;
            }>,
        };

        // Automatyczny zapis do folderu data z merge (nakładanie DIFF na istniejące dane)
        let mergedData: any = newData;
        if (manufacturer) {
            try {
                const dataDir = path.join(process.cwd(), "data");

                // Kapitalizacja pierwszej litery dla nazwy pliku
                const fileName =
                    manufacturer.charAt(0).toUpperCase() +
                    manufacturer.slice(1).toLowerCase();
                const filePath = path.join(dataDir, `${fileName}.json`);

                // Sprawdź czy plik już istnieje
                let existingData = null;
                try {
                    const existingContent = await fs.readFile(
                        filePath,
                        "utf-8"
                    );
                    existingData = JSON.parse(existingContent);
                    console.log(
                        `📄 Znaleziono istniejący plik: data/${fileName}.json`
                    );
                } catch {
                    console.log(
                        `🆕 Tworzenie nowego pliku: data/${fileName}.json`
                    );
                }

                // Merge danych

                if ((existingData && existingData.categories) || newData.categories) {
                    mergedData = {
                        title: newData.title || existingData?.title,
                        categories: { ...(existingData?.categories || {}) },
                    };

                    // Iteruj po kategoriach z nowego cennika
                    Object.entries(newData.categories || {}).forEach(
                        ([categoryName, newProducts]) => {
                            if (!mergedData.categories[categoryName]) {
                                // Nowa kategoria - dodaj całą
                                mergedData.categories[categoryName] =
                                    newProducts as Record<string, unknown>;
                                changeLog.newCategories.push(categoryName);
                                console.log(
                                    `+ Dodano nową kategorię: ${categoryName}`
                                );
                            } else {
                                // Kategoria istnieje - merge produktów
                                const productsObj = newProducts as Record<
                                    string,
                                    Record<string, unknown>
                                >;
                                Object.entries(productsObj).forEach(
                                    ([productName, newProductData]) => {
                                        const existingProduct =
                                            mergedData.categories[categoryName][
                                                productName
                                            ];

                                        if (!existingProduct) {
                                            // Nowy produkt - dodaj całość
                                            mergedData.categories[categoryName][
                                                productName
                                            ] = newProductData;
                                            changeLog.newProducts.push({
                                                category: categoryName,
                                                name: productName,
                                                oldData: null,
                                                newData:
                                                    newProductData as Record<
                                                        string,
                                                        unknown
                                                    >,
                                            });
                                            console.log(
                                                `➕ Dodano nowy produkt: ${categoryName}/${productName}`
                                            );
                                        } else {
                                            // Produkt istnieje - aktualizuj TYLKO to, co przyszło w DIFF
                                            const existingProductObj =
                                                existingProduct as Record<string, unknown>;

                                            const updated: Record<string, any> = {
                                                ...existingProductObj, // zachowaj resztę
                                            };
                                            if ((newProductData as any).prices !== undefined) {
                                                updated.prices = (newProductData as any).prices;
                                            }
                                            if ((newProductData as any).sizes !== undefined) {
                                                updated.sizes = (newProductData as any).sizes;
                                            }
                                            if ((newProductData as any).elements !== undefined) {
                                                updated.elements = (newProductData as any).elements;
                                            }
                                            if ((newProductData as any).material !== undefined) {
                                                updated.material = (newProductData as any).material;
                                            }
                                            if ((newProductData as any).previousName !== undefined) {
                                                updated.previousName = (newProductData as any).previousName;
                                            }

                                            mergedData.categories[categoryName][productName] = updated;

                                            // Sprawdź zmiany cen
                                            const priceChanges: string[] = [];
                                            if (
                                                (newProductData as any).prices &&
                                                JSON.stringify((newProductData as any).prices) !==
                                                    JSON.stringify((existingProductObj as any).prices)
                                            ) {
                                                priceChanges.push(
                                                    "Ceny produktu"
                                                );
                                                console.log(
                                                    `💰 Zaktualizowano ceny: ${categoryName}/${productName}`
                                                );
                                            }
                                            if (
                                                (newProductData as any).sizes &&
                                                JSON.stringify((newProductData as any).sizes) !==
                                                    JSON.stringify((existingProductObj as any).sizes)
                                            ) {
                                                priceChanges.push(
                                                    "Rozmiary i ceny"
                                                );
                                                console.log(
                                                    `💰 Zaktualizowano rozmiary i ceny: ${categoryName}/${productName}`
                                                );
                                            }
                                            if (
                                                (newProductData as any).elements &&
                                                JSON.stringify((newProductData as any).elements) !==
                                                    JSON.stringify((existingProductObj as any).elements)
                                            ) {
                                                priceChanges.push("Elementy i ceny (MP Nidzica)");
                                                console.log(
                                                    `💰 Zaktualizowano elementy/ceny: ${categoryName}/${productName}`
                                                );
                                            }

                                            if (priceChanges.length > 0) {
                                                changeLog.updatedPrices.push({
                                                    category: categoryName,
                                                    name: productName,
                                                    changes:
                                                        priceChanges.join(", "),
                                                    oldData:
                                                        existingProductObj as Record<
                                                            string,
                                                            unknown
                                                        >,
                                                    newData:
                                                        (newProductData as any) as Record<
                                                            string,
                                                            unknown
                                                        >,
                                                });
                                            }
                                        }
                                    }
                                );
                            }
                        }
                    );
                }

                // NIE zapisujemy automatycznie - czekamy na akceptację użytkownika
                console.log(
                    `⏸️  Przygotowano zmiany dla: data/${fileName}.json (oczekuje na akceptację)`
                );
            } catch (error) {
                console.error("❌ Błąd przygotowania zmian:", error);
            }
        }

        return NextResponse.json({
            success: true,
            data: mergedData,
            rawText: pdfText.substring(0, 500),
            saved: false, // Zawsze false - czekamy na akceptację
            filePath: manufacturer
                ? `data/${
                      manufacturer.charAt(0).toUpperCase() +
                      manufacturer.slice(1).toLowerCase()
                  }.json`
                : null,
            changeLog,
            pendingApproval: true, // Nowa flaga
        });
    } catch (error) {
        console.error("Błąd przetwarzania PDF:", error);
        return NextResponse.json(
            {
                error: "Błąd przetwarzania PDF",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
