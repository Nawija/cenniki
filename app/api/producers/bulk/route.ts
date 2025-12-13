import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";

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

        // Rewaliduj strony producentów, żeby zmiany (np. priceFactor) były widoczne
        for (const producer of updatedProducers) {
            revalidatePath(`/p/${producer.slug}`);
        }
        revalidatePath("/"); // Strona główna też może pokazywać dane

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating producers:", error);
        return NextResponse.json(
            { error: "Failed to update producers" },
            { status: 500 }
        );
    }
}
