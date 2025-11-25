"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Edit3, Plus } from "lucide-react";

export default function AdminPageClient() {
    const router = useRouter();
    const [manufacturers, setManufacturers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [newManufacturerName, setNewManufacturerName] = useState("");
    const [deleting, setDeleting] = useState<string | null>(null);

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

    const handleAddManufacturer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newManufacturerName.trim()) return;

        try {
            const newData = {
                title: `Cennik ${newManufacturerName}`,
                categories: {},
            };

            const res = await fetch("/api/manufacturers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newManufacturerName,
                    data: newData,
                }),
            });

            if (res.ok) {
                setNewManufacturerName("");
                fetchManufacturers();
                // Przejdź do edytora
                router.push(
                    `/admin/manufacturer/${newManufacturerName.toLowerCase()}`
                );
            }
        } catch (error) {
            console.error("Błąd dodawania producenta:", error);
        }
    };

    const handleDeleteManufacturer = async (name: string) => {
        if (
            !confirm(
                `Czy na pewno chcesz usunąć producenta "${name}"? Ta akcja jest nieodwracalna.`
            )
        )
            return;

        try {
            setDeleting(name);
            const res = await fetch("/api/manufacturers", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            if (res.ok) {
                fetchManufacturers();
            }
        } catch (error) {
            console.error("Błąd usuwania producenta:", error);
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="min-h-screen bg-white pt-10">
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

                {/* Formularz dodawania */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-8 shadow-sm">
                    <h2 className="text-2xl font-semibold mb-4">
                        Dodaj nowego producenta
                    </h2>
                    <form
                        onSubmit={handleAddManufacturer}
                        className="flex gap-3"
                    >
                        <input
                            type="text"
                            placeholder="Nazwa producenta (np. Nowy_Producent)"
                            value={newManufacturerName}
                            onChange={(e) =>
                                setNewManufacturerName(e.target.value)
                            }
                            className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 transition"
                        >
                            <Plus size={18} />
                            Dodaj
                        </button>
                    </form>
                </div>

                {/* Lista producentów */}
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">
                            Ładowanie producentów...
                        </p>
                    </div>
                ) : manufacturers.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-50 rounded-lg border border-zinc-200">
                        <p className="text-gray-600 mb-4">
                            Brak producentów. Dodaj pierwszego!
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {manufacturers.map((manufacturer) => (
                            <div
                                key={manufacturer}
                                className="bg-white border border-zinc-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {manufacturer}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        /admin/manufacturer/
                                        {manufacturer.toLowerCase()}
                                    </p>
                                </div>

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
                                    <button
                                        onClick={() =>
                                            handleDeleteManufacturer(
                                                manufacturer
                                            )
                                        }
                                        disabled={deleting === manufacturer}
                                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium flex items-center gap-2 transition disabled:opacity-50"
                                    >
                                        <Trash2 size={16} />
                                        {deleting === manufacturer
                                            ? "Usuwanie..."
                                            : "Usuń"}
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
