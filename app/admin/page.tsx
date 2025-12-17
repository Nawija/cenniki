"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { useAdmin } from "./AdminContext";
import type { ProducerConfig } from "@/lib/types";
import { getTodayISO } from "@/lib/utils";
import {
    ProducerCard,
    AddProducerModal,
    ScheduledChangesManager,
} from "@/components/admin";
import { toast, ConfirmDialog } from "@/components/ui";
import GoogleSpinner from "@/components/Loading";

export default function AdminPage() {
    const [producers, setProducers] = useState<ProducerConfig[]>([]);
    const [originalProducers, setOriginalProducers] = useState<
        ProducerConfig[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        slug: string | null;
    }>({
        isOpen: false,
        slug: null,
    });

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
            toast.success("Zapisano pomyślnie!");
        } catch (error) {
            console.error("Error saving producers:", error);
            toast.error("Błąd podczas zapisywania");
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
            toast.success("Dodano producenta!");
        } catch (error) {
            console.error("Error adding producer:", error);
            toast.error("Błąd podczas dodawania producenta");
        }
    };

    const handleDelete = (slug: string) => {
        setDeleteConfirm({ isOpen: true, slug });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.slug) return;
        try {
            await fetch(`/api/producers?slug=${deleteConfirm.slug}`, {
                method: "DELETE",
            });
            fetchProducers();
            toast.success("Usunięto producenta!");
        } catch (error) {
            console.error("Error deleting producer:", error);
            toast.error("Błąd podczas usuwania producenta");
        }
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return <GoogleSpinner />;
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Zaplanowane zmiany */}
            <ScheduledChangesManager />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        Producenci
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {producers.length}{" "}
                        {producers.length === 1 ? "producent" : "producentów"}
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Dodaj
                </button>
            </div>

            {/* Add Producer Modal */}
            <AddProducerModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onAdd={handleAddProducer}
            />

            {/* Producers List */}
            <div className="space-y-2">
                {[...producers]
                    .sort((a, b) =>
                        a.displayName.localeCompare(b.displayName, "pl")
                    )
                    .map((producer) => (
                        <ProducerCard
                            key={producer.slug}
                            producer={producer}
                            index={producers.findIndex(
                                (p) => p.slug === producer.slug
                            )}
                            onUpdate={updateProducer}
                            onTogglePromotion={togglePromotion}
                            onUpdatePromotion={updatePromotion}
                            onDelete={handleDelete}
                        />
                    ))}
            </div>

            {/* Empty State */}
            {producers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p className="text-sm">Brak producentów</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                        Dodaj pierwszego producenta
                    </button>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, slug: null })}
                onConfirm={confirmDelete}
                title="Usunąć producenta?"
                description="Czy na pewno chcesz usunąć tego producenta? Ta operacja jest nieodwracalna."
                confirmText="Usuń"
                cancelText="Anuluj"
                variant="danger"
            />
        </div>
    );
}
