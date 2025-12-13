"use client";

import { useState, useCallback, useRef } from "react";
import {
    Upload,
    FileText,
    X,
    AlertTriangle,
    Check,
    Plus,
    RefreshCw,
    ArrowRight,
    Loader2,
    TrendingUp,
    TrendingDown,
    Package,
    Image as ImageIcon,
    ChevronDown,
    ChevronRight,
} from "lucide-react";

// ============================================
// TYPY
// ============================================

interface PriceChange {
    type: "price_change";
    id: string;
    product: string;
    myName: string;
    pdfName: string;
    element?: string;
    dimension?: string;
    category?: string;
    oldPrice: number;
    newPrice: number;
    percentChange: number;
    preservedData?: {
        image?: string;
        technicalImage?: string;
        description?: string[];
    };
}

interface NewProduct {
    type: "new_product";
    id: string;
    product: string;
    category?: string;
    elements?: string[];
    data: Record<string, any>;
}

interface NewElement {
    type: "new_element";
    id: string;
    product: string;
    myName: string;
    element: string;
    prices: Record<string, number>;
}

interface RemovedProduct {
    type: "removed_product";
    id: string;
    product: string;
    category?: string;
    hasData: boolean;
}

interface DataChange {
    type: "data_change";
    id: string;
    product: string;
    field: string;
    oldValue: any;
    newValue: any;
}

type Change =
    | PriceChange
    | NewProduct
    | NewElement
    | RemovedProduct
    | DataChange;

interface AnalysisResult {
    success: boolean;
    changes: Change[];
    summary: {
        totalChanges: number;
        priceChanges: number;
        newProducts: number;
        newElements: number;
        removedProducts: number;
        dataChanges: number;
        priceIncrease: number;
        priceDecrease: number;
    };
    mergedData: Record<string, any>;
    error?: string;
}

interface Props {
    producerSlug: string;
    layoutType: string;
    onApplyChanges: (newData: Record<string, any>) => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PdfAnalyzer({
    producerSlug,
    layoutType,
    onApplyChanges,
}: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(["price_change", "data_change"])
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

    // Analiza
    const analyzePdf = async () => {
        if (!selectedFile) return;

        setIsAnalyzing(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("pdf", selectedFile);
            formData.append("producer", producerSlug);
            formData.append("layoutType", layoutType);

            const response = await fetch("/api/analyze-pdf", {
                method: "POST",
                body: formData,
            });

            const data: AnalysisResult = await response.json();
            setResult(data);

            // Domyślnie zaznacz wszystkie zmiany
            if (data.success && data.changes.length > 0) {
                setSelectedChanges(new Set(data.changes.map((c) => c.id)));
            }
        } catch {
            setResult({
                success: false,
                changes: [],
                summary: {
                    totalChanges: 0,
                    priceChanges: 0,
                    newProducts: 0,
                    newElements: 0,
                    removedProducts: 0,
                    dataChanges: 0,
                    priceIncrease: 0,
                    priceDecrease: 0,
                },
                mergedData: {},
                error: "Wystąpił błąd podczas analizy. Spróbuj ponownie.",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Zastosuj zmiany
    const handleApplyChanges = () => {
        if (result?.mergedData) {
            onApplyChanges(result.mergedData);
            setResult(null);
            setSelectedFile(null);
        }
    };

    // Toggle grup
    const toggleGroup = (group: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    };

    // Toggle pojedynczej zmiany
    const toggleChange = (id: string) => {
        setSelectedChanges((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Usuń zmianę z listy
    const removeChange = (id: string) => {
        setResult((prev) => {
            if (!prev) return prev;
            const newChanges = prev.changes.filter((c) => c.id !== id);
            const priceChanges = newChanges.filter(
                (c) => c.type === "price_change"
            ) as PriceChange[];
            return {
                ...prev,
                changes: newChanges,
                summary: {
                    ...prev.summary,
                    totalChanges: newChanges.length,
                    priceChanges: priceChanges.length,
                    newProducts: newChanges.filter(
                        (c) => c.type === "new_product"
                    ).length,
                    newElements: newChanges.filter(
                        (c) => c.type === "new_element"
                    ).length,
                    removedProducts: newChanges.filter(
                        (c) => c.type === "removed_product"
                    ).length,
                    dataChanges: newChanges.filter(
                        (c) => c.type === "data_change"
                    ).length,
                    priceIncrease: priceChanges.filter(
                        (c) => c.percentChange > 0
                    ).length,
                    priceDecrease: priceChanges.filter(
                        (c) => c.percentChange < 0
                    ).length,
                },
            };
        });
        setSelectedChanges((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    // Wyczyść
    const clearFile = () => {
        setSelectedFile(null);
        setResult(null);
        setSelectedChanges(new Set());
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Grupuj zmiany po typie
    const groupedChanges = result?.changes.reduce((acc, change) => {
        if (!acc[change.type]) acc[change.type] = [];
        acc[change.type].push(change);
        return acc;
    }, {} as Record<string, Change[]>);

    return (
        <div className="border border-gray-200 rounded-md bg-white mb-4">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                    Analiza cennika PDF
                </span>
            </div>

            <div className="p-4">
                {/* Dropzone */}
                {!selectedFile && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
                            isDragging
                                ? "border-blue-400 bg-blue-50"
                                : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                        <Upload
                            className={`w-8 h-8 mx-auto mb-2 ${
                                isDragging ? "text-blue-500" : "text-gray-400"
                            }`}
                        />
                        <p className="text-sm text-gray-600">
                            Przeciągnij PDF lub kliknij
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
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-gray-50 rounded p-3">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-red-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {(
                                            selectedFile.size /
                                            1024 /
                                            1024
                                        ).toFixed(2)}{" "}
                                        MB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={clearFile}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={analyzePdf}
                            disabled={isAnalyzing}
                            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 px-4 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Analizuję...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Analizuj i porównaj
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Wyniki */}
                {result && (
                    <div className="space-y-4">
                        {/* Błąd */}
                        {!result.success && (
                            <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">
                                        Błąd analizy
                                    </p>
                                    <p className="text-xs text-red-600">
                                        {result.error}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Sukces */}
                        {result.success && (
                            <>
                                {/* Podsumowanie */}
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-lg font-bold text-gray-700">
                                            {result.summary.priceChanges}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Zmiany cen
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-lg font-bold text-green-600">
                                            {result.summary.newProducts}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Nowe produkty
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-lg font-bold text-blue-600">
                                            {result.summary.newElements}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Nowe elementy
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="flex items-center text-red-600">
                                                <TrendingUp className="w-3 h-3 mr-0.5" />
                                                {result.summary.priceIncrease}
                                            </span>
                                            <span className="flex items-center text-green-600">
                                                <TrendingDown className="w-3 h-3 mr-0.5" />
                                                {result.summary.priceDecrease}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Wzrosty/Spadki
                                        </p>
                                    </div>
                                </div>

                                {/* Brak zmian */}
                                {result.changes.length === 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-500" />
                                        <p className="text-sm text-green-800">
                                            Cennik jest aktualny
                                        </p>
                                    </div>
                                )}

                                {/* Lista zmian */}
                                {result.changes.length > 0 &&
                                    groupedChanges && (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                            {/* Zmiany cen */}
                                            {groupedChanges.price_change && (
                                                <ChangeGroup
                                                    title="Zmiany cen"
                                                    count={
                                                        groupedChanges
                                                            .price_change.length
                                                    }
                                                    icon={
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    }
                                                    color="amber"
                                                    isExpanded={expandedGroups.has(
                                                        "price_change"
                                                    )}
                                                    onToggle={() =>
                                                        toggleGroup(
                                                            "price_change"
                                                        )
                                                    }
                                                >
                                                    {groupedChanges.price_change.map(
                                                        (change) => (
                                                            <PriceChangeItem
                                                                key={change.id}
                                                                change={
                                                                    change as PriceChange
                                                                }
                                                                isSelected={selectedChanges.has(
                                                                    change.id
                                                                )}
                                                                onToggle={() =>
                                                                    toggleChange(
                                                                        change.id
                                                                    )
                                                                }
                                                                onRemove={() =>
                                                                    removeChange(
                                                                        change.id
                                                                    )
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </ChangeGroup>
                                            )}

                                            {/* Nowe produkty */}
                                            {groupedChanges.new_product && (
                                                <ChangeGroup
                                                    title="Nowe produkty"
                                                    count={
                                                        groupedChanges
                                                            .new_product.length
                                                    }
                                                    icon={
                                                        <Package className="w-3.5 h-3.5" />
                                                    }
                                                    color="green"
                                                    isExpanded={expandedGroups.has(
                                                        "new_product"
                                                    )}
                                                    onToggle={() =>
                                                        toggleGroup(
                                                            "new_product"
                                                        )
                                                    }
                                                >
                                                    {groupedChanges.new_product.map(
                                                        (change) => (
                                                            <NewProductItem
                                                                key={change.id}
                                                                change={
                                                                    change as NewProduct
                                                                }
                                                                isSelected={selectedChanges.has(
                                                                    change.id
                                                                )}
                                                                onToggle={() =>
                                                                    toggleChange(
                                                                        change.id
                                                                    )
                                                                }
                                                                onRemove={() =>
                                                                    removeChange(
                                                                        change.id
                                                                    )
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </ChangeGroup>
                                            )}

                                            {/* Nowe elementy */}
                                            {groupedChanges.new_element && (
                                                <ChangeGroup
                                                    title="Nowe elementy"
                                                    count={
                                                        groupedChanges
                                                            .new_element.length
                                                    }
                                                    icon={
                                                        <Plus className="w-3.5 h-3.5" />
                                                    }
                                                    color="blue"
                                                    isExpanded={expandedGroups.has(
                                                        "new_element"
                                                    )}
                                                    onToggle={() =>
                                                        toggleGroup(
                                                            "new_element"
                                                        )
                                                    }
                                                >
                                                    {groupedChanges.new_element.map(
                                                        (change) => (
                                                            <NewElementItem
                                                                key={change.id}
                                                                change={
                                                                    change as NewElement
                                                                }
                                                                isSelected={selectedChanges.has(
                                                                    change.id
                                                                )}
                                                                onToggle={() =>
                                                                    toggleChange(
                                                                        change.id
                                                                    )
                                                                }
                                                                onRemove={() =>
                                                                    removeChange(
                                                                        change.id
                                                                    )
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </ChangeGroup>
                                            )}

                                            {/* Zmiany danych */}
                                            {groupedChanges.data_change && (
                                                <ChangeGroup
                                                    title="Inne zmiany"
                                                    count={
                                                        groupedChanges
                                                            .data_change.length
                                                    }
                                                    icon={
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    }
                                                    color="gray"
                                                    isExpanded={expandedGroups.has(
                                                        "data_change"
                                                    )}
                                                    onToggle={() =>
                                                        toggleGroup(
                                                            "data_change"
                                                        )
                                                    }
                                                >
                                                    {groupedChanges.data_change.map(
                                                        (change) => (
                                                            <DataChangeItem
                                                                key={change.id}
                                                                change={
                                                                    change as DataChange
                                                                }
                                                                isSelected={selectedChanges.has(
                                                                    change.id
                                                                )}
                                                                onToggle={() =>
                                                                    toggleChange(
                                                                        change.id
                                                                    )
                                                                }
                                                                onRemove={() =>
                                                                    removeChange(
                                                                        change.id
                                                                    )
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </ChangeGroup>
                                            )}
                                        </div>
                                    )}

                                {/* Akcje */}
                                <div className="flex gap-2 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={clearFile}
                                        className="flex-1 py-2 px-3 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                    >
                                        Anuluj
                                    </button>
                                    {result.changes.length > 0 && (
                                        <button
                                            onClick={handleApplyChanges}
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 text-white py-2 px-3 rounded text-sm font-medium hover:bg-gray-800"
                                        >
                                            <Check className="w-4 h-4" />
                                            Zastosuj zmiany
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// CHANGE GROUP
// ============================================

function ChangeGroup({
    title,
    count,
    icon,
    color,
    isExpanded,
    onToggle,
    children,
}: {
    title: string;
    count: number;
    icon: React.ReactNode;
    color: "amber" | "green" | "blue" | "red" | "gray";
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    const colors = {
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        green: "bg-green-50 text-green-700 border-green-200",
        blue: "bg-blue-50 text-blue-700 border-blue-200",
        red: "bg-red-50 text-red-700 border-red-200",
        gray: "bg-gray-50 text-gray-700 border-gray-200",
    };

    return (
        <div className={`border rounded ${colors[color]}`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-medium">{title}</span>
                    <span className="text-xs bg-white/50 px-1.5 py-0.5 rounded">
                        {count}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronRight className="w-4 h-4" />
                )}
            </button>
            {isExpanded && (
                <div className="border-t border-inherit bg-white/50 p-2 space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
}

// ============================================
// PRICE CHANGE ITEM
// ============================================

function PriceChangeItem({
    change,
    isSelected,
    onToggle: _onToggle,
    onRemove,
}: {
    change: PriceChange;
    isSelected: boolean;
    onToggle: () => void;
    onRemove: () => void;
}) {
    const hasImage = !!change.preservedData?.image;

    return (
        <div
            className={`flex items-center gap-2 p-2 rounded text-sm transition-colors ${
                isSelected ? "bg-amber-100" : "bg-white hover:bg-amber-50"
            }`}
        >
            {hasImage && (
                <span title="Ma zdjęcie">
                    <ImageIcon className="w-3.5 h-3.5 text-green-500" />
                </span>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900 truncate">
                        {change.myName}
                    </span>
                    {change.myName !== change.pdfName && (
                        <span className="text-xs text-gray-400">
                            (PDF: {change.pdfName})
                        </span>
                    )}
                </div>
                <div className="text-xs text-gray-500">
                    {change.element && <span>{change.element} • </span>}
                    {change.dimension}
                </div>
            </div>

            <div className="text-right shrink-0">
                <div className="flex items-center gap-1">
                    <span className="text-gray-400 line-through">
                        {change.oldPrice}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{change.newPrice}</span>
                </div>
                <span
                    className={`text-xs font-medium ${
                        change.percentChange > 0
                            ? "text-red-600"
                            : "text-green-600"
                    }`}
                >
                    {change.percentChange > 0 ? "+" : ""}
                    {change.percentChange}%
                </span>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Usuń zmianę"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ============================================
// NEW PRODUCT ITEM
// ============================================

function NewProductItem({
    change,
    isSelected,
    onToggle: _onToggle,
    onRemove,
}: {
    change: NewProduct;
    isSelected: boolean;
    onToggle: () => void;
    onRemove: () => void;
}) {
    return (
        <div
            className={`flex items-center gap-2 p-2 rounded text-sm transition-colors ${
                isSelected ? "bg-green-100" : "bg-white hover:bg-green-50"
            }`}
        >
            <Package className="w-3.5 h-3.5 text-green-600" />

            <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">
                    {change.product}
                </span>
                {change.category && (
                    <span className="text-xs text-gray-500 ml-1">
                        ({change.category})
                    </span>
                )}
                {change.elements && change.elements.length > 0 && (
                    <p className="text-xs text-gray-500 truncate">
                        Elementy: {change.elements.slice(0, 5).join(", ")}
                        {change.elements.length > 5 &&
                            ` +${change.elements.length - 5}`}
                    </p>
                )}
            </div>

            <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                NOWY
            </span>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Usuń zmianę"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ============================================
// NEW ELEMENT ITEM
// ============================================

function NewElementItem({
    change,
    isSelected,
    onToggle: _onToggle,
    onRemove,
}: {
    change: NewElement;
    isSelected: boolean;
    onToggle: () => void;
    onRemove: () => void;
}) {
    const priceEntries = Object.entries(change.prices || {});

    return (
        <div
            className={`flex items-center gap-2 p-2 rounded text-sm transition-colors ${
                isSelected ? "bg-blue-100" : "bg-white hover:bg-blue-50"
            }`}
        >
            <Plus className="w-3.5 h-3.5 text-blue-600" />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900">
                        {change.myName}
                    </span>
                    <span className="text-gray-500">→</span>
                    <span className="text-blue-700">{change.element}</span>
                </div>
                {priceEntries.length > 0 && (
                    <p className="text-xs text-gray-500">
                        {priceEntries
                            .map(([g, p]) => `${g}: ${p} zł`)
                            .join(" | ")}
                    </p>
                )}
            </div>

            <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">
                NOWY
            </span>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Usuń zmianę"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ============================================
// DATA CHANGE ITEM
// ============================================

function DataChangeItem({
    change,
    isSelected,
    onToggle: _onToggle,
    onRemove,
}: {
    change: DataChange;
    isSelected: boolean;
    onToggle: () => void;
    onRemove: () => void;
}) {
    return (
        <div
            className={`flex items-center gap-2 p-2 rounded text-sm transition-colors ${
                isSelected ? "bg-gray-200" : "bg-white hover:bg-gray-100"
            }`}
        >
            <ArrowRight className="w-3.5 h-3.5 text-gray-500" />

            <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">
                    {change.product}
                </span>
                <span className="text-gray-500 ml-1">({change.field})</span>
                <div className="text-xs text-gray-500">
                    <span className="line-through">
                        {JSON.stringify(change.oldValue)}
                    </span>
                    {" → "}
                    <span>{JSON.stringify(change.newValue)}</span>
                </div>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Usuń zmianę"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
