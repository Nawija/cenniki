"use client";

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import { Button, toast } from "@/components/ui";
import * as XLSX from "xlsx";

// ============================================
// TYPY
// ============================================

interface PriceChange {
    id: string;
    product: string;
    priceGroup: string;
    oldPrice: number;
    newPrice: number;
    percentChange: number;
}

interface ColumnMapping {
    model: string | null;
    priceColumns: { excelColumn: string; targetGroup: string }[];
}

interface MatchStats {
    matched: number;
    notFound: string[];
    totalExcel: number;
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

// Grupy cenowe Puszman
const PUSZMAN_PRICE_GROUPS = [
    "grupa I",
    "grupa II",
    "grupa III",
    "grupa IV",
    "grupa V",
    "grupa VI",
];

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export function ExcelPriceUpdater({
    producerSlug,
    producerName,
    layoutType,
    currentData,
    onApplyChanges,
}: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [excelData, setExcelData] = useState<any[][] | null>(null);
    const [excelColumns, setExcelColumns] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
        model: null,
        priceColumns: [],
    });
    const [showMapping, setShowMapping] = useState(false);
    const [changes, setChanges] = useState<PriceChange[]>([]);
    const [selectedChanges, setSelectedChanges] = useState<Set<string>>(
        new Set()
    );
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(PUSZMAN_PRICE_GROUPS) // Domyślnie rozwiń wszystkie grupy
    );
    const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Drag & Drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && isExcelFile(file)) {
            processExcelFile(file);
        } else {
            toast.error("Proszę wybrać plik Excel (.xlsx, .xls, .ods)");
        }
    }, []);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file && isExcelFile(file)) {
                processExcelFile(file);
            } else if (file) {
                toast.error("Proszę wybrać plik Excel (.xlsx, .xls, .ods)");
            }
        },
        []
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

    // Przetwarzanie pliku Excel
    const processExcelFile = async (file: File) => {
        setIsProcessing(true);
        setSelectedFile(file);
        setChanges([]);
        setSelectedChanges(new Set());

        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(uint8Array, { type: "array" });

            // Weź pierwszy arkusz
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                toast.error("Plik Excel nie zawiera żadnych arkuszy");
                return;
            }
            const worksheet = workbook.Sheets[sheetName];

            // Konwertuj na tablicę 2D
            const data = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: "",
            }) as any[][];

            console.log("Excel data:", data.slice(0, 3)); // Debug: pierwsze 3 wiersze

            if (data.length < 2) {
                toast.error("Plik Excel jest pusty lub ma za mało danych");
                return;
            }

            // Pierwszy wiersz to nagłówki
            const headers = data[0].map((h: any) =>
                h ? String(h).trim() : ""
            );
            console.log("Headers:", headers); // Debug
            setExcelColumns(headers);
            setExcelData(data);

            // Auto-mapowanie kolumn
            const autoMapping = autoDetectColumns(headers);
            console.log("Auto mapping:", autoMapping); // Debug
            setColumnMapping(autoMapping);

            // Jeśli znaleziono mapowanie, od razu pokaż podgląd
            if (autoMapping.model && autoMapping.priceColumns.length > 0) {
                calculateChanges(data, autoMapping);
            }

            setShowMapping(true);
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

    // Auto-detekcja kolumn
    const autoDetectColumns = (headers: string[]): ColumnMapping => {
        const mapping: ColumnMapping = {
            model: null,
            priceColumns: [],
        };

        // Szukaj kolumny z modelem
        const modelPatterns = [/^model$/i, /^nazwa$/i, /^produkt$/i, /^name$/i];
        for (const header of headers) {
            for (const pattern of modelPatterns) {
                if (pattern.test(header)) {
                    mapping.model = header;
                    break;
                }
            }
            if (mapping.model) break;
        }

        // Dla Puszman szukaj grup cenowych - DOKŁADNE dopasowanie
        if (layoutType === "puszman") {
            // Mapowanie wzorców dla każdej grupy (kolejność od VI do I żeby uniknąć częściowych matchów)
            const groupPatterns: { group: string; patterns: RegExp[] }[] = [
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
            ];

            for (const header of headers) {
                const normalizedHeader = header.trim();

                for (const { group, patterns } of groupPatterns) {
                    // Sprawdź czy ta grupa już nie jest zmapowana
                    if (
                        mapping.priceColumns.some(
                            (pc) => pc.targetGroup === group
                        )
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

            // Sortuj według kolejności grup
            const groupOrder = PUSZMAN_PRICE_GROUPS;
            mapping.priceColumns.sort(
                (a, b) =>
                    groupOrder.indexOf(a.targetGroup) -
                    groupOrder.indexOf(b.targetGroup)
            );
        }

        return mapping;
    };

    // Obliczanie zmian
    const calculateChanges = (data: any[][], mapping: ColumnMapping) => {
        if (!mapping.model || mapping.priceColumns.length === 0) {
            setChanges([]);
            setMatchStats(null);
            return;
        }

        const headers = data[0];
        const modelIndex = headers.indexOf(mapping.model);
        const priceIndices = mapping.priceColumns.map((pc) => ({
            index: headers.indexOf(pc.excelColumn),
            targetGroup: pc.targetGroup,
        }));

        if (modelIndex === -1) {
            toast.error("Nie znaleziono kolumny z modelem");
            return;
        }

        const newChanges: PriceChange[] = [];

        // Dla Puszman - matchowanie po MODEL lub previousName
        if (layoutType === "puszman" && currentData.Arkusz1) {
            // Tworzymy 2 mapy: po MODEL i po previousName (case-insensitive)
            const byModel = new Map<string, any>();
            const byPreviousName = new Map<string, any>();

            for (const p of currentData.Arkusz1) {
                const modelKey = p.MODEL?.trim().toLowerCase();
                if (modelKey) byModel.set(modelKey, p);

                const prevKey = p.previousName?.trim().toLowerCase();
                if (prevKey) byPreviousName.set(prevKey, p);
            }

            const notFound: string[] = [];
            let matchedCount = 0;

            // Przetwórz wiersze (pomijając nagłówek)
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const excelName = row[modelIndex]
                    ? String(row[modelIndex]).trim()
                    : "";

                if (!excelName) continue;

                const excelKey = excelName.toLowerCase();

                // Szukaj najpierw po MODEL, potem po previousName
                const currentProd =
                    byModel.get(excelKey) || byPreviousName.get(excelKey);

                if (!currentProd) {
                    notFound.push(excelName);
                    continue;
                }

                matchedCount++;

                // Sprawdź każdą grupę cenową
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
                            id: `${currentProd.MODEL}-${targetGroup}`,
                            product: currentProd.MODEL, // Używamy nowej nazwy z JSON
                            priceGroup: targetGroup,
                            oldPrice,
                            newPrice,
                            percentChange: Math.round(percentChange * 10) / 10,
                        });
                    }
                }
            }

            // Ustaw statystyki dopasowania
            const totalRows = data.length - 1; // bez nagłówka
            setMatchStats({
                matched: matchedCount,
                notFound,
                totalExcel: totalRows,
            });
        }

        setChanges(newChanges);
        setSelectedChanges(new Set(newChanges.map((c) => c.id)));
    };

    // Parsowanie ceny
    const parsePrice = (value: any): number | null => {
        if (value === null || value === undefined || value === "") return null;

        if (typeof value === "number") return value;

        // Usuń spacje, zamień przecinek na kropkę
        const cleaned = String(value)
            .replace(/\s/g, "")
            .replace(",", ".")
            .replace(/[^\d.]/g, "");

        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    };

    // Aktualizacja mapowania
    const updateMapping = (
        field: "model" | "price",
        value: string,
        targetGroup?: string
    ) => {
        const newMapping = { ...columnMapping };

        if (field === "model") {
            newMapping.model = value || null;
        } else if (field === "price" && targetGroup) {
            const existingIndex = newMapping.priceColumns.findIndex(
                (pc) => pc.targetGroup === targetGroup
            );

            if (value) {
                if (existingIndex >= 0) {
                    newMapping.priceColumns[existingIndex].excelColumn = value;
                } else {
                    newMapping.priceColumns.push({
                        excelColumn: value,
                        targetGroup,
                    });
                }
            } else {
                if (existingIndex >= 0) {
                    newMapping.priceColumns.splice(existingIndex, 1);
                }
            }
        }

        setColumnMapping(newMapping);

        // Przelicz zmiany
        if (excelData) {
            calculateChanges(excelData, newMapping);
        }
    };

    // Zastosuj zmiany
    const applyChanges = () => {
        if (changes.length === 0 || selectedChanges.size === 0) return;

        const selectedChangesList = changes.filter((c) =>
            selectedChanges.has(c.id)
        );

        // Aktualizuj dane
        const updatedData = { ...currentData };

        if (layoutType === "puszman" && updatedData.Arkusz1) {
            updatedData.Arkusz1 = updatedData.Arkusz1.map((prod: any) => {
                const updatedProd = { ...prod };

                for (const change of selectedChangesList) {
                    if (change.product === prod.MODEL) {
                        updatedProd[change.priceGroup] = change.newPrice;
                    }
                }

                return updatedProd;
            });
        }

        // Oblicz podsumowanie
        const summary = {
            totalChanges: selectedChangesList.length,
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

        onApplyChanges(updatedData, {
            changes: selectedChangesList,
            summary,
        });

        // Reset
        toast.success(
            `Zastosowano ${selectedChangesList.length} zmian cenowych`
        );
        resetState();
    };

    const resetState = () => {
        setSelectedFile(null);
        setExcelData(null);
        setExcelColumns([]);
        setColumnMapping({ model: null, priceColumns: [] });
        setShowMapping(false);
        setChanges([]);
        setSelectedChanges(new Set());
        setMatchStats(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Toggle selection
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

    // Grupowanie zmian
    const groupedChanges = changes.reduce((acc, change) => {
        const group = change.priceGroup;
        if (!acc[group]) acc[group] = [];
        acc[group].push(change);
        return acc;
    }, {} as Record<string, PriceChange[]>);

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

    // ============================================
    // RENDER
    // ============================================

    // Tylko dla Puszman na razie
    if (layoutType !== "puszman") {
        return null;
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">
                        Aktualizacja cen z Excel
                    </h3>
                    <p className="text-sm text-gray-500">
                        Wgraj plik Excel z nowymi cenami
                    </p>
                </div>
            </div>

            {/* Drop zone */}
            {!selectedFile && (
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
            )}

            {/* Processing */}
            {isProcessing && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500 mr-2" />
                    <span className="text-gray-600">
                        Przetwarzanie pliku...
                    </span>
                </div>
            )}

            {/* File selected - mapping & preview */}
            {selectedFile && !isProcessing && (
                <div className="space-y-4">
                    {/* File info */}
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

                    {/* Podgląd danych Excel */}
                    {excelData && excelData.length > 1 && (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-2 bg-blue-50 border-b border-gray-200">
                                <span className="font-medium text-gray-700">
                                    📊 Podgląd pliku Excel (
                                    {excelData.length - 1} wierszy)
                                </span>
                            </div>
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500 border-b whitespace-nowrap w-10">
                                                #
                                            </th>
                                            {excelColumns.map((col, i) => (
                                                <th
                                                    key={i}
                                                    className="px-3 py-2 text-left font-medium text-gray-600 border-b whitespace-nowrap"
                                                >
                                                    {col || `Kolumna ${i + 1}`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {excelData
                                            .slice(1)
                                            .map((row, rowIdx) => (
                                                <tr
                                                    key={rowIdx}
                                                    className="border-b last:border-0 hover:bg-gray-50"
                                                >
                                                    <td className="px-3 py-1.5 text-gray-400 text-xs whitespace-nowrap">
                                                        {rowIdx + 1}
                                                    </td>
                                                    {excelColumns.map(
                                                        (_, colIdx) => (
                                                            <td
                                                                key={colIdx}
                                                                className="px-3 py-1.5 text-gray-700 whitespace-nowrap"
                                                            >
                                                                {row[colIdx] ??
                                                                    ""}
                                                            </td>
                                                        )
                                                    )}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Statystyki dopasowania */}
                    {matchStats && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-green-600 font-medium">
                                    ✓ Dopasowano: {matchStats.matched}/
                                    {matchStats.totalExcel} produktów
                                </span>
                                {matchStats.notFound.length > 0 && (
                                    <span className="text-orange-600">
                                        ⚠ Nie znaleziono:{" "}
                                        {matchStats.notFound.length}
                                    </span>
                                )}
                            </div>
                            {matchStats.notFound.length > 0 &&
                                matchStats.notFound.length <= 15 && (
                                    <div className="mt-2 text-xs text-gray-600">
                                        <span className="font-medium">
                                            Brak w bazie:{" "}
                                        </span>
                                        {matchStats.notFound.join(", ")}
                                    </div>
                                )}
                            {matchStats.notFound.length > 15 && (
                                <div className="mt-2 text-xs text-gray-600">
                                    <span className="font-medium">
                                        Brak w bazie:{" "}
                                    </span>
                                    {matchStats.notFound
                                        .slice(0, 15)
                                        .join(", ")}
                                    ...
                                    <span className="text-orange-600">
                                        {" "}
                                        (+{matchStats.notFound.length - 15}{" "}
                                        więcej)
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Column mapping */}
                    {showMapping && (
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Settings2 className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-700">
                                    Mapowanie kolumn
                                </span>
                            </div>

                            <div className="grid gap-3">
                                {/* Model column */}
                                <div className="flex items-center gap-3">
                                    <label className="w-32 text-sm text-gray-600">
                                        Kolumna modelu:
                                    </label>
                                    <select
                                        value={columnMapping.model || ""}
                                        onChange={(e) =>
                                            updateMapping(
                                                "model",
                                                e.target.value
                                            )
                                        }
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="">
                                            Wybierz kolumnę
                                        </option>
                                        {excelColumns.map((col) => (
                                            <option key={col} value={col}>
                                                {col}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Price columns - dla Puszman */}
                                {PUSZMAN_PRICE_GROUPS.map((group) => {
                                    const mapping =
                                        columnMapping.priceColumns.find(
                                            (pc) => pc.targetGroup === group
                                        );
                                    return (
                                        <div
                                            key={group}
                                            className="flex items-center gap-3"
                                        >
                                            <label className="w-32 text-sm text-gray-600">
                                                {group}:
                                            </label>
                                            <select
                                                value={
                                                    mapping?.excelColumn || ""
                                                }
                                                onChange={(e) =>
                                                    updateMapping(
                                                        "price",
                                                        e.target.value,
                                                        group
                                                    )
                                                }
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                            >
                                                <option value="">
                                                    Wybierz kolumnę
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
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Changes preview */}
                    {changes.length > 0 && (
                        <div className="border border-gray-200 rounded-lg">
                            {/* Summary header */}
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

                            {/* Grouped changes */}
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
                                                                    <span className="text-sm text-gray-700">
                                                                        {
                                                                            change.product
                                                                        }
                                                                    </span>
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

                    {/* No changes message */}
                    {changes.length === 0 &&
                        columnMapping.model &&
                        columnMapping.priceColumns.length > 0 && (
                            <div className="text-center py-6 text-gray-500">
                                Nie znaleziono zmian cenowych w pliku Excel
                            </div>
                        )}

                    {/* Apply button */}
                    {changes.length > 0 && selectedChanges.size > 0 && (
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={resetState}>
                                Anuluj
                            </Button>
                            <Button
                                onClick={applyChanges}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Zastosuj {selectedChanges.size} zmian
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
