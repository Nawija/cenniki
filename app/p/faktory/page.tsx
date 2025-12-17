import fs from "fs";
import path from "path";
import { getAllProducers } from "@/lib/producers";
import type { ProducerConfig, UniversalProduct } from "@/lib/types";
import { FaktoryTable } from "./FaktoryTable";

// Statyczna strona - odświeża się przy nowym buildzie
export const dynamic = "force-static";

interface ProducerFactorData {
    producer: ProducerConfig;
    mainFactor: number;
    categoryFactors: Record<string, number>;
    productsWithHigherFactor: {
        name: string;
        category?: string;
        priceFactor: number;
    }[];
}

function loadProducerData(dataFile: string): any {
    const filePath = path.join(process.cwd(), "data", dataFile);
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
    return null;
}

function extractFactorData(
    producer: ProducerConfig,
    data: any
): ProducerFactorData {
    const mainFactor = producer.priceFactor ?? 1;
    const categoryFactors: Record<string, number> = {};
    const productsWithHigherFactor: ProducerFactorData["productsWithHigherFactor"] =
        [];

    // Extract category price factors if they exist
    if (data?.categoryPriceFactors) {
        Object.entries(data.categoryPriceFactors).forEach(
            ([category, factor]) => {
                if (typeof factor === "number" && factor !== mainFactor) {
                    categoryFactors[category] = factor;
                }
            }
        );
    }

    // Check for category-based data (like Bomar)
    if (data?.categories) {
        Object.entries(data.categories).forEach(
            ([categoryName, categoryProducts]) => {
                if (
                    typeof categoryProducts === "object" &&
                    categoryProducts !== null
                ) {
                    Object.entries(
                        categoryProducts as Record<string, UniversalProduct>
                    ).forEach(([productName, product]) => {
                        if (
                            product.priceFactor &&
                            typeof product.priceFactor === "number" &&
                            product.priceFactor > mainFactor
                        ) {
                            productsWithHigherFactor.push({
                                name: product.name || productName,
                                category: categoryName,
                                priceFactor: product.priceFactor,
                            });
                        }
                    });
                }
            }
        );
    }

    // Check for list-based data (like mp-nidzica, benix, etc.)
    if (data?.products && Array.isArray(data.products)) {
        data.products.forEach((product: UniversalProduct) => {
            if (
                product.priceFactor &&
                typeof product.priceFactor === "number" &&
                product.priceFactor > mainFactor
            ) {
                productsWithHigherFactor.push({
                    name: product.name || product.MODEL || "Nieznany produkt",
                    category: product.category,
                    priceFactor: product.priceFactor,
                });
            }
        });
    }

    // Check for table-based data (Arkusz1)
    if (data?.Arkusz1 && Array.isArray(data.Arkusz1)) {
        data.Arkusz1.forEach((product: UniversalProduct) => {
            if (
                product.priceFactor &&
                typeof product.priceFactor === "number" &&
                product.priceFactor > mainFactor
            ) {
                productsWithHigherFactor.push({
                    name: product.name || product.MODEL || "Nieznany produkt",
                    category: product.category,
                    priceFactor: product.priceFactor,
                });
            }
        });
    }

    // Sort products by factor descending
    productsWithHigherFactor.sort((a, b) => b.priceFactor - a.priceFactor);

    return {
        producer,
        mainFactor,
        categoryFactors,
        productsWithHigherFactor,
    };
}

export default async function FaktoryPage() {
    const producers = getAllProducers();

    // Load all producer data and extract factors
    const allFactorData = producers
        .map((producer) => {
            const data = loadProducerData(producer.dataFile);
            return extractFactorData(producer, data);
        })
        .sort((a, b) =>
            a.producer.displayName.localeCompare(b.producer.displayName, "pl")
        );

    // Serialize for client component
    const serializedData = allFactorData.map((data) => ({
        slug: data.producer.slug,
        displayName: data.producer.displayName,
        color: data.producer.color,
        mainFactor: data.mainFactor,
        categoryFactors: data.categoryFactors,
        productsWithHigherFactor: data.productsWithHigherFactor,
    }));

    return <FaktoryTable data={serializedData} />;
}
