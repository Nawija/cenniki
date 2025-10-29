"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import PDFUploader from "@/components/PDFUploader";

interface ParsedData {
    title: string;
    categories: Record<string, any>;
}

export default function AdminPage() {
    const [jsonData, setJsonData] = useState<any[]>([]);
    const [pdfData, setPdfData] = useState<ParsedData | null>(null);
    const [activeTab, setActiveTab] = useState<"pdf" | "excel">("pdf");

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = evt.target?.result;
            if (!data) return;

            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0]; // pierwsza zakładka
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            setJsonData(json);
        };
        reader.readAsBinaryString(file);
    };

    const handlePDFDataParsed = (data: ParsedData) => {
        setPdfData(data);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-10">
            <h1 className="text-3xl font-bold mb-6">
                📊 Admin Panel – Aktualizacja Cenników
            </h1>

            {/* Zakładki */}
            <div className="mb-6 border-b border-gray-300">
                <div className="flex space-x-4">
                    <button
                        onClick={() => setActiveTab("pdf")}
                        className={`px-6 py-3 font-medium transition-colors ${
                            activeTab === "pdf"
                                ? "border-b-2 border-blue-600 text-blue-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        📄 Upload PDF (AI)
                    </button>
                    <button
                        onClick={() => setActiveTab("excel")}
                        className={`px-6 py-3 font-medium transition-colors ${
                            activeTab === "excel"
                                ? "border-b-2 border-blue-600 text-blue-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        📊 Upload Excel (tradycyjnie)
                    </button>
                </div>
            </div>

            {/* Zawartość zakładki PDF */}
            {activeTab === "pdf" && (
                <PDFUploader onDataParsed={handlePDFDataParsed} />
            )}

            {/* Zawartość zakładki Excel */}
            {activeTab === "excel" && (
                <div>
                    <div className="mb-4">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                             file:rounded-lg file:border-0
                             file:text-sm file:font-semibold
                             file:bg-blue-600 file:text-white
                             hover:file:bg-blue-700 cursor-pointer"
                        />
                    </div>

                    {jsonData.length > 0 && (
                        <div className="bg-white p-4 rounded-lg shadow-md overflow-auto max-h-[500px]">
                            <pre className="text-sm whitespace-pre-wrap">
                                {JSON.stringify(jsonData, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
