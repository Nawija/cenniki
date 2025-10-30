import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - pobranie wszystkich nadpisań dla producenta
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const manufacturer = searchParams.get("manufacturer");
        const category = searchParams.get("category");

        if (!manufacturer) {
            return NextResponse.json(
                { error: "Manufacturer parameter is required" },
                { status: 400 }
            );
        }

        const where: { manufacturer: string; category?: string } = {
            manufacturer: manufacturer.toLowerCase(),
        };
        if (category) {
            where.category = category;
        }

        const overrides = await prisma.productOverride.findMany({
            where,
            orderBy: [{ category: "asc" }, { productName: "asc" }],
        });

        return NextResponse.json({ overrides });
    } catch (error) {
        console.error("Error fetching overrides:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch overrides",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// POST - utworzenie lub aktualizacja nadpisania
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            manufacturer,
            category,
            productName,
            customName,
            priceFactor,
            discount,
        } = body as {
            manufacturer: string;
            category: string;
            productName: string;
            customName?: string | null;
            priceFactor?: number;
            discount?: number | null;
        };

        if (!manufacturer || !category || !productName) {
            return NextResponse.json(
                {
                    error: "manufacturer, category, and productName are required",
                },
                { status: 400 }
            );
        }

        // Sprawdź czy nadpisanie już istnieje
        const existing = await prisma.productOverride.findUnique({
            where: {
                manufacturer_category_productName: {
                    manufacturer: manufacturer.toLowerCase(),
                    category,
                    productName,
                },
            },
        });

        let override;

        if (existing) {
            // Aktualizuj istniejące
            override = await prisma.productOverride.update({
                where: {
                    manufacturer_category_productName: {
                        manufacturer: manufacturer.toLowerCase(),
                        category,
                        productName,
                    },
                },
                data: {
                    customName: customName || null,
                    priceFactor: priceFactor ?? 1.0,
                    discount: discount !== undefined ? discount : null,
                },
            });
        } else {
            // Utwórz nowe
            override = await prisma.productOverride.create({
                data: {
                    manufacturer: manufacturer.toLowerCase(),
                    category,
                    productName,
                    customName: customName || null,
                    priceFactor: priceFactor ?? 1.0,
                    discount: discount !== undefined ? discount : null,
                },
            });
        }

        return NextResponse.json({ override });
    } catch (error) {
        console.error("Error saving override:", error);
        return NextResponse.json(
            {
                error: "Failed to save override",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// DELETE - usunięcie nadpisania
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "ID parameter is required" },
                { status: 400 }
            );
        }

        await prisma.productOverride.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting override:", error);
        return NextResponse.json(
            {
                error: "Failed to delete override",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
