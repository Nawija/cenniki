// lib/types.ts
// Uniwersalne typy dla wszystkich producentów

// ============================================
// TYPY DLA FORMATU MP-NIDZICA
// ============================================

export type PriceGroups = Record<string, number>;

export interface ElementItem {
    code: string;
    prices: PriceGroups;
    description?: string[];
}

export interface MpNidzicaProduct {
    name: string;
    image?: string;
    technicalImage?: string;
    elements?: ElementItem[] | Record<string, ElementItem>;
}

export interface MpNidzicaMetaData {
    company?: string;
    catalog_year?: string;
    valid_from?: string;
    contact_orders?: string;
    contact_claims?: string;
}

export interface MpNidzicaData {
    meta_data: MpNidzicaMetaData;
    products: MpNidzicaProduct[];
}

// ============================================
// TYPY DLA FORMATU BOMAR (kategorie z kartami)
// ============================================

export type ProductSize = {
    dimension: string;
    prices: string | number;
};

export interface BomarProductData {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: ProductSize[];
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
    priceFactor?: number; // Indywidualny mnożnik ceny produktu
}

export interface BomarData {
    title?: string;
    categories: Record<string, Record<string, BomarProductData>>;
}

// ============================================
// TYPY DLA FORMATU PUSZMAN (prosta tabela)
// ============================================

export interface PuszmanProduct {
    Column1?: number | string;
    MODEL: string;
    "grupa I"?: number;
    "grupa II"?: number;
    "grupa III"?: number;
    "grupa IV"?: number;
    "grupa V"?: number;
    "grupa VI"?: number;
    "KOLOR NOGI"?: string;
    [key: string]: string | number | undefined;
}

export interface PuszmanData {
    Arkusz1: PuszmanProduct[];
}

// ============================================
// TYPY KONFIGURACJI PRODUCENTÓW
// ============================================

export type ProducerLayoutType =
    | "bomar" // Karty produktów w kategoriach
    | "mpnidzica" // Produkty z elementami i selektorem
    | "puszman"; // Prosta tabela z grupami cenowymi

export interface ProducerConfig {
    slug: string; // URL slug (np. "mp-nidzica")
    displayName: string; // Nazwa wyświetlana (np. "MP Nidzica")
    dataFile: string; // Nazwa pliku JSON (np. "MP-Nidzica.json")
    layoutType: ProducerLayoutType;
    title?: string; // Opcjonalny tytuł strony
    priceGroups?: string[]; // Dla layoutu "puszman" - nazwy grup cenowych
    color?: string; // Kolor tła avatara (np. "#4285F4", "#EA4335")
    priceFactor?: number; // Mnożnik cen (np. 1.0, 1.1, 0.9)
    promotion?: {
        // Opcjonalna promocja
        text: string; // Tekst promocji (np. "Promocja -20%")
        from?: string; // Data od (np. "2025-12-12")
        to?: string; // Data do (np. "2025-12-25")
        enabled?: boolean; // Czy promocja jest włączona
    };
}
