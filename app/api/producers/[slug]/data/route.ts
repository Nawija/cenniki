// app/api/producers/[slug]/data/route.ts
// API do zarządzania danymi producenta (produkty, kategorie, ceny)

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { sendChangesNotification } from "@/lib/mail";

const PRODUCERS_FILE = path.join(process.cwd(), "data", "producers.json");
const DATA_DIR = path.join(process.cwd(), "data");

function getProducers() {
    const data = fs.readFileSync(PRODUCERS_FILE, "utf-8");
    return JSON.parse(data);
}

function getProducerBySlug(slug: string) {
    const producers = getProducers();
    return producers.find((p: any) => p.slug === slug);
}

// GET - pobierz dane producenta
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const producer = getProducerBySlug(slug);

        if (!producer) {
            return NextResponse.json(
                { error: "Producent nie został znaleziony" },
                { status: 404 }
            );
        }

        const dataPath = path.join(DATA_DIR, producer.dataFile);

        if (!fs.existsSync(dataPath)) {
            return NextResponse.json(
                { error: "Plik danych nie istnieje" },
                { status: 404 }
            );
        }

        const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

        return NextResponse.json({
            producer,
            data,
        });
    } catch (error) {
        console.error("Error getting producer data:", error);
        return NextResponse.json(
            { error: "Nie udało się pobrać danych producenta" },
            { status: 500 }
        );
    }
}

// PUT - aktualizuj dane producenta (cały plik JSON)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const producer = getProducerBySlug(slug);

        if (!producer) {
            return NextResponse.json(
                { error: "Producent nie został znaleziony" },
                { status: 404 }
            );
        }

        const body = await request.json();
        const dataPath = path.join(DATA_DIR, producer.dataFile);

        // Wczytaj stare dane do porównania
        let oldData = {};
        if (fs.existsSync(dataPath)) {
            oldData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
        }

        // Zapisz dane do pliku JSON
        fs.writeFileSync(dataPath, JSON.stringify(body, null, 2));

        // Wyślij powiadomienie email o zmianach (async, nie blokuje odpowiedzi)
        sendChangesNotification(
            producer.name || producer.slug,
            producer.slug,
            oldData,
            body
        ).catch((err) => console.error("Failed to send notification:", err));

        return NextResponse.json({
            success: true,
            message: "Dane zostały zapisane",
        });
    } catch (error) {
        console.error("Error saving producer data:", error);
        return NextResponse.json(
            { error: "Nie udało się zapisać danych producenta" },
            { status: 500 }
        );
    }
}

// PATCH - aktualizuj część danych (np. jeden produkt)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const producer = getProducerBySlug(slug);

        if (!producer) {
            return NextResponse.json(
                { error: "Producent nie został znaleziony" },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { action, ...payload } = body;

        const dataPath = path.join(DATA_DIR, producer.dataFile);
        const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

        switch (producer.layoutType) {
            case "bomar":
                handleBomarAction(data, action, payload);
                break;
            case "mpnidzica":
                handleMpNidzicaAction(data, action, payload);
                break;
            case "puszman":
                handlePuszmanAction(data, action, payload);
                break;
        }

        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Error patching producer data:", error);
        return NextResponse.json(
            { error: "Nie udało się zaktualizować danych" },
            { status: 500 }
        );
    }
}

// ============================================
// BOMAR HANDLERS
// ============================================

function handleBomarAction(data: any, action: string, payload: any) {
    if (!data.categories) data.categories = {};

    switch (action) {
        case "addCategory": {
            const { categoryName } = payload;
            if (!data.categories[categoryName]) {
                data.categories[categoryName] = {};
            }
            break;
        }
        case "deleteCategory": {
            const { categoryName } = payload;
            delete data.categories[categoryName];
            break;
        }
        case "renameCategory": {
            const { oldName, newName } = payload;
            if (data.categories[oldName]) {
                data.categories[newName] = data.categories[oldName];
                delete data.categories[oldName];
            }
            break;
        }
        case "addProduct": {
            const { categoryName, productName, productData } = payload;
            if (!data.categories[categoryName]) {
                data.categories[categoryName] = {};
            }
            data.categories[categoryName][productName] = productData || {
                image: null,
                material: "",
                prices: {},
                options: [],
                description: [],
            };
            break;
        }
        case "updateProduct": {
            const { categoryName, productName, productData } = payload;
            if (data.categories[categoryName]) {
                data.categories[categoryName][productName] = productData;
            }
            break;
        }
        case "deleteProduct": {
            const { categoryName, productName } = payload;
            if (data.categories[categoryName]) {
                delete data.categories[categoryName][productName];
            }
            break;
        }
        case "renameProduct": {
            const { categoryName, oldName, newName } = payload;
            if (data.categories[categoryName]?.[oldName]) {
                data.categories[categoryName][newName] =
                    data.categories[categoryName][oldName];
                delete data.categories[categoryName][oldName];
            }
            break;
        }
        case "updateTitle": {
            data.title = payload.title;
            break;
        }
    }
}

// ============================================
// MP-NIDZICA HANDLERS
// ============================================

function handleMpNidzicaAction(data: any, action: string, payload: any) {
    if (!data.products) data.products = [];
    if (!data.meta_data) data.meta_data = {};

    switch (action) {
        case "updateMeta": {
            data.meta_data = { ...data.meta_data, ...payload.meta };
            break;
        }
        case "addProduct": {
            const { product } = payload;
            data.products.push({
                name: product.name || "Nowy produkt",
                image: product.image || null,
                technicalImage: product.technicalImage || null,
                elements: product.elements || [],
            });
            break;
        }
        case "updateProduct": {
            const { index, product } = payload;
            if (index >= 0 && index < data.products.length) {
                data.products[index] = product;
            }
            break;
        }
        case "deleteProduct": {
            const { index } = payload;
            if (index >= 0 && index < data.products.length) {
                data.products.splice(index, 1);
            }
            break;
        }
        case "addElement": {
            const { productIndex, element } = payload;
            if (productIndex >= 0 && productIndex < data.products.length) {
                if (!Array.isArray(data.products[productIndex].elements)) {
                    data.products[productIndex].elements = [];
                }
                data.products[productIndex].elements.push(element);
            }
            break;
        }
        case "updateElement": {
            const { productIndex, elementIndex, element } = payload;
            if (
                productIndex >= 0 &&
                productIndex < data.products.length &&
                Array.isArray(data.products[productIndex].elements)
            ) {
                data.products[productIndex].elements[elementIndex] = element;
            }
            break;
        }
        case "deleteElement": {
            const { productIndex, elementIndex } = payload;
            if (
                productIndex >= 0 &&
                productIndex < data.products.length &&
                Array.isArray(data.products[productIndex].elements)
            ) {
                data.products[productIndex].elements.splice(elementIndex, 1);
            }
            break;
        }
    }
}

// ============================================
// PUSZMAN HANDLERS
// ============================================

function handlePuszmanAction(data: any, action: string, payload: any) {
    if (!data.Arkusz1) data.Arkusz1 = [];

    switch (action) {
        case "addProduct": {
            const { product } = payload;
            data.Arkusz1.push({
                MODEL: product.MODEL || "Nowy model",
                "grupa I": product["grupa I"] || 0,
                "grupa II": product["grupa II"] || 0,
                "grupa III": product["grupa III"] || 0,
                "grupa IV": product["grupa IV"] || 0,
                "grupa V": product["grupa V"] || 0,
                "grupa VI": product["grupa VI"] || 0,
                "KOLOR NOGI": product["KOLOR NOGI"] || "",
            });
            break;
        }
        case "updateProduct": {
            const { index, product } = payload;
            if (index >= 0 && index < data.Arkusz1.length) {
                data.Arkusz1[index] = product;
            }
            break;
        }
        case "deleteProduct": {
            const { index } = payload;
            if (index >= 0 && index < data.Arkusz1.length) {
                data.Arkusz1.splice(index, 1);
            }
            break;
        }
    }
}
