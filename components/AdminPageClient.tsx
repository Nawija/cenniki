"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit3 } from "lucide-react";
import Loading from "./Loading";

export default function AdminPageClient() {
    const router = useRouter();
    const [manufacturers, setManufacturers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Pobierz listę producentów
    useEffect(() => {
        fetchManufacturers();
    }, []);

    const fetchManufacturers = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/manufacturers");
            const data = await res.json();
            setManufacturers(data.manufacturers || []);
        } catch (error) {
            console.error("Błąd pobierania producentów:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-10">
            <div className="max-w-6xl mx-auto px-4">
                {/* Nagłówek */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Zarządzanie Producentami
                    </h1>
                    <p className="text-gray-600">
                        Dodawaj, edytuj i usuwaj producentów oraz ich cenniki
                    </p>
                </div>

                {/* Lista producentów */}
                {loading ? (
                    <Loading />
                ) : manufacturers.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-50 rounded-lg border border-zinc-200">
                        <p className="text-gray-600 mb-4">Brak producentów</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {manufacturers.map((manufacturer) => (
                            <div
                                key={manufacturer}
                                className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between"
                            >
                                <h3 className="text-lg font-semibold capitalize text-gray-900">
                                    {manufacturer}
                                </h3>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            router.push(
                                                `/admin/manufacturer/${manufacturer.toLowerCase()}`
                                            )
                                        }
                                        className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium flex items-center gap-2 transition"
                                    >
                                        <Edit3 size={16} />
                                        Edytuj
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
