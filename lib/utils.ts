import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================
// TAILWIND UTILITIES
// ============================================

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ============================================
// PRICE UTILITIES
// ============================================

/**
 * Zastosuj marżę/mnożnik do ceny
 */
export function applyMargin(price: number, margin: number): number {
    return Math.round(price * margin);
}

/**
 * Oblicz cenę z wieloma faktorami - używa tylko najwyższego faktora
 */
export function calculatePrice(
    basePrice: number,
    factors: {
        priceFactor?: number;
        productFactor?: number;
        overrideFactor?: number;
    }
): number {
    const { priceFactor = 1, productFactor = 1, overrideFactor = 1 } = factors;
    // Używamy tylko najwyższego faktora (nie mnożymy)
    const effectiveFactor = Math.max(
        priceFactor,
        productFactor,
        overrideFactor
    );
    return Math.round(basePrice * effectiveFactor);
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Pobierz dzisiejszą datę w formacie YYYY-MM-DD
 */
export function getTodayISO(): string {
    return new Date().toISOString().split("T")[0];
}

/**
 * Sprawdź czy data jest w przeszłości
 */
export function isDatePast(date: string | undefined): boolean {
    if (!date) return false;
    return date < getTodayISO();
}

/**
 * Sprawdź czy data jest w przyszłości
 */
export function isDateFuture(date: string | undefined): boolean {
    if (!date) return false;
    return date > getTodayISO();
}

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Konwertuj tekst na URL-friendly slug
 */
export function toSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

/**
 * Pierwsza litera wielka
 */
export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Normalizuj tekst do ID (usuwa spacje, polskie znaki, itp.)
 * Używane do tworzenia ID produktów dla scroll-to
 */
export function normalizeToId(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

/**
 * Formatuj datę w polskim formacie (dd.mm.yyyy)
 */
export function formatDatePL(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pl-PL");
}

/**
 * Oblicz procentową zmianę między dwiema wartościami
 */
export function calculatePercentChange(
    oldValue: number,
    newValue: number
): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
}

/**
 * Formatuj procentową zmianę ze znakiem
 */
export function formatPercentChange(percent: number): string {
    const sign = percent > 0 ? "+" : "";
    return `${sign}${percent}%`;
}
