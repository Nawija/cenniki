"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { producenci } from "@/producenci";

type ProductSize = {
    dimension: string;
    prices: string | number;
};

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number>;
    sizes?: ProductSize[];
    options?: string[];
    description?: string[];
    previousName?: string;
    notes?: string;
};

interface ParsedData {
    title: string;
    categories: Record<string, Record<string, ProductData>>;
}

type ChangeLog = {
    newCategories: string[];
    newProducts: Array<{ category: string; name: string }>;
    updatedPrices: Array<{ category: string; name: string; changes: string }>;
};

interface PDFUploaderProps {
    onDataParsed?: (data: ParsedData) => void;
}

export default function PDFUploader({ onDataParsed }: PDFUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [fileName, setFileName] = useState<string>("");
    const [manufacturer, setManufacturer] = useState<string>("");
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [error, setError] = useState<string>("");
    const [savedFilePath, setSavedFilePath] = useState<string>("");
    const [changeLog, setChangeLog] = useState<ChangeLog | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const pdfFile = files.find((file) => file.type === "application/pdf");

        if (pdfFile) {
            await processFile(pdfFile);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await processFile(file);
        }
    };

    const processFile = async (file: File) => {
        setFileName(file.name);
        setIsProcessing(true);
        setStatus("idle");
        setError("");

        try {
            const formData = new FormData();
            formData.append("pdf", file);
            formData.append("manufacturer", manufacturer);

            const response = await fetch("/api/parse-pdf", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                setParsedData(result.data);
                setStatus("success");
                setSavedFilePath(result.filePath || "");
                setChangeLog(result.changeLog || null);
                onDataParsed?.(result.data);
            } else {
                setStatus("error");
                setError(result.error || "Błąd przetwarzania");
            }
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Błąd połączenia");
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadJSON = () => {
        if (!parsedData) return;

        const blob = new Blob([JSON.stringify(parsedData, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${manufacturer || "cennik"}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
            {/* Wybór producenta */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wybierz producenta:
                </label>
                <select
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isProcessing}
                >
                    <option value="">-- Wybierz --</option>
                    {producenci.map((p) => (
                        <option
                            key={p}
                            value={p.toLowerCase().replace(/\s+/g, "-")}
                        >
                            {p}
                        </option>
                    ))}
                </select>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          relative border-2 border-dashed rounded-lg p-12 text-center transition-all
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"}
          ${
              isProcessing
                  ? "opacity-50 pointer-events-none"
                  : "cursor-pointer hover:border-gray-400"
          }
        `}
            >
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isProcessing}
                />

                <div className="flex flex-col items-center justify-center space-y-4">
                    {isProcessing ? (
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                    ) : status === "success" ? (
                        <CheckCircle className="w-16 h-16 text-green-500" />
                    ) : status === "error" ? (
                        <XCircle className="w-16 h-16 text-red-500" />
                    ) : (
                        <Upload className="w-16 h-16 text-gray-400" />
                    )}

                    <div>
                        <p className="text-lg font-medium text-gray-900">
                            {isProcessing
                                ? "Przetwarzanie PDF..."
                                : status === "success"
                                ? "Przetworzono pomyślnie!"
                                : status === "error"
                                ? "Wystąpił błąd"
                                : "Przeciągnij PDF tutaj lub kliknij, aby wybrać"}
                        </p>
                        {fileName && (
                            <p className="text-sm text-gray-500 mt-1">
                                <FileText className="inline w-4 h-4 mr-1" />
                                {fileName}
                            </p>
                        )}
                        {error && (
                            <p className="text-sm text-red-500 mt-2">{error}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Podgląd danych */}
            {parsedData && (
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900">
                            Wyekstrahowane dane
                        </h3>
                        {savedFilePath && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                                ✅ Zapisano: {savedFilePath}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">{parsedData.title}</p>

                    {/* Log zmian */}
                    {changeLog && (
                        <div className="space-y-4">
                            {/* Nowe kategorie */}
                            {changeLog.newCategories.length > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                        <span className="text-lg">➕</span> Nowe
                                        kategorie (
                                        {changeLog.newCategories.length})
                                    </h4>
                                    <ul className="space-y-1">
                                        {changeLog.newCategories.map(
                                            (cat, i) => (
                                                <li
                                                    key={i}
                                                    className="text-sm text-blue-800 ml-6"
                                                >
                                                    • {cat}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Nowe produkty */}
                            {changeLog.newProducts.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                        <span className="text-lg">🆕</span> Nowe
                                        produkty ({changeLog.newProducts.length}
                                        )
                                    </h4>
                                    <ul className="space-y-1">
                                        {changeLog.newProducts.map(
                                            (prod, i) => (
                                                <li
                                                    key={i}
                                                    className="text-sm text-green-800 ml-6"
                                                >
                                                    • {prod.category} /{" "}
                                                    {prod.name}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Zaktualizowane ceny */}
                            {changeLog.updatedPrices.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                        <span className="text-lg">💰</span>{" "}
                                        Zaktualizowane ceny (
                                        {changeLog.updatedPrices.length})
                                    </h4>
                                    <ul className="space-y-2">
                                        {changeLog.updatedPrices.map(
                                            (update, i) => (
                                                <li
                                                    key={i}
                                                    className="text-sm text-amber-800 ml-6"
                                                >
                                                    <strong>
                                                        {update.category} /{" "}
                                                        {update.name}
                                                    </strong>
                                                    <div className="ml-4 mt-1 text-xs">
                                                        {update.changes}
                                                    </div>
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Brak zmian */}
                            {changeLog.newCategories.length === 0 &&
                                changeLog.newProducts.length === 0 &&
                                changeLog.updatedPrices.length === 0 && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                        <p className="text-gray-600">
                                            ℹ️ Brak zmian - cennik jest aktualny
                                        </p>
                                    </div>
                                )}
                        </div>
                    )}

                    {/* JSON Preview (zwinięty) */}
                    <details className="bg-gray-50 rounded p-4">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                            📄 Pokaż pełny JSON
                        </summary>
                        <pre className="text-xs mt-3 max-h-96 overflow-auto">
                            {JSON.stringify(parsedData, null, 2)}
                        </pre>
                    </details>

                    <div className="flex gap-4">
                        <button
                            onClick={downloadJSON}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Pobierz JSON
                        </button>
                        <button
                            onClick={() => {
                                setStatus("idle");
                                setParsedData(null);
                                setFileName("");
                                setSavedFilePath("");
                            }}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                        >
                            Przetwórz kolejny
                        </button>
                    </div>
                </div>
            )}

            {/* Instrukcje */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                    💡 Jak to działa?
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>1. Wybierz producenta z listy</li>
                    <li>
                        2. Przeciągnij PDF z cennikiem lub kliknij, aby wybrać
                        plik
                    </li>
                    <li>
                        3. AI automatycznie wyekstrahuje produkty, ceny i opcje
                    </li>
                    <li>
                        4. AI porównuje z istniejącym cennikiem:
                        <ul className="ml-4 mt-1 space-y-0.5">
                            <li>• Aktualizuje tylko zmienione ceny</li>
                            <li>• Dodaje nowe produkty</li>
                            <li>• Zachowuje zdjęcia i opisy</li>
                        </ul>
                    </li>
                    <li>
                        5. JSON zostanie automatycznie zapisany w folderze data/
                    </li>
                    <li>
                        6. Sprawdź dane i zarządzaj faktorami w panelu admina
                    </li>
                </ul>
            </div>
        </div>
    );
}
