"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
    Upload,
    FileSpreadsheet,
    X,
    Check,
    Loader2,
    TrendingUp,
    TrendingDown,
    Settings2,
    ChevronDown,
    ChevronRight,
    Download,
    Sparkles,
    DollarSign,
    Package,
    AlertTriangle,
    RefreshCw,
    SkipForward,
    Merge,
    Search,
    Wand2,
    Edit3,
    ArrowRight,
    PlusCircle,
    Layers,
} from "lucide-react";
import { Button, toast } from "@/components/ui";
import * as XLSX from "xlsx";
import {
    PRODUCER_SCHEMAS,
    getProducerSchema,
    getExcelTemplateColumns,
    findBestMatch,
    detectConflicts,
    type ProducerExcelSchema,
    type ImportConflict,
    type ConflictResolution,
} from "@/lib/excelSchemas";

// ============================================
// TYPY
// ============================================

type ImportMode = "ai" | "prices" | "full";

interface PriceChange {
    id: string;
    product: string;
    previousName?: string; // stara nazwa produktu
    element?: string;
    size?: string;
    priceGroup: string;
    oldPrice: number;
    newPrice: number;
    percentChange: number;
}

interface ColumnMapping {
    name: string | null;
    element: string | null;
    size: string | null;
    priceColumns: { excelColumn: string; targetGroup: string }[];
    additionalFields: { excelColumn: string; targetField: string }[];
    // Kolumny wymiarów (do budowania description)
    dimensions: {
        width: string | null; // szer
        depth: string | null; // gł
        height: string | null; // wys
        sleepArea: string | null; // pow. spania
    };
}

interface MatchStats {
    matched: number;
    notFound: string[];
    suggestions: {
        name: string;
        bestMatch: string | null;
        allSuggestions: string[];
    }[];
    totalExcel: number;
}

// Zmiana opisu elementu
interface DescriptionChange {
    product: string;
    element: string;
    oldDescription: string;
    newDescription: string;
}

// Nowy element do dodania
interface NewElementToAdd {
    product: string;
    element: string;
    prices: Record<string, number>;
    description?: string;
    selected: boolean;
}

// Statystyki porównania Excel vs Baza
interface ComparisonStats {
    // Produkty
    productsInExcel: string[];
    productsInDb: string[];
    missingInExcel: string[]; // produkty z bazy których nie ma w Excel
    newInExcel: string[]; // produkty z Excel których nie ma w bazie
    // Elementy (dla schematów z elements)
    elementsInExcel: { product: string; element: string }[];
    elementsInDb: { product: string; element: string }[];
    missingElementsInExcel: { product: string; element: string }[];
    newElementsInExcel: { product: string; element: string }[];
}

// Mapowanie nazw: nazwa z Excel -> nowa nazwa (dla pełnego importu)
interface NameMapping {
    excelName: string;
    matchedProduct: string | null; // produkt który znaleziono (lub null)
    newName: string; // nowa nazwa do ustawienia
    useAsSuggestion: boolean; // czy użyć sugestii AI
}

// Nowy produkt do dodania (tryb full)
interface NewProduct {
    excelName: string; // nazwa z Excel
    newName: string; // nowa nazwa (domyślnie = excelName)
    category?: string; // kategoria (dla layoutów z kategoriami)
    elements: { code: string; prices: Record<string, number> }[];
    prices?: Record<string, number>; // dla produktów bez elementów
    sizes?: { dimension: string; prices: number }[];
    selected: boolean; // czy dodać ten produkt
}

interface Props {
    producerSlug: string;
    producerName?: string;
    layoutType: string;
    currentData: Record<string, any>;
    onApplyChanges: (
        newData: Record<string, any>,
        changes?: {
            changes: PriceChange[];
            summary: {
                totalChanges: number;
                priceIncrease: number;
                priceDecrease: number;
                avgChangePercent: number;
            };
        }
    ) => void;
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export function ExcelImportCenter({
    producerSlug,
    producerName,
    layoutType,
    currentData,
    onApplyChanges,
}: Props) {
    // Pobierz schemat producenta (z przekazaniem danych do auto-generacji)
    const schema = useMemo(
        () => getProducerSchema(producerSlug, currentData),
        [producerSlug, currentData]
    );

    // Stan
    const [mode, setMode] = useState<ImportMode | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [excelData, setExcelData] = useState<any[][] | null>(null);
    const [excelColumns, setExcelColumns] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
        name: null,
        element: null,
        size: null,
        priceColumns: [],
        additionalFields: [],
        dimensions: {
            width: null,
            depth: null,
            height: null,
            sleepArea: null,
        },
    });
    const [changes, setChanges] = useState<PriceChange[]>([]);
    const [selectedChanges, setSelectedChanges] = useState<Set<string>>(
        new Set()
    );
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set()
    );
    const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
    const [conflicts, setConflicts] = useState<ImportConflict[]>([]);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Nowe stany dla mapowania nazw i AI sugestii
    const [nameMapping, setNameMapping] = useState<Map<string, NameMapping>>(
        new Map()
    );
    const [showNameMappingStep, setShowNameMappingStep] = useState(false);
    const [appliedAISuggestions, setAppliedAISuggestions] = useState<
        Set<string>
    >(new Set());

    // Nowe produkty do dodania (tryb full)
    const [newProducts, setNewProducts] = useState<NewProduct[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>(
        []
    );

    // Statystyki porównania Excel vs Baza
    const [comparisonStats, setComparisonStats] =
        useState<ComparisonStats | null>(null);

    // Mapa opisów elementów z Excel (klucz: "nazwaProductu|kodElementu" -> description)
    const [elementDescriptions, setElementDescriptions] = useState<
        Map<string, string>
    >(new Map());

    // Lista zmian opisów (dla podglądu)
    const [descriptionChanges, setDescriptionChanges] = useState<
        DescriptionChange[]
    >([]);

    // Nowe elementy do dodania
    const [newElementsToAdd, setNewElementsToAdd] = useState<NewElementToAdd[]>(
        []
    );

    // Filtrowane elementy - tylko te dla produktów z bazy (uwzględniając previousName)
    // lub dla zaznaczonych nowych produktów
    const filteredNewElements = useMemo(() => {
        if (!schema || newElementsToAdd.length === 0) return [];

        // Zbuduj zbiór produktów z bazy (name i previousName)
        const dbProductNames = new Set<string>();
        if (schema.dataKey === "products" && currentData.products) {
            for (const p of currentData.products) {
                if (p.name) dbProductNames.add(p.name.toLowerCase());
                if (p.previousName)
                    dbProductNames.add(p.previousName.toLowerCase());
            }
        } else if (schema.dataKey === "Arkusz1" && currentData.Arkusz1) {
            for (const p of currentData.Arkusz1) {
                if (p.MODEL) dbProductNames.add(p.MODEL.toLowerCase());
                if (p.previousName)
                    dbProductNames.add(p.previousName.toLowerCase());
            }
        }

        // Zbuduj zbiór zaznaczonych nowych produktów
        const selectedNewProductNames = new Set<string>();
        for (const np of newProducts) {
            if (np.selected) {
                selectedNewProductNames.add(np.excelName.toLowerCase());
                selectedNewProductNames.add(np.newName.toLowerCase());
            }
        }

        // Filtruj elementy
        return newElementsToAdd.filter((el) => {
            const prodLower = el.product.toLowerCase();
            return (
                dbProductNames.has(prodLower) ||
                selectedNewProductNames.has(prodLower)
            );
        });
    }, [newElementsToAdd, currentData, schema, newProducts]);

    // Mapa previousName -> actualName (dla wyświetlania "Soho (CUBE)")
    const previousNameToActualName = useMemo(() => {
        const map = new Map<string, string>();
        if (!schema) return map;

        if (schema.dataKey === "products" && currentData.products) {
            for (const p of currentData.products) {
                if (p.previousName && p.name) {
                    map.set(p.previousName.toLowerCase(), p.name);
                }
            }
        } else if (schema.dataKey === "Arkusz1" && currentData.Arkusz1) {
            for (const p of currentData.Arkusz1) {
                if (p.previousName && p.MODEL) {
                    map.set(p.previousName.toLowerCase(), p.MODEL);
                }
            }
        }
        return map;
    }, [currentData, schema]);

    // Jeśli brak schematu - nie renderuj
    if (!schema) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-yellow-700">
                    Brak konfiguracji importu Excel dla tego producenta
                </p>
            </div>
        );
    }

    // ============================================
    // GENEROWANIE SZABLONU EXCEL
    // ============================================

    const generateTemplate = useCallback(() => {
        const columns = getExcelTemplateColumns(schema);

        // Przygotuj dane - WSZYSTKIE produkty z bazy
        const sampleData: any[] = [];

        // Pobierz WSZYSTKIE produkty z currentData
        let products: any[] = [];
        if (schema.dataKey === "Arkusz1" && currentData.Arkusz1) {
            products = currentData.Arkusz1; // wszystkie produkty
        } else if (schema.dataKey === "products" && currentData.products) {
            products = currentData.products; // wszystkie produkty
        } else if (schema.dataKey === "categories" && currentData.categories) {
            // Dla categories - zbierz produkty z wszystkich kategorii
            for (const [catName, catProducts] of Object.entries(
                currentData.categories
            )) {
                for (const [prodName, prodData] of Object.entries(
                    catProducts as Record<string, any>
                )) {
                    products.push({
                        name: prodName,
                        category: catName,
                        ...(prodData as object),
                    });
                }
            }
        }

        // Konwertuj produkty na wiersze
        for (const prod of products) {
            if (schema.hasElements && prod.elements) {
                // Jeden wiersz na element - WSZYSTKIE elementy
                for (const el of prod.elements) {
                    // Pomiń separatory
                    if (el.type === "separator") continue;

                    const row: any = {};
                    const productName =
                        prod.name || prod.MODEL || prod[schema.nameField];

                    // Dla combinedNameElement - połącz nazwę produktu i element w jednej kolumnie NAZWA
                    if (schema.combinedNameElement) {
                        row[columns[0]] = `${productName} ${el.code}`.trim();
                    } else {
                        row[columns[0]] = productName;

                        // Dodaj element jako osobną kolumnę
                        const elementColIndex = columns.findIndex(
                            (c) =>
                                c.toLowerCase().includes("element") ||
                                c.toLowerCase().includes("kod") ||
                                c.toLowerCase().includes("wymiar")
                        );
                        if (elementColIndex >= 0) {
                            row[columns[elementColIndex]] = el.code;
                        }
                    }

                    // Dodaj wymiary z description (jeśli producent ma dimensionFields)
                    if (schema.dimensionFields && el.description) {
                        // Parsuj description np. "112 x 100 h90 , pow. spania - 80X205"
                        const desc = el.description;

                        // Szerokość - pierwsza liczba
                        if (schema.dimensionFields.width) {
                            const widthMatch = desc.match(/^(\d+)/);
                            if (widthMatch) {
                                row[schema.dimensionFields.width.label] =
                                    widthMatch[1];
                            }
                        }

                        // Głębokość - liczba po "x" lub "×"
                        if (schema.dimensionFields.depth) {
                            const depthMatch = desc.match(/[x×]\s*(\d+)/i);
                            if (depthMatch) {
                                row[schema.dimensionFields.depth.label] =
                                    depthMatch[1];
                            }
                        }

                        // Wysokość - liczba po "h" lub "wys"
                        if (schema.dimensionFields.height) {
                            const heightMatch =
                                desc.match(/h\s*(\d+)/i) ||
                                desc.match(/wys[:\s]*(\d+)/i);
                            if (heightMatch) {
                                row[schema.dimensionFields.height.label] =
                                    heightMatch[1];
                            }
                        }

                        // Pow. spania - po "pow. spania" lub "spania"
                        if (schema.dimensionFields.sleepArea) {
                            const sleepMatch =
                                desc.match(
                                    /pow\.?\s*spania\s*[-–:]\s*([^\s,]+)/i
                                ) || desc.match(/spania\s*[-–:]\s*([^\s,]+)/i);
                            if (sleepMatch) {
                                row[schema.dimensionFields.sleepArea.label] =
                                    sleepMatch[1];
                            }
                        }
                    }

                    // Dodaj ceny
                    if (el.prices) {
                        for (const pg of schema.priceGroups) {
                            if (pg.variants) {
                                for (const variant of pg.variants) {
                                    const colName = `${pg.name} ${variant}`;
                                    if (columns.includes(colName)) {
                                        row[colName] =
                                            el.prices[pg.name]?.[variant] || "";
                                    }
                                }
                            } else {
                                if (columns.includes(pg.name)) {
                                    row[pg.name] = el.prices[pg.name] || "";
                                }
                            }
                        }
                    }

                    sampleData.push(row);
                }
            } else if (schema.hasSizes && prod.sizes) {
                // Jeden wiersz na rozmiar - WSZYSTKIE rozmiary
                for (const size of prod.sizes) {
                    const row: any = {};
                    row[columns[0]] = prod.name || prod[schema.nameField];

                    const sizeColIndex = columns.findIndex(
                        (c) =>
                            c.toLowerCase().includes("wymiar") ||
                            c.toLowerCase().includes("rozmiar")
                    );
                    if (sizeColIndex >= 0) {
                        row[columns[sizeColIndex]] = size.dimension;
                    }

                    // Cena dla stołów
                    if (columns.includes("Cena")) {
                        row["Cena"] = size.prices || "";
                    }

                    // Ceny dla grup (Halex krzesła)
                    if (
                        typeof size.prices === "object" &&
                        size.prices !== null
                    ) {
                        for (const pg of schema.priceGroups) {
                            if (pg.variants) {
                                for (const variant of pg.variants) {
                                    const colName = `${pg.name} ${variant}`;
                                    if (columns.includes(colName)) {
                                        row[colName] =
                                            size.prices[pg.name]?.[variant] ||
                                            "";
                                    }
                                }
                            } else if (pg.name !== "Cena") {
                                if (columns.includes(pg.name)) {
                                    row[pg.name] = size.prices[pg.name] || "";
                                }
                            }
                        }
                    }

                    sampleData.push(row);
                }
            } else {
                // Prosty produkt (puszman)
                const row: any = {};
                row[columns[0]] =
                    prod.name || prod.MODEL || prod[schema.nameField];

                // Dodaj ceny
                for (const pg of schema.priceGroups) {
                    if (columns.includes(pg.name)) {
                        row[pg.name] =
                            prod[pg.name] || prod.prices?.[pg.name] || "";
                    }
                }

                sampleData.push(row);
            }
        }

        // Stwórz arkusz
        const ws = XLSX.utils.json_to_sheet(
            sampleData.length > 0 ? sampleData : [{}],
            {
                header: columns,
            }
        );

        // Ustaw szerokości kolumn
        ws["!cols"] = columns.map(() => ({ wch: 15 }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dane");

        // Pobierz plik
        XLSX.writeFile(wb, `szablon_${producerSlug}.xlsx`);
        toast.success("Szablon Excel został pobrany");
    }, [schema, currentData, producerSlug]);

    // ============================================
    // OBSŁUGA PLIKU
    // ============================================

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && isExcelFile(file)) {
                processExcelFile(file);
            } else {
                toast.error("Proszę wybrać plik Excel (.xlsx, .xls, .ods)");
            }
        },
        [mode]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file && isExcelFile(file)) {
                processExcelFile(file);
            } else if (file) {
                toast.error("Proszę wybrać plik Excel (.xlsx, .xls, .ods)");
            }
        },
        [mode]
    );

    const isExcelFile = (file: File) => {
        return (
            file.type ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.type === "application/vnd.ms-excel" ||
            file.type === "application/vnd.oasis.opendocument.spreadsheet" ||
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls") ||
            file.name.endsWith(".ods")
        );
    };

    // ============================================
    // PRZETWARZANIE EXCEL
    // ============================================

    const processExcelFile = async (file: File) => {
        setIsProcessing(true);
        setSelectedFile(file);
        setChanges([]);
        setSelectedChanges(new Set());
        setConflicts([]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(uint8Array, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                toast.error("Plik Excel nie zawiera żadnych arkuszy");
                return;
            }
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: "",
            }) as any[][];

            if (data.length < 2) {
                toast.error("Plik Excel jest pusty lub ma za mało danych");
                return;
            }

            const headers = data[0].map((h: any) =>
                h ? String(h).trim() : ""
            );
            setExcelColumns(headers);
            setExcelData(data);

            // Auto-mapowanie kolumn
            const autoMapping = autoDetectColumns(headers);
            setColumnMapping(autoMapping);

            // Logowanie do debugowania
            console.log("Excel headers:", headers);
            console.log("Auto mapping:", autoMapping);

            // Oblicz zmiany
            if (autoMapping.name && autoMapping.priceColumns.length > 0) {
                calculateChanges(data, autoMapping);
            } else {
                // Pokaż ostrzeżenie jeśli nie wykryto kolumn
                if (!autoMapping.name) {
                    toast.error(
                        "Nie wykryto kolumny z nazwą produktu. Sprawdź nagłówki w Excelu."
                    );
                } else if (autoMapping.priceColumns.length === 0) {
                    toast.error(
                        `Nie wykryto kolumn z cenami. Nagłówki w pliku: ${headers
                            .slice(0, 10)
                            .join(", ")}${headers.length > 10 ? "..." : ""}`
                    );
                }
            }

            // Inicjalizuj rozwinięte grupy
            setExpandedGroups(new Set(schema.priceGroups.map((pg) => pg.name)));
        } catch (error) {
            console.error("Błąd podczas czytania pliku Excel:", error);
            toast.error(
                `Błąd: ${
                    error instanceof Error ? error.message : "Nieznany błąd"
                }`
            );
        } finally {
            setIsProcessing(false);
        }
    };

    // ============================================
    // AUTO-DETEKCJA KOLUMN
    // ============================================

    const autoDetectColumns = (headers: string[]): ColumnMapping => {
        const mapping: ColumnMapping = {
            name: null,
            element: null,
            size: null,
            priceColumns: [],
            additionalFields: [],
            dimensions: {
                width: null,
                depth: null,
                height: null,
                sleepArea: null,
            },
        };

        // Szukaj kolumny nazwy
        for (const header of headers) {
            for (const pattern of schema.columnPatterns.name) {
                if (pattern.test(header)) {
                    mapping.name = header;
                    break;
                }
            }
            if (mapping.name) break;
        }

        // Szukaj kolumny elementu
        if (schema.hasElements && schema.columnPatterns.element) {
            for (const header of headers) {
                for (const pattern of schema.columnPatterns.element) {
                    if (pattern.test(header)) {
                        mapping.element = header;
                        break;
                    }
                }
                if (mapping.element) break;
            }
        }

        // Szukaj kolumny rozmiaru
        if (schema.hasSizes && schema.columnPatterns.size) {
            for (const header of headers) {
                for (const pattern of schema.columnPatterns.size) {
                    if (pattern.test(header)) {
                        mapping.size = header;
                        break;
                    }
                }
                if (mapping.size) break;
            }
        }

        // Szukaj kolumn wymiarów (dla schematów które je mają)
        if (schema.columnPatterns.dimensions) {
            const dims = schema.columnPatterns.dimensions;

            for (const header of headers) {
                const normalizedHeader = header.trim();

                // Szerokość
                if (!mapping.dimensions.width && dims.width) {
                    for (const pattern of dims.width) {
                        if (pattern.test(normalizedHeader)) {
                            mapping.dimensions.width = header;
                            break;
                        }
                    }
                }

                // Głębokość
                if (!mapping.dimensions.depth && dims.depth) {
                    for (const pattern of dims.depth) {
                        if (pattern.test(normalizedHeader)) {
                            mapping.dimensions.depth = header;
                            break;
                        }
                    }
                }

                // Wysokość
                if (!mapping.dimensions.height && dims.height) {
                    for (const pattern of dims.height) {
                        if (pattern.test(normalizedHeader)) {
                            mapping.dimensions.height = header;
                            break;
                        }
                    }
                }

                // Powierzchnia spania
                if (!mapping.dimensions.sleepArea && dims.sleepArea) {
                    for (const pattern of dims.sleepArea) {
                        if (pattern.test(normalizedHeader)) {
                            mapping.dimensions.sleepArea = header;
                            break;
                        }
                    }
                }
            }
        }

        // Szukaj grup cenowych
        for (const header of headers) {
            const normalizedHeader = header.trim();

            for (const { group, patterns } of schema.columnPatterns
                .priceGroups) {
                if (
                    mapping.priceColumns.some((pc) => pc.targetGroup === group)
                ) {
                    continue;
                }

                for (const pattern of patterns) {
                    if (pattern.test(normalizedHeader)) {
                        mapping.priceColumns.push({
                            excelColumn: header,
                            targetGroup: group,
                        });
                        break;
                    }
                }
            }
        }

        return mapping;
    };

    // Funkcja budująca description z wymiarów
    const buildDescription = (
        row: any[],
        headers: string[],
        dimensions: ColumnMapping["dimensions"]
    ): string | null => {
        const widthIdx = dimensions.width
            ? headers.indexOf(dimensions.width)
            : -1;
        const depthIdx = dimensions.depth
            ? headers.indexOf(dimensions.depth)
            : -1;
        const heightIdx = dimensions.height
            ? headers.indexOf(dimensions.height)
            : -1;
        const sleepIdx = dimensions.sleepArea
            ? headers.indexOf(dimensions.sleepArea)
            : -1;

        const width = widthIdx >= 0 ? String(row[widthIdx] || "").trim() : "";
        const depth = depthIdx >= 0 ? String(row[depthIdx] || "").trim() : "";
        const height =
            heightIdx >= 0 ? String(row[heightIdx] || "").trim() : "";
        let sleepArea = sleepIdx >= 0 ? String(row[sleepIdx] || "").trim() : "";

        // Jeśli pow. spania to "X" lub "-" lub pusta, ignoruj
        if (
            sleepArea.toUpperCase() === "X" ||
            sleepArea === "-" ||
            sleepArea === ""
        ) {
            sleepArea = "";
        }

        // Jeśli nie ma żadnych wymiarów, zwróć null
        if (!width && !depth && !height && !sleepArea) {
            return null;
        }

        // Buduj description w formacie: "112 x 100 h90 , pow. spania - 80X205"
        let desc = "";

        // Wymiary podstawowe: szer x gł hwys
        if (width || depth || height) {
            const parts: string[] = [];
            if (width) parts.push(width);
            if (depth) parts.push(depth);

            if (parts.length > 0) {
                desc = parts.join(" x ");
            }

            if (height) {
                desc += (desc ? " " : "") + "h" + height;
            }
        }

        // Powierzchnia spania (tylko jeśli ma wartość)
        if (sleepArea) {
            if (desc) {
                desc += " , pow. spania - " + sleepArea;
            } else {
                desc = "pow. spania - " + sleepArea;
            }
        }

        return desc || null;
    };

    // ============================================
    // OBLICZANIE ZMIAN Z FUZZY MATCHING
    // ============================================

    const calculateChanges = (
        data: any[][],
        mapping: ColumnMapping,
        forcedMappings?: Map<string, string>
    ) => {
        if (!mapping.name || mapping.priceColumns.length === 0) {
            setChanges([]);
            setMatchStats(null);
            return;
        }

        // Ustaw spinner i opóźnij obliczenia żeby UI się zaktualizowało
        setIsCalculating(true);

        setTimeout(() => {
            try {
                calculateChangesSync(data, mapping, forcedMappings);
            } finally {
                setIsCalculating(false);
            }
        }, 50);
    };

    const calculateChangesSync = (
        data: any[][],
        mapping: ColumnMapping,
        forcedMappings?: Map<string, string>
    ) => {
        const headers = data[0];
        const nameIndex = headers.indexOf(mapping.name!);
        const elementIndex = mapping.element
            ? headers.indexOf(mapping.element)
            : -1;
        const sizeIndex = mapping.size ? headers.indexOf(mapping.size) : -1;
        const priceIndices = mapping.priceColumns.map((pc) => ({
            index: headers.indexOf(pc.excelColumn),
            targetGroup: pc.targetGroup,
        }));

        if (nameIndex === -1) {
            toast.error("Nie znaleziono kolumny z nazwą");
            return;
        }

        const newChanges: PriceChange[] = [];
        const notFound: string[] = [];
        const suggestions: MatchStats["suggestions"] = [];
        let matchedCount = 0;

        // Dla trybu FULL - zbieramy nowe produkty
        const newProductsMap = new Map<string, NewProduct>();

        // Mapa opisów elementów z Excel (klucz: "nazwaProductu|kodElementu" -> description)
        const elementDescsMap = new Map<string, string>();

        // Buduj mapę produktów (uwzględnia previousName)
        const productMap = buildProductMap();
        const allProductNames = Array.from(productMap.keys());

        // Pobierz dostępne kategorie (dla layoutów z kategoriami)
        const categories: string[] = [];
        if (schema.dataKey === "categories" && currentData.categories) {
            categories.push(...Object.keys(currentData.categories));
        }
        setAvailableCategories(categories);

        // Helper: dla combinedNameElement parsuj "NAZWA PRODUKTU ELEMENT" na części
        const parseCombinedName = (
            fullName: string
        ): { productName: string; elementCode: string } | null => {
            if (!schema.combinedNameElement) return null;

            // Pobierz produkty z odpowiedniego źródła
            const products: any[] =
                currentData.products ||
                currentData.Arkusz1 ||
                (currentData.categories
                    ? Object.values(currentData.categories).flatMap(
                          (cat: any) =>
                              Object.entries(cat).map(([name, data]) => ({
                                  name,
                                  ...(data as object),
                              }))
                      )
                    : []);

            const fullNameUpper = fullName.toUpperCase();

            // Szukaj najdłuższego dopasowania (żeby "COTTO GRANDE" miało priorytet nad "COTTO")
            let bestMatch: {
                productName: string;
                elementCode: string;
                matchLength: number;
            } | null = null;

            for (const prod of products) {
                // Zbierz wszystkie możliwe nazwy produktu (name, previousName, MODEL)
                const namesToCheck = [
                    {
                        matchName: prod.name?.toUpperCase(),
                        originalName: prod.name,
                    },
                    {
                        matchName: prod.previousName?.toUpperCase(),
                        originalName: prod.previousName,
                    },
                    {
                        matchName: prod.MODEL?.toUpperCase(),
                        originalName: prod.MODEL,
                    },
                ].filter((n) => n.matchName);

                for (const { matchName, originalName } of namesToCheck) {
                    if (
                        matchName &&
                        fullNameUpper.startsWith(matchName + " ")
                    ) {
                        // Znaleziono dopasowanie - sprawdź czy jest dłuższe niż poprzednie
                        if (
                            !bestMatch ||
                            matchName.length > bestMatch.matchLength
                        ) {
                            const elementPart = fullName
                                .substring(matchName.length)
                                .trim();
                            bestMatch = {
                                // Zwróć oryginalną nazwę (może być previousName) - productMap ją znajdzie
                                productName: originalName,
                                elementCode: elementPart.toUpperCase(),
                                matchLength: matchName.length,
                            };
                        }
                    }
                }
            }

            return bestMatch
                ? {
                      productName: bestMatch.productName,
                      elementCode: bestMatch.elementCode,
                  }
                : null;
        };

        // Przetwórz wiersze
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            let excelName = row[nameIndex] ? String(row[nameIndex]).trim() : "";
            if (!excelName) continue;

            // Dla combinedNameElement - parsuj nazwę i element z jednej kolumny
            let parsedElement = "";
            if (schema.combinedNameElement) {
                const parsed = parseCombinedName(excelName);
                if (parsed) {
                    excelName = parsed.productName; // np. "FIORD" -> zmapowane na "ZEN"
                    parsedElement = parsed.elementCode; // np. "MEGA SOFA DL"
                }
            }

            const excelKey = excelName.toLowerCase();
            let currentProd = productMap.get(excelKey);
            let usedFuzzyMatch = false;

            // Sprawdź czy mamy wymuszone mapowanie z AI
            if (!currentProd && forcedMappings?.has(excelName)) {
                const forcedMatch = forcedMappings.get(excelName)!;
                currentProd = productMap.get(forcedMatch.toLowerCase());
            }

            // FUZZY MATCHING - tylko dla trybu AI Smart
            if (!currentProd && mode === "ai") {
                const fuzzyResult = findBestMatch(
                    excelName,
                    allProductNames,
                    0.6
                );

                if (fuzzyResult.match) {
                    currentProd = productMap.get(
                        fuzzyResult.match.toLowerCase()
                    );
                    usedFuzzyMatch = true;
                    suggestions.push({
                        name: excelName,
                        bestMatch: fuzzyResult.match,
                        allSuggestions: fuzzyResult.suggestions,
                    });
                } else if (fuzzyResult.suggestions.length > 0) {
                    suggestions.push({
                        name: excelName,
                        bestMatch: null,
                        allSuggestions: fuzzyResult.suggestions,
                    });
                }
            }

            // Tryb "prices" - tylko dokładne dopasowanie (już sprawdzono przez productMap które zawiera previousName)
            // Tryb "full" - zbiera nowe produkty do dodania

            if (!currentProd) {
                notFound.push(excelName);

                // Dla trybu "prices" sugeruj możliwe dopasowania
                if (mode === "prices") {
                    const fuzzyResult = findBestMatch(
                        excelName,
                        allProductNames,
                        0.5
                    );
                    if (fuzzyResult.suggestions.length > 0) {
                        suggestions.push({
                            name: excelName,
                            bestMatch: null,
                            allSuggestions: fuzzyResult.suggestions,
                        });
                    }
                }

                // Dla trybu "full" - zbierz dane nowego produktu
                if (mode === "full") {
                    // Użyj parsedElement z combinedNameElement lub oddzielnej kolumny
                    const excelElement =
                        parsedElement ||
                        (elementIndex >= 0
                            ? String(row[elementIndex] || "").trim()
                            : "");
                    const excelSize =
                        sizeIndex >= 0
                            ? String(row[sizeIndex] || "").trim()
                            : "";

                    // Zbierz ceny z wiersza
                    const rowPrices: Record<string, number> = {};
                    for (const { index, targetGroup } of priceIndices) {
                        if (index === -1) continue;
                        const price = parsePrice(row[index]);
                        if (price !== null) {
                            rowPrices[targetGroup] = price;
                        }
                    }

                    // Dodaj do mapy nowych produktów
                    if (!newProductsMap.has(excelName)) {
                        newProductsMap.set(excelName, {
                            excelName,
                            newName: excelName, // domyślnie ta sama nazwa
                            category: categories[0] || "", // pierwsza kategoria jako domyślna
                            elements: [],
                            prices: schema.hasElements ? undefined : rowPrices,
                            sizes: schema.hasSizes ? [] : undefined,
                            selected: true,
                        });
                    }

                    const newProd = newProductsMap.get(excelName)!;

                    // Dodaj element jeśli schemat ma elementy
                    if (schema.hasElements && excelElement) {
                        const existingEl = newProd.elements.find(
                            (e) => e.code === excelElement
                        );
                        if (existingEl) {
                            Object.assign(existingEl.prices, rowPrices);
                        } else {
                            // Buduj description z wymiarów
                            const desc = buildDescription(
                                row,
                                headers,
                                mapping.dimensions
                            );
                            const newElement: any = {
                                code: excelElement,
                                prices: rowPrices,
                            };
                            if (desc) {
                                newElement.description = desc;
                            }
                            newProd.elements.push(newElement);
                        }
                    } else if (!schema.hasElements) {
                        // Produkty bez elementów - ceny bezpośrednie
                        newProd.prices = { ...newProd.prices, ...rowPrices };
                    }

                    // Dodaj rozmiar jeśli schemat ma sizes
                    if (schema.hasSizes && excelSize && rowPrices["Cena"]) {
                        const existingSize = newProd.sizes?.find(
                            (s) => s.dimension === excelSize
                        );
                        if (!existingSize) {
                            newProd.sizes?.push({
                                dimension: excelSize,
                                prices: rowPrices["Cena"],
                            });
                        }
                    }
                }

                continue;
            }

            matchedCount++;
            const prodName =
                currentProd.name ||
                currentProd.MODEL ||
                currentProd[schema.nameField];
            const prevName = currentProd.previousName; // pobierz poprzednią nazwę

            // Oblicz zmiany cen w zależności od struktury
            // Użyj parsedElement z combinedNameElement lub oddzielnej kolumny
            const excelElement =
                parsedElement ||
                (elementIndex >= 0
                    ? String(row[elementIndex] || "").trim()
                    : "");
            const excelSize =
                sizeIndex >= 0 ? String(row[sizeIndex] || "").trim() : "";

            // Puszman - ceny bezpośrednie
            if (schema.priceLocation === "direct") {
                for (const { index, targetGroup } of priceIndices) {
                    if (index === -1) continue;
                    const newPrice = parsePrice(row[index]);
                    const oldPrice = currentProd[targetGroup];

                    if (
                        newPrice !== null &&
                        oldPrice !== undefined &&
                        newPrice !== oldPrice
                    ) {
                        const percentChange =
                            ((newPrice - oldPrice) / oldPrice) * 100;
                        newChanges.push({
                            id: `${prodName}-${targetGroup}`,
                            product: prodName,
                            previousName: prevName,
                            priceGroup: targetGroup,
                            oldPrice,
                            newPrice,
                            percentChange: Math.round(percentChange * 10) / 10,
                        });
                    }
                }
            }

            // Products z elements
            else if (
                schema.priceLocation === "elements" &&
                currentProd.elements
            ) {
                const elementsToUpdate = excelElement
                    ? currentProd.elements.filter(
                          (el: any) =>
                              (el.code || "").trim().toLowerCase() ===
                              excelElement.toLowerCase()
                      )
                    : currentProd.elements;

                // Zbierz description z wymiarów dla tego wiersza
                // TYLKO W TRYBIE FULL - w trybie "price" zmieniamy tylko ceny!
                const hasDimensionColumns =
                    mapping.dimensions &&
                    (mapping.dimensions.width ||
                        mapping.dimensions.depth ||
                        mapping.dimensions.height ||
                        mapping.dimensions.sleepArea);

                if (mode === "full" && excelElement && hasDimensionColumns) {
                    const desc = buildDescription(
                        row,
                        headers,
                        mapping.dimensions
                    );
                    if (desc) {
                        // Klucz: "nazwaProductu|kodElementu"
                        const descKey = `${prodName.toLowerCase()}|${excelElement.toLowerCase()}`;
                        elementDescsMap.set(descKey, desc);
                    }
                }

                for (const element of elementsToUpdate) {
                    if (!element.prices) continue;

                    for (const { index, targetGroup } of priceIndices) {
                        if (index === -1) continue;

                        // Obsługa wariantów BUK/DAB
                        const [baseGroup, variant] = targetGroup.includes(" ")
                            ? targetGroup
                                  .split(" ")
                                  .slice(0, -1)
                                  .join(" ")
                                  .split(/\s+(?=[A-Z]+$)/)
                            : [targetGroup, null];

                        let oldPrice: number | undefined;
                        if (
                            variant &&
                            element.prices[baseGroup]?.[variant] !== undefined
                        ) {
                            oldPrice = element.prices[baseGroup][variant];
                        } else {
                            oldPrice = element.prices[targetGroup];
                        }

                        const newPrice = parsePrice(row[index]);

                        if (
                            newPrice !== null &&
                            oldPrice !== undefined &&
                            newPrice !== oldPrice
                        ) {
                            const percentChange =
                                ((newPrice - oldPrice) / oldPrice) * 100;
                            newChanges.push({
                                id: `${prodName}-${element.code}-${targetGroup}`,
                                product: prodName,
                                previousName: prevName,
                                element: element.code,
                                priceGroup: targetGroup,
                                oldPrice,
                                newPrice,
                                percentChange:
                                    Math.round(percentChange * 10) / 10,
                            });
                        }
                    }
                }
            }

            // Categories z sizes (stoły)
            else if (schema.priceLocation === "sizes" && currentProd.sizes) {
                const sizesToUpdate = excelSize
                    ? currentProd.sizes.filter(
                          (s: any) =>
                              s.dimension?.toLowerCase() ===
                              excelSize.toLowerCase()
                      )
                    : currentProd.sizes;

                for (const sizeObj of sizesToUpdate) {
                    for (const { index, targetGroup } of priceIndices) {
                        if (index === -1 || targetGroup !== "Cena") continue;
                        const newPrice = parsePrice(row[index]);
                        const oldPrice = sizeObj.prices;

                        if (
                            newPrice !== null &&
                            typeof oldPrice === "number" &&
                            newPrice !== oldPrice
                        ) {
                            const percentChange =
                                ((newPrice - oldPrice) / oldPrice) * 100;
                            newChanges.push({
                                id: `${prodName}-${sizeObj.dimension}-Cena`,
                                product: prodName,
                                previousName: prevName,
                                size: sizeObj.dimension,
                                priceGroup: "Cena",
                                oldPrice,
                                newPrice,
                                percentChange:
                                    Math.round(percentChange * 10) / 10,
                            });
                        }
                    }
                }
            }

            // Categories z prices (krzesła, verikon)
            else if (schema.priceLocation === "prices" && currentProd.prices) {
                for (const { index, targetGroup } of priceIndices) {
                    if (index === -1) continue;
                    const newPrice = parsePrice(row[index]);

                    // Obsługa wariantów BUK/DAB dla Halex
                    let oldPrice: number | undefined;
                    const parts = targetGroup.split(" ");
                    if (parts.length >= 2) {
                        const variant = parts[parts.length - 1];
                        const baseGroup = parts.slice(0, -1).join(" ");
                        if (
                            currentProd.prices[baseGroup]?.[variant] !==
                            undefined
                        ) {
                            oldPrice = currentProd.prices[baseGroup][variant];
                        }
                    }
                    if (oldPrice === undefined) {
                        oldPrice = currentProd.prices[targetGroup];
                    }

                    if (
                        newPrice !== null &&
                        typeof oldPrice === "number" &&
                        newPrice !== oldPrice
                    ) {
                        const percentChange =
                            ((newPrice - oldPrice) / oldPrice) * 100;
                        newChanges.push({
                            id: `${prodName}-${targetGroup}`,
                            product: prodName,
                            previousName: prevName,
                            priceGroup: targetGroup,
                            oldPrice,
                            newPrice,
                            percentChange: Math.round(percentChange * 10) / 10,
                        });
                    }
                }
            }
        }

        // ============================================
        // PORÓWNANIE EXCEL VS BAZA
        // ============================================

        // Funkcja do normalizacji kodu elementu (usuwa nadmiarowe spacje)
        const normalizeCode = (code: string): string => {
            return code.trim().replace(/\s+/g, " ").toLowerCase();
        };

        // Zbierz wszystkie produkty i elementy z Excel
        const excelProductsSet = new Set<string>();
        const excelElementsSet = new Set<string>();

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            let excelName = row[nameIndex] ? String(row[nameIndex]).trim() : "";
            if (!excelName) continue;

            let excelElement = "";

            // Dla combinedNameElement - parsuj nazwę produktu i element z jednej kolumny
            if (schema.combinedNameElement) {
                const parsed = parseCombinedName(excelName);
                if (parsed) {
                    excelName = parsed.productName;
                    excelElement = parsed.elementCode;
                }
            }

            excelProductsSet.add(excelName.toLowerCase());

            // Dla elementów - użyj parsedElement lub kolumny
            if (schema.combinedNameElement && excelElement) {
                excelElementsSet.add(
                    `${excelName.toLowerCase()}|${normalizeCode(excelElement)}`
                );
            } else if (elementIndex >= 0) {
                const elFromCol = String(row[elementIndex] || "").trim();
                if (elFromCol) {
                    excelElementsSet.add(
                        `${excelName.toLowerCase()}|${normalizeCode(elFromCol)}`
                    );
                }
            }
        }

        // Zbierz wszystkie produkty i elementy z bazy
        const dbProductsSet = new Set<string>();
        const dbElementsSet = new Set<string>();
        const dbProductNames: string[] = []; // Oryginalne nazwy (nie lowercase)
        const dbElements: { product: string; element: string }[] = [];

        if (schema.dataKey === "products" && currentData.products) {
            for (const p of currentData.products) {
                const name = (p.name || "").trim();
                dbProductsSet.add(name.toLowerCase());
                dbProductNames.push(name);

                // Dodaj previousName do seta dla WSZYSTKICH producentów z products
                if (p.previousName) {
                    dbProductsSet.add(p.previousName.toLowerCase());
                }

                if (p.elements) {
                    for (const el of p.elements) {
                        // Pomiń separatory (nie mają kodu)
                        if (el.type === "separator") continue;

                        const code = (el.code || "").trim();
                        // Pomiń elementy bez kodu
                        if (!code) continue;

                        dbElementsSet.add(
                            `${name.toLowerCase()}|${normalizeCode(code)}`
                        );
                        dbElements.push({ product: name, element: code });

                        // Dodaj też elementy z previousName jako klucz (dla WSZYSTKICH producentów)
                        if (p.previousName) {
                            dbElementsSet.add(
                                `${p.previousName.toLowerCase()}|${normalizeCode(
                                    code
                                )}`
                            );
                        }
                    }
                }
            }
        } else if (schema.dataKey === "categories" && currentData.categories) {
            for (const [catName, products] of Object.entries(
                currentData.categories
            )) {
                for (const [prodName, prodData] of Object.entries(
                    products as Record<string, any>
                )) {
                    dbProductsSet.add(prodName.toLowerCase());
                    dbProductNames.push(prodName);
                }
            }
        } else if (schema.dataKey === "Arkusz1" && currentData.Arkusz1) {
            for (const p of currentData.Arkusz1) {
                const name = p.MODEL || "";
                dbProductsSet.add(name.toLowerCase());
                dbProductNames.push(name);
                // Dodaj też previousName do seta (dla porównania)
                if (p.previousName) {
                    dbProductsSet.add(p.previousName.toLowerCase());
                }
            }
        }

        // Oblicz różnice
        const missingInExcel: string[] = [];
        const newInExcel: string[] = [];
        const missingElementsInExcel: { product: string; element: string }[] =
            [];
        const newElementsInExcel: { product: string; element: string }[] = [];

        // Produkty z bazy których nie ma w Excel
        // Dla wszystkich producentów z products lub Arkusz1 sprawdzamy też previousName
        if (schema.dataKey === "Arkusz1" && currentData.Arkusz1) {
            for (const p of currentData.Arkusz1) {
                const name = p.MODEL || "";
                const prevName = p.previousName || "";
                // Produkt jest "brakujący" tylko jeśli ani jego nazwa ani previousName nie jest w Excel
                const nameInExcel = excelProductsSet.has(name.toLowerCase());
                const prevNameInExcel =
                    prevName && excelProductsSet.has(prevName.toLowerCase());
                if (!nameInExcel && !prevNameInExcel) {
                    missingInExcel.push(name);
                }
            }
        } else if (schema.dataKey === "products" && currentData.products) {
            // Dla WSZYSTKICH producentów z products - sprawdź name i previousName
            for (const p of currentData.products) {
                const name = p.name || "";
                const prevName = p.previousName || "";
                const nameInExcel = excelProductsSet.has(name.toLowerCase());
                const prevNameInExcel =
                    prevName && excelProductsSet.has(prevName.toLowerCase());
                if (!nameInExcel && !prevNameInExcel) {
                    missingInExcel.push(name);
                }
            }
        } else {
            for (const dbName of dbProductNames) {
                if (!excelProductsSet.has(dbName.toLowerCase())) {
                    missingInExcel.push(dbName);
                }
            }
        }

        // Produkty z Excel których nie ma w bazie (to już mamy w notFound, ale z oryginalnymi nazwami)
        for (const excelName of excelProductsSet) {
            if (!dbProductsSet.has(excelName)) {
                // Znajdź oryginalną nazwę
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    const name = row[nameIndex]
                        ? String(row[nameIndex]).trim()
                        : "";
                    if (
                        name.toLowerCase() === excelName &&
                        !newInExcel.includes(name)
                    ) {
                        newInExcel.push(name);
                        break;
                    }
                }
            }
        }

        // Zbuduj mapę previousName -> name dla produktów
        const prevNameToName = new Map<string, string>();
        if (schema.dataKey === "products" && currentData.products) {
            for (const p of currentData.products) {
                if (p.previousName) {
                    prevNameToName.set(
                        p.previousName.toLowerCase(),
                        (p.name || "").toLowerCase()
                    );
                }
            }
        }

        // Elementy - tylko dla schematów z elements
        if (
            schema.hasElements &&
            (elementIndex >= 0 || schema.combinedNameElement)
        ) {
            // Elementy z bazy których nie ma w Excel - TYLKO dla produktów które SĄ w Excel
            for (const dbEl of dbElements) {
                const prodLower = dbEl.product.toLowerCase();
                // Znajdź previousName dla tego produktu
                const prod = currentData.products?.find(
                    (p: any) => (p.name || "").toLowerCase() === prodLower
                );
                const prevNameLower = prod?.previousName?.toLowerCase();

                // Sprawdź czy produkt (lub jego previousName) jest w Excel
                const productInExcel =
                    excelProductsSet.has(prodLower) ||
                    (prevNameLower && excelProductsSet.has(prevNameLower));

                if (!productInExcel) {
                    continue; // Pomiń elementy produktów których nie ma w Excel
                }

                // Sprawdź klucz z nazwą produktu lub previousName
                const keyByName = `${prodLower}|${normalizeCode(dbEl.element)}`;
                const keyByPrevName = prevNameLower
                    ? `${prevNameLower}|${normalizeCode(dbEl.element)}`
                    : null;

                if (
                    !excelElementsSet.has(keyByName) &&
                    (!keyByPrevName || !excelElementsSet.has(keyByPrevName))
                ) {
                    missingElementsInExcel.push(dbEl);
                }
            }

            // Elementy z Excel których nie ma w bazie - zbierz też ceny
            const newElsWithPrices: NewElementToAdd[] = [];
            const hasDimCols =
                mapping.dimensions &&
                (mapping.dimensions.width ||
                    mapping.dimensions.depth ||
                    mapping.dimensions.height ||
                    mapping.dimensions.sleepArea);
            for (const excelKey of excelElementsSet) {
                if (!dbElementsSet.has(excelKey)) {
                    const [prodName, elCode] = excelKey.split("|");
                    // Znajdź oryginalne nazwy i ceny
                    for (let i = 1; i < data.length; i++) {
                        const row = data[i];
                        const name = row[nameIndex]
                            ? String(row[nameIndex]).trim()
                            : "";
                        const el = String(row[elementIndex] || "").trim();
                        if (
                            name.toLowerCase() === prodName &&
                            normalizeCode(el) === elCode
                        ) {
                            // Zbierz ceny dla tego elementu
                            const prices: Record<string, number> = {};
                            for (const { index, targetGroup } of priceIndices) {
                                if (index === -1) continue;
                                const price = parsePrice(row[index]);
                                if (price !== null) {
                                    prices[targetGroup] = price;
                                }
                            }

                            // Zbierz description jeśli są wymiary
                            let description: string | undefined;
                            if (mode === "full" && hasDimCols) {
                                const desc = buildDescription(
                                    row,
                                    headers,
                                    mapping.dimensions
                                );
                                if (desc) description = desc;
                            }

                            newElementsInExcel.push({
                                product: name,
                                element: el,
                            });

                            newElsWithPrices.push({
                                product: name,
                                element: el,
                                prices,
                                description,
                                selected: true, // domyślnie zaznaczone
                            });
                            break;
                        }
                    }
                }
            }

            // Ustaw nowe elementy do dodania
            setNewElementsToAdd(newElsWithPrices);
        }

        setComparisonStats({
            productsInExcel: Array.from(excelProductsSet),
            productsInDb: dbProductNames,
            missingInExcel,
            newInExcel,
            elementsInExcel: Array.from(excelElementsSet).map((k) => {
                const [p, e] = k.split("|");
                return { product: p, element: e };
            }),
            elementsInDb: dbElements,
            missingElementsInExcel,
            newElementsInExcel,
        });

        setMatchStats({
            matched: matchedCount,
            notFound,
            suggestions,
            totalExcel: data.length - 1,
        });
        setChanges(newChanges);
        setSelectedChanges(new Set(newChanges.map((c) => c.id)));

        // Ustaw mapę opisów elementów
        setElementDescriptions(elementDescsMap);

        // Zbuduj listę zmian opisów (dla podglądu) - porównaj z aktualnymi opisami w bazie
        const descChanges: DescriptionChange[] = [];
        if (
            mode === "full" &&
            elementDescsMap.size > 0 &&
            schema.dataKey === "products" &&
            currentData.products
        ) {
            for (const prod of currentData.products) {
                if (!prod.elements) continue;
                const prodNameLower = (prod.name || "").toLowerCase().trim();
                const prevNameLower = (prod.previousName || "")
                    .toLowerCase()
                    .trim();

                for (const el of prod.elements) {
                    if (el.type === "separator") continue;
                    const elCodeLower = (el.code || "").toLowerCase().trim();

                    // Szukaj nowego opisu
                    let newDesc = elementDescsMap.get(
                        `${prodNameLower}|${elCodeLower}`
                    );
                    if (!newDesc && prevNameLower) {
                        newDesc = elementDescsMap.get(
                            `${prevNameLower}|${elCodeLower}`
                        );
                    }

                    if (newDesc && newDesc !== (el.description || "")) {
                        descChanges.push({
                            product: prod.name,
                            element: el.code,
                            oldDescription: el.description || "(brak)",
                            newDescription: newDesc,
                        });
                    }
                }
            }
        }
        setDescriptionChanges(descChanges);

        // Dla trybu FULL - ustaw nowe produkty
        if (mode === "full") {
            setNewProducts(Array.from(newProductsMap.values()));
        } else {
            setNewProducts([]);
        }
    };

    // ============================================
    // POMOCNICZE
    // ============================================

    const buildProductMap = (): Map<string, any> => {
        const map = new Map<string, any>();

        if (schema.dataKey === "Arkusz1" && currentData.Arkusz1) {
            for (const p of currentData.Arkusz1) {
                const key = (p.MODEL || "").toLowerCase();
                if (key) map.set(key, p);
                if (p.previousName) {
                    map.set(p.previousName.toLowerCase(), p);
                }
            }
        } else if (schema.dataKey === "products" && currentData.products) {
            for (const p of currentData.products) {
                const key = (p.name || "").toLowerCase();
                if (key) map.set(key, p);
                if (p.previousName) {
                    map.set(p.previousName.toLowerCase(), p);
                }
            }
        } else if (schema.dataKey === "categories" && currentData.categories) {
            for (const [catName, products] of Object.entries(
                currentData.categories
            )) {
                for (const [prodName, prodData] of Object.entries(
                    products as Record<string, any>
                )) {
                    map.set(prodName.toLowerCase(), {
                        name: prodName,
                        category: catName,
                        ...(prodData as object),
                    });
                    if ((prodData as any).previousName) {
                        map.set((prodData as any).previousName.toLowerCase(), {
                            name: prodName,
                            category: catName,
                            ...(prodData as object),
                        });
                    }
                }
            }
        }

        return map;
    };

    const parsePrice = (value: any): number | null => {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "number") return value;

        const cleaned = String(value)
            .replace(/\s/g, "")
            .replace(",", ".")
            .replace(/[^\d.]/g, "");

        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    };

    // ============================================
    // ZASTOSUJ SUGESTIE AI
    // ============================================

    const applyAISuggestions = () => {
        if (!matchStats || !excelData || !columnMapping) return;

        // Zbierz wszystkie sugestie bez bestMatch ale z allSuggestions
        const suggestionsToApply = matchStats.suggestions.filter(
            (s) => !s.bestMatch && s.allSuggestions.length > 0
        );

        if (suggestionsToApply.length === 0) {
            toast.info("Brak sugestii do zastosowania");
            return;
        }

        // Stwórz mapę wymuszonych dopasowań
        const forcedMappings = new Map<string, string>();
        for (const s of suggestionsToApply) {
            // Użyj pierwszej sugestii jako najlepszego dopasowania
            forcedMappings.set(s.name, s.allSuggestions[0]);
        }

        // Oznacz jako zastosowane
        setAppliedAISuggestions(new Set(suggestionsToApply.map((s) => s.name)));

        // Przelicz zmiany z wymuszonymi mapowaniami
        calculateChanges(excelData, columnMapping, forcedMappings);

        toast.success(`Zastosowano ${suggestionsToApply.length} sugestii AI`);
    };

    // Zastosuj pojedynczą sugestię
    const applySingleSuggestion = (
        excelName: string,
        suggestedName: string
    ) => {
        if (!excelData || !columnMapping) return;

        const forcedMappings = new Map<string, string>();

        // Dodaj wcześniej zastosowane sugestie
        for (const applied of appliedAISuggestions) {
            const s = matchStats?.suggestions.find((x) => x.name === applied);
            if (s && s.allSuggestions.length > 0) {
                forcedMappings.set(applied, s.allSuggestions[0]);
            }
        }

        // Dodaj nową sugestię
        forcedMappings.set(excelName, suggestedName);

        setAppliedAISuggestions((prev) => new Set([...prev, excelName]));
        calculateChanges(excelData, columnMapping, forcedMappings);

        toast.success(`Dopasowano "${excelName}" → "${suggestedName}"`);
    };

    // ============================================
    // ZASTOSUJ ZMIANY
    // ============================================

    const applyChanges = (resolution: ConflictResolution = "overwrite") => {
        const selectedChangesList = changes.filter((c) =>
            selectedChanges.has(c.id)
        );
        const selectedNewProductsList = newProducts.filter((np) => np.selected);

        if (
            selectedChangesList.length === 0 &&
            selectedNewProductsList.length === 0
        )
            return;

        const updatedData = JSON.parse(JSON.stringify(currentData));

        // Puszman
        if (schema.dataKey === "Arkusz1" && updatedData.Arkusz1) {
            // Aktualizacja istniejących produktów
            updatedData.Arkusz1 = updatedData.Arkusz1.map((prod: any) => {
                const updatedProd = { ...prod };
                for (const change of selectedChangesList) {
                    if (change.product === prod.MODEL) {
                        if (resolution === "skip") continue;
                        if (resolution === "merge" && prod[change.priceGroup]) {
                            updatedProd[change.priceGroup] = Math.max(
                                prod[change.priceGroup],
                                change.newPrice
                            );
                        } else {
                            updatedProd[change.priceGroup] = change.newPrice;
                        }
                    }
                }
                return updatedProd;
            });

            // Dodawanie nowych produktów
            for (const newProd of selectedNewProductsList) {
                const newProduct: any = {
                    MODEL: newProd.newName || newProd.excelName,
                    ...newProd.prices,
                };
                updatedData.Arkusz1.push(newProduct);
            }
        }

        // Products z elements
        else if (
            schema.dataKey === "products" &&
            schema.priceLocation === "elements" &&
            updatedData.products
        ) {
            // Aktualizacja istniejących
            updatedData.products = updatedData.products.map((prod: any) => {
                if (!prod.elements) return prod;

                const updatedProd = { ...prod };
                updatedProd.elements = prod.elements.map((el: any) => {
                    const updatedEl = { ...el };
                    for (const change of selectedChangesList) {
                        // Używamy trim() bo w bazie mogą być spacje końcowe
                        const prodNameMatch =
                            change.product.toLowerCase().trim() ===
                                (prod.name || "").toLowerCase().trim() ||
                            change.product.toLowerCase().trim() ===
                                (prod.previousName || "").toLowerCase().trim();
                        const elCodeMatch =
                            (change.element || "").toLowerCase().trim() ===
                            (el.code || "").toLowerCase().trim();

                        if (prodNameMatch && elCodeMatch) {
                            if (resolution === "skip") continue;
                            if (!updatedEl.prices) updatedEl.prices = {};

                            // Sprawdź czy to wariant BUK/DAB (np. "Grupa cenowa I BUK")
                            const parts = change.priceGroup.split(" ");
                            const lastPart =
                                parts[parts.length - 1].toUpperCase();
                            const isBukDabVariant =
                                lastPart === "BUK" || lastPart === "DAB";

                            if (isBukDabVariant && parts.length >= 2) {
                                const variant = parts[parts.length - 1];
                                const baseGroup = parts.slice(0, -1).join(" ");
                                if (!updatedEl.prices[baseGroup])
                                    updatedEl.prices[baseGroup] = {};
                                updatedEl.prices[baseGroup][variant] =
                                    change.newPrice;
                            } else {
                                // Dla zwykłych grup cenowych (Grupa I, Grupa II, itd.)
                                updatedEl.prices[change.priceGroup] =
                                    change.newPrice;
                            }
                        }
                    }
                    return updatedEl;
                });
                return updatedProd;
            });

            // Aktualizuj description dla WSZYSTKICH elementów z mapy (niezależnie od zmian cen)
            if (elementDescriptions.size > 0) {
                updatedData.products = updatedData.products.map((prod: any) => {
                    if (!prod.elements) return prod;

                    const prodNameLower = (prod.name || "")
                        .toLowerCase()
                        .trim();
                    const prevNameLower = (prod.previousName || "")
                        .toLowerCase()
                        .trim();

                    const updatedProd = { ...prod };
                    updatedProd.elements = prod.elements.map((el: any) => {
                        const elCodeLower = (el.code || "")
                            .toLowerCase()
                            .trim();

                        // Szukaj opisu dla tego elementu (po aktualnej lub poprzedniej nazwie produktu)
                        let newDesc = elementDescriptions.get(
                            `${prodNameLower}|${elCodeLower}`
                        );
                        if (!newDesc && prevNameLower) {
                            newDesc = elementDescriptions.get(
                                `${prevNameLower}|${elCodeLower}`
                            );
                        }

                        if (newDesc) {
                            return { ...el, description: newDesc };
                        }
                        return el;
                    });
                    return updatedProd;
                });
            }

            // Dodawanie nowych produktów z elementami
            for (const newProd of selectedNewProductsList) {
                const newProduct: any = {
                    name: newProd.newName || newProd.excelName,
                    elements: newProd.elements || [],
                };
                if (newProd.category) {
                    newProduct.category = newProd.category;
                }
                updatedData.products.push(newProduct);
            }
        }

        // Categories z prices
        else if (
            schema.dataKey === "categories" &&
            schema.priceLocation === "prices" &&
            updatedData.categories
        ) {
            // Aktualizacja istniejących
            for (const catName of Object.keys(updatedData.categories)) {
                for (const prodName of Object.keys(
                    updatedData.categories[catName]
                )) {
                    const prodData = updatedData.categories[catName][prodName];
                    for (const change of selectedChangesList) {
                        if (change.product === prodName && prodData.prices) {
                            if (resolution === "skip") continue;

                            // Sprawdź czy to wariant BUK/DAB (np. "Grupa cenowa I BUK")
                            const parts = change.priceGroup.split(" ");
                            const lastPart =
                                parts[parts.length - 1].toUpperCase();
                            const isBukDabVariant =
                                lastPart === "BUK" || lastPart === "DAB";

                            if (isBukDabVariant && parts.length >= 2) {
                                const variant = parts[parts.length - 1];
                                const baseGroup = parts.slice(0, -1).join(" ");
                                if (!prodData.prices[baseGroup])
                                    prodData.prices[baseGroup] = {};
                                prodData.prices[baseGroup][variant] =
                                    change.newPrice;
                            } else {
                                prodData.prices[change.priceGroup] =
                                    change.newPrice;
                            }
                        }
                    }
                }
            }

            // Dodawanie nowych produktów do kategorii
            for (const newProd of selectedNewProductsList) {
                const targetCategory =
                    newProd.category || availableCategories[0] || "Inne";
                if (!updatedData.categories[targetCategory]) {
                    updatedData.categories[targetCategory] = {};
                }

                const prodName = newProd.newName || newProd.excelName;
                updatedData.categories[targetCategory][prodName] = {
                    prices: newProd.prices || {},
                };
            }
        }

        // Categories z sizes
        else if (
            schema.dataKey === "categories" &&
            schema.priceLocation === "sizes" &&
            updatedData.categories
        ) {
            // Aktualizacja istniejących
            for (const catName of Object.keys(updatedData.categories)) {
                for (const prodName of Object.keys(
                    updatedData.categories[catName]
                )) {
                    const prodData = updatedData.categories[catName][prodName];
                    if (prodData.sizes) {
                        for (const sizeObj of prodData.sizes) {
                            for (const change of selectedChangesList) {
                                if (
                                    change.product === prodName &&
                                    change.size === sizeObj.dimension
                                ) {
                                    if (resolution === "skip") continue;
                                    sizeObj.prices = change.newPrice;
                                }
                            }
                        }
                    }
                }
            }

            // Dodawanie nowych produktów z rozmiarami
            for (const newProd of selectedNewProductsList) {
                const targetCategory =
                    newProd.category || availableCategories[0] || "Inne";
                if (!updatedData.categories[targetCategory]) {
                    updatedData.categories[targetCategory] = {};
                }

                const prodName = newProd.newName || newProd.excelName;
                updatedData.categories[targetCategory][prodName] = {
                    sizes: newProd.sizes || [],
                };
            }
        }

        const summary = {
            totalChanges: selectedChangesList.length,
            newProducts: selectedNewProductsList.length,
            priceIncrease: selectedChangesList.filter(
                (c) => c.percentChange > 0
            ).length,
            priceDecrease: selectedChangesList.filter(
                (c) => c.percentChange < 0
            ).length,
            avgChangePercent:
                selectedChangesList.length > 0
                    ? Math.round(
                          (selectedChangesList.reduce(
                              (sum, c) => sum + c.percentChange,
                              0
                          ) /
                              selectedChangesList.length) *
                              10
                      ) / 10
                    : 0,
        };

        onApplyChanges(updatedData, { changes: selectedChangesList, summary });

        const messages: string[] = [];
        if (selectedChangesList.length > 0) {
            messages.push(`${selectedChangesList.length} zmian cenowych`);
        }
        if (selectedNewProductsList.length > 0) {
            messages.push(`${selectedNewProductsList.length} nowych produktów`);
        }
        toast.success(`Zastosowano: ${messages.join(", ")}`);
        resetState();
    };

    // Nadpisuje tylko elementy (bez produktów)
    const applyElementsOnly = () => {
        if (
            schema.dataKey !== "products" ||
            schema.priceLocation !== "elements"
        ) {
            toast.error(
                "Ta opcja jest dostępna tylko dla schematów z elementami"
            );
            return;
        }

        const selectedChangesList = changes.filter((c) =>
            selectedChanges.has(c.id)
        );

        if (selectedChangesList.length === 0) {
            toast.error("Wybierz zmiany do zastosowania");
            return;
        }

        const updatedData = JSON.parse(JSON.stringify(currentData));

        if (updatedData.products) {
            updatedData.products = updatedData.products.map((prod: any) => {
                if (!prod.elements) return prod;

                const updatedProd = { ...prod };
                updatedProd.elements = prod.elements.map((el: any) => {
                    const updatedEl = { ...el };
                    for (const change of selectedChangesList) {
                        const prodNameMatch =
                            change.product.toLowerCase().trim() ===
                                (prod.name || "").toLowerCase().trim() ||
                            change.product.toLowerCase().trim() ===
                                (prod.previousName || "").toLowerCase().trim();
                        const elCodeMatch =
                            (change.element || "").toLowerCase().trim() ===
                            (el.code || "").toLowerCase().trim();

                        if (prodNameMatch && elCodeMatch) {
                            if (!updatedEl.prices) updatedEl.prices = {};

                            // Sprawdź czy to wariant BUK/DAB (np. "Grupa cenowa I BUK")
                            const parts = change.priceGroup.split(" ");
                            const lastPart =
                                parts[parts.length - 1].toUpperCase();
                            const isBukDabVariant =
                                lastPart === "BUK" || lastPart === "DAB";

                            if (isBukDabVariant && parts.length >= 2) {
                                const variant = parts[parts.length - 1];
                                const baseGroup = parts.slice(0, -1).join(" ");
                                if (!updatedEl.prices[baseGroup])
                                    updatedEl.prices[baseGroup] = {};
                                updatedEl.prices[baseGroup][variant] =
                                    change.newPrice;
                            } else {
                                // Dla zwykłych grup cenowych (Grupa I, Grupa II, itd.)
                                updatedEl.prices[change.priceGroup] =
                                    change.newPrice;
                            }
                        }
                    }
                    return updatedEl;
                });
                return updatedProd;
            });

            // Aktualizuj description dla WSZYSTKICH elementów z mapy (niezależnie od zmian cen)
            if (elementDescriptions.size > 0) {
                updatedData.products = updatedData.products.map((prod: any) => {
                    if (!prod.elements) return prod;

                    const prodNameLower = (prod.name || "")
                        .toLowerCase()
                        .trim();
                    const prevNameLower = (prod.previousName || "")
                        .toLowerCase()
                        .trim();

                    const updatedProd = { ...prod };
                    updatedProd.elements = prod.elements.map((el: any) => {
                        const elCodeLower = (el.code || "")
                            .toLowerCase()
                            .trim();

                        // Szukaj opisu dla tego elementu (po aktualnej lub poprzedniej nazwie produktu)
                        let newDesc = elementDescriptions.get(
                            `${prodNameLower}|${elCodeLower}`
                        );
                        if (!newDesc && prevNameLower) {
                            newDesc = elementDescriptions.get(
                                `${prevNameLower}|${elCodeLower}`
                            );
                        }

                        if (newDesc) {
                            return { ...el, description: newDesc };
                        }
                        return el;
                    });
                    return updatedProd;
                });
            }
        }

        const summary = {
            totalChanges: selectedChangesList.length,
            newProducts: 0,
            priceIncrease: selectedChangesList.filter(
                (c) => c.percentChange > 0
            ).length,
            priceDecrease: selectedChangesList.filter(
                (c) => c.percentChange < 0
            ).length,
            avgChangePercent:
                selectedChangesList.length > 0
                    ? Math.round(
                          (selectedChangesList.reduce(
                              (sum, c) => sum + c.percentChange,
                              0
                          ) /
                              selectedChangesList.length) *
                              10
                      ) / 10
                    : 0,
        };

        onApplyChanges(updatedData, { changes: selectedChangesList, summary });
        toast.success(
            `Zastosowano ${selectedChangesList.length} zmian elementów`
        );
        resetState();
    };

    // Zapisz tylko wymiary (opisy elementów)
    const applyDimensionsOnly = () => {
        if (descriptionChanges.length === 0) {
            toast.error("Brak wymiarów do zapisania");
            return;
        }

        if (mode !== "full") {
            toast.error("Wymiary można zapisać tylko w trybie 'Pełny import'");
            return;
        }

        if (
            schema.dataKey !== "products" ||
            schema.priceLocation !== "elements"
        ) {
            toast.error(
                "Ta opcja jest dostępna tylko dla schematów z elementami"
            );
            return;
        }

        const updatedData = JSON.parse(JSON.stringify(currentData));

        if (updatedData.products) {
            updatedData.products = updatedData.products.map((prod: any) => {
                if (!prod.elements) return prod;

                const prodNameLower = (prod.name || "").toLowerCase().trim();
                const prevNameLower = (prod.previousName || "")
                    .toLowerCase()
                    .trim();

                const updatedProd = { ...prod };
                updatedProd.elements = prod.elements.map((el: any) => {
                    const elCodeLower = (el.code || "").toLowerCase().trim();

                    // Szukaj opisu dla tego elementu (po aktualnej lub poprzedniej nazwie produktu)
                    let newDesc = elementDescriptions.get(
                        `${prodNameLower}|${elCodeLower}`
                    );
                    if (!newDesc && prevNameLower) {
                        newDesc = elementDescriptions.get(
                            `${prevNameLower}|${elCodeLower}`
                        );
                    }

                    if (newDesc) {
                        return { ...el, description: newDesc };
                    }
                    return el;
                });
                return updatedProd;
            });
        }

        const summary = {
            totalChanges: 0,
            newProducts: 0,
            priceIncrease: 0,
            priceDecrease: 0,
            avgChangePercent: 0,
        };

        onApplyChanges(updatedData, { changes: [], summary });
        toast.success(
            `Zaktualizowano wymiary dla ${descriptionChanges.length} elementów`
        );
        resetState();
    };

    // Dodaj wybrane nowe elementy do produktów
    const addNewElements = () => {
        // Używaj tylko filtrowanych i zaznaczonych elementów
        const selectedNewEls = filteredNewElements.filter((el) => el.selected);
        if (selectedNewEls.length === 0) {
            toast.error("Wybierz elementy do dodania");
            return;
        }

        if (
            schema.dataKey !== "products" ||
            schema.priceLocation !== "elements"
        ) {
            toast.error(
                "Ta opcja jest dostępna tylko dla schematów z elementami"
            );
            return;
        }

        const updatedData = JSON.parse(JSON.stringify(currentData));

        if (updatedData.products) {
            // Grupuj nowe elementy po produkcie (uwzględniając previousName)
            const elementsByProduct = new Map<string, NewElementToAdd[]>();
            for (const el of selectedNewEls) {
                const prodKey = el.product.toLowerCase().trim();
                if (!elementsByProduct.has(prodKey)) {
                    elementsByProduct.set(prodKey, []);
                }
                elementsByProduct.get(prodKey)!.push(el);
            }

            updatedData.products = updatedData.products.map((prod: any) => {
                const prodNameLower = (prod.name || "").toLowerCase().trim();
                const prevNameLower = (prod.previousName || "")
                    .toLowerCase()
                    .trim();

                // Szukaj elementów po name lub previousName
                let newEls = elementsByProduct.get(prodNameLower);
                if ((!newEls || newEls.length === 0) && prevNameLower) {
                    newEls = elementsByProduct.get(prevNameLower);
                }

                if (!newEls || newEls.length === 0) return prod;

                const updatedProd = { ...prod };
                if (!updatedProd.elements) updatedProd.elements = [];

                // Dodaj nowe elementy
                for (const newEl of newEls) {
                    updatedProd.elements.push({
                        code: newEl.element,
                        prices: newEl.prices,
                        ...(newEl.description
                            ? { description: newEl.description }
                            : {}),
                    });
                }

                return updatedProd;
            });
        }

        const summary = {
            totalChanges: selectedNewEls.length,
            newProducts: 0,
            priceIncrease: 0,
            priceDecrease: 0,
            avgChangePercent: 0,
        };

        onApplyChanges(updatedData, { changes: [], summary });
        toast.success(`Dodano ${selectedNewEls.length} nowych elementów`);
        resetState();
    };

    // Toggle zaznaczenia nowego elementu
    const toggleNewElement = (product: string, element: string) => {
        setNewElementsToAdd((prev) =>
            prev.map((el) =>
                el.product === product && el.element === element
                    ? { ...el, selected: !el.selected }
                    : el
            )
        );
    };

    // Zaznacz/odznacz wszystkie filtrowane nowe elementy
    const toggleAllNewElements = () => {
        // Sprawdź czy wszystkie FILTROWANE elementy są zaznaczone
        const allFilteredSelected = filteredNewElements.every(
            (el) => el.selected
        );

        // Zbuduj zbiór filtrowanych elementów
        const filteredKeys = new Set(
            filteredNewElements.map((el) => `${el.product}|${el.element}`)
        );

        // Zmień tylko filtrowane elementy
        setNewElementsToAdd((prev) =>
            prev.map((el) => {
                const key = `${el.product}|${el.element}`;
                if (filteredKeys.has(key)) {
                    return { ...el, selected: !allFilteredSelected };
                }
                return el;
            })
        );
    };

    const resetState = () => {
        setSelectedFile(null);
        setExcelData(null);
        setExcelColumns([]);
        setColumnMapping({
            name: null,
            element: null,
            size: null,
            priceColumns: [],
            additionalFields: [],
            dimensions: {
                width: null,
                depth: null,
                height: null,
                sleepArea: null,
            },
        });
        setChanges([]);
        setSelectedChanges(new Set());
        setMatchStats(null);
        setComparisonStats(null);
        setElementDescriptions(new Map());
        setDescriptionChanges([]);
        setNewElementsToAdd([]);
        setConflicts([]);
        setMode(null);
        setNameMapping(new Map());
        setShowNameMappingStep(false);
        setAppliedAISuggestions(new Set());
        setNewProducts([]);
        setAvailableCategories([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const toggleChange = (id: string) => {
        setSelectedChanges((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedChanges.size === changes.length) {
            setSelectedChanges(new Set());
        } else {
            setSelectedChanges(new Set(changes.map((c) => c.id)));
        }
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(group)) {
                next.delete(group);
            } else {
                next.add(group);
            }
            return next;
        });
    };

    const groupedChanges = changes.reduce((acc, change) => {
        const group = change.priceGroup;
        if (!acc[group]) acc[group] = [];
        acc[group].push(change);
        return acc;
    }, {} as Record<string, PriceChange[]>);

    // ============================================
    // OBSŁUGA NOWYCH PRODUKTÓW
    // ============================================

    const toggleNewProduct = (excelName: string) => {
        setNewProducts((prev) =>
            prev.map((np) =>
                np.excelName === excelName
                    ? { ...np, selected: !np.selected }
                    : np
            )
        );
    };

    const toggleAllNewProducts = () => {
        const allSelected = newProducts.every((np) => np.selected);
        setNewProducts((prev) =>
            prev.map((np) => ({ ...np, selected: !allSelected }))
        );
    };

    const updateNewProductName = (excelName: string, newName: string) => {
        setNewProducts((prev) =>
            prev.map((np) =>
                np.excelName === excelName ? { ...np, newName } : np
            )
        );
    };

    const updateNewProductCategory = (excelName: string, category: string) => {
        setNewProducts((prev) =>
            prev.map((np) =>
                np.excelName === excelName ? { ...np, category } : np
            )
        );
    };

    const selectedNewProducts = newProducts.filter((np) => np.selected);

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-4">
            {/* Przycisk pobierania szablonu */}
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={generateTemplate}
                    className="flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Pobierz szablon
                </Button>
            </div>

            {/* Wybór trybu */}
            {!mode && !selectedFile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* AI Smart */}
                    <button
                        onClick={() => setMode("ai")}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            <span className="font-semibold text-gray-900">
                                🤖 AI Smart
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Fuzzy matching - dopasowuje podobne nazwy
                            automatycznie
                        </p>
                        <p className="text-xs text-purple-500 mt-1">
                            np. "LIZBONA FOTEL" → "lizbona"
                        </p>
                    </button>

                    {/* Tylko ceny */}
                    <button
                        onClick={() => setMode("prices")}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            <span className="font-semibold text-gray-900">
                                💰 Tylko ceny
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Dokładne dopasowanie po nazwie lub starej nazwie
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                            Używa previousName z bazy
                        </p>
                    </button>

                    {/* Pełny import */}
                    <button
                        onClick={() => setMode("full")}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            <span className="font-semibold text-gray-900">
                                📦 Pełny import
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Dodawanie nowych produktów + mapowanie nazw
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                            Format: NowaNazwa - StaraNazwa
                        </p>
                    </button>
                </div>
            )}

            {/* Drop zone */}
            {mode && !selectedFile && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <button
                            onClick={() => setMode(null)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            ← Wróć
                        </button>
                        <span className="text-sm font-medium text-gray-700">
                            Tryb:{" "}
                            {mode === "ai"
                                ? "🤖 AI Smart"
                                : mode === "prices"
                                ? "💰 Tylko ceny"
                                : "📦 Pełny import"}
                        </span>
                    </div>

                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                            transition-all duration-200
                            ${
                                isDragging
                                    ? "border-green-500 bg-green-50"
                                    : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
                            }
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.ods"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Upload
                            className={`w-10 h-10 mx-auto mb-3 ${
                                isDragging ? "text-green-500" : "text-gray-400"
                            }`}
                        />
                        <p className="text-gray-600 font-medium">
                            Przeciągnij plik Excel lub kliknij aby wybrać
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            Obsługiwane formaty: .xlsx, .xls, .ods
                        </p>
                    </div>
                </div>
            )}

            {/* Processing */}
            {(isProcessing || isCalculating) && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500 mr-2" />
                    <span className="text-gray-600">
                        {isCalculating
                            ? "Obliczanie zmian..."
                            : "Przetwarzanie pliku..."}
                    </span>
                </div>
            )}

            {/* Wyniki */}
            {selectedFile && !isProcessing && !isCalculating && (
                <div className="space-y-4">
                    {/* Info o pliku */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">
                                {selectedFile.name}
                            </span>
                        </div>
                        <button
                            onClick={resetState}
                            className="p-1 hover:bg-gray-200 rounded"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    {/* Ostrzeżenie gdy nie wykryto kolumn */}
                    {(!columnMapping.name ||
                        columnMapping.priceColumns.length === 0) &&
                        excelColumns.length > 0 && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-medium text-yellow-800 mb-2">
                                            Nie wykryto automatycznie kolumn z
                                            pliku Excel
                                        </p>
                                        <p className="text-sm text-yellow-700 mb-3">
                                            Nagłówki w pliku:{" "}
                                            <span className="font-mono bg-yellow-100 px-1 rounded">
                                                {excelColumns
                                                    .slice(0, 8)
                                                    .join(", ")}
                                                {excelColumns.length > 8
                                                    ? "..."
                                                    : ""}
                                            </span>
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Kolumna nazwy */}
                                            <div>
                                                <label className="block text-xs font-medium text-yellow-800 mb-1">
                                                    Kolumna z nazwą produktu:
                                                </label>
                                                <select
                                                    value={
                                                        columnMapping.name || ""
                                                    }
                                                    onChange={(e) => {
                                                        const newMapping = {
                                                            ...columnMapping,
                                                            name:
                                                                e.target
                                                                    .value ||
                                                                null,
                                                        };
                                                        setColumnMapping(
                                                            newMapping
                                                        );
                                                        if (
                                                            newMapping.name &&
                                                            newMapping
                                                                .priceColumns
                                                                .length > 0 &&
                                                            excelData
                                                        ) {
                                                            calculateChanges(
                                                                excelData,
                                                                newMapping
                                                            );
                                                        }
                                                    }}
                                                    className="w-full text-sm border border-yellow-300 rounded px-2 py-1 bg-white"
                                                >
                                                    <option value="">
                                                        -- Wybierz --
                                                    </option>
                                                    {excelColumns.map((col) => (
                                                        <option
                                                            key={col}
                                                            value={col}
                                                        >
                                                            {col}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* Kolumna elementu (jeśli schemat ma elementy) */}
                                            {schema.hasElements && (
                                                <div>
                                                    <label className="block text-xs font-medium text-yellow-800 mb-1">
                                                        Kolumna z elementem:
                                                    </label>
                                                    <select
                                                        value={
                                                            columnMapping.element ||
                                                            ""
                                                        }
                                                        onChange={(e) => {
                                                            const newMapping = {
                                                                ...columnMapping,
                                                                element:
                                                                    e.target
                                                                        .value ||
                                                                    null,
                                                            };
                                                            setColumnMapping(
                                                                newMapping
                                                            );
                                                            if (
                                                                newMapping.name &&
                                                                newMapping
                                                                    .priceColumns
                                                                    .length >
                                                                    0 &&
                                                                excelData
                                                            ) {
                                                                calculateChanges(
                                                                    excelData,
                                                                    newMapping
                                                                );
                                                            }
                                                        }}
                                                        className="w-full text-sm border border-yellow-300 rounded px-2 py-1 bg-white"
                                                    >
                                                        <option value="">
                                                            -- Wybierz --
                                                        </option>
                                                        {excelColumns.map(
                                                            (col) => (
                                                                <option
                                                                    key={col}
                                                                    value={col}
                                                                >
                                                                    {col}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        {/* Mapowanie grup cenowych */}
                                        <div className="mt-3">
                                            <label className="block text-xs font-medium text-yellow-800 mb-2">
                                                Mapowanie grup cenowych:
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {schema.priceGroups.map(
                                                    (pg) => {
                                                        const existing =
                                                            columnMapping.priceColumns.find(
                                                                (pc) =>
                                                                    pc.targetGroup ===
                                                                    pg.name
                                                            );
                                                        return (
                                                            <div
                                                                key={pg.name}
                                                                className="flex items-center gap-1"
                                                            >
                                                                <span className="text-xs text-yellow-700 w-16 truncate">
                                                                    {pg.name}:
                                                                </span>
                                                                <select
                                                                    value={
                                                                        existing?.excelColumn ||
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const newPriceColumns =
                                                                            columnMapping.priceColumns.filter(
                                                                                (
                                                                                    pc
                                                                                ) =>
                                                                                    pc.targetGroup !==
                                                                                    pg.name
                                                                            );
                                                                        if (
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ) {
                                                                            newPriceColumns.push(
                                                                                {
                                                                                    excelColumn:
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    targetGroup:
                                                                                        pg.name,
                                                                                }
                                                                            );
                                                                        }
                                                                        const newMapping =
                                                                            {
                                                                                ...columnMapping,
                                                                                priceColumns:
                                                                                    newPriceColumns,
                                                                            };
                                                                        setColumnMapping(
                                                                            newMapping
                                                                        );
                                                                        if (
                                                                            newMapping.name &&
                                                                            newMapping
                                                                                .priceColumns
                                                                                .length >
                                                                                0 &&
                                                                            excelData
                                                                        ) {
                                                                            calculateChanges(
                                                                                excelData,
                                                                                newMapping
                                                                            );
                                                                        }
                                                                    }}
                                                                    className="flex-1 text-xs border border-yellow-300 rounded px-1 py-0.5 bg-white"
                                                                >
                                                                    <option value="">
                                                                        --
                                                                    </option>
                                                                    {excelColumns.map(
                                                                        (
                                                                            col
                                                                        ) => (
                                                                            <option
                                                                                key={
                                                                                    col
                                                                                }
                                                                                value={
                                                                                    col
                                                                                }
                                                                            >
                                                                                {
                                                                                    col
                                                                                }
                                                                            </option>
                                                                        )
                                                                    )}
                                                                </select>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Statystyki dopasowania z sugestiami */}
                    {matchStats && (
                        <div
                            className={`p-4 rounded-lg border ${
                                mode === "ai"
                                    ? "bg-purple-50 border-purple-200"
                                    : mode === "prices"
                                    ? "bg-green-50 border-green-200"
                                    : "bg-blue-50 border-blue-200"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-green-600 font-medium">
                                        ✓ Dopasowano: {matchStats.matched}/
                                        {matchStats.totalExcel}
                                    </span>
                                    {matchStats.notFound.length > 0 && (
                                        <span className="text-orange-600">
                                            ⚠ Nie znaleziono:{" "}
                                            {matchStats.notFound.length}
                                        </span>
                                    )}
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                            mode === "ai"
                                                ? "bg-purple-200 text-purple-700"
                                                : mode === "prices"
                                                ? "bg-green-200 text-green-700"
                                                : "bg-blue-200 text-blue-700"
                                        }`}
                                    >
                                        {mode === "ai"
                                            ? "🤖 AI Smart"
                                            : mode === "prices"
                                            ? "💰 Tylko ceny"
                                            : "📦 Pełny import"}
                                    </span>
                                </div>

                                {/* Przycisk Zastosuj AI - tylko dla trybu AI */}
                                {mode === "ai" &&
                                    matchStats.suggestions.filter(
                                        (s) =>
                                            !s.bestMatch &&
                                            s.allSuggestions.length > 0 &&
                                            !appliedAISuggestions.has(s.name)
                                    ).length > 0 && (
                                        <Button
                                            size="sm"
                                            onClick={applyAISuggestions}
                                            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                                        >
                                            <Wand2 className="w-4 h-4" />
                                            Zastosuj AI (
                                            {
                                                matchStats.suggestions.filter(
                                                    (s) =>
                                                        !s.bestMatch &&
                                                        s.allSuggestions
                                                            .length > 0 &&
                                                        !appliedAISuggestions.has(
                                                            s.name
                                                        )
                                                ).length
                                            }
                                            )
                                        </Button>
                                    )}
                            </div>

                            {/* Info o trybie prices */}
                            {mode === "prices" &&
                                matchStats.notFound.length > 0 && (
                                    <div className="text-xs text-green-700 mb-2 bg-green-100 rounded px-2 py-1">
                                        💡 Tryb "Tylko ceny" wymaga dokładnej
                                        nazwy lub previousName w bazie
                                    </div>
                                )}

                            {/* Sugestie poprawek */}
                            {matchStats.suggestions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Search className="w-4 h-4 text-purple-500" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {mode === "ai"
                                                ? "Automatyczne dopasowania:"
                                                : "Znalezione w exel (sugestie):"}
                                        </span>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {matchStats.suggestions
                                            .slice(0, 15)
                                            .map((s, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between text-xs bg-white/50 rounded px-2 py-1"
                                                >
                                                    <div>
                                                        <span className="text-gray-600 font-medium">
                                                            "{s.name}"
                                                        </span>
                                                        {s.bestMatch ||
                                                        appliedAISuggestions.has(
                                                            s.name
                                                        ) ? (
                                                            <span className="text-green-600 ml-2">
                                                                ✓ → "
                                                                {s.bestMatch ||
                                                                    s
                                                                        .allSuggestions[0]}
                                                                "
                                                            </span>
                                                        ) : s.allSuggestions
                                                              .length > 0 ? (
                                                            <span className="text-orange-600 ml-2">
                                                                → może:{" "}
                                                                {s.allSuggestions
                                                                    .slice(0, 2)
                                                                    .join(", ")}
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-500 ml-2">
                                                                ✗ brak
                                                                dopasowania
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Przycisk do pojedynczej sugestii - tylko dla AI */}
                                                    {mode === "ai" &&
                                                        !s.bestMatch &&
                                                        !appliedAISuggestions.has(
                                                            s.name
                                                        ) &&
                                                        s.allSuggestions
                                                            .length > 0 && (
                                                            <button
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    applySingleSuggestion(
                                                                        s.name,
                                                                        s
                                                                            .allSuggestions[0]
                                                                    );
                                                                }}
                                                                className="text-purple-600 hover:text-purple-800 hover:bg-purple-100 px-2 py-0.5 rounded flex items-center gap-1"
                                                            >
                                                                <Wand2 className="w-3 h-3" />
                                                                Użyj
                                                            </button>
                                                        )}
                                                </div>
                                            ))}
                                        {matchStats.suggestions.length > 15 && (
                                            <div className="text-xs text-gray-400 text-center">
                                                ...i{" "}
                                                {matchStats.suggestions.length -
                                                    15}{" "}
                                                więcej
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ============================================ */}
                    {/* PORÓWNANIE EXCEL VS BAZA - tylko w trybie FULL */}
                    {/* ============================================ */}
                    {mode === "full" &&
                        comparisonStats &&
                        (comparisonStats.missingInExcel.length > 0 ||
                            comparisonStats.newInExcel.length > 0 ||
                            comparisonStats.missingElementsInExcel.length > 0 ||
                            comparisonStats.newElementsInExcel.length > 0) && (
                            <div className="border border-amber-200 rounded-lg bg-amber-50 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    <span className="font-semibold text-amber-900">
                                        Porównanie Excel vs Baza
                                    </span>
                                </div>

                                {/* Statystyki ogólne */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-white rounded p-2 border border-amber-200">
                                        <span className="text-gray-600">
                                            Produkty w Excel:
                                        </span>
                                        <span className="font-bold ml-2 text-gray-900">
                                            {
                                                comparisonStats.productsInExcel
                                                    .length
                                            }
                                        </span>
                                    </div>
                                    <div className="bg-white rounded p-2 border border-amber-200">
                                        <span className="text-gray-600">
                                            Produkty w bazie:
                                        </span>
                                        <span className="font-bold ml-2 text-gray-900">
                                            {
                                                comparisonStats.productsInDb
                                                    .length
                                            }
                                        </span>
                                    </div>
                                </div>

                                {/* Brakujące w Excel (są w bazie ale nie w Excel) */}
                                {comparisonStats.missingInExcel.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-red-600 font-medium text-sm">
                                                ⚠️ Produkty z bazy których NIE
                                                MA w Excel (
                                                {
                                                    comparisonStats
                                                        .missingInExcel.length
                                                }
                                                ):
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {comparisonStats.missingInExcel
                                                .slice(0, 20)
                                                .map((name, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded"
                                                    >
                                                        {name}
                                                    </span>
                                                ))}
                                            {comparisonStats.missingInExcel
                                                .length > 20 && (
                                                <span className="text-xs text-red-500">
                                                    ...i{" "}
                                                    {comparisonStats
                                                        .missingInExcel.length -
                                                        20}{" "}
                                                    więcej
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Nowe w Excel (są w Excel ale nie w bazie) */}
                                {comparisonStats.newInExcel.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-blue-600 font-medium text-sm">
                                                🆕 Nowe produkty w Excel (nie ma
                                                ich w bazie) (
                                                {
                                                    comparisonStats.newInExcel
                                                        .length
                                                }
                                                ):
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {comparisonStats.newInExcel
                                                .slice(0, 20)
                                                .map((name, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                                                    >
                                                        {name}
                                                    </span>
                                                ))}
                                            {comparisonStats.newInExcel.length >
                                                20 && (
                                                <span className="text-xs text-blue-500">
                                                    ...i{" "}
                                                    {comparisonStats.newInExcel
                                                        .length - 20}{" "}
                                                    więcej
                                                </span>
                                            )}
                                        </div>
                                        {mode !== "full" && (
                                            <p className="text-xs text-blue-600 mt-2">
                                                💡 Użyj trybu "Pełny import" aby
                                                dodać te produkty do bazy
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Brakujące elementy */}
                                {comparisonStats.missingElementsInExcel.length >
                                    0 && (
                                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-orange-600 font-medium text-sm">
                                                ⚠️ Elementy z bazy których NIE
                                                MA w Excel (
                                                {
                                                    comparisonStats
                                                        .missingElementsInExcel
                                                        .length
                                                }
                                                ):
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {comparisonStats.missingElementsInExcel
                                                .slice(0, 15)
                                                .map((el, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded"
                                                    >
                                                        {el.product} →{" "}
                                                        {el.element}
                                                    </span>
                                                ))}
                                            {comparisonStats
                                                .missingElementsInExcel.length >
                                                15 && (
                                                <span className="text-xs text-orange-500">
                                                    ...i{" "}
                                                    {comparisonStats
                                                        .missingElementsInExcel
                                                        .length - 15}{" "}
                                                    więcej
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    {/* Nowe elementy do dodania - z checkboxami */}
                    {/* Pokazuj tylko elementy dla produktów z bazy lub zaznaczonych nowych produktów */}
                    {filteredNewElements.length > 0 && (
                        <div className="mb-4 border border-green-200 rounded-lg">
                            <div className="p-3 bg-green-50 border-b border-green-200 rounded-t-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                            />
                                        </svg>
                                        <span className="font-medium">
                                            Nowe elementy do dodania:{" "}
                                            {
                                                filteredNewElements.filter(
                                                    (el) => el.selected
                                                ).length
                                            }{" "}
                                            / {filteredNewElements.length}
                                        </span>
                                    </div>
                                    <button
                                        onClick={toggleAllNewElements}
                                        className="text-sm text-green-600 hover:text-green-700"
                                    >
                                        {filteredNewElements.every(
                                            (el) => el.selected
                                        )
                                            ? "Odznacz wszystkie"
                                            : "Zaznacz wszystkie"}
                                    </button>
                                </div>
                                <p className="text-sm text-green-600 mt-1 ml-7">
                                    Te elementy zostaną dodane do istniejących
                                    produktów.
                                </p>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {filteredNewElements.map((el, idx) => (
                                    <div
                                        key={`${el.product}-${el.element}-${idx}`}
                                        className={`px-4 py-2 border-b border-green-100 last:border-0 flex items-center gap-3 hover:bg-green-50/50 cursor-pointer ${
                                            el.selected ? "bg-green-50/30" : ""
                                        }`}
                                        onClick={() =>
                                            toggleNewElement(
                                                el.product,
                                                el.element
                                            )
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            checked={el.selected}
                                            onChange={() =>
                                                toggleNewElement(
                                                    el.product,
                                                    el.element
                                                )
                                            }
                                            className="w-4 h-4 text-green-600 rounded border-green-300 focus:ring-green-500"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-700 text-sm">
                                                    {el.product}
                                                    {previousNameToActualName.has(
                                                        el.product.toLowerCase()
                                                    ) && (
                                                        <span className="text-blue-600 ml-1">
                                                            (
                                                            {previousNameToActualName.get(
                                                                el.product.toLowerCase()
                                                            )}
                                                            )
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-gray-400">
                                                    ›
                                                </span>
                                                <span className="text-green-600 font-mono text-xs">
                                                    {el.element}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                <span>
                                                    Ceny:{" "}
                                                    {
                                                        Object.keys(el.prices)
                                                            .length
                                                    }{" "}
                                                    grup
                                                </span>
                                                {el.description && (
                                                    <span className="text-purple-600">
                                                        Wymiary:{" "}
                                                        {el.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Podgląd zmian */}
                    {/* Info o aktualizacji wymiarów - tylko tryb FULL */}
                    {mode === "full" && descriptionChanges.length > 0 && (
                        <div className="mb-4 border border-purple-200 rounded-lg">
                            <div className="p-3 bg-purple-50 border-b border-purple-200 rounded-t-lg">
                                <div className="flex items-center gap-2 text-purple-700">
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                        />
                                    </svg>
                                    <span className="font-medium">
                                        Wymiary do aktualizacji:{" "}
                                        {descriptionChanges.length} elementów
                                    </span>
                                </div>
                                <p className="text-sm text-purple-600 mt-1 ml-7">
                                    Opisy elementów (wymiary) zostaną
                                    zaktualizowane przy zapisie.
                                </p>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {descriptionChanges.map((dc, idx) => (
                                    <div
                                        key={`${dc.product}-${dc.element}-${idx}`}
                                        className="px-4 py-2 border-b border-purple-100 last:border-0 text-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700">
                                                {dc.product}
                                            </span>
                                            <span className="text-gray-400">
                                                ›
                                            </span>
                                            <span className="text-purple-600 font-mono text-xs">
                                                {dc.element}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs">
                                            <span className="text-gray-400 line-through">
                                                {dc.oldDescription}
                                            </span>
                                            <span className="text-gray-400">
                                                →
                                            </span>
                                            <span className="text-purple-700 font-medium">
                                                {dc.newDescription}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {changes.length > 0 && (
                        <div className="border border-gray-200 rounded-lg">
                            <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-semibold text-gray-900">
                                            Znalezione zmiany: {changes.length}
                                        </span>
                                        <div className="flex gap-4 mt-1 text-sm">
                                            <span className="text-green-600 flex items-center gap-1">
                                                <TrendingUp className="w-4 h-4" />
                                                {
                                                    changes.filter(
                                                        (c) =>
                                                            c.percentChange > 0
                                                    ).length
                                                }{" "}
                                                podwyżek
                                            </span>
                                            <span className="text-red-600 flex items-center gap-1">
                                                <TrendingDown className="w-4 h-4" />
                                                {
                                                    changes.filter(
                                                        (c) =>
                                                            c.percentChange < 0
                                                    ).length
                                                }{" "}
                                                obniżek
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleAll}
                                        className="text-sm text-green-600 hover:text-green-700"
                                    >
                                        {selectedChanges.size === changes.length
                                            ? "Odznacz wszystkie"
                                            : "Zaznacz wszystkie"}
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-96 overflow-y-auto">
                                {Object.entries(groupedChanges).map(
                                    ([group, groupChanges]) => (
                                        <div
                                            key={group}
                                            className="border-b border-gray-100 last:border-0"
                                        >
                                            <button
                                                onClick={() =>
                                                    toggleGroup(group)
                                                }
                                                className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                                            >
                                                <span className="font-medium text-gray-700">
                                                    {group} (
                                                    {groupChanges.length})
                                                </span>
                                                {expandedGroups.has(group) ? (
                                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                                )}
                                            </button>

                                            {expandedGroups.has(group) && (
                                                <div className="divide-y divide-gray-100">
                                                    {groupChanges.map(
                                                        (change) => (
                                                            <div
                                                                key={change.id}
                                                                onClick={() =>
                                                                    toggleChange(
                                                                        change.id
                                                                    )
                                                                }
                                                                className={`
                                                            px-4 py-2 flex items-center justify-between cursor-pointer
                                                            ${
                                                                selectedChanges.has(
                                                                    change.id
                                                                )
                                                                    ? "bg-green-50"
                                                                    : "hover:bg-gray-50"
                                                            }
                                                        `}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`
                                                                    w-5 h-5 rounded border-2 flex items-center justify-center
                                                                    ${
                                                                        selectedChanges.has(
                                                                            change.id
                                                                        )
                                                                            ? "bg-green-500 border-green-500"
                                                                            : "border-gray-300"
                                                                    }
                                                                `}
                                                                    >
                                                                        {selectedChanges.has(
                                                                            change.id
                                                                        ) && (
                                                                            <Check className="w-3 h-3 text-white" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm text-gray-700">
                                                                            {
                                                                                change.product
                                                                            }
                                                                        </span>
                                                                        {change.previousName &&
                                                                            change.previousName.toLowerCase() !==
                                                                                change.product.toLowerCase() && (
                                                                                <span className="text-xs text-purple-600 ml-1">
                                                                                    (było:{" "}
                                                                                    {
                                                                                        change.previousName
                                                                                    }

                                                                                    )
                                                                                </span>
                                                                            )}
                                                                        {change.element && (
                                                                            <span className="text-xs text-gray-500 ml-2">
                                                                                (
                                                                                {
                                                                                    change.element
                                                                                }

                                                                                )
                                                                            </span>
                                                                        )}
                                                                        {change.size && (
                                                                            <span className="text-xs text-gray-500 ml-2">
                                                                                [
                                                                                {
                                                                                    change.size
                                                                                }

                                                                                ]
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-sm">
                                                                    <span className="text-gray-400 line-through">
                                                                        {change.oldPrice.toLocaleString(
                                                                            "pl-PL"
                                                                        )}{" "}
                                                                        zł
                                                                    </span>
                                                                    <span className="font-medium text-gray-900">
                                                                        {change.newPrice.toLocaleString(
                                                                            "pl-PL"
                                                                        )}{" "}
                                                                        zł
                                                                    </span>
                                                                    <span
                                                                        className={`
                                                                    px-2 py-0.5 rounded text-xs font-medium
                                                                    ${
                                                                        change.percentChange >
                                                                        0
                                                                            ? "bg-green-100 text-green-700"
                                                                            : "bg-red-100 text-red-700"
                                                                    }
                                                                `}
                                                                    >
                                                                        {change.percentChange >
                                                                        0
                                                                            ? "+"
                                                                            : ""}
                                                                        {
                                                                            change.percentChange
                                                                        }
                                                                        %
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* Brak zmian cen, ale są wymiary - tylko w trybie FULL */}
                    {mode === "full" &&
                        changes.length === 0 &&
                        newProducts.length === 0 &&
                        descriptionChanges.length > 0 &&
                        columnMapping.name &&
                        columnMapping.priceColumns.length > 0 && (
                            <div className="text-center py-6 text-gray-500">
                                <p>
                                    Nie znaleziono zmian cenowych, ale wykryto
                                    wymiary do aktualizacji.
                                </p>
                                <p className="text-sm mt-1">
                                    Kliknij &quot;Zapisz wymiary&quot; poniżej,
                                    aby zaktualizować opisy elementów.
                                </p>
                            </div>
                        )}

                    {/* Brak zmian */}
                    {changes.length === 0 &&
                        newProducts.length === 0 &&
                        descriptionChanges.length === 0 &&
                        columnMapping.name &&
                        columnMapping.priceColumns.length > 0 && (
                            <div className="text-center py-6 text-gray-500">
                                {mode === "full"
                                    ? "Nie znaleziono zmian cenowych ani nowych produktów w pliku Excel"
                                    : "Nie znaleziono zmian cenowych w pliku Excel"}
                            </div>
                        )}

                    {/* Mapowanie nazw dla trybu FULL - pozwala wpisać nowe nazwy */}
                    {mode === "full" &&
                        matchStats &&
                        matchStats.suggestions.length > 0 && (
                            <div className="border border-purple-200 rounded-lg bg-purple-50 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Edit3 className="w-5 h-5 text-purple-600" />
                                    <span className="font-semibold text-purple-900">
                                        Mapowanie nazw (opcjonalne)
                                    </span>
                                </div>
                                <p className="text-sm text-purple-700 mb-4">
                                    Wpisz nowe nazwy produktów w formacie:{" "}
                                    <span className="font-mono bg-purple-100 px-1 rounded">
                                        NowaNazwa - StaraNazwaZExcel
                                    </span>
                                </p>

                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {matchStats.suggestions
                                        .filter(
                                            (s) =>
                                                !s.bestMatch &&
                                                !appliedAISuggestions.has(
                                                    s.name
                                                )
                                        )
                                        .map((s, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 bg-white rounded-lg p-2 border border-purple-100"
                                            >
                                                <div className="flex-shrink-0 w-48">
                                                    <span className="text-sm text-gray-600 font-medium">
                                                        "{s.name}"
                                                    </span>
                                                    {s.allSuggestions.length >
                                                        0 && (
                                                        <div className="text-xs text-purple-500">
                                                            sugestia:{" "}
                                                            {
                                                                s
                                                                    .allSuggestions[0]
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder={
                                                        s.allSuggestions[0] ||
                                                        "Wpisz nową nazwę..."
                                                    }
                                                    className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none"
                                                    onChange={(e) => {
                                                        const value =
                                                            e.target.value.trim();
                                                        if (value) {
                                                            setNameMapping(
                                                                (prev) => {
                                                                    const next =
                                                                        new Map(
                                                                            prev
                                                                        );
                                                                    next.set(
                                                                        s.name,
                                                                        {
                                                                            excelName:
                                                                                s.name,
                                                                            matchedProduct:
                                                                                s
                                                                                    .allSuggestions[0] ||
                                                                                null,
                                                                            newName:
                                                                                value,
                                                                            useAsSuggestion:
                                                                                false,
                                                                        }
                                                                    );
                                                                    return next;
                                                                }
                                                            );
                                                        } else {
                                                            setNameMapping(
                                                                (prev) => {
                                                                    const next =
                                                                        new Map(
                                                                            prev
                                                                        );
                                                                    next.delete(
                                                                        s.name
                                                                    );
                                                                    return next;
                                                                }
                                                            );
                                                        }
                                                    }}
                                                />
                                                {s.allSuggestions.length >
                                                    0 && (
                                                    <button
                                                        onClick={() =>
                                                            applySingleSuggestion(
                                                                s.name,
                                                                s
                                                                    .allSuggestions[0]
                                                            )
                                                        }
                                                        className="text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100 px-2 py-1 rounded flex items-center gap-1 flex-shrink-0"
                                                    >
                                                        <Wand2 className="w-3 h-3" />
                                                        AI
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                </div>

                                {matchStats.suggestions.filter(
                                    (s) =>
                                        !s.bestMatch &&
                                        !appliedAISuggestions.has(s.name)
                                ).length === 0 && (
                                    <div className="text-sm text-green-600 text-center py-2">
                                        ✓ Wszystkie nazwy zostały dopasowane
                                    </div>
                                )}
                            </div>
                        )}

                    {/* ============================================ */}
                    {/* NOWE PRODUKTY - tryb "full" */}
                    {/* ============================================ */}
                    {mode === "full" && newProducts.length > 0 && (
                        <div className="border border-blue-200 rounded-lg bg-blue-50 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PlusCircle className="w-5 h-5 text-blue-600" />
                                    <span className="font-semibold text-blue-900">
                                        Nowe produkty ({newProducts.length})
                                    </span>
                                    <span className="text-sm text-blue-600">
                                        - wybrano {selectedNewProducts.length}
                                    </span>
                                </div>
                                <button
                                    onClick={toggleAllNewProducts}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    {newProducts.every((np) => np.selected)
                                        ? "Odznacz wszystkie"
                                        : "Zaznacz wszystkie"}
                                </button>
                            </div>

                            <p className="text-sm text-blue-700">
                                Te produkty nie istnieją w bazie. Uzupełnij
                                nazwy i kategorie, a następnie wybierz które
                                chcesz dodać.
                            </p>

                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {newProducts.map((np, i) => (
                                    <div
                                        key={i}
                                        className={`
                                            bg-white rounded-lg p-3 border transition-all
                                            ${
                                                np.selected
                                                    ? "border-blue-400 shadow-sm"
                                                    : "border-gray-200"
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <div className="pt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={np.selected}
                                                    onChange={() =>
                                                        toggleNewProduct(
                                                            np.excelName
                                                        )
                                                    }
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Treść */}
                                            <div className="flex-1 space-y-2">
                                                {/* Nazwa z Excel */}
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>Z Excela:</span>
                                                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                                                        {np.excelName}
                                                    </span>
                                                </div>

                                                {/* Nowa nazwa */}
                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm text-gray-600 w-24">
                                                        Nazwa:
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={np.newName}
                                                        onChange={(e) =>
                                                            updateNewProductName(
                                                                np.excelName,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Wpisz nazwę produktu..."
                                                        className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                                                    />
                                                </div>

                                                {/* Kategoria - jeśli dostępne */}
                                                {availableCategories.length >
                                                    0 && (
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm text-gray-600 w-24">
                                                            Kategoria:
                                                        </label>
                                                        <select
                                                            value={
                                                                np.category ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                updateNewProductCategory(
                                                                    np.excelName,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white"
                                                        >
                                                            <option value="">
                                                                Wybierz
                                                                kategorię...
                                                            </option>
                                                            {availableCategories.map(
                                                                (cat, ci) => (
                                                                    <option
                                                                        key={ci}
                                                                        value={
                                                                            cat
                                                                        }
                                                                    >
                                                                        {cat}
                                                                    </option>
                                                                )
                                                            )}
                                                            <option value="__new__">
                                                                + Nowa
                                                                kategoria...
                                                            </option>
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Podgląd danych */}
                                                <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-2">
                                                    {np.elements &&
                                                        np.elements.length >
                                                            0 && (
                                                            <div>
                                                                <span className="font-medium">
                                                                    Elementy:
                                                                </span>{" "}
                                                                {np.elements
                                                                    .slice(0, 3)
                                                                    .map(
                                                                        (el) =>
                                                                            el.code
                                                                    )
                                                                    .join(", ")}
                                                                {np.elements
                                                                    .length >
                                                                    3 &&
                                                                    ` i ${
                                                                        np
                                                                            .elements
                                                                            .length -
                                                                        3
                                                                    } więcej...`}
                                                            </div>
                                                        )}
                                                    {np.prices &&
                                                        Object.keys(np.prices)
                                                            .length > 0 && (
                                                            <div>
                                                                <span className="font-medium">
                                                                    Ceny:
                                                                </span>{" "}
                                                                {Object.entries(
                                                                    np.prices
                                                                )
                                                                    .slice(0, 3)
                                                                    .map(
                                                                        ([
                                                                            k,
                                                                            v,
                                                                        ]) =>
                                                                            `${k}: ${v} zł`
                                                                    )
                                                                    .join(", ")}
                                                                {Object.keys(
                                                                    np.prices
                                                                ).length > 3 &&
                                                                    ` i ${
                                                                        Object.keys(
                                                                            np.prices
                                                                        )
                                                                            .length -
                                                                        3
                                                                    } więcej...`}
                                                            </div>
                                                        )}
                                                    {np.sizes &&
                                                        np.sizes.length > 0 && (
                                                            <div>
                                                                <span className="font-medium">
                                                                    Rozmiary:
                                                                </span>{" "}
                                                                {np.sizes
                                                                    .slice(0, 3)
                                                                    .map(
                                                                        (s) =>
                                                                            `${s.dimension}: ${s.prices} zł`
                                                                    )
                                                                    .join(", ")}
                                                                {np.sizes
                                                                    .length >
                                                                    3 &&
                                                                    ` i ${
                                                                        np.sizes
                                                                            .length -
                                                                        3
                                                                    } więcej...`}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Przyciski akcji - 3 opcje */}
                    {((changes.length > 0 && selectedChanges.size > 0) ||
                        selectedNewProducts.length > 0) && (
                        <div className="flex flex-col gap-3">
                            <div className="text-sm text-gray-600 font-medium">
                                {selectedChanges.size > 0 &&
                                selectedNewProducts.length > 0
                                    ? `Zastosuj ${selectedChanges.size} zmian + ${selectedNewProducts.length} nowych produktów:`
                                    : selectedNewProducts.length > 0
                                    ? `Dodaj ${selectedNewProducts.length} nowych produktów:`
                                    : `Wybierz sposób zastosowania ${selectedChanges.size} zmian:`}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Button
                                    onClick={() => applyChanges("overwrite")}
                                    className="bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    {selectedNewProducts.length > 0 ? (
                                        <>
                                            <PlusCircle className="w-4 h-4" />
                                            Zastosuj
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            Nadpisz ({selectedChanges.size})
                                        </>
                                    )}
                                </Button>
                                {selectedChanges.size > 0 && (
                                    <Button
                                        onClick={() => applyChanges("merge")}
                                        variant="outline"
                                        className="flex items-center justify-center gap-2"
                                    >
                                        <Merge className="w-4 h-4" />
                                        Scal (zachowaj wyższe)
                                    </Button>
                                )}
                                {/* Przycisk "Dodaj nowe elementy" */}
                                {filteredNewElements.filter((el) => el.selected)
                                    .length > 0 &&
                                    schema.hasElements &&
                                    schema.priceLocation === "elements" && (
                                        <Button
                                            onClick={addNewElements}
                                            variant="outline"
                                            className="flex items-center justify-center gap-2 border-green-300 text-green-600 hover:bg-green-50"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            Dodaj elementy (
                                            {
                                                filteredNewElements.filter(
                                                    (el) => el.selected
                                                ).length
                                            }
                                            )
                                        </Button>
                                    )}
                                {/* Przycisk "Zapisz wymiary" - tylko tryb FULL gdy są wymiary do zapisania */}
                                {mode === "full" &&
                                    descriptionChanges.length > 0 &&
                                    schema.hasElements &&
                                    schema.priceLocation === "elements" && (
                                        <Button
                                            onClick={applyDimensionsOnly}
                                            variant="outline"
                                            className="flex items-center justify-center gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                                        >
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                                />
                                            </svg>
                                            Zapisz wymiary (
                                            {descriptionChanges.length})
                                        </Button>
                                    )}
                                <Button
                                    onClick={resetState}
                                    variant="outline"
                                    className="flex items-center justify-center gap-2 text-gray-600"
                                >
                                    <SkipForward className="w-4 h-4" />
                                    Anuluj
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Przyciski gdy tylko wymiary do zapisania (brak zmian cen) */}
                    {/* Przycisk wymiarów gdy nie ma zmian cenowych - tylko tryb FULL */}
                    {mode === "full" &&
                        changes.length === 0 &&
                        newProducts.length === 0 &&
                        descriptionChanges.length > 0 &&
                        schema.hasElements &&
                        schema.priceLocation === "elements" && (
                            <div className="flex flex-col gap-3">
                                <div className="text-sm text-gray-600 font-medium">
                                    Zapisz wymiary dla{" "}
                                    {descriptionChanges.length} elementów:
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={applyDimensionsOnly}
                                        className="bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                            />
                                        </svg>
                                        Zapisz wymiary (
                                        {descriptionChanges.length})
                                    </Button>
                                    <Button
                                        onClick={resetState}
                                        variant="outline"
                                        className="flex items-center justify-center gap-2 text-gray-600"
                                    >
                                        <SkipForward className="w-4 h-4" />
                                        Anuluj
                                    </Button>
                                </div>
                            </div>
                        )}

                    {/* Przyciski gdy tylko nowe elementy do dodania (brak zmian cen i nowych produktów) */}
                    {changes.length === 0 &&
                        newProducts.filter((p) => p.selected).length === 0 &&
                        descriptionChanges.length === 0 &&
                        filteredNewElements.filter((el) => el.selected).length >
                            0 &&
                        schema.hasElements &&
                        schema.priceLocation === "elements" && (
                            <div className="flex flex-col gap-3">
                                <div className="text-sm text-gray-600 font-medium">
                                    Dodaj{" "}
                                    {
                                        filteredNewElements.filter(
                                            (el) => el.selected
                                        ).length
                                    }{" "}
                                    nowych elementów:
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={addNewElements}
                                        className="bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Dodaj elementy (
                                        {
                                            filteredNewElements.filter(
                                                (el) => el.selected
                                            ).length
                                        }
                                        )
                                    </Button>
                                    <Button
                                        onClick={resetState}
                                        variant="outline"
                                        className="flex items-center justify-center gap-2 text-gray-600"
                                    >
                                        <SkipForward className="w-4 h-4" />
                                        Anuluj
                                    </Button>
                                </div>
                            </div>
                        )}
                </div>
            )}
        </div>
    );
}
