// lib/types.ts
// Uniwersalne typy dla wszystkich producentów - ZUNIFIKOWANE

// ============================================
// WSPÓLNE TYPY BAZOWE
// ============================================

export interface Surcharge {
    label: string;
    percent: number;
}

export interface CategorySettings {
    surcharges?: Surcharge[];
    type?: "groups" | "elements" | "sizes";
    variants?: string[];
    groupsVariants?: string[];
}

// ============================================
// UNIWERSALNY PRODUKT - ZUNIFIKOWANY
// ============================================

export type PriceValue = number | string | Record<string, number>;
export type PriceRecord = Record<string, PriceValue>;

export interface PriceElement {
    code?: string;
    name?: string;
    dimension?: string;
    prices: PriceRecord;
    description?: string[];
    note?: string;
    image?: string; // Małe zdjęcie elementu (ikona)
}

// Separator element for table sections
export interface SeparatorElement {
    type: "separator";
    label: string;
}

// Element może być zwykłym elementem cenowym lub separatorem
export type ProductElement = PriceElement | SeparatorElement;

export interface ProductSize {
    dimension: string;
    prices: PriceValue | PriceRecord;
}

export interface PriceMatrix {
    groups: string[];
    columns: string[];
    values: Record<string, Record<string, number>>;
    dimensions?: Record<string, string>;
}

// ============================================
// UNIWERSALNY PRODUKT
// ============================================

export interface UniversalProduct {
    name?: string;
    MODEL?: string;
    image?: string;
    technicalImage?: string;
    prices?: PriceRecord;
    elements?: ProductElement[];
    sizes?: ProductSize[];
    priceMatrix?: PriceMatrix;
    price?: number;
    material?: string;
    dimensions?: string | Record<string, string>;
    description?: string | string[];
    options?: string[];
    notes?: string;
    previousName?: string;
    priceFactor?: number;
    discount?: number;
    discountLabel?: string;
    category?: string; // Kategoria produktu (np. "Stoły", "Krzesła")
    Column1?: number | string;
    "KOLOR NOGI"?: string;
    "grupa I"?: number;
    "grupa II"?: number;
    "grupa III"?: number;
    "grupa IV"?: number;
    "grupa V"?: number;
    "grupa VI"?: number;
    [key: string]: any;
}

// ============================================
// UNIWERSALNA STRUKTURA DANYCH
// ============================================

export interface CategoryBasedData {
    title?: string;
    categories: Record<string, Record<string, UniversalProduct>>;
    categorySettings?: Record<string, CategorySettings>;
    categoryPriceFactors?: Record<string, number>;
    surcharges?: Surcharge[];
}

export interface ListBasedData {
    meta_data?: {
        company?: string;
        catalog_year?: string;
        valid_from?: string;
        contact_orders?: string;
        contact_claims?: string;
    };
    products: UniversalProduct[];
    priceGroups?: string[]; // Globalne grupy cenowe (domyślne dla wszystkich)
    productCategories?: string[]; // Lista kategorii produktów (np. ["Stoły", "Krzesła"])
    categoryPriceGroups?: Record<string, string[]>; // Grupy cenowe per kategoria (np. { "Krzesła": ["GRUPA 1", "GRUPA 2"] })
    surcharges?: Surcharge[];
    priceFactor?: number;
}

export interface TableBasedData {
    Arkusz1: UniversalProduct[];
    surcharges?: Surcharge[];
    priceFactor?: number;
}

export interface DynamicGroupsData {
    priceGroups: string[];
    dimensionLabels?: string[];
    products: UniversalProduct[];
    surcharges?: Surcharge[];
    priceFactor?: number;
}

export type ProducerData =
    | CategoryBasedData
    | ListBasedData
    | TableBasedData
    | DynamicGroupsData;

// ============================================
// KONFIGURACJA PRODUCENTA
// ============================================

export type ProducerLayoutType =
    | "category-cards"
    | "product-list"
    | "product-table"
    | "bomar"
    | "halex"
    | "mpnidzica"
    | "puszman"
    | "topline"
    | "verikon"
    | "furnirest"
    | "bestmeble";

export interface ProducerConfig {
    slug: string;
    displayName: string;
    dataFile: string;
    layoutType: ProducerLayoutType;
    title?: string;
    priceGroups?: string[];
    color?: string;
    priceFactor?: number;
    promotion?: {
        text: string;
        from?: string;
        to?: string;
        enabled?: boolean;
    };
    displayConfig?: {
        showCategories?: boolean;
        showPriceGroups?: boolean;
        showSizes?: boolean;
        showElements?: boolean;
        showMaterial?: boolean;
        showLegInfo?: boolean;
        cardStyle?: "compact" | "full";
        tableStyle?: "simple" | "full";
    };
}

// ============================================
// TYPY POMOCNICZE
// ============================================

export function isCategoryBasedData(data: any): data is CategoryBasedData {
    return (
        data &&
        typeof data.categories === "object" &&
        !Array.isArray(data.categories)
    );
}

export function isListBasedData(data: any): data is ListBasedData {
    return data && Array.isArray(data.products);
}

export function isTableBasedData(data: any): data is TableBasedData {
    return data && Array.isArray(data.Arkusz1);
}

export function isDynamicGroupsData(data: any): data is DynamicGroupsData {
    return (
        data && Array.isArray(data.priceGroups) && Array.isArray(data.products)
    );
}

export function getProductName(product: UniversalProduct): string {
    return product.name || product.MODEL || "Bez nazwy";
}

export function getProductPrices(product: UniversalProduct): PriceRecord {
    if (product.prices) return product.prices;
    if (product.price) return { Cena: product.price };

    const puszmanPrices: PriceRecord = {};
    const groups = [
        "grupa I",
        "grupa II",
        "grupa III",
        "grupa IV",
        "grupa V",
        "grupa VI",
    ];
    groups.forEach((g) => {
        if (product[g] !== undefined) puszmanPrices[g] = product[g] as number;
    });
    if (Object.keys(puszmanPrices).length > 0) return puszmanPrices;

    return {};
}

// ============================================
// LEGACY TYPES - dla kompatybilności wstecznej
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
    elements?: PriceElement[];
    priceGroups?: string[];
    previousName?: string;
    discount?: number;
    discountLabel?: string;
    priceFactor?: number;
    description?: string;
}

export interface MpNidzicaMetaData {
    company?: string;
    catalog_year?: string;
    valid_from?: string;
    contact_orders?: string;
    contact_claims?: string;
}

export interface MpNidzicaData {
    meta_data?: MpNidzicaMetaData;
    products: MpNidzicaProduct[];
    surcharges?: Surcharge[];
    priceGroups?: string[];
}

export interface BomarProductData extends UniversalProduct {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: ProductSize[];
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
    priceFactor?: number;
    discount?: number;
    discountLabel?: string;
}

export interface BomarData {
    title?: string;
    categories: Record<string, Record<string, BomarProductData>>;
    categorySettings?: Record<string, CategorySettings>;
    categoryPriceFactors?: Record<string, number>;
}

export interface PuszmanProduct extends UniversalProduct {
    Column1?: number | string;
    MODEL: string;
    "grupa I"?: number;
    "grupa II"?: number;
    "grupa III"?: number;
    "grupa IV"?: number;
    "grupa V"?: number;
    "grupa VI"?: number;
    "KOLOR NOGI"?: string;
    previousName?: string;
    discount?: number;
    discountLabel?: string;
}

export interface PuszmanData {
    Arkusz1: PuszmanProduct[];
    surcharges?: Surcharge[];
    priceFactor?: number;
}

export interface BestMebleProduct extends UniversalProduct {
    MODEL: string;
    prices: Record<string, number>;
    dimensions?: Record<string, string>;
    previousName?: string;
    discount?: number;
    discountLabel?: string;
}

export interface BestMebleData {
    priceGroups: string[];
    dimensionLabels?: string[];
    products: BestMebleProduct[];
    surcharges?: Surcharge[];
    priceFactor?: number;
}

export interface TopLineProductData extends UniversalProduct {
    image?: string;
    dimensions?: string;
    description?: string;
    price?: number;
    previousName?: string;
    discount?: number;
    discountLabel?: string;
}

export interface TopLineData {
    title?: string;
    categories: Record<string, Record<string, TopLineProductData>>;
    categorySettings?: Record<string, CategorySettings>;
    categoryPriceFactors?: Record<string, number>;
}

export interface VerikonProductData extends UniversalProduct {
    image?: string;
    material?: string;
    prices?: Record<string, number>;
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

export interface FurnirestElement {
    name: string;
    dimension?: string;
    prices: Record<string, number>;
    note?: string;
}

export interface FurnirestPriceMatrix {
    groups: string[];
    columns: string[];
    values: Record<string, Record<string, number>>;
    dimensions?: Record<string, string>;
}

export interface FurnirestProductData extends UniversalProduct {
    image?: string;
    material?: string;
    priceMatrix?: FurnirestPriceMatrix;
    elements?: FurnirestElement[];
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
    priceFactor?: number;
    discount?: number;
    discountLabel?: string;
}

export interface FurnirestData {
    title?: string;
    categories: Record<string, Record<string, FurnirestProductData>>;
    categorySettings?: Record<string, CategorySettings>;
    categoryPriceFactors?: Record<string, number>;
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
