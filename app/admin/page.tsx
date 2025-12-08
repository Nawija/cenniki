"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { useAdmin } from "./AdminContext";
import type { ProducerConfig } from "@/lib/types";
import { getTodayISO } from "@/lib/utils";
import { ProducerCard, AddProducerModal } from "@/components/admin";
import { Button } from "@/components/ui";

export default function AdminPage() {
    const [producers, setProducers] = useState<ProducerConfig[]>([]);
    const [originalProducers, setOriginalProducers] = useState<
        ProducerConfig[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const { setHasChanges, setSaveFunction, setSaving } = useAdmin();

    // ============================================
    // DATA FETCHING
    // ============================================

    const checkPromotionExpiry = useCallback(
        (producersList: ProducerConfig[]): ProducerConfig[] => {
            const today = getTodayISO();
            return producersList.map((p) => {
                if (
                    p.promotion?.enabled &&
                    p.promotion.to &&
                    p.promotion.to < today
                ) {
                    return {
                        ...p,
                        promotion: { ...p.promotion, enabled: false },
                    };
                }
                return p;
            });
        },
        []
    );

    const fetchProducers = useCallback(async () => {
        try {
            const res = await fetch("/api/producers");
            const data = await res.json();
            const checked = checkPromotionExpiry(data);
            setProducers(checked);
            setOriginalProducers(JSON.parse(JSON.stringify(checked)));
        } catch (error) {
            console.error("Error fetching producers:", error);
        } finally {
            setLoading(false);
        }
    }, [checkPromotionExpiry]);

    useEffect(() => {
        fetchProducers();
    }, [fetchProducers]);

    // ============================================
    // CHANGE DETECTION
    // ============================================

    useEffect(() => {
        const hasChanges =
            JSON.stringify(producers) !== JSON.stringify(originalProducers);
        setHasChanges(hasChanges);
    }, [producers, originalProducers, setHasChanges]);

    // ============================================
    // SAVE FUNCTION
    // ============================================

    const saveAllProducers = useCallback(async () => {
        setSaving(true);
        try {
            await fetch("/api/producers/bulk", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(producers),
            });
            setOriginalProducers(JSON.parse(JSON.stringify(producers)));
            alert("Zapisano pomyślnie!");
        } catch (error) {
            console.error("Error saving producers:", error);
            alert("Błąd podczas zapisywania");
        } finally {
            setSaving(false);
        }
    }, [producers, setSaving]);

    useEffect(() => {
        setSaveFunction(saveAllProducers);
        return () => setSaveFunction(null);
    }, [saveAllProducers, setSaveFunction]);

    // ============================================
    // PRODUCER HANDLERS
    // ============================================

    const updateProducer = (
        index: number,
        updates: Partial<ProducerConfig>
    ) => {
        setProducers((prev) =>
            prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
        );
    };

    const togglePromotion = (index: number) => {
        setProducers((prev) =>
            prev.map((p, i) => {
                if (i !== index) return p;

                const isCurrentlyEnabled = p.promotion?.enabled ?? false;

                if (!isCurrentlyEnabled) {
                    return {
                        ...p,
                        promotion: {
                            text: p.promotion?.text || "Promocja",
                            from: p.promotion?.from || getTodayISO(),
                            to: p.promotion?.to || "",
                            enabled: true,
                        },
                    };
                } else {
                    return {
                        ...p,
                        promotion: {
                            ...p.promotion,
                            text: p.promotion?.text || "",
                            enabled: false,
                        },
                    };
                }
            })
        );
    };

    const updatePromotion = (
        index: number,
        field: "text" | "from" | "to",
        value: string
    ) => {
        setProducers((prev) =>
            prev.map((p, i) => {
                if (i !== index) return p;
                return {
                    ...p,
                    promotion: {
                        text: p.promotion?.text || "",
                        from: p.promotion?.from,
                        to: p.promotion?.to,
                        enabled: p.promotion?.enabled ?? false,
                        [field]: value,
                    },
                };
            })
        );
    };

    const handleAddProducer = async (
        newProducer: Omit<ProducerConfig, "priceFactor">
    ) => {
        try {
            await fetch("/api/producers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newProducer, priceFactor: 1 }),
            });
            fetchProducers();
        } catch (error) {
            console.error("Error adding producer:", error);
            alert("Błąd podczas dodawania producenta");
        }
    };

    const handleDelete = async (slug: string) => {
        if (!confirm("Czy na pewno chcesz usunąć tego producenta?")) return;

        try {
            await fetch(`/api/producers?slug=${slug}`, { method: "DELETE" });
            fetchProducers();
        } catch (error) {
            console.error("Error deleting producer:", error);
            alert("Błąd podczas usuwania producenta");
        }
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Producenci
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {producers.length}{" "}
                        {producers.length === 1 ? "producent" : "producentów"}
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} size="lg">
                    <Plus className="w-5 h-5" />
                    Dodaj producenta
                </Button>
            </div>

            {/* Add Producer Modal */}
            <AddProducerModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onAdd={handleAddProducer}
            />

            {/* Producers List */}
            <div className="space-y-3">
                {producers.map((producer, index) => (
                    <ProducerCard
                        key={producer.slug}
                        producer={producer}
                        index={index}
                        onUpdate={updateProducer}
                        onTogglePromotion={togglePromotion}
                        onUpdatePromotion={updatePromotion}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* Empty State */}
            {producers.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-medium text-gray-600">
                        Brak producentów
                    </p>
                    <p className="text-sm mt-1">
                        Kliknij &quot;Dodaj producenta&quot; aby rozpocząć
                    </p>
                </div>
            )}
        </div>
    );
}
