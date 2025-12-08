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
    { value: "puszman", label: "Puszman (prosta tabela)" },
];

export function AddProducerModal({ isOpen, onClose, onAdd }: Props) {
    const [formData, setFormData] = useState({
        slug: "",
        displayName: "",
        layoutType: "bomar" as ProducerLayoutType,
        title: "",
        color: "#6b7280",
    });

    const resetForm = () => {
        setFormData({
            slug: "",
            displayName: "",
            layoutType: "bomar",
            title: "",
            color: "#6b7280",
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            slug: formData.slug,
            displayName: formData.displayName,
            dataFile: `${formData.slug}.json`,
            layoutType: formData.layoutType,
            title: formData.title,
            color: formData.color,
        });
        handleClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Nowy producent">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                    label="Slug (URL)"
                    value={formData.slug}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            slug: toSlug(e.target.value),
                        })
                    }
                    placeholder="np. nazwa-producenta"
                    required
                />

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

                <FormInput
                    label="Tytuł cennika"
                    value={formData.title}
                    onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="np. CENNIK STYCZEŃ 2025"
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
                    <Button type="submit" className="flex-1">
                        Dodaj producenta
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
