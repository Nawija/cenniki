// ============================================
// KONFIGURACJA SCHEMATÓW EXCEL DLA PRODUCENTÓW
// ============================================

export interface PriceGroupConfig {
    name: string;
    variants?: string[]; // np. dla Halex: ["BUK", "DAB"]
}

export interface ElementField {
    key: string;
    label: string;
    type: "string" | "number" | "boolean";
    required?: boolean;
}

export interface DimensionFieldConfig {
    key: string;
    label: string;
}

export interface ProducerExcelSchema {
    slug: string;
    name: string;
    dataKey: "Arkusz1" | "products" | "categories";
    nameField: string;
    priceLocation: "direct" | "elements" | "sizes" | "prices";

    // Grupy cenowe z opcjonalnymi wariantami (BUK/DAB)
    priceGroups: PriceGroupConfig[];

    // Pola produktu
    productFields: ElementField[];

    // Pola elementu (jeśli ma elements[])
    elementFields?: ElementField[];

    // Pola rozmiaru (jeśli ma sizes[])
    sizeFields?: ElementField[];

    // Pola wymiarów do automatycznego budowania description
    dimensionFields?: {
        width?: DimensionFieldConfig;
        depth?: DimensionFieldConfig;
        height?: DimensionFieldConfig;
        sleepArea?: DimensionFieldConfig;
    };

    // Kategorie (dla categories{})
    categories?: string[];

    // Czy stoły mają sizes[]
    hasSizes?: boolean;

    // Czy produkty mają elements[]
    hasElements?: boolean;

    // Czy w Excelu nazwa produktu i element są w jednej kolumnie (np. "FIORD MEGA SOFA DL")
    combinedNameElement?: boolean;

    // Wzorce do auto-detekcji kolumn
    columnPatterns: {
        name: RegExp[];
        element?: RegExp[];
        size?: RegExp[];
        priceGroups: { group: string; patterns: RegExp[] }[];
        // Wzorce dla kolumn wymiarów
        dimensions?: {
            width?: RegExp[];
            depth?: RegExp[];
            height?: RegExp[];
            sleepArea?: RegExp[];
        };
    };
}

// ============================================
// SCHEMATY WSZYSTKICH PRODUCENTÓW
// ============================================

export const PRODUCER_SCHEMAS: Record<string, ProducerExcelSchema> = {
    puszman: {
        slug: "puszman",
        name: "Puszman",
        dataKey: "Arkusz1",
        nameField: "MODEL",
        priceLocation: "direct",
        priceGroups: [
            { name: "grupa I" },
            { name: "grupa II" },
            { name: "grupa III" },
            { name: "grupa IV" },
            { name: "grupa V" },
            { name: "grupa VI" },
        ],
        productFields: [
            { key: "MODEL", label: "Model", type: "string", required: true },
            { key: "KOLOR NOGI", label: "Kolor nogi", type: "string" },
            { key: "discount", label: "Rabat %", type: "number" },
            { key: "discountLabel", label: "Opis rabatu", type: "string" },
        ],
        columnPatterns: {
            name: [/^model$/i, /^nazwa$/i, /^produkt$/i],
            priceGroups: [
                {
                    group: "grupa VI",
                    patterns: [/^grupa\s*vi$/i, /^vi$/i, /^6$/],
                },
                { group: "grupa V", patterns: [/^grupa\s*v$/i, /^v$/i, /^5$/] },
                {
                    group: "grupa IV",
                    patterns: [/^grupa\s*iv$/i, /^iv$/i, /^4$/],
                },
                {
                    group: "grupa III",
                    patterns: [/^grupa\s*iii$/i, /^iii$/i, /^3$/],
                },
                {
                    group: "grupa II",
                    patterns: [/^grupa\s*ii$/i, /^ii$/i, /^2$/],
                },
                { group: "grupa I", patterns: [/^grupa\s*i$/i, /^i$/i, /^1$/] },
            ],
        },
    },

    benix: {
        slug: "benix",
        name: "Benix",
        dataKey: "products",
        nameField: "name",
        priceLocation: "elements",
        hasElements: true,
        priceGroups: [
            { name: "GRUPA I" },
            { name: "GRUPA II" },
            { name: "GRUPA III" },
            { name: "GRUPA IV" },
            { name: "GRUPA V" },
            { name: "GRUPA VI" },
        ],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
            { key: "discount", label: "Rabat %", type: "number" },
        ],
        elementFields: [
            {
                key: "code",
                label: "Kod elementu",
                type: "string",
                required: true,
            },
            { key: "description", label: "Opis", type: "string" },
        ],
        columnPatterns: {
            name: [
                /^nazwa$/i,
                /^produkt$/i,
                /^model$/i,
                /^name$/i,
                /^kolekcja$/i,
            ],
            element: [
                /^element$/i,
                /^kod$/i,
                /^code$/i,
                /^symbol$/i,
                /^rodzaj$/i,
                /^typ$/i,
                /^wariant$/i,
            ],
            priceGroups: [
                {
                    group: "GRUPA VI",
                    patterns: [
                        /^grupa\s*vi$/i,
                        /^grupa\s*6$/i,
                        /^g\s*vi$/i,
                        /^g\s*6$/i,
                        /^vi$/i,
                        /^6$/,
                    ],
                },
                {
                    group: "GRUPA V",
                    patterns: [
                        /^grupa\s*v$/i,
                        /^grupa\s*5$/i,
                        /^g\s*v$/i,
                        /^g\s*5$/i,
                        /^v$/i,
                        /^5$/,
                    ],
                },
                {
                    group: "GRUPA IV",
                    patterns: [
                        /^grupa\s*iv$/i,
                        /^grupa\s*4$/i,
                        /^g\s*iv$/i,
                        /^g\s*4$/i,
                        /^iv$/i,
                        /^4$/,
                    ],
                },
                {
                    group: "GRUPA III",
                    patterns: [
                        /^grupa\s*iii$/i,
                        /^grupa\s*3$/i,
                        /^g\s*iii$/i,
                        /^g\s*3$/i,
                        /^iii$/i,
                        /^3$/,
                    ],
                },
                {
                    group: "GRUPA II",
                    patterns: [
                        /^grupa\s*ii$/i,
                        /^grupa\s*2$/i,
                        /^g\s*ii$/i,
                        /^g\s*2$/i,
                        /^ii$/i,
                        /^2$/,
                    ],
                },
                {
                    group: "GRUPA I",
                    patterns: [
                        /^grupa\s*i$/i,
                        /^grupa\s*1$/i,
                        /^g\s*i$/i,
                        /^g\s*1$/i,
                        /^i$/i,
                        /^1$/,
                    ],
                },
            ],
        },
    },

    "best-meble": {
        slug: "best-meble",
        name: "Best Meble",
        dataKey: "products",
        nameField: "name",
        priceLocation: "elements",
        hasElements: true,
        priceGroups: [{ name: "Cena Brutto" }],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
        ],
        elementFields: [
            {
                key: "code",
                label: "Kod elementu",
                type: "string",
                required: true,
            },
        ],
        columnPatterns: {
            name: [/^nazwa$/i, /^nazwa\s*produktu$/i, /^produkt$/i, /^model$/i],
            element: [/^element$/i, /^kod$/i, /^kod\s*elementu$/i, /^code$/i],
            priceGroups: [
                {
                    group: "Cena Brutto",
                    patterns: [
                        /^cena$/i,
                        /^cena\s*brutto$/i,
                        /^brutto$/i,
                        /^price$/i,
                    ],
                },
            ],
        },
    },

    cristap: {
        slug: "cristap",
        name: "Cristap",
        dataKey: "products",
        nameField: "name",
        priceLocation: "elements",
        hasElements: true,
        // W Excelu od Cristap nazwa produktu i element są w jednej kolumnie "NAZWA"
        // np. "FIORD MEGA SOFA DL" = produkt "FIORD" + element "MEGA SOFA DL"
        combinedNameElement: true,
        priceGroups: [
            { name: "CLASSIC" },
            { name: "PERFEKT" },
            { name: "ELEGANCE" },
            { name: "PRESTIGE" },
            { name: "EXCLUSIVE" },
        ],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
            {
                key: "technicalImage",
                label: "Obrazek techniczny",
                type: "string",
            },
        ],
        elementFields: [
            {
                key: "code",
                label: "Kod elementu",
                type: "string",
                required: true,
            },
        ],
        columnPatterns: {
            // Kolumna NAZWA zawiera połączenie produktu i elementu
            name: [/^nazwa$/i, /^produkt$/i, /^model$/i],
            // Element nie jest wymagany jako osobna kolumna (jest w NAZWA)
            element: [/^element$/i, /^kod$/i, /^code$/i],
            priceGroups: [
                { group: "CLASSIC", patterns: [/^classic$/i] },
                { group: "PERFEKT", patterns: [/^perfekt$/i] },
                { group: "ELEGANCE", patterns: [/^elegance$/i] },
                { group: "PRESTIGE", patterns: [/^prestige$/i] },
                { group: "EXCLUSIVE", patterns: [/^exclusive$/i] },
            ],
        },
    },

    furnirest: {
        slug: "furnirest",
        name: "Furnirest",
        dataKey: "products",
        nameField: "name",
        priceLocation: "elements",
        hasElements: true,
        priceGroups: [
            { name: "BUK" },
            { name: "DĄB" },
            { name: "BUK BIAŁY lub CZARNY" },
            { name: "DĄB BIAŁY lub CZARNY" },
        ],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "category", label: "Kategoria", type: "string" },
            { key: "image", label: "Obrazek", type: "string" },
            { key: "description", label: "Opis", type: "string" },
        ],
        elementFields: [
            {
                key: "code",
                label: "Kod/Wymiar",
                type: "string",
                required: true,
            },
        ],
        columnPatterns: {
            name: [/^nazwa$/i, /^produkt$/i, /^model$/i],
            element: [/^element$/i, /^kod$/i, /^wymiar$/i],
            priceGroups: [
                {
                    group: "BUK BIAŁY lub CZARNY",
                    patterns: [/^buk\s*(bia[lł]y|czarny)/i, /^buk\s*b/i],
                },
                {
                    group: "DĄB BIAŁY lub CZARNY",
                    patterns: [/^d[aą]b\s*(bia[lł]y|czarny)/i, /^d[aą]b\s*b/i],
                },
                { group: "BUK", patterns: [/^buk$/i] },
                { group: "DĄB", patterns: [/^d[aą]b$/i] },
            ],
        },
    },

    "mp-nidzica": {
        slug: "mp-nidzica",
        name: "MP Nidzica",
        dataKey: "products",
        nameField: "name",
        priceLocation: "elements",
        hasElements: true,
        priceGroups: [
            { name: "A" },
            { name: "B" },
            { name: "C" },
            { name: "D" },
        ],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
            {
                key: "technicalImage",
                label: "Obrazek techniczny",
                type: "string",
            },
            { key: "priceFactor", label: "Mnożnik ceny", type: "number" },
        ],
        elementFields: [
            {
                key: "code",
                label: "Kod elementu",
                type: "string",
                required: true,
            },
            { key: "isCorner", label: "Element narożny", type: "boolean" },
        ],
        columnPatterns: {
            name: [/^nazwa$/i, /^produkt$/i, /^model$/i],
            element: [/^element$/i, /^kod$/i, /^code$/i],
            priceGroups: [
                { group: "A", patterns: [/^a$/i, /^grupa\s*a$/i] },
                { group: "B", patterns: [/^b$/i, /^grupa\s*b$/i] },
                { group: "C", patterns: [/^c$/i, /^grupa\s*c$/i] },
                { group: "D", patterns: [/^d$/i, /^grupa\s*d$/i] },
            ],
        },
    },

    "top-line": {
        slug: "top-line",
        name: "Top-Line",
        dataKey: "products",
        nameField: "name",
        priceLocation: "elements",
        hasElements: true,
        priceGroups: [{ name: "Cena" }],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
            { key: "discount", label: "Rabat %", type: "number" },
            { key: "isNew", label: "Nowość", type: "boolean" },
            { key: "description", label: "Opis", type: "string" },
        ],
        elementFields: [
            {
                key: "code",
                label: "Typ (Sofa/Fotel/Narożnik)",
                type: "string",
                required: true,
            },
            { key: "description", label: "Wymiary", type: "string" },
        ],
        columnPatterns: {
            name: [/^nazwa$/i, /^produkt$/i, /^model$/i],
            element: [/^element$/i, /^typ$/i, /^rodzaj$/i],
            priceGroups: [{ group: "Cena", patterns: [/^cena$/i, /^price$/i] }],
        },
    },

    zoya: {
        slug: "zoya",
        name: "Zoya",
        dataKey: "products",
        nameField: "name",
        priceLocation: "elements",
        hasElements: true,
        priceGroups: [
            { name: "Grupa I" },
            { name: "Grupa II" },
            { name: "Grupa III" },
            { name: "Grupa IV" },
        ],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
            { key: "description", label: "Opis", type: "string" },
        ],
        elementFields: [
            {
                key: "code",
                label: "Kod elementu",
                type: "string",
                required: true,
            },
            { key: "description", label: "Wymiary", type: "string" },
            { key: "image", label: "Obrazek elementu", type: "string" },
            { key: "isStatic", label: "Element statyczny", type: "boolean" },
            { key: "isEndElement", label: "Element końcowy", type: "boolean" },
        ],
        // Pola wymiarów do automatycznego budowania description
        dimensionFields: {
            width: { key: "szer", label: "Szerokość" },
            depth: { key: "gł", label: "Głębokość" },
            height: { key: "wys", label: "Wysokość" },
            sleepArea: { key: "pow. spania", label: "Powierzchnia spania" },
        },
        columnPatterns: {
            name: [
                /^nazwa$/i,
                /^produkt$/i,
                /^model$/i,
                /^nazwa\s*produkt/i,
                /^produkt.*nazwa/i,
                /^mebel$/i,
                /^kolekcja$/i,
            ],
            element: [
                /^element$/i,
                /^kod$/i,
                /^code$/i,
                /^kod\s*element/i,
                /symbol/i,
                /^el\.?$/i,
                /^oznaczenie$/i,
            ],
            // Wzorce dla kolumn wymiarów
            dimensions: {
                width: [/^szer$/i, /^szeroko/i, /^width$/i, /^sz$/i],
                depth: [/^g[łl]$/i, /^g[łl][eę]bok/i, /^depth$/i],
                height: [/^wys$/i, /^wysoko/i, /^height$/i, /^h$/i],
                sleepArea: [
                    /^pow\.?\s*spania$/i,
                    /^powierzchnia\s*spania$/i,
                    /^spanie$/i,
                ],
            },
            priceGroups: [
                {
                    group: "Grupa IV",
                    patterns: [/^grupa\s*iv$/i, /^grupa\s*4$/i, /^iv$/i, /^4$/],
                },
                {
                    group: "Grupa III",
                    patterns: [
                        /^grupa\s*iii$/i,
                        /^grupa\s*3$/i,
                        /^iii$/i,
                        /^3$/,
                    ],
                },
                {
                    group: "Grupa II",
                    patterns: [/^grupa\s*ii$/i, /^grupa\s*2$/i, /^ii$/i, /^2$/],
                },
                {
                    group: "Grupa I",
                    patterns: [/^grupa\s*i$/i, /^grupa\s*1$/i, /^i$/i, /^1$/],
                },
            ],
        },
    },

    verikon: {
        slug: "verikon",
        name: "Verikon",
        dataKey: "categories",
        nameField: "key",
        priceLocation: "prices",
        categories: ["Fotele"],
        priceGroups: [
            { name: "G1" },
            { name: "G2" },
            { name: "G3" },
            { name: "G4" },
            { name: "Skóra Hermes" },
            { name: "Skóra Toledo" },
        ],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
            { key: "material", label: "Materiał podstawy", type: "string" },
            { key: "priceFactor", label: "Mnożnik ceny", type: "number" },
        ],
        columnPatterns: {
            name: [/^nazwa$/i, /^produkt$/i, /^model$/i],
            priceGroups: [
                { group: "G1", patterns: [/^g1$/i, /^grupa\s*1$/i] },
                { group: "G2", patterns: [/^g2$/i, /^grupa\s*2$/i] },
                { group: "G3", patterns: [/^g3$/i, /^grupa\s*3$/i] },
                { group: "G4", patterns: [/^g4$/i, /^grupa\s*4$/i] },
                {
                    group: "Skóra Hermes",
                    patterns: [/^sk[oó]ra\s*hermes$/i, /^hermes$/i],
                },
                {
                    group: "Skóra Toledo",
                    patterns: [/^sk[oó]ra\s*toledo$/i, /^toledo$/i],
                },
            ],
        },
    },

    bomar: {
        slug: "bomar",
        name: "Bomar",
        dataKey: "categories",
        nameField: "key",
        priceLocation: "sizes",
        hasSizes: true,
        categories: ["stoły", "krzesła"],
        priceGroups: [
            { name: "Cena" }, // dla stołów - pojedyncza cena
            { name: "Grupa I" },
            { name: "Grupa II" },
            { name: "Grupa III" },
            { name: "Grupa IV" },
            { name: "Grupa V" },
        ],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
            { key: "material", label: "Materiał (BUK/DĄB)", type: "string" },
            { key: "category", label: "Kategoria", type: "string" },
        ],
        sizeFields: [
            {
                key: "dimension",
                label: "Wymiar",
                type: "string",
                required: true,
            },
            { key: "prices", label: "Cena", type: "number", required: true },
        ],
        columnPatterns: {
            name: [/^nazwa$/i, /^produkt$/i, /^model$/i],
            size: [/^wymiar$/i, /^rozmiar$/i, /^dimension$/i, /^size$/i],
            priceGroups: [
                { group: "Cena", patterns: [/^cena$/i, /^price$/i] },
                { group: "Grupa V", patterns: [/^grupa\s*v$/i, /^v$/i, /^5$/] },
                {
                    group: "Grupa IV",
                    patterns: [/^grupa\s*iv$/i, /^iv$/i, /^4$/],
                },
                {
                    group: "Grupa III",
                    patterns: [/^grupa\s*iii$/i, /^iii$/i, /^3$/],
                },
                {
                    group: "Grupa II",
                    patterns: [/^grupa\s*ii$/i, /^ii$/i, /^2$/],
                },
                { group: "Grupa I", patterns: [/^grupa\s*i$/i, /^i$/i, /^1$/] },
            ],
        },
    },

    halex: {
        slug: "halex",
        name: "Halex",
        dataKey: "categories",
        nameField: "key",
        priceLocation: "sizes",
        hasSizes: true,
        categories: ["Stoły", "Krzesla"],
        // HALEX MA WARIANTY BUK/DAB DLA KRZESEŁ!
        priceGroups: [
            { name: "Cena" }, // dla stołów
            { name: "Grupa I", variants: ["BUK", "DAB"] },
            { name: "Grupa II", variants: ["BUK", "DAB"] },
            { name: "Grupa III", variants: ["BUK", "DAB"] },
            { name: "Grupa IV", variants: ["BUK", "DAB"] },
            { name: "Grupa V", variants: ["BUK", "DAB"] },
            { name: "tk.pow", variants: ["BUK", "DAB"] },
        ],
        productFields: [
            {
                key: "name",
                label: "Nazwa produktu",
                type: "string",
                required: true,
            },
            { key: "image", label: "Obrazek", type: "string" },
            { key: "category", label: "Kategoria", type: "string" },
            { key: "priceFactor", label: "Mnożnik ceny", type: "number" },
        ],
        sizeFields: [
            {
                key: "dimension",
                label: "Wymiar",
                type: "string",
                required: true,
            },
            { key: "prices", label: "Cena", type: "number", required: true },
        ],
        columnPatterns: {
            name: [/^nazwa$/i, /^produkt$/i, /^model$/i],
            size: [/^wymiar$/i, /^rozmiar$/i, /^dimension$/i],
            priceGroups: [
                { group: "Cena", patterns: [/^cena$/i, /^price$/i] },
                {
                    group: "Grupa V BUK",
                    patterns: [/^grupa\s*v\s*buk$/i, /^v\s*buk$/i],
                },
                {
                    group: "Grupa V DAB",
                    patterns: [/^grupa\s*v\s*d[aą]b$/i, /^v\s*d[aą]b$/i],
                },
                {
                    group: "Grupa IV BUK",
                    patterns: [/^grupa\s*iv\s*buk$/i, /^iv\s*buk$/i],
                },
                {
                    group: "Grupa IV DAB",
                    patterns: [/^grupa\s*iv\s*d[aą]b$/i, /^iv\s*d[aą]b$/i],
                },
                {
                    group: "Grupa III BUK",
                    patterns: [/^grupa\s*iii\s*buk$/i, /^iii\s*buk$/i],
                },
                {
                    group: "Grupa III DAB",
                    patterns: [/^grupa\s*iii\s*d[aą]b$/i, /^iii\s*d[aą]b$/i],
                },
                {
                    group: "Grupa II BUK",
                    patterns: [/^grupa\s*ii\s*buk$/i, /^ii\s*buk$/i],
                },
                {
                    group: "Grupa II DAB",
                    patterns: [/^grupa\s*ii\s*d[aą]b$/i, /^ii\s*d[aą]b$/i],
                },
                {
                    group: "Grupa I BUK",
                    patterns: [/^grupa\s*i\s*buk$/i, /^i\s*buk$/i],
                },
                {
                    group: "Grupa I DAB",
                    patterns: [/^grupa\s*i\s*d[aą]b$/i, /^i\s*d[aą]b$/i],
                },
                { group: "tk.pow BUK", patterns: [/^tk\.?\s*pow\.?\s*buk$/i] },
                {
                    group: "tk.pow DAB",
                    patterns: [/^tk\.?\s*pow\.?\s*d[aą]b$/i],
                },
            ],
        },
    },
};

// ============================================
// FUNKCJE POMOCNICZE
// ============================================

/**
 * Pobierz schemat producenta
 * Jeśli nie ma zdefiniowanego schematu, spróbuj wygenerować automatycznie na podstawie danych
 */
export function getProducerSchema(
    slug: string,
    currentData?: Record<string, any>
): ProducerExcelSchema | null {
    // Najpierw sprawdź czy mamy zdefiniowany schemat
    if (PRODUCER_SCHEMAS[slug]) {
        return PRODUCER_SCHEMAS[slug];
    }

    // Jeśli nie ma schematu, ale mamy dane - wygeneruj automatycznie
    if (currentData) {
        return generateAutoSchema(slug, currentData);
    }

    return null;
}

/**
 * Automatycznie generuje schemat na podstawie danych producenta
 */
function generateAutoSchema(
    slug: string,
    data: Record<string, any>
): ProducerExcelSchema | null {
    // Sprawdź czy mamy products z elements (struktura mpnidzica/benix)
    if (data.products && Array.isArray(data.products)) {
        const products = data.products;

        // Wykryj grupy cenowe
        let priceGroups: string[] = [];

        // 1. Z globalnego priceGroups
        if (data.priceGroups && Array.isArray(data.priceGroups)) {
            priceGroups = data.priceGroups;
        }

        // 2. Z pierwszego produktu z elementami
        if (priceGroups.length === 0 && products.length > 0) {
            for (const prod of products) {
                if (prod.elements && prod.elements.length > 0) {
                    const firstElement = prod.elements[0];
                    if (firstElement.prices) {
                        priceGroups = Object.keys(firstElement.prices);
                        break;
                    }
                }
                // Lub z produktu z priceGroups
                if (prod.priceGroups && Array.isArray(prod.priceGroups)) {
                    priceGroups = prod.priceGroups;
                    break;
                }
            }
        }

        if (priceGroups.length === 0) {
            return null;
        }

        // Sprawdź czy ma elements
        const hasElements = products.some(
            (p: any) => p.elements && p.elements.length > 0
        );

        // Generuj wzorce do auto-detekcji kolumn
        const priceGroupPatterns = priceGroups.map((group) => {
            // Utwórz wzorce dla każdej grupy
            const escaped = group.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return {
                group,
                patterns: [
                    new RegExp(`^${escaped}$`, "i"),
                    new RegExp(`^${escaped.replace(/\s+/g, "\\s*")}$`, "i"),
                ],
            };
        });

        return {
            slug,
            name: slug.charAt(0).toUpperCase() + slug.slice(1),
            dataKey: "products",
            nameField: "name",
            priceLocation: hasElements ? "elements" : "direct",
            hasElements,
            priceGroups: priceGroups.map((name) => ({ name })),
            productFields: [
                {
                    key: "name",
                    label: "Nazwa produktu",
                    type: "string",
                    required: true,
                },
                { key: "image", label: "Obrazek", type: "string" },
                { key: "discount", label: "Rabat %", type: "number" },
            ],
            elementFields: hasElements
                ? [
                      {
                          key: "code",
                          label: "Kod elementu",
                          type: "string",
                          required: true,
                      },
                      { key: "description", label: "Opis", type: "string" },
                  ]
                : undefined,
            columnPatterns: {
                name: [
                    /^nazwa$/i,
                    /^produkt$/i,
                    /^model$/i,
                    /^name$/i,
                    /^kolekcja$/i,
                ],
                element: hasElements
                    ? [
                          /^element$/i,
                          /^kod$/i,
                          /^code$/i,
                          /^symbol$/i,
                          /^rodzaj$/i,
                          /^typ$/i,
                          /^wariant$/i,
                      ]
                    : undefined,
                priceGroups: priceGroupPatterns,
            },
        };
    }

    return null;
}

/**
 * Pobierz wszystkie kolumny dla szablonu Excel
 */
export function getExcelTemplateColumns(schema: ProducerExcelSchema): string[] {
    const columns: string[] = [];

    // Dla combinedNameElement - tylko jedna kolumna NAZWA (zawiera produkt + element)
    if (schema.combinedNameElement) {
        columns.push("NAZWA");
    } else {
        // Nazwa produktu
        columns.push(
            schema.productFields.find((f) => f.required)?.label || "Nazwa"
        );

        // Element/Wymiar jeśli potrzebny
        if (schema.hasElements && schema.elementFields) {
            const codeField = schema.elementFields.find(
                (f) => f.key === "code"
            );
            if (codeField) columns.push(codeField.label);
        }
        if (schema.hasSizes && schema.sizeFields) {
            const dimField = schema.sizeFields.find(
                (f) => f.key === "dimension"
            );
            if (dimField) columns.push(dimField.label);
        }
    }

    // Kolumny wymiarów (jeśli producent ma dimensionFields)
    if (schema.dimensionFields) {
        if (schema.dimensionFields.width) {
            columns.push(schema.dimensionFields.width.label);
        }
        if (schema.dimensionFields.depth) {
            columns.push(schema.dimensionFields.depth.label);
        }
        if (schema.dimensionFields.height) {
            columns.push(schema.dimensionFields.height.label);
        }
        if (schema.dimensionFields.sleepArea) {
            columns.push(schema.dimensionFields.sleepArea.label);
        }
    }

    // Grupy cenowe z wariantami
    for (const pg of schema.priceGroups) {
        if (pg.variants && pg.variants.length > 0) {
            for (const variant of pg.variants) {
                columns.push(`${pg.name} ${variant}`);
            }
        } else {
            columns.push(pg.name);
        }
    }

    // Dodatkowe pola produktu (opcjonalne)
    for (const field of schema.productFields) {
        if (!field.required && field.key !== "name" && field.key !== "MODEL") {
            columns.push(field.label);
        }
    }

    // Dodatkowe pola elementu (opcjonalne)
    if (schema.elementFields) {
        for (const field of schema.elementFields) {
            if (!field.required && field.key !== "code") {
                columns.push(field.label);
            }
        }
    }

    return columns;
}

/**
 * Levenshtein distance dla fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Znajdź najbliższe dopasowanie (fuzzy matching)
 */
export function findBestMatch(
    searchTerm: string,
    candidates: string[],
    threshold: number = 0.6
): { match: string | null; score: number; suggestions: string[] } {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    const scored = candidates.map((candidate) => {
        const normalizedCandidate = candidate.toLowerCase().trim();
        const distance = levenshteinDistance(
            normalizedSearch,
            normalizedCandidate
        );
        const maxLen = Math.max(
            normalizedSearch.length,
            normalizedCandidate.length
        );
        const similarity = maxLen > 0 ? 1 - distance / maxLen : 1;
        return { candidate, similarity };
    });

    scored.sort((a, b) => b.similarity - a.similarity);

    const bestMatch = scored[0];
    const suggestions = scored
        .filter((s) => s.similarity >= threshold * 0.7)
        .slice(0, 3)
        .map((s) => s.candidate);

    return {
        match:
            bestMatch && bestMatch.similarity >= threshold
                ? bestMatch.candidate
                : null,
        score: bestMatch?.similarity || 0,
        suggestions,
    };
}

/**
 * Typ konfliktu przy imporcie
 */
export type ConflictResolution = "overwrite" | "merge" | "skip";

export interface ImportConflict {
    type: "exists" | "different_elements" | "price_mismatch";
    productName: string;
    existingData: any;
    newData: any;
    resolution?: ConflictResolution;
}

/**
 * Wykryj konflikty między istniejącymi danymi a importowanymi
 */
export function detectConflicts(
    existingProducts: any[],
    importedProducts: any[],
    schema: ProducerExcelSchema
): ImportConflict[] {
    const conflicts: ImportConflict[] = [];
    const existingMap = new Map<string, any>();

    // Buduj mapę istniejących produktów
    for (const prod of existingProducts) {
        const name = prod[schema.nameField] || prod.name;
        if (name) {
            existingMap.set(name.toLowerCase(), prod);
        }
        // Dodaj też previousName
        if (prod.previousName) {
            existingMap.set(prod.previousName.toLowerCase(), prod);
        }
    }

    // Sprawdź każdy importowany produkt
    for (const imported of importedProducts) {
        const name = imported.name?.toLowerCase();
        if (!name) continue;

        const existing = existingMap.get(name);
        if (existing) {
            // Sprawdź różnice
            if (schema.hasElements) {
                const existingElements = existing.elements?.length || 0;
                const importedElements = imported.elements?.length || 0;

                if (existingElements !== importedElements) {
                    conflicts.push({
                        type: "different_elements",
                        productName: imported.name,
                        existingData: existing,
                        newData: imported,
                    });
                    continue;
                }
            }

            // Produkt istnieje - potencjalny konflikt cenowy
            conflicts.push({
                type: "exists",
                productName: imported.name,
                existingData: existing,
                newData: imported,
            });
        }
    }

    return conflicts;
}
