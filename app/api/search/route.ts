import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { producers } from "@/lib/producers";
import { normalizeToId } from "@/lib/utils";

interface SearchResult {
    name: string;
    previousName?: string;
    producerSlug: string;
    producerName: string;
    productId: string;
}

let cachedProducts: SearchResult[] | null = null;

function extractProducts(): SearchResult[] {
    if (cachedProducts) return cachedProducts;

    const results: SearchResult[] = [];

    for (const producer of producers) {
        try {
            const dataPath = path.join(
                process.cwd(),
                "data",
                producer.dataFile
            );
            if (!fs.existsSync(dataPath)) continue;

            const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

            if (data?.categories) {
                Object.entries(data.categories).forEach(([_, products]) => {
                    Object.entries(
                        products as Record<string, { previousName?: string }>
                    ).forEach(([productName, productData]) => {
                        results.push({
                            name: productName,
                            previousName: productData?.previousName,
                            producerSlug: producer.slug,
                            producerName: producer.displayName,
                            productId: `product-${normalizeToId(productName)}`,
                        });
                    });
                });
            }

            if (data?.products && Array.isArray(data.products)) {
                data.products.forEach(
                    (product: { name: string; previousName?: string }) => {
                        if (product.name) {
                            results.push({
                                name: product.name,
                                previousName: product.previousName,
                                producerSlug: producer.slug,
                                producerName: producer.displayName,
                                productId: `product-${normalizeToId(
                                    product.name
                                )}`,
                            });
                        }
                    }
                );
            }

            if (data?.Arkusz1 && Array.isArray(data.Arkusz1)) {
                data.Arkusz1.forEach(
                    (product: { MODEL: string; previousName?: string }) => {
                        if (product.MODEL) {
                            results.push({
                                name: product.MODEL,
                                previousName: product.previousName,
                                producerSlug: producer.slug,
                                producerName: producer.displayName,
                                productId: `product-${normalizeToId(
                                    product.MODEL
                                )}`,
                            });
                        }
                    }
                );
            }
        } catch {
            // Ignore errors
        }
    }

    cachedProducts = results;
    return results;
}

// Fuzzy match - sprawdza czy litery z query występują w tekście w tej samej kolejności
function fuzzyMatch(text: string, query: string): boolean {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let queryIndex = 0;

    for (
        let i = 0;
        i < lowerText.length && queryIndex < lowerQuery.length;
        i++
    ) {
        if (lowerText[i] === lowerQuery[queryIndex]) {
            queryIndex++;
        }
    }

    return queryIndex === lowerQuery.length;
}

// Oblicz score dopasowania (im niższy tym lepszy)
function matchScore(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Najlepiej: zaczyna się od frazy
    if (lowerText.startsWith(lowerQuery)) return 0;

    // Bardzo dobrze: zawiera dokładną frazę
    if (lowerText.includes(lowerQuery)) return 1;

    // Dobrze: fuzzy match
    if (fuzzyMatch(lowerText, lowerQuery)) return 2;

    return 999;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    if (!query.trim()) {
        return NextResponse.json({ results: [] });
    }

    const allProducts = extractProducts();

    // Filtruj: dokładne dopasowanie LUB fuzzy match
    const filtered = allProducts.filter(
        (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.previousName && p.previousName.toLowerCase().includes(query)) ||
            fuzzyMatch(p.name, query) ||
            (p.previousName && fuzzyMatch(p.previousName, query))
    );

    // Sortowanie według score (najlepsze dopasowania na górze)
    const results = filtered
        .sort((a, b) => {
            const aScore = Math.min(
                matchScore(a.name, query),
                a.previousName ? matchScore(a.previousName, query) : 999
            );
            const bScore = Math.min(
                matchScore(b.name, query),
                b.previousName ? matchScore(b.previousName, query) : 999
            );

            return aScore - bScore;
        })
        .slice(0, 5);

    return NextResponse.json({ results });
}
