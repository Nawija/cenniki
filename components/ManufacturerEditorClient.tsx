"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, AlertCircle, Check } from "lucide-react";
import JSONEditor from "@/components/JSONEditor";

interface ManufacturerEditorClientProps {
    manufacturerName: string;
    initialData: any;
}

export default function ManufacturerEditorClient({
    manufacturerName,
    initialData,
}: ManufacturerEditorClientProps) {
    const router = useRouter();
    const [data, setData] = useState(initialData);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await fetch("/api/manufacturers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: manufacturerName,
                    data,
                }),
            });

            if (res.ok) {
                setMessage({
                    type: "success",
                    text: `Producent ${manufacturerName} został zaktualizowany!`,
                });
                setTimeout(() => {
                    router.push("/admin");
                }, 1500);
            } else {
                setMessage({
                    type: "error",
                    text: "Błąd podczas zapisywania producenta",
                });
            }
        } catch (error) {
            setMessage({
                type: "error",
                text: "Błąd podczas zapisywania",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-white pt-10">
            <div className="max-w-6xl mx-auto px-4">
                {/* Nagłówek */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => router.push("/admin")}
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                        >
                            <ArrowLeft size={18} />
                            Wróć do listy
                        </button>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Edytor: {manufacturerName}
                        </h1>
                        <p className="text-gray-600">
                            Edytuj JSON dla producenta {manufacturerName}
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2 transition"
                    >
                        <Save size={18} />
                        {saving ? "Zapisywanie..." : "Zapisz zmiany"}
                    </button>
                </div>

                {/* Komunikat */}
                {message && (
                    <div
                        className={`mb-8 p-4 rounded-lg border flex items-center gap-3 ${
                            message.type === "success"
                                ? "bg-green-50 border-green-300 text-green-700"
                                : "bg-red-50 border-red-300 text-red-700"
                        }`}
                    >
                        {message.type === "success" ? (
                            <Check size={20} />
                        ) : (
                            <AlertCircle size={20} />
                        )}
                        {message.text}
                    </div>
                )}

                {/* Edytor JSON */}
                <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
                    <JSONEditor data={data} onChange={setData} />
                </div>

                {/* Przycisk zapisu na dole */}
                <div className="mt-8 flex gap-4 justify-end pb-8">
                    <button
                        onClick={() => router.push("/admin")}
                        className="px-6 py-2 border border-zinc-300 text-gray-700 rounded-lg font-semibold hover:bg-zinc-50 transition"
                    >
                        Anuluj
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2 transition"
                    >
                        <Save size={18} />
                        {saving ? "Zapisywanie..." : "Zapisz zmiany"}
                    </button>
                </div>
            </div>
        </div>
    );
}
