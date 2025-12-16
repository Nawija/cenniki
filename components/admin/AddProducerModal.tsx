"use client";

import { useState } from "react";
import type { ProducerConfig, ProducerLayoutType } from "@/lib/types";
import { Modal, FormInput, FormSelect, Button } from "@/components/ui";
import { toSlug } from "@/lib/utils";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (producer: Omit<ProducerConfig, "priceFactor">) => void;
}

const LAYOUT_OPTIONS = [
    { value: "bomar", label: "Bomar (kategorie z kartami)" },
    { value: "mpnidzica", label: "MP Nidzica (produkty z elementami)" },
    { value: "puszman", label: "Puszman (prosta tabela)" }
];

export function AddProducerModal({ isOpen, onClose, onAdd }: Props) {
    const [formData, setFormData] = useState({
        displayName: "",
        layoutType: "bomar" as ProducerLayoutType,
        color: "#6b7280",
    });

    const resetForm = () => {
        setFormData({
            displayName: "",
            layoutType: "bomar",
            color: "#6b7280",
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const slug = toSlug(formData.displayName);
        onAdd({
            slug: slug,
            displayName: formData.displayName,
            dataFile: `${slug}.json`,
            layoutType: formData.layoutType,
            color: formData.color,
        });
        handleClose();
    };

    // Auto-generowany slug z nazwy wyświetlanej
    const generatedSlug = toSlug(formData.displayName);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Nowy producent">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                    label="Nazwa wyświetlana"
                    value={formData.displayName}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            displayName: e.target.value,
                        })
                    }
                    placeholder="np. Nazwa Firmy"
                    required
                />

                {/* Podgląd auto-generowanego slugu */}
                {formData.displayName && (
                    <div className="text-sm text-gray-500">
                        <span className="font-medium">Slug URL:</span>{" "}
                        <code className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                            {generatedSlug}
                        </code>
                    </div>
                )}

                <FormSelect
                    label="Typ layoutu"
                    value={formData.layoutType}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            layoutType: e.target.value as ProducerLayoutType,
                        })
                    }
                    options={LAYOUT_OPTIONS}
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Kolor avatara
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="color"
                            value={formData.color}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    color: e.target.value,
                                })
                            }
                            className="w-14 h-11 rounded-xl border-0 cursor-pointer shadow-inner"
                        />
                        <input
                            type="text"
                            value={formData.color}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    color: e.target.value,
                                })
                            }
                            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1"
                    >
                        Anuluj
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={!formData.displayName.trim()}
                    >
                        Dodaj producenta
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
