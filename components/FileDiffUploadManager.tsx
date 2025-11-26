"use client";

import { useState } from "react";
import {
    Upload,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

interface FileDiffUploadManagerProps {
    currentData: Record<string, any>;
    manufacturerName: string;
    onDataUpdate?: (newData: Record<string, any>) => void;
}

interface DiffResult {
    parsed: Record<string, any>;
    changes: Array<{
        type: "added" | "modified" | "deleted";
        path: string;
        oldValue?: any;
        newValue?: any;
    }>;
}

export default function FileDiffUploadManager({
    currentData,
    manufacturerName,
    onDataUpdate,
}: FileDiffUploadManagerProps) {
    const [uploading, setUploading] = useState(false);
    const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
    const [message, setMessage] = useState<{
        type: "success" | "error" | "info";
        text: string;
    } | null>(null);
    const [expandedChanges, setExpandedChanges] = useState(false);

    const handleFileUpload = async (file: File) => {
        if (!file) return;

        setUploading(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("manufacturer", manufacturerName);
            formData.append("currentData", JSON.stringify(currentData));

            const response = await fetch("/api/compare-file", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Błąd przy porównywaniu pliku");
            }

            setDiffResult(result);
            setMessage({
                type: "success",
                text: `Znaleziono ${result.changes.length} zmian(y)`,
            });
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Błąd przy wgrywaniu pliku",
            });
            setDiffResult(null);
        } finally {
            setUploading(false);
        }
    };

    const applyChanges = () => {
        if (diffResult && onDataUpdate) {
            onDataUpdate(diffResult.parsed);
            setMessage({
                type: "success",
                text: "Zmiany zastosowane! Klikni 'Zapisz', aby potwierdzić.",
            });
            setDiffResult(null);
        }
    };

    const discardChanges = () => {
        setDiffResult(null);
        setMessage(null);
    };

    return (
        <div className="w-full">
            {/* Upload Section */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 cursor-pointer transition">
                    <div className="flex flex-col items-center justify-center">
                        <Upload size={24} className="text-blue-600 mb-2" />
                        <span className="text-sm text-blue-700 font-medium">
                            {uploading ? "Wgrywanie..." : "Wgraj PDF lub Excel"}
                        </span>
                        <span className="text-xs text-blue-600 mt-1">
                            Będzie porównane z aktualnym JSON-em
                        </span>
                    </div>
                    <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                        disabled={uploading}
                    />
                </label>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                        message.type === "success"
                            ? "bg-green-50 text-green-800 border border-green-200"
                            : message.type === "error"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}
                >
                    {message.type === "success" ? (
                        <CheckCircle size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Diff Result */}
            {diffResult && (
                <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Porównanie zmian
                        </h3>
                        <p className="text-sm text-gray-600">
                            Znaleziono {diffResult.changes.length} zmian(y).
                            Przejrzyj przed zatwierdzeniem.
                        </p>
                    </div>

                    {/* Changes List */}
                    <div className="mb-4 space-y-2 max-h-96 overflow-y-auto">
                        {diffResult.changes.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                                Brak zmian
                            </div>
                        ) : (
                            diffResult.changes.map((change, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded border-l-4 ${
                                        change.type === "added"
                                            ? "bg-green-50 border-l-green-500"
                                            : change.type === "modified"
                                            ? "bg-yellow-50 border-l-yellow-500"
                                            : "bg-red-50 border-l-red-500"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="font-mono text-xs font-semibold text-gray-900 mb-1">
                                                {change.path}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                <span className="font-medium">
                                                    {change.type === "added"
                                                        ? "Dodane"
                                                        : change.type ===
                                                          "modified"
                                                        ? "Zmienione"
                                                        : "Usunięte"}
                                                </span>
                                            </div>

                                            {change.type === "modified" && (
                                                <div className="mt-1 text-xs space-y-1">
                                                    <div className="text-red-700">
                                                        Przed:{" "}
                                                        <span className="font-mono">
                                                            {JSON.stringify(
                                                                change.oldValue
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="text-green-700">
                                                        Po:{" "}
                                                        <span className="font-mono">
                                                            {JSON.stringify(
                                                                change.newValue
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {change.type === "added" && (
                                                <div className="mt-1 text-xs text-green-700">
                                                    <span className="font-mono">
                                                        {JSON.stringify(
                                                            change.newValue
                                                        )}
                                                    </span>
                                                </div>
                                            )}

                                            {change.type === "deleted" && (
                                                <div className="mt-1 text-xs text-red-700">
                                                    <span className="font-mono">
                                                        {JSON.stringify(
                                                            change.oldValue
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={applyChanges}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                        >
                            Zastosuj zmiany
                        </button>
                        <button
                            onClick={discardChanges}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                        >
                            Odrzuć
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
