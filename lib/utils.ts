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
 * Oblicz cenę z wieloma faktorami
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
    return Math.round(basePrice * priceFactor * productFactor * overrideFactor);
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
