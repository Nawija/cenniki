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
