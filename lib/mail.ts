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

// Tłumaczenia ścieżek na czytelne nazwy
const pathTranslations: Record<string, string> = {
    // Główne sekcje
    products: "Produkty",
    categories: "Kategorie",
    surcharges: "Dopłaty",
    priceGroups: "Grupy cenowe",
    categorySettings: "Ustawienia kategorii",
    categoryPriceFactors: "Faktory cen kategorii",
    meta_data: "Metadane",

    // Pola produktów
    name: "Nazwa",
    previousName: "Poprzednia nazwa",
    image: "Zdjęcie",
    technicalImage: "Rysunek techniczny",
    elements: "Elementy",
    prices: "Ceny",
    code: "Kod",
    discount: "Rabat",
    discountLabel: "Opis rabatu",
    material: "Materiał",
    dimensions: "Wymiary",
    sizes: "Rozmiary",
    dimension: "Wymiar",
    price: "Cena",
    options: "Opcje",
    description: "Opis",
    notes: "Uwagi",
    priceFactor: "Faktor",

    // Kategorie (Bomar)
    stoły: "Stoły",
    krzesła: "Krzesła",
    ławy: "Ławy",
    komody: "Komody",

    // Grupy cenowe
    A: "Grupa A",
    B: "Grupa B",
    C: "Grupa C",
    D: "Grupa D",
    "grupa I": "Grupa I",
    "grupa II": "Grupa II",
    "grupa III": "Grupa III",
    "grupa IV": "Grupa IV",
    "grupa V": "Grupa V",
    "grupa VI": "Grupa VI",

    // Metadane
    company: "Firma",
    catalog_year: "Rok katalogu",
    valid_from: "Ważny od",
    contact_orders: "Kontakt zamówienia",
    contact_claims: "Kontakt reklamacje",
    title: "Tytuł",

    // Dopłaty
    label: "Etykieta",
    percent: "Procent",
};

// Tłumacz ścieżkę na czytelną nazwę
function translatePath(path: string): string {
    // Zamień indeksy tablicy na numery (np. products[0] -> Produkt 1)
    let translated = path
        .replace(/\[(\d+)\]/g, (_, num) => ` ${parseInt(num) + 1}`)
        .replace(/\./g, " → ");

    // Przetłumacz poszczególne segmenty
    for (const [key, value] of Object.entries(pathTranslations)) {
        // Zamień całe słowa (z uwzględnieniem granic)
        const regex = new RegExp(`\\b${key}\\b`, "g");
        translated = translated.replace(regex, value);
    }

    // Specjalne przypadki złożone
    translated = translated
        .replace(/Faktory cen kategorii → (\w+)/g, "Faktor cen: $1")
        .replace(/Produkty (\d+)/g, "Produkt $1")
        .replace(/Elementy (\d+)/g, "Element $1")
        .replace(/Rozmiary (\d+)/g, "Rozmiar $1")
        .replace(/Dopłaty (\d+)/g, "Dopłata $1")
        .replace(/Ceny → /g, "Cena ");

    return translated;
}

// Tłumacz typ zmiany
function translateChangeType(type: "added" | "removed" | "modified"): string {
    switch (type) {
        case "added":
            return "Dodano";
        case "removed":
            return "Usunięto";
        case "modified":
            return "Zmieniono";
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

// Grupuj zmiany według produktu/kategorii
function groupChanges(changes: ChangeItem[]): Map<string, ChangeItem[]> {
    const groups = new Map<string, ChangeItem[]>();

    for (const change of changes) {
        // Wyciągnij główną ścieżkę (np. products[0] lub categories.stoły.STÓŁ1)
        const match = change.path.match(
            /^([^.[\]]+(?:\[[^\]]+\])?(?:\.[^.[\]]+)?)/
        );
        const groupKey = match ? match[1] : "other";

        // Przetłumacz klucz grupy
        const translatedKey = translatePath(groupKey);

        if (!groups.has(translatedKey)) {
            groups.set(translatedKey, []);
        }
        groups.get(translatedKey)!.push(change);
    }

    return groups;
}

// Formatuj zmiany do HTML
function formatChangesToHtml(
    changes: ChangeItem[],
    producerName: string
): string {
    if (changes.length === 0) {
        return "<p>Brak zmian do wyświetlenia.</p>";
    }

    // Filtruj mało istotne zmiany (np. zmiana kolejności kluczy)
    const significantChanges = changes.filter((c) => {
        // Ignoruj zmiany w priceGroups na poziomie produktu (są teraz globalne)
        if (c.path.includes("priceGroups")) return false;
        return true;
    });

    if (significantChanges.length === 0) {
        return "<p>Wprowadzono drobne zmiany techniczne.</p>";
    }

    const groups = groupChanges(significantChanges);

    let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            📝 Zmiany w cenniku: ${producerName}
        </h2>
        <p style="color: #666; font-size: 14px;">
            Data: ${new Date().toLocaleString("pl-PL")}
        </p>
        <p style="color: #666; font-size: 14px;">
            Liczba zmian: <strong>${significantChanges.length}</strong>
        </p>
    `;

    for (const [groupKey, groupChanges] of groups) {
        html += `
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #495057;">${groupKey}</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #e9ecef;">
                        <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Akcja</th>
                        <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Co zmieniono</th>
                        <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Poprzednio</th>
                        <th style="padding: 8px; text-align: left; border: 1px solid #dee2e6;">Aktualnie</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const change of groupChanges.slice(0, 50)) {
            // Limit do 50 zmian per grupa
            const typeColor =
                change.type === "added"
                    ? "#28a745"
                    : change.type === "removed"
                    ? "#dc3545"
                    : "#ffc107";
            const typeIcon =
                change.type === "added"
                    ? "➕"
                    : change.type === "removed"
                    ? "➖"
                    : "✏️";
            const typeText = translateChangeType(change.type);
            const translatedPath = translatePath(change.path);

            html += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #dee2e6;">
                        <span style="color: ${typeColor}; font-weight: bold;">${typeIcon} ${typeText}</span>
                    </td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px;">
                        ${translatedPath}
                    </td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; color: #6c757d;">
                        ${
                            change.oldValue !== undefined
                                ? String(change.oldValue)
                                : "-"
                        }
                    </td>
                    <td style="padding: 8px; border: 1px solid #dee2e6; color: #212529; font-weight: 500;">
                        ${
                            change.newValue !== undefined
                                ? String(change.newValue)
                                : "-"
                        }
                    </td>
                </tr>
            `;
        }

        if (groupChanges.length > 50) {
            html += `
                <tr>
                    <td colspan="4" style="padding: 8px; border: 1px solid #dee2e6; text-align: center; color: #6c757d;">
                        ... i jeszcze ${groupChanges.length - 50} zmian
                    </td>
                </tr>
            `;
        }

        html += `
                </tbody>
            </table>
        </div>
        `;
    }

    html += `
        <p style="color: #6c757d; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            Ta wiadomość została wygenerowana automatycznie przez system cenników.
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
        console.log("SMTP not configured, skipping email notification");
        return false;
    }

    const recipientEmail =
        process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;

    try {
        const changes = findChanges(oldData, newData);

        // Jeśli nie ma zmian, nie wysyłaj maila
        if (changes.length === 0) {
            console.log("No changes detected, skipping email");
            return false;
        }

        const htmlContent = formatChangesToHtml(changes, producerName);

        await transporter.sendMail({
            from: `"Aktualizacja - ${producerName}" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: `📊 Zmiany w cenniku: ${producerName} (${changes.length} zmian)`,
            html: htmlContent,
        });

        console.log(
            `Email notification sent for ${producerName} (${changes.length} changes)`
        );
        return true;
    } catch (error) {
        console.error("Failed to send email notification:", error);
        return false;
    }
}
