// lib/types.ts
// Uniwersalne typy dla wszystkich producentów

// ============================================
// WSPÓLNE TYPY
// ============================================

export interface Surcharge {
    label: string;
    percent: number;
}

export interface CategorySettings {
    surcharges?: Surcharge[];
}

export interface ProductOverride {
    id: string;
    manufacturer: string;
    category: string;
    productName: string;
    customName: string | null;
    priceFactor: number;
    discount: number | null;
    customPrice: number | null;
    customPreviousName: string | null;
    customImage: string | null;
}

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
    priceGroups?: string[]; // Wspólne grupy cenowe dla wszystkich elementów
    previousName?: string; // Poprzednia nazwa produktu
    discount?: number; // Rabat procentowy (np. 10 = 10%)
    discountLabel?: string; // Opis rabatu (np. "stały rabat")
    priceFactor?: number; // Mnożnik ceny produktu (np. 1.2 = +20%)
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
    surcharges?: Surcharge[]; // Globalne dopłaty dla wszystkich produktów
    priceGroups?: string[]; // Globalne grupy cenowe (np. ["A", "B", "C", "D"])
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
    discount?: number; // Rabat procentowy (np. 10 = 10%)
    discountLabel?: string; // Opis rabatu (np. "stały rabat")
}

export interface BomarData {
    title?: string;
    categories: Record<string, Record<string, BomarProductData>>;
    categorySettings?: Record<string, CategorySettings>;
    categoryPriceFactors?: Record<string, number>; // Mnożniki cen per kategoria (np. { "krzesła": 1.2, "stoły": 1.06 })
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
    previousName?: string; // Poprzednia nazwa produktu
    discount?: number; // Rabat procentowy (np. 10 = 10%)
    discountLabel?: string; // Opis rabatu (np. "stały rabat")
    [key: string]: string | number | undefined;
}

export interface PuszmanData {
    Arkusz1: PuszmanProduct[];
    surcharges?: Surcharge[]; // Globalne dopłaty dla wszystkich produktów
    priceFactor?: number; // Globalny mnożnik cen (np. 1.2 = +20%)
}

// ============================================
// TYPY DLA FORMATU TOPLINE (karty z wymiarami)
// ============================================

export interface TopLineProductData {
    image?: string;
    dimensions?: string; // Wymiary oddzielone enterem (każda linia = osobny podpunkt)
    description?: string;
    price?: number;
    previousName?: string;
    discount?: number; // Rabat procentowy (np. 10 = 10%)
    discountLabel?: string; // Opis rabatu (np. "stały rabat")
}

export interface TopLineData {
    title?: string;
    categories: Record<string, Record<string, TopLineProductData>>;
    categorySettings?: Record<string, CategorySettings>;
    categoryPriceFactors?: Record<string, number>; // Mnożniki cen per kategoria
}

// ============================================
// TYPY DLA FORMATU VERIKON (fotele z grupami materiałowymi)
// ============================================

export interface VerikonProductData {
    image?: string;
    material?: string; // np. "4 Star Frosted Black"
    prices?: Record<string, number>; // G1, G2, G3, G4, Skóra Hermes, Skóra Toledo
    sizes?: ProductSize[];
    options?: string[];
    description?: string[];
    previousName?: string;
    priceFactor?: number;
    discount?: number;
    discountLabel?: string;
}

export interface VerikonData {
    title?: string;
    categories: Record<string, Record<string, VerikonProductData>>;
    categorySettings?: Record<string, CategorySettings>;
    categoryPriceFactors?: Record<string, number>;
}

// ============================================
// TYPY KONFIGURACJI PRODUCENTÓW
// ============================================

export type ProducerLayoutType =
    | "bomar" // Karty produktów w kategoriach
    | "mpnidzica" // Produkty z elementami i selektorem
    | "puszman" // Prosta tabela z grupami cenowymi
    | "topline" // Karty z wymiarami jako podpunkty
    | "verikon"; // Fotele Verikon z grupami materiałowymi

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
