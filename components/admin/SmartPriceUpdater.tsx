"use client";

import { useState, useCallback, useRef } from "react";
import {
    Upload,
    FileText,
    X,
    AlertTriangle,
    Check,
    RefreshCw,
    Loader2,
    TrendingUp,
    TrendingDown,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui";
import GoogleSpinner from "../Loading";

// ============================================
// TYPY
// ============================================

interface PriceChange {
    id: string;
    product: string;
    element?: string;
    dimension?: string;
    category?: string;
    priceGroup?: string;
    oldPrice: number;
    newPrice: number;
    percentChange: number;
}

interface AnalysisResult {
    success: boolean;
    changes: PriceChange[];
    summary: {
        totalChanges: number;
        priceIncrease: number;
        priceDecrease: number;
        avgChangePercent: number;
    };
    updatedData: Record<string, any>;
    error?: string;
}

interface Props {
    producerSlug: string;
    producerName?: string;
    layoutType: string;
    currentData: Record<string, any>;
    onApplyChanges: (
        newData: Record<string, any>,
        aiChanges?: {
            changes: PriceChange[];
            summary: AnalysisResult["summary"];
        }
    ) => void;
}

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export function SmartPriceUpdater({
    producerSlug,
    producerName,
    layoutType,
    currentData,
    onApplyChanges,
}: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(["all"])
    );
    const [selectedChanges, setSelectedChanges] = useState<Set<string>>(
        new Set()
    );
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
        if (file && file.type === "application/pdf") {
            setSelectedFile(file);
            setResult(null);
        }
    }, []);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setSelectedFile(file);
                setResult(null);
            }
        },
        []
    );

    // Analiza PDF - tylko ceny
    const analyzePdf = async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("pdf", selectedFile);
            formData.append("producer", producerSlug);
            formData.append("layoutType", layoutType);
            formData.append("currentData", JSON.stringify(currentData));
            formData.append("mode", "prices-only"); // Nowy tryb - tylko ceny

            const response = await fetch("/api/analyze-pdf", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data.success && data.changes) {
                setResult(data);
                // Domyślnie zaznacz wszystkie zmiany
                setSelectedChanges(
                    new Set(data.changes.map((c: PriceChange) => c.id))
                );
            } else {
                setResult({
                    success: false,
                    changes: [],
                    summary: {
                        totalChanges: 0,
                        priceIncrease: 0,
                        priceDecrease: 0,
                        avgChangePercent: 0,
                    },
                    updatedData: {},
                    error: data.error || "Wystąpił błąd podczas analizy",
                });
            }
        } catch (error) {
            setResult({
                success: false,
                changes: [],
                summary: {
                    totalChanges: 0,
                    priceIncrease: 0,
                    priceDecrease: 0,
                    avgChangePercent: 0,
                },
                updatedData: {},
                error: "Wystąpił błąd podczas analizy. Spróbuj ponownie.",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Zastosuj wybrane zmiany
    const applySelectedChanges = () => {
        if (!result?.changes || result.changes.length === 0) return;
        if (selectedChanges.size === 0) return;

        // Filtruj tylko wybrane zmiany
        const selectedChangesList = result.changes.filter((c) =>
            selectedChanges.has(c.id)
        );

        // Zastosuj tylko wybrane zmiany
        const updatedData = applyChangesToData(
            currentData,
            result.changes,
            selectedChanges,
            layoutType
        );

        // Przekaż dane o zmianach do planowania
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
                    ? selectedChangesList.reduce(
                          (acc, c) => acc + c.percentChange,
                          0
                      ) / selectedChangesList.length
                    : 0,
        };

        onApplyChanges(updatedData, { changes: selectedChangesList, summary });
        setResult(null);
        setSelectedFile(null);
        setSelectedChanges(new Set());
    };

    // Toggle zmiany
    const toggleChange = (id: string) => {
        setSelectedChanges((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Zaznacz/Odznacz wszystkie
    const toggleAll = () => {
        if (selectedChanges.size === result?.changes.length) {
            setSelectedChanges(new Set());
        } else {
            setSelectedChanges(new Set(result?.changes.map((c) => c.id)));
        }
    };

    // Wyczyść
    const clearFile = () => {
        setSelectedFile(null);
        setResult(null);
        setSelectedChanges(new Set());
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Grupuj zmiany po produkcie
    const groupedChanges = result?.changes.reduce((acc, change) => {
        const key = change.category
            ? `${change.category} / ${change.product}`
            : change.product;
        if (!acc[key]) acc[key] = [];
        acc[key].push(change);
        return acc;
    }, {} as Record<string, PriceChange[]>);

    // Toggle wszystkie zmiany w grupie (produkt)
    const toggleGroup = (groupChanges: PriceChange[]) => {
        const groupIds = groupChanges.map((c) => c.id);
        const allSelected = groupIds.every((id) => selectedChanges.has(id));

        setSelectedChanges((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                // Odznacz wszystkie w grupie
                groupIds.forEach((id) => next.delete(id));
            } else {
                // Zaznacz wszystkie w grupie
                groupIds.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    // Sprawdź czy wszystkie w grupie są zaznaczone
    const isGroupFullySelected = (groupChanges: PriceChange[]) => {
        return groupChanges.every((c) => selectedChanges.has(c.id));
    };

    // Sprawdź czy część grupy jest zaznaczona (indeterminate)
    const isGroupPartiallySelected = (groupChanges: PriceChange[]) => {
        const selected = groupChanges.filter((c) => selectedChanges.has(c.id));
        return selected.length > 0 && selected.length < groupChanges.length;
    };

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            {!selectedFile && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                        isDragging
                            ? "border-blue-400 bg-blue-50 scale-[1.02]"
                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                >
                    <Upload
                        className={`w-10 h-10 mx-auto mb-3 ${
                            isDragging ? "text-blue-500" : "text-gray-400"
                        }`}
                    />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                        Przeciągnij nowy cennik PDF
                    </p>
                    <p className="text-xs text-gray-500">
                        AI automatycznie porówna ceny i zaktualizuje tylko
                        zmienione
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            )}

            {/* Wybrany plik */}
            {selectedFile && !result && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-linear-to-tr from-sky-100 to-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-sky-700" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(
                                        2
                                    )}{" "}
                                    MB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={clearFile}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <Button
                        onClick={analyzePdf}
                        disabled={isAnalyzing}
                        className="w-full relative overflow-hidden"
                        size="lg"
                    >
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                        )}
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Analizuję ceny...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Porównaj i znajdź zmiany cen
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-center text-gray-400">
                        AI porówna ceny z PDF do aktualnych danych i zaproponuje
                        aktualizacje
                    </p>
                </div>
            )}

            {/* Wyniki */}
            {result && (
                <div className="space-y-4">
                    {/* Błąd */}
                    {!result.success && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800">
                                    Błąd analizy
                                </p>
                                <p className="text-xs text-red-600 mt-1">
                                    {result.error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Sukces */}
                    {result.success && (
                        <>
                            {/* Podsumowanie */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-gray-700">
                                        {result.summary.totalChanges}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Zmian cen
                                    </p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <TrendingUp className="w-4 h-4 text-red-500" />
                                        <span className="text-2xl font-bold text-red-600">
                                            {result.summary.priceIncrease}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Wzrostów
                                    </p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <TrendingDown className="w-4 h-4 text-green-500" />
                                        <span className="text-2xl font-bold text-green-600">
                                            {result.summary.priceDecrease}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Spadków
                                    </p>
                                </div>
                            </div>

                            {/* Średnia zmiana */}
                            {result.summary.avgChangePercent != null &&
                                result.summary.avgChangePercent !== 0 && (
                                    <div className="text-center py-2 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">
                                            Średnia zmiana:
                                            <span
                                                className={`font-bold ml-1 ${
                                                    result.summary
                                                        .avgChangePercent > 0
                                                        ? "text-red-600"
                                                        : "text-green-600"
                                                }`}
                                            >
                                                {result.summary
                                                    .avgChangePercent > 0
                                                    ? "+"
                                                    : ""}
                                                {result.summary.avgChangePercent.toFixed(
                                                    1
                                                )}
                                                %
                                            </span>
                                        </span>
                                    </div>
                                )}

                            {/* Brak zmian */}
                            {result.changes.length === 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-500" />
                                    <p className="text-sm text-green-800 font-medium">
                                        Wszystkie ceny są aktualne - brak zmian
                                        do zastosowania
                                    </p>
                                </div>
                            )}

                            {/* Lista zmian */}
                            {result.changes.length > 0 && groupedChanges && (
                                <>
                                    {/* Przycisk zaznacz wszystkie */}
                                    <div className="flex items-center justify-between px-1">
                                        <button
                                            onClick={toggleAll}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            {selectedChanges.size ===
                                            result.changes.length
                                                ? "Odznacz wszystkie"
                                                : "Zaznacz wszystkie"}
                                        </button>
                                        <span className="text-sm text-gray-500">
                                            Wybrano: {selectedChanges.size} /{" "}
                                            {result.changes.length}
                                        </span>
                                    </div>

                                    {/* Zgrupowane zmiany */}
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                        {Object.entries(groupedChanges).map(
                                            ([productKey, changes]) => (
                                                <div
                                                    key={productKey}
                                                    className="border border-gray-200 rounded-lg overflow-hidden"
                                                >
                                                    <label className="bg-gray-50 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={isGroupFullySelected(
                                                                    changes
                                                                )}
                                                                ref={(el) => {
                                                                    if (el) {
                                                                        el.indeterminate =
                                                                            isGroupPartiallySelected(
                                                                                changes
                                                                            );
                                                                    }
                                                                }}
                                                                onChange={() =>
                                                                    toggleGroup(
                                                                        changes
                                                                    )
                                                                }
                                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm font-medium text-gray-800">
                                                                {productKey}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            {
                                                                changes.filter(
                                                                    (c) =>
                                                                        selectedChanges.has(
                                                                            c.id
                                                                        )
                                                                ).length
                                                            }{" "}
                                                            / {changes.length}{" "}
                                                            zmian
                                                        </span>
                                                    </label>
                                                    <div className="divide-y divide-gray-100">
                                                        {changes.map(
                                                            (change) => (
                                                                <label
                                                                    key={
                                                                        change.id
                                                                    }
                                                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedChanges.has(
                                                                            change.id
                                                                        )}
                                                                        onChange={() =>
                                                                            toggleChange(
                                                                                change.id
                                                                            )
                                                                        }
                                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            {change.element && (
                                                                                <span className="text-xs text-gray-500">
                                                                                    {
                                                                                        change.element
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                            {(change.dimension ||
                                                                                change.priceGroup) && (
                                                                                <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">
                                                                                    {change.dimension ||
                                                                                        change.priceGroup}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <span className="text-gray-400 line-through">
                                                                            {
                                                                                change.oldPrice
                                                                            }{" "}
                                                                            zł
                                                                        </span>
                                                                        <span className="text-gray-400">
                                                                            →
                                                                        </span>
                                                                        <span
                                                                            className={`font-semibold ${
                                                                                (change.percentChange ??
                                                                                    0) >
                                                                                0
                                                                                    ? "text-red-600"
                                                                                    : "text-green-600"
                                                                            }`}
                                                                        >
                                                                            {
                                                                                change.newPrice
                                                                            }{" "}
                                                                            zł
                                                                        </span>
                                                                        <span
                                                                            className={`text-xs px-1.5 py-0.5 rounded ${
                                                                                (change.percentChange ??
                                                                                    0) >
                                                                                0
                                                                                    ? "bg-red-100 text-red-700"
                                                                                    : "bg-green-100 text-green-700"
                                                                            }`}
                                                                        >
                                                                            {(change.percentChange ??
                                                                                0) >
                                                                            0
                                                                                ? "+"
                                                                                : ""}
                                                                            {(
                                                                                change.percentChange ??
                                                                                0
                                                                            ).toFixed(
                                                                                1
                                                                            )}
                                                                            %
                                                                        </span>
                                                                    </div>
                                                                </label>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* Przyciski akcji */}
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={clearFile}
                                            className="flex-1"
                                        >
                                            Anuluj
                                        </Button>
                                        <Button
                                            onClick={applySelectedChanges}
                                            disabled={
                                                selectedChanges.size === 0
                                            }
                                            className="flex-1"
                                        >
                                            <Check className="w-4 h-4 mr-2" />
                                            Zastosuj zmiany
                                        </Button>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* Przycisk ponów */}
                    {result && !result.success && (
                        <Button
                            variant="outline"
                            onClick={clearFile}
                            className="w-full"
                        >
                            Spróbuj ponownie
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// HELPER: Zastosuj zmiany do danych
// ============================================

// Helper do normalizacji nazw (usuwanie spacji, lowercase)
function normalizeForMatch(str: string): string {
    if (!str) return "";
    return str.toLowerCase().trim().replace(/\s+/g, " ");
}

function applyChangesToData(
    currentData: Record<string, any>,
    changes: PriceChange[],
    selectedIds: Set<string>,
    layoutType: string
): Record<string, any> {
    const data = JSON.parse(JSON.stringify(currentData));
    const selectedChanges = changes.filter((c) => selectedIds.has(c.id));

    for (const change of selectedChanges) {
        const priceGroupKey = change.priceGroup || change.dimension;

        switch (layoutType) {
            case "bomar":
            case "halex":
            case "verikon":
            case "topline":
            case "furnirest":
            case "category-cards":
                if (
                    change.category &&
                    data.categories?.[change.category]?.[change.product]
                ) {
                    const product =
                        data.categories[change.category][change.product];

                    if (priceGroupKey && product.prices) {
                        const variantMatch = priceGroupKey.match(
                            /^(.+?)\s*\(([^)]+)\)$/
                        );

                        if (variantMatch) {
                            const groupName = variantMatch[1].trim();
                            const variant = variantMatch[2].trim();

                            if (!product.prices[groupName]) {
                                product.prices[groupName] = {};
                            }

                            if (typeof product.prices[groupName] !== "object") {
                                product.prices[groupName] = {};
                            }

                            product.prices[groupName][variant] =
                                change.newPrice;
                        } else {
                            product.prices[priceGroupKey] = change.newPrice;
                        }
                    }
                    if (change.dimension && product.sizes) {
                        const size = product.sizes.find(
                            (s: any) => s.dimension === change.dimension
                        );
                        if (size) {
                            size.prices = change.newPrice;
                        }
                    }
                    if (
                        !priceGroupKey &&
                        !change.dimension &&
                        product.price !== undefined
                    ) {
                        product.price = change.newPrice;
                    }
                    if (change.element && product.elements) {
                        const element = product.elements.find(
                            (e: any) =>
                                normalizeForMatch(e.name) ===
                                    normalizeForMatch(change.element || "") ||
                                normalizeForMatch(e.code) ===
                                    normalizeForMatch(change.element || "")
                        );
                        if (element && priceGroupKey) {
                            if (!element.prices) element.prices = {};
                            element.prices[priceGroupKey] = change.newPrice;
                        }
                    }
                }
                break;

            case "mpnidzica":
            case "product-list":
                const mpProduct = data.products?.find(
                    (p: any) =>
                        normalizeForMatch(p.name) ===
                            normalizeForMatch(change.product) ||
                        normalizeForMatch(p.MODEL) ===
                            normalizeForMatch(change.product)
                );
                if (mpProduct) {
                    if (change.element && mpProduct.elements) {
                        const element = (mpProduct.elements || []).find(
                            (e: any) =>
                                normalizeForMatch(e.code) ===
                                    normalizeForMatch(change.element || "") ||
                                normalizeForMatch(e.name) ===
                                    normalizeForMatch(change.element || "")
                        );
                        if (element && priceGroupKey) {
                            if (!element.prices) element.prices = {};
                            element.prices[priceGroupKey] = change.newPrice;
                        }
                    } else if (priceGroupKey) {
                        if (!mpProduct.prices) mpProduct.prices = {};
                        mpProduct.prices[priceGroupKey] = change.newPrice;
                    }
                }
                break;

            case "puszman":
            case "product-table":
                const puszProduct = data.Arkusz1?.find(
                    (p: any) => p.MODEL === change.product
                );
                if (puszProduct && priceGroupKey) {
                    puszProduct[priceGroupKey] = change.newPrice;
                }
                break;

            case "bestmeble":
                const bmProduct = data.products?.find(
                    (p: any) => p.MODEL === change.product
                );
                if (bmProduct && priceGroupKey) {
                    if (!bmProduct.prices) bmProduct.prices = {};
                    bmProduct.prices[priceGroupKey] = change.newPrice;
                }
                break;
        }
    }

    return data;
}

export default SmartPriceUpdater;
