"use client";

import { useState } from "react";
import { Save, AlertCircle, Plus, Trash2 } from "lucide-react";
import FileDiffUploadManager from "../FileDiffUploadManager";

export interface TableEditorBaseProps {
    initialData: Record<string, any>;
    manufacturerName: string;
    onSave: (data: Record<string, any>) => Promise<void>;
    columns: Array<{
        key: string;
        label: string;
        type: "text" | "number";
        editable?: boolean;
    }>;
    dataKey?: string; // np. "Arkusz1"
}

export default function TableEditorBase({
    initialData,
    manufacturerName,
    onSave,
    columns,
    dataKey = "Arkusz1",
}: TableEditorBaseProps) {
    const [data, setData] = useState(initialData);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(data);
            setMessage({ type: "success", text: "Zapisano!" });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Błąd podczas zapisywania",
            });
        } finally {
            setSaving(false);
        }
    };

    const rows =
        data[dataKey]?.filter((row: any) => row && row[columns[0].key]) || [];

    const updateRow = (actualIdx: number, field: string, value: any) => {
        const newData = JSON.parse(JSON.stringify(data));
        newData[dataKey][actualIdx][field] = value;
        setData(newData);
    };

    const deleteRow = (actualIdx: number) => {
        if (confirm("Usunąć wiersz?")) {
            const newData = JSON.parse(JSON.stringify(data));
            newData[dataKey] = newData[dataKey].filter(
                (_: any, i: number) => i !== actualIdx
            );
            setData(newData);
        }
    };

    const addRow = (template: Record<string, any>) => {
        const newData = JSON.parse(JSON.stringify(data));
        newData[dataKey].push(template);
        setData(newData);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-12">
            {/* Header */}
            <div className="mb-6 border-b pb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                    {manufacturerName}
                </h1>
                <p className="text-gray-600 mt-2">Edytuj katalog produktów</p>
            </div>

            {/* Messages */}
            {message && (
                <div
                    className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                        message.type === "success"
                            ? "bg-green-50 text-green-800 border border-green-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                >
                    <AlertCircle size={20} />
                    <span>{message.text}</span>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                >
                    <Save size={20} />
                    {saving ? "Zapisywanie..." : "Zapisz"}
                </button>
            </div>

            {/* File Diff Upload Manager */}
            <div className="mb-8">
                <FileDiffUploadManager
                    currentData={data}
                    manufacturerName={manufacturerName}
                    onDataUpdate={setData}
                />
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {dataKey} - {rows.length} wierszy
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={`px-4 py-2 font-medium text-gray-700 ${
                                            col.type === "number"
                                                ? "text-right"
                                                : "text-left"
                                        }`}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                                <th className="px-4 py-2 text-center font-medium text-gray-700">
                                    Usuń
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row: any, idx: number) => {
                                const actualIdx = data[dataKey].findIndex(
                                    (r: any) => r === row
                                );
                                return (
                                    <tr
                                        key={idx}
                                        className={
                                            idx % 2 === 0
                                                ? "border-b bg-white"
                                                : "border-b bg-gray-50"
                                        }
                                    >
                                        {columns.map((col) => (
                                            <td
                                                key={col.key}
                                                className={`px-4 py-2 ${
                                                    col.type === "number"
                                                        ? "text-right"
                                                        : ""
                                                }`}
                                            >
                                                {col.editable !== false ? (
                                                    <input
                                                        type={col.type}
                                                        value={
                                                            row[col.key] || ""
                                                        }
                                                        onChange={(e) => {
                                                            const value =
                                                                col.type ===
                                                                "number"
                                                                    ? parseFloat(
                                                                          e
                                                                              .target
                                                                              .value
                                                                      ) || null
                                                                    : e.target
                                                                          .value;
                                                            updateRow(
                                                                actualIdx,
                                                                col.key,
                                                                value
                                                            );
                                                        }}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                ) : (
                                                    <span>{row[col.key]}</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={() =>
                                                    deleteRow(actualIdx)
                                                }
                                                className="px-2 py-2 text-red-600 hover:bg-red-100 rounded transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Add Row Button */}
                <div className="p-4 border-t">
                    <button
                        onClick={() => {
                            const template: Record<string, any> = {};
                            columns.forEach((col) => {
                                template[col.key] =
                                    col.type === "number" ? 0 : "";
                            });
                            addRow(template);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <Plus size={20} />
                        Dodaj wiersz
                    </button>
                </div>
            </div>
        </div>
    );
}
