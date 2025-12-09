"use client";

import { useState, useCallback, useRef } from "react";
import {
    Upload,
    FileText,
    X,
    AlertTriangle,
    Check,
    Plus,
    Minus,
    RefreshCw,
    ArrowRight,
    Loader2,
} from "lucide-react";

// Typy dla zmian
interface PriceChange {
    type: "price_change";
    product: string;
    category?: string;
    dimension?: string;
    oldPrice: number | string;
    newPrice: number | string;
    percentChange?: number;
}

interface NewProduct {
    type: "new_product";
    product: string;
    category?: string;
    data: Record<string, any>;
}

interface RemovedProduct {
    type: "removed_product";
    product: string;
    category?: string;
}

interface DataChange {
    type: "data_change";
    product: string;
    category?: string;
    field: string;
    oldValue: any;
    newValue: any;
}

type Change = PriceChange | NewProduct | RemovedProduct | DataChange;

interface AnalysisResult {
    success: boolean;
    changes: Change[];
    summary: {
        totalChanges: number;
        priceChanges: number;
        newProducts: number;
        removedProducts: number;
        dataChanges: number;
    };
    extractedData: Record<string, any>;
    error?: string;
}

interface Props {
    producerSlug: string;
    layoutType: string;
    onApplyChanges: (newData: Record<string, any>) => void;
}

export function PdfAnalyzer({
    producerSlug,
    layoutType,
    onApplyChanges,
}: Props) {
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [expandedChanges, setExpandedChanges] = useState<Set<number>>(
        new Set()
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        } catch (error) {
            setResult({
                success: false,
                changes: [],
                summary: {
                    totalChanges: 0,
                    priceChanges: 0,
                    newProducts: 0,
                    removedProducts: 0,
                    dataChanges: 0,
                },
                extractedData: {},
                error: "Wystąpił błąd podczas analizy. Spróbuj ponownie.",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplyChanges = () => {
        if (result?.extractedData) {
            onApplyChanges(result.extractedData);
            setResult(null);
            setSelectedFile(null);
        }
    };

    const toggleChange = (index: number) => {
        setExpandedChanges((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const clearFile = () => {
        setSelectedFile(null);
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Analiza cennika PDF
            </h3>

            {/* Dropzone */}
            {!selectedFile && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                        ${
                            isDragging
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                        }
                    `}
                >
                    <Upload
                        className={`w-12 h-12 mx-auto mb-4 ${
                            isDragging ? "text-blue-500" : "text-gray-400"
                        }`}
                    />
                    <p className="text-gray-600 mb-2">
                        Przeciągnij plik PDF lub kliknij, aby wybrać
                    </p>
                    <p className="text-sm text-gray-400">
                        Obsługiwane formaty: PDF
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

            {/* Selected file */}
            {selectedFile && !result && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-orange-700" />
                            <div>
                                <p className="font-medium text-gray-900">
                                    {selectedFile.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {(selectedFile.size / 1024 / 1024).toFixed(
                                        2
                                    )}{" "}
                                    MB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={clearFile}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={analyzePdf}
                        disabled={isAnalyzing}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Analizuję cennik...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5" />
                                Analizuj i porównaj z aktualnym cennikiem
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Error */}
                    {!result.success && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-800">
                                    Błąd analizy
                                </p>
                                <p className="text-sm text-red-600">
                                    {result.error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success */}
                    {result.success && (
                        <>
                            {/* Summary */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 mb-3">
                                    Podsumowanie analizy
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-blue-600">
                                            {result.summary.totalChanges}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            Wszystkie zmiany
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-amber-600">
                                            {result.summary.priceChanges}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            Zmiany cen
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-600">
                                            {result.summary.newProducts}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            Nowe produkty
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-red-600">
                                            {result.summary.removedProducts}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            Usunięte
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* No changes */}
                            {result.changes.length === 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-500" />
                                    <p className="text-green-800">
                                        Cennik jest aktualny - nie wykryto
                                        żadnych zmian.
                                    </p>
                                </div>
                            )}

                            {/* Changes list */}
                            {result.changes.length > 0 && (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    <h4 className="font-semibold text-gray-800 sticky top-0 bg-white py-2">
                                        Wykryte zmiany ({result.changes.length})
                                    </h4>

                                    {result.changes.map((change, index) => (
                                        <ChangeItem
                                            key={index}
                                            change={change}
                                            isExpanded={expandedChanges.has(
                                                index
                                            )}
                                            onToggle={() => toggleChange(index)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={clearFile}
                                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Anuluj
                                </button>
                                {result.changes.length > 0 && (
                                    <button
                                        onClick={handleApplyChanges}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                                    >
                                        <Check className="w-5 h-5" />
                                        Zastosuj zmiany
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// Komponent pojedynczej zmiany
function ChangeItem({
    change,
    isExpanded,
    onToggle,
}: {
    change: Change;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const getIcon = () => {
        switch (change.type) {
            case "price_change":
                return <RefreshCw className="w-4 h-4 text-amber-500" />;
            case "new_product":
                return <Plus className="w-4 h-4 text-green-500" />;
            case "removed_product":
                return <Minus className="w-4 h-4 text-red-500" />;
            case "data_change":
                return <ArrowRight className="w-4 h-4 text-blue-500" />;
        }
    };

    const getBackgroundColor = () => {
        switch (change.type) {
            case "price_change":
                return "bg-amber-50 border-amber-200";
            case "new_product":
                return "bg-green-50 border-green-200";
            case "removed_product":
                return "bg-red-50 border-red-200";
            case "data_change":
                return "bg-blue-50 border-blue-200";
        }
    };

    const getLabel = () => {
        switch (change.type) {
            case "price_change":
                return "Zmiana ceny";
            case "new_product":
                return "Nowy produkt";
            case "removed_product":
                return "Usunięty";
            case "data_change":
                return "Zmiana danych";
        }
    };

    return (
        <div
            className={`border rounded-lg p-3 cursor-pointer transition-all ${getBackgroundColor()}`}
            onClick={onToggle}
        >
            <div className="flex items-center gap-3">
                {getIcon()}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/50">
                            {getLabel()}
                        </span>
                        {change.category && (
                            <span className="text-xs text-gray-500">
                                {change.category}
                            </span>
                        )}
                    </div>
                    <p className="font-medium text-gray-900 truncate">
                        {change.product}
                    </p>
                </div>

                {/* Price change indicator */}
                {change.type === "price_change" && (
                    <div className="text-right shrink-0">
                        <p className="text-sm">
                            <span className="text-gray-500 line-through">
                                {change.oldPrice} zł
                            </span>
                            {" → "}
                            <span className="font-semibold">
                                {change.newPrice} zł
                            </span>
                        </p>
                        {change.percentChange !== undefined &&
                            change.percentChange !== 0 && (
                                <p
                                    className={`text-xs font-medium ${
                                        change.percentChange > 0
                                            ? "text-red-600"
                                            : "text-green-600"
                                    }`}
                                >
                                    {change.percentChange > 0 ? "+" : ""}
                                    {change.percentChange}%
                                </p>
                            )}
                    </div>
                )}
            </div>

            {/* Expanded details */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200/50 text-sm">
                    {change.type === "price_change" && change.dimension && (
                        <p className="text-gray-600">
                            Wymiar: {change.dimension}
                        </p>
                    )}
                    {change.type === "new_product" && (
                        <pre className="bg-white/50 rounded p-2 text-xs overflow-auto max-h-32">
                            {JSON.stringify(change.data, null, 2)}
                        </pre>
                    )}
                    {change.type === "data_change" && (
                        <div className="space-y-1">
                            <p className="text-gray-600">
                                Pole: {change.field}
                            </p>
                            <p className="text-gray-500">
                                Było:{" "}
                                <span className="line-through">
                                    {JSON.stringify(change.oldValue)}
                                </span>
                            </p>
                            <p className="text-gray-900">
                                Jest:{" "}
                                <span className="font-medium">
                                    {JSON.stringify(change.newValue)}
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
