import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { sendProducerUpdateNotification } from "@/lib/mail";

const PRODUCERS_FILE = path.join(process.cwd(), "data", "producers.json");

// PUT - Bulk update all producers
export async function PUT(request: NextRequest) {
    try {
        const producers = await request.json();

        if (!Array.isArray(producers)) {
            return NextResponse.json(
                { error: "Expected array of producers" },
                { status: 400 }
            );
        }

        // Wczytaj stare dane producentów do porównania faktorów
        let oldProducers: any[] = [];
        try {
            if (fsSync.existsSync(PRODUCERS_FILE)) {
                const oldData = fsSync.readFileSync(PRODUCERS_FILE, "utf-8");
                oldProducers = JSON.parse(oldData);
            }
        } catch {
            // Ignore read errors
        }

        // Sprawdź czy promocje powinny być wyłączone (data minęła)
        const today = new Date().toISOString().split("T")[0];
        const updatedProducers = producers.map((p: any) => {
            if (
                p.promotion?.enabled &&
                p.promotion.to &&
                p.promotion.to < today
            ) {
                return {
                    ...p,
                    promotion: { ...p.promotion, enabled: false },
                };
            }
            return p;
        });

        await fs.writeFile(
            PRODUCERS_FILE,
            JSON.stringify(updatedProducers, null, 2),
            "utf-8"
        );

        // Sprawdź zmiany faktorów i wyślij powiadomienia
        for (const newProducer of updatedProducers) {
            const oldProducer = oldProducers.find(
                (p: any) => p.slug === newProducer.slug
            );

            if (
                oldProducer &&
                oldProducer.priceFactor !== undefined &&
                newProducer.priceFactor !== undefined &&
                oldProducer.priceFactor !== newProducer.priceFactor
            ) {
                const oldFactor = oldProducer.priceFactor;
                const newFactor = newProducer.priceFactor;
                const percentChange =
                    oldFactor > 0
                        ? Math.round(
                              ((newFactor - oldFactor) / oldFactor) * 100 * 10
                          ) / 10
                        : 0;

                sendProducerUpdateNotification(
                    newProducer.displayName || newProducer.slug,
                    {
                        factorChange: {
                            oldFactor,
                            newFactor,
                            percentChange,
                        },
                        priceIncreased: [],
                        priceDecreased: [],
                        addedModels: [],
                        removedModels: [],
                    }
                ).catch(() => {});
            }
        }

        // Rewaliduj strony producentów, żeby zmiany (np. priceFactor) były widoczne
        for (const producer of updatedProducers) {
            revalidatePath(`/p/${producer.slug}`);
        }
        revalidatePath("/"); // Strona główna też może pokazywać dane

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to update producers" },
            { status: 500 }
        );
    }
}
