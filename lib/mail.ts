// lib/mail.ts
// Konfiguracja i funkcje wysyłania maili

import nodemailer from "nodemailer";

// Konfiguracja transportera - użyj zmiennych środowiskowych
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true dla 465, false dla innych
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface ChangeItem {
    type: "added" | "removed" | "modified";
    path: string;
    oldValue?: any;
    newValue?: any;
}

// Tłumaczenia pól na czytelne nazwy
const fieldTranslations: Record<string, string> = {
    // Pola
    name: "Nazwa",
    previousName: "Poprzednia nazwa",
    image: "Zdjęcie",
    technicalImage: "Rysunek techniczny",
    code: "Kod",
    discount: "Rabat",
    discountLabel: "Opis rabatu",
    material: "Materiał",
    dimensions: "Wymiary",
    dimension: "Wymiar",
    price: "Cena",
    prices: "Ceny",
    options: "Opcje",
    description: "Opis",
    notes: "Uwagi",
    priceFactor: "Faktor",
    label: "Etykieta",
    percent: "Procent",
    company: "Firma",
    catalog_year: "Rok katalogu",
    valid_from: "Ważny od",
    contact_orders: "Kontakt zamówienia",
    contact_claims: "Kontakt reklamacje",
    title: "Tytuł",
};

// Uniwersalny resolver nazw z danych JSON
function resolveNameFromData(data: any, pathSegments: string[]): string | null {
    if (!data || pathSegments.length === 0) return null;

    let current = data;
    const names: string[] = [];

    for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];

        // Obsługa indeksu tablicy [n]
        const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const [, key, indexStr] = arrayMatch;
            const index = parseInt(indexStr);

            if (
                current[key] &&
                Array.isArray(current[key]) &&
                current[key][index]
            ) {
                current = current[key][index];
                // Wyciągnij nazwę z elementu tablicy
                const itemName =
                    current.name ||
                    current.MODEL ||
                    current.code ||
                    current.dimension;
                if (itemName) names.push(itemName);
            } else {
                break;
            }
        }
        // Obsługa kategorii (Bomar style: categories.stoły.PRODUKT)
        else if (segment === "categories" && current.categories) {
            current = current.categories;
        }
        // Obsługa klucza obiektu
        else if (current[segment] !== undefined) {
            // Jeśli to klucz produktu w kategorii (np. "TRIM" w stoły.TRIM)
            if (
                typeof current[segment] === "object" &&
                !Array.isArray(current[segment])
            ) {
                const prev = pathSegments[i - 1];
                // Jeśli poprzedni segment to kategoria, ten jest nazwą produktu
                if (
                    prev &&
                    [
                        "stoły",
                        "krzesła",
                        "ławy",
                        "komody",
                        "fotele",
                        "sofy",
                    ].includes(prev)
                ) {
                    names.push(segment);
                }
            }
            current = current[segment];
        } else {
            break;
        }
    }

    return names.length > 0 ? names.join(" / ") : null;
}

// Parsuj ścieżkę na segmenty
function parsePathSegments(path: string): string[] {
    const segments: string[] = [];
    let current = "";

    for (let i = 0; i < path.length; i++) {
        const char = path[i];
        if (char === ".") {
            if (current) segments.push(current);
            current = "";
        } else if (char === "[") {
            if (current) {
                current += char;
            }
        } else if (char === "]") {
            current += char;
            segments.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    if (current) segments.push(current);

    return segments;
}

// Tłumacz końcowe pole ścieżki
function translateField(field: string): string {
    // Usuń indeks tablicy jeśli jest
    const cleanField = field.replace(/\[\d+\]$/, "");

    // Sprawdź tłumaczenie
    if (fieldTranslations[cleanField]) {
        return fieldTranslations[cleanField];
    }

    // Grupy cenowe
    if (/^[A-Z]$/.test(cleanField)) return `Cena ${cleanField}`;
    if (/^grupa\s+[IVX]+$/i.test(cleanField)) return cleanField;

    return cleanField;
}

// Buduj czytelną ścieżkę z kontekstem nazw
function buildReadablePath(
    path: string,
    data: any
): { context: string; field: string } {
    const segments = parsePathSegments(path);

    // Znajdź nazwy z danych
    const contextName = resolveNameFromData(data, segments);

    // Ostatni segment to pole które się zmieniło
    const lastSegment = segments[segments.length - 1] || path;
    const fieldName = translateField(lastSegment.replace(/\[\d+\]/, ""));

    // Jeśli ostatni segment to indeks w prices, wyciągnij grupę cenową
    const pricesMatch = path.match(/prices\.(\w+)$/);
    if (pricesMatch) {
        return {
            context: contextName || "",
            field: `Cena ${pricesMatch[1]}`,
        };
    }

    // Jeśli zmiana w sizes
    const sizesMatch = path.match(/sizes\[(\d+)\]\.(\w+)$/);
    if (sizesMatch) {
        const sizeIndex = parseInt(sizesMatch[1]);
        const sizeField = translateField(sizesMatch[2]);
        // Spróbuj wyciągnąć wymiar
        const sizeData = getValueByPath(data, path.replace(/\.\w+$/, ""));
        const sizeName = sizeData?.dimension || `Rozmiar ${sizeIndex + 1}`;
        return {
            context: contextName ? `${contextName} / ${sizeName}` : sizeName,
            field: sizeField,
        };
    }

    // Jeśli zmiana w elements
    const elementsMatch = path.match(/elements\[(\d+)\]\.(\w+)$/);
    if (elementsMatch) {
        return {
            context: contextName || "",
            field: translateField(elementsMatch[2]),
        };
    }

    return {
        context: contextName || "",
        field: fieldName,
    };
}

// Pomocnicza funkcja do wyciągania wartości po ścieżce
function getValueByPath(data: any, path: string): any {
    const segments = parsePathSegments(path);
    let current = data;

    for (const segment of segments) {
        if (!current) return undefined;

        const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const [, key, indexStr] = arrayMatch;
            current = current[key]?.[parseInt(indexStr)];
        } else {
            current = current[segment];
        }
    }

    return current;
}

// Tłumacz typ zmiany
function translateChangeType(type: "added" | "removed" | "modified"): {
    text: string;
    icon: string;
    color: string;
} {
    switch (type) {
        case "added":
            return { text: "Dodano", icon: "+", color: "#22c55e" };
        case "removed":
            return { text: "Usunięto", icon: "−", color: "#ef4444" };
        case "modified":
            return { text: "Zmiana", icon: "~", color: "#3b82f6" };
    }
}

// Porównaj dwa obiekty i znajdź różnice
export function findChanges(
    oldData: any,
    newData: any,
    path: string = ""
): ChangeItem[] {
    const changes: ChangeItem[] = [];

    if (oldData === newData) return changes;

    // Jeśli typy są różne
    if (typeof oldData !== typeof newData) {
        changes.push({
            type: "modified",
            path: path || "root",
            oldValue: oldData,
            newValue: newData,
        });
        return changes;
    }

    // Dla prymitywów
    if (typeof oldData !== "object" || oldData === null) {
        if (oldData !== newData) {
            changes.push({
                type: "modified",
                path: path || "root",
                oldValue: oldData,
                newValue: newData,
            });
        }
        return changes;
    }

    // Dla tablic
    if (Array.isArray(oldData) && Array.isArray(newData)) {
        // Porównaj długości
        if (oldData.length !== newData.length) {
            // Znajdź dodane/usunięte elementy
            const maxLen = Math.max(oldData.length, newData.length);
            for (let i = 0; i < maxLen; i++) {
                if (i >= oldData.length) {
                    changes.push({
                        type: "added",
                        path: `${path}[${i}]`,
                        newValue: summarizeValue(newData[i]),
                    });
                } else if (i >= newData.length) {
                    changes.push({
                        type: "removed",
                        path: `${path}[${i}]`,
                        oldValue: summarizeValue(oldData[i]),
                    });
                } else {
                    changes.push(
                        ...findChanges(oldData[i], newData[i], `${path}[${i}]`)
                    );
                }
            }
        } else {
            // Ta sama długość - porównaj elementy
            for (let i = 0; i < oldData.length; i++) {
                changes.push(
                    ...findChanges(oldData[i], newData[i], `${path}[${i}]`)
                );
            }
        }
        return changes;
    }

    // Dla obiektów
    const allKeys = new Set([
        ...Object.keys(oldData || {}),
        ...Object.keys(newData || {}),
    ]);

    for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;

        if (!(key in oldData)) {
            changes.push({
                type: "added",
                path: newPath,
                newValue: summarizeValue(newData[key]),
            });
        } else if (!(key in newData)) {
            changes.push({
                type: "removed",
                path: newPath,
                oldValue: summarizeValue(oldData[key]),
            });
        } else {
            changes.push(...findChanges(oldData[key], newData[key], newPath));
        }
    }

    return changes;
}

// Skróć wartość do czytelnej formy
function summarizeValue(value: any): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value === "string")
        return value.length > 50 ? value.substring(0, 50) + "..." : value;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return `[Array: ${value.length} items]`;
    if (typeof value === "object") {
        const name = value.name || value.MODEL || value.code || "";
        return name ? `{${name}}` : `{Object}`;
    }
    return String(value);
}

// Formatuj zmiany do HTML - minimalistyczna pojedyncza tabela
function formatChangesToHtml(
    changes: ChangeItem[],
    producerName: string,
    sourceData: any
): string {
    if (changes.length === 0) {
        return "<p>Brak zmian do wyświetlenia.</p>";
    }

    // Filtruj mało istotne zmiany
    const significantChanges = changes.filter((c) => {
        if (c.path.includes("priceGroups")) return false;
        return true;
    });

    if (significantChanges.length === 0) {
        return "<p>Wprowadzono drobne zmiany techniczne.</p>";
    }

    // Limit 100 zmian
    const displayChanges = significantChanges.slice(0, 100);
    const hasMore = significantChanges.length > 100;

    let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #fff;">
        <h2 style="color: #1a1a1a; font-weight: 600; margin: 0 0 8px 0; font-size: 20px;">
            Zmiany w cenniku: ${producerName}
        </h2>
        <p style="color: #666; font-size: 13px; margin: 0 0 20px 0;">
            ${new Date().toLocaleString("pl-PL")} • ${
        significantChanges.length
    } zmian
        </p>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #e9ecef;">
                    <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #374151;">Produkt / Element</th>
                    <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #374151;">Co zmieniono</th>
                    <th style="padding: 10px 12px; text-align: right; font-weight: 600; color: #374151; width: 100px;">Było</th>
                    <th style="padding: 10px 12px; text-align: right; font-weight: 600; color: #374151; width: 100px;">Jest</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const change of displayChanges) {
        const { context, field } = buildReadablePath(change.path, sourceData);
        const changeInfo = translateChangeType(change.type);

        const oldVal =
            change.oldValue !== undefined ? String(change.oldValue) : "—";
        const newVal =
            change.newValue !== undefined ? String(change.newValue) : "—";

        // Styl dla typu zmiany
        const rowBg =
            change.type === "added"
                ? "#f0fdf4"
                : change.type === "removed"
                ? "#fef2f2"
                : "#fff";

        html += `
            <tr style="background: ${rowBg}; border-bottom: 1px solid #e9ecef;">
                <td style="padding: 8px 12px; color: #1a1a1a;">
                    ${context || "<span style='color: #9ca3af;'>—</span>"}
                </td>
                <td style="padding: 8px 12px;">
                    <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 4px; background: ${
                        changeInfo.color
                    }; color: white; font-size: 12px; font-weight: bold; margin-right: 6px;">${
            changeInfo.icon
        }</span>
                    ${field}
                </td>
                <td style="padding: 8px 12px; text-align: right; color: #6b7280; font-family: 'SF Mono', Monaco, monospace; font-size: 12px;">
                    ${oldVal}
                </td>
                <td style="padding: 8px 12px; text-align: right; color: #1a1a1a; font-weight: 500; font-family: 'SF Mono', Monaco, monospace; font-size: 12px;">
                    ${newVal}
                </td>
            </tr>
        `;
    }

    if (hasMore) {
        html += `
            <tr>
                <td colspan="4" style="padding: 12px; text-align: center; color: #6b7280; font-size: 12px; background: #f8f9fa;">
                    … i jeszcze ${significantChanges.length - 100} zmian
                </td>
            </tr>
        `;
    }

    html += `
            </tbody>
        </table>
        
        <p style="color: #9ca3af; font-size: 11px; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #e9ecef;">
            Wygenerowano automatycznie przez system cenników
        </p>
    </div>
    `;

    return html;
}

// Wysyłanie maila z powiadomieniem o zmianach
export async function sendChangesNotification(
    producerName: string,
    producerSlug: string,
    oldData: any,
    newData: any
): Promise<boolean> {
    // Sprawdź czy konfiguracja jest ustawiona
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return false;
    }

    const recipientEmail =
        process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;

    try {
        const changes = findChanges(oldData, newData);

        // Jeśli nie ma zmian, nie wysyłaj maila
        if (changes.length === 0) {
            return false;
        }

        // Przekaż newData jako sourceData dla resolvera nazw
        const htmlContent = formatChangesToHtml(changes, producerName, newData);

        await transporter.sendMail({
            from: `"Cenniki - ${producerName}" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: `Zmiany w cenniku: ${producerName} (${changes.length})`,
            html: htmlContent,
        });

        return true;
    } catch {
        return false;
    }
}

// ============================================
// NOWY SYSTEM POWIADOMIEŃ O ZMIANACH PRODUCENTA
// ============================================

export interface ProducerUpdateNotification {
    factorChange?: {
        oldFactor: number;
        newFactor: number;
        percentChange: number;
    };
    surchargesChanged?: boolean; // Czy zmieniono mnożniki kategorii
    priceIncreased: string[]; // Nazwy modeli z podwyżką
    priceDecreased: string[]; // Nazwy modeli z obniżką
    addedModels: string[]; // Nowe modele
    removedModels: string[]; // Usunięte modele
    addedElements: string[]; // Dodane elementy (format: "Model > Element")
    removedElements: string[]; // Usunięte elementy
}

/**
 * Wyciąga nazwy modeli z danych producenta (różne layouty)
 */
function extractModelNames(data: any): string[] {
    const models: string[] = [];

    // Puszman layout (Arkusz1)
    if (data?.Arkusz1 && Array.isArray(data.Arkusz1)) {
        for (const item of data.Arkusz1) {
            if (item.MODEL) models.push(item.MODEL);
        }
    }

    // Bomar/Halex layout (categories)
    if (data?.categories) {
        for (const [, products] of Object.entries(
            data.categories as Record<string, any>
        )) {
            for (const prodName of Object.keys(
                products as Record<string, any>
            )) {
                models.push(prodName);
            }
        }
    }

    // MP Nidzica layout (products array)
    if (data?.products && Array.isArray(data.products)) {
        for (const prod of data.products) {
            if (prod.name) models.push(prod.name);
        }
    }

    return models;
}

/**
 * Wyciąga ceny modeli z danych producenta (różne layouty)
 * Zwraca Map<nazwaModelu, średniaCena>
 */
function extractModelPrices(data: any): Map<string, number> {
    const prices = new Map<string, number>();

    // Puszman layout (Arkusz1)
    if (data?.Arkusz1 && Array.isArray(data.Arkusz1)) {
        for (const item of data.Arkusz1) {
            if (item.MODEL) {
                // Weź pierwszą grupę cenową jako reprezentatywną
                const price = item["grupa I"] || item["grupa II"] || 0;
                prices.set(item.MODEL, Number(price));
            }
        }
    }

    // Bomar/Halex layout (categories)
    if (data?.categories) {
        for (const [, products] of Object.entries(
            data.categories as Record<string, any>
        )) {
            for (const [prodName, prodData] of Object.entries(
                products as Record<string, any>
            )) {
                // Weź cenę z prices lub sizes
                let price = 0;
                if (prodData.prices) {
                    const priceValues = Object.values(
                        prodData.prices as Record<string, number>
                    );
                    price = priceValues.length > 0 ? Number(priceValues[0]) : 0;
                } else if (prodData.sizes && prodData.sizes[0]) {
                    price = Number(prodData.sizes[0].prices) || 0;
                }
                prices.set(prodName, price);
            }
        }
    }

    // MP Nidzica layout (products array)
    if (data?.products && Array.isArray(data.products)) {
        for (const prod of data.products) {
            if (prod.name && prod.elements?.[0]) {
                const el = prod.elements[0];
                const price =
                    el.price || (el.prices ? Object.values(el.prices)[0] : 0);
                prices.set(prod.name, Number(price) || 0);
            }
        }
    }

    return prices;
}

/**
 * Porównuje surcharges (mnożniki kategorii) między starymi i nowymi danymi
 */
function detectSurchargesChanged(oldData: any, newData: any): boolean {
    // Globalne surcharges
    const oldGlobal = JSON.stringify(oldData?.surcharges || []);
    const newGlobal = JSON.stringify(newData?.surcharges || []);
    if (oldGlobal !== newGlobal) return true;

    // Surcharges w kategoriach (Bomar layout)
    if (oldData?.categories && newData?.categories) {
        // Sprawdź wszystkie kategorie (stare i nowe)
        const allCategories = new Set([
            ...Object.keys(oldData.categories || {}),
            ...Object.keys(newData.categories || {}),
        ]);

        for (const catName of allCategories) {
            const oldCat = oldData.categories?.[catName];
            const newCat = newData.categories?.[catName];

            const oldSurcharges = JSON.stringify(oldCat?.surcharges || []);
            const newSurcharges = JSON.stringify(newCat?.surcharges || []);

            if (oldSurcharges !== newSurcharges) return true;
        }
    }

    return false;
}

/**
 * Wykrywa dodane/usunięte elementy wewnątrz produktów
 */
function detectElementChanges(
    oldData: any,
    newData: any
): { added: string[]; removed: string[] } {
    const added: string[] = [];
    const removed: string[] = [];

    // MP Nidzica layout (products array z elements)
    if (oldData?.products && newData?.products) {
        for (const newProd of newData.products) {
            const oldProd = oldData.products.find(
                (p: any) => p.name === newProd.name
            );

            if (oldProd && newProd.elements && oldProd.elements) {
                const oldElements = new Set(
                    oldProd.elements.map((e: any) => e.code || e.name)
                );
                const newElements = new Set(
                    newProd.elements.map((e: any) => e.code || e.name)
                );

                // Dodane elementy
                for (const el of newProd.elements) {
                    const elName = el.code || el.name;
                    if (!oldElements.has(elName)) {
                        added.push(`${newProd.name} > ${elName}`);
                    }
                }

                // Usunięte elementy
                for (const el of oldProd.elements) {
                    const elName = el.code || el.name;
                    if (!newElements.has(elName)) {
                        removed.push(`${newProd.name} > ${elName}`);
                    }
                }
            }
        }
    }

    // Bomar layout (categories z sizes/elements)
    if (oldData?.categories && newData?.categories) {
        for (const [catName, products] of Object.entries(
            newData.categories as Record<string, any>
        )) {
            for (const [prodName, prodData] of Object.entries(
                products as Record<string, any>
            )) {
                const oldProd = oldData.categories?.[catName]?.[prodName];

                if (oldProd) {
                    // Sprawdź sizes
                    if (prodData.sizes && oldProd.sizes) {
                        const oldSizes = new Set(
                            oldProd.sizes.map((s: any) => s.dimension)
                        );
                        const newSizes = new Set(
                            prodData.sizes.map((s: any) => s.dimension)
                        );

                        for (const size of prodData.sizes) {
                            if (!oldSizes.has(size.dimension)) {
                                added.push(`${prodName} > ${size.dimension}`);
                            }
                        }

                        for (const size of oldProd.sizes) {
                            if (!newSizes.has(size.dimension)) {
                                removed.push(`${prodName} > ${size.dimension}`);
                            }
                        }
                    }

                    // Sprawdź elements (jeśli istnieją)
                    if (prodData.elements && oldProd.elements) {
                        const oldElements = new Set(
                            oldProd.elements.map((e: any) => e.code || e.name)
                        );
                        const newElements = new Set(
                            prodData.elements.map((e: any) => e.code || e.name)
                        );

                        for (const el of prodData.elements) {
                            const elName = el.code || el.name;
                            if (!oldElements.has(elName)) {
                                added.push(`${prodName} > ${elName}`);
                            }
                        }

                        for (const el of oldProd.elements) {
                            const elName = el.code || el.name;
                            if (!newElements.has(elName)) {
                                removed.push(`${prodName} > ${elName}`);
                            }
                        }
                    }
                }
            }
        }
    }

    return { added, removed };
}

/**
 * Wykrywa zmiany w modelach producenta
 */
export function detectModelChanges(
    oldData: any,
    newData: any
): Omit<ProducerUpdateNotification, "factorChange"> {
    const oldModels = extractModelNames(oldData);
    const newModels = extractModelNames(newData);

    const oldSet = new Set(oldModels);
    const newSet = new Set(newModels);

    // Dodane modele (są w new, nie ma w old)
    const addedModels = newModels.filter((m) => !oldSet.has(m));

    // Usunięte modele (są w old, nie ma w new)
    const removedModels = oldModels.filter((m) => !newSet.has(m));

    // Porównaj ceny dla wspólnych modeli
    const oldPrices = extractModelPrices(oldData);
    const newPrices = extractModelPrices(newData);

    const priceIncreased: string[] = [];
    const priceDecreased: string[] = [];

    for (const model of oldModels) {
        if (newSet.has(model)) {
            const oldPrice = oldPrices.get(model) || 0;
            const newPrice = newPrices.get(model) || 0;

            if (newPrice > oldPrice && oldPrice > 0) {
                priceIncreased.push(model);
            } else if (newPrice < oldPrice && newPrice > 0) {
                priceDecreased.push(model);
            }
        }
    }

    // Wykryj zmiany w surcharges (mnożnikach kategorii)
    const surchargesChanged = detectSurchargesChanged(oldData, newData);

    // Wykryj dodane/usunięte elementy
    const elementChanges = detectElementChanges(oldData, newData);

    return {
        surchargesChanged,
        priceIncreased,
        priceDecreased,
        addedModels,
        removedModels,
        addedElements: elementChanges.added,
        removedElements: elementChanges.removed,
    };
}

/**
 * Formatuje HTML dla nowego systemu powiadomień
 */
function formatProducerUpdateHtml(
    producerName: string,
    notification: ProducerUpdateNotification
): string {
    const sections: string[] = [];

    // Sekcja: Zmiana faktora (= zmiana cen na cały asortyment)
    if (notification.factorChange) {
        const { percentChange } = notification.factorChange;
        const isIncrease = percentChange > 0;
        const text = isIncrease
            ? `Podniesiono ceny na cały asortyment ${producerName}`
            : `Obniżono ceny na cały asortyment ${producerName}`;

        sections.push(`
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                    ${text}
                </h3>
            </div>
        `);
    }

    // Sekcja: Zmiana mnożników kategorii
    if (notification.surchargesChanged) {
        sections.push(`
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                    Zmieniono mnożniki cen dla kategorii
                </h3>
            </div>
        `);
    }

    // Sekcja: Podwyżki cen
    if (notification.priceIncreased.length > 0) {
        sections.push(`
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                    Podwyżka (${notification.priceIncreased.length})
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    ${notification.priceIncreased
                        .map((m) => `<li style="margin-bottom: 4px;">${m}</li>`)
                        .join("")}
                </ul>
            </div>
        `);
    }

    // Sekcja: Obniżki cen
    if (notification.priceDecreased.length > 0) {
        sections.push(`
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                    Obniżka (${notification.priceDecreased.length})
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    ${notification.priceDecreased
                        .map((m) => `<li style="margin-bottom: 4px;">${m}</li>`)
                        .join("")}
                </ul>
            </div>
        `);
    }

    // Sekcja: Usunięte modele
    if (notification.removedModels.length > 0) {
        sections.push(`
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                    Modele które wypadły (${notification.removedModels.length})
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    ${notification.removedModels
                        .map((m) => `<li style="margin-bottom: 4px;">${m}</li>`)
                        .join("")}
                </ul>
            </div>
        `);
    }

    // Sekcja: Dodane modele
    if (notification.addedModels.length > 0) {
        sections.push(`
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                    Dodane modele (${notification.addedModels.length})
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    ${notification.addedModels
                        .map((m) => `<li style="margin-bottom: 4px;">${m}</li>`)
                        .join("")}
                </ul>
            </div>
        `);
    }

    // Sekcja: Usunięte elementy
    if (
        notification.removedElements &&
        notification.removedElements.length > 0
    ) {
        sections.push(`
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                    Usunięte elementy (${notification.removedElements.length})
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    ${notification.removedElements
                        .map((m) => `<li style="margin-bottom: 4px;">${m}</li>`)
                        .join("")}
                </ul>
            </div>
        `);
    }

    // Sekcja: Dodane elementy
    if (notification.addedElements && notification.addedElements.length > 0) {
        sections.push(`
            <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                    Dodane elementy (${notification.addedElements.length})
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    ${notification.addedElements
                        .map((m) => `<li style="margin-bottom: 4px;">${m}</li>`)
                        .join("")}
                </ul>
            </div>
        `);
    }

    if (sections.length === 0) {
        return "";
    }

    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
        <h2 style="color: #1a1a1a; font-weight: 600; margin: 0 0 8px 0; font-size: 22px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
            Aktualizacja - ${producerName}
        </h2>
        <p style="color: #666; font-size: 13px; margin: 0 0 24px 0;">
            ${new Date().toLocaleString("pl-PL")}
        </p>
        
        ${sections.join("")}
        
        <p style="color: #9ca3af; font-size: 11px; margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #e9ecef;">
            Wygenerowano automatycznie przez system cenników
        </p>
    </div>
    `;
}

/**
 * Wysyła powiadomienie o aktualizacji producenta
 * Jeden zbiorczy email z sekcjami: faktor, podwyżki, obniżki, usunięte, dodane
 */
export async function sendProducerUpdateNotification(
    producerName: string,
    notification: ProducerUpdateNotification
): Promise<boolean> {
    // Sprawdź czy konfiguracja jest ustawiona
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return false;
    }

    // Sprawdź czy jest cokolwiek do wysłania
    const hasChanges =
        notification.factorChange ||
        notification.surchargesChanged ||
        notification.priceIncreased.length > 0 ||
        notification.priceDecreased.length > 0 ||
        notification.addedModels.length > 0 ||
        notification.removedModels.length > 0 ||
        (notification.addedElements && notification.addedElements.length > 0) ||
        (notification.removedElements &&
            notification.removedElements.length > 0);

    if (!hasChanges) {
        return false;
    }

    const recipientEmail =
        process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;

    try {
        const htmlContent = formatProducerUpdateHtml(
            producerName,
            notification
        );

        if (!htmlContent) {
            return false;
        }

        await transporter.sendMail({
            from: `"Cenniki" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: `Aktualizacja - ${producerName}`,
            html: htmlContent,
        });

        return true;
    } catch {
        return false;
    }
}
