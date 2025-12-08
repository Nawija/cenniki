"use client";

import { Trash2 } from "lucide-react";
import type { Surcharge } from "@/lib/types";
import { IconButton } from "@/components/ui";

interface Props {
    categoryName: string;
    surcharges: Surcharge[];
    onChange: (surcharges: Surcharge[]) => void;
}

export function CategorySurchargesEditor({
    categoryName,
    surcharges,
    onChange,
}: Props) {
    const addSurcharge = () => {
        onChange([...surcharges, { label: "Nowa dopłata", percent: 10 }]);
    };

    const updateSurcharge = (
        index: number,
        field: keyof Surcharge,
        value: string | number
    ) => {
        const newSurcharges = [...surcharges];
        if (field === "percent") {
            newSurcharges[index] = {
                ...newSurcharges[index],
                percent: Number(value) || 0,
            };
        } else {
            newSurcharges[index] = {
                ...newSurcharges[index],
                label: String(value),
            };
        }
        onChange(newSurcharges);
    };

    const removeSurcharge = (index: number) => {
        onChange(surcharges.filter((_, i) => i !== index));
    };

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-amber-800">
                    Dopłaty dla kategorii &quot;{categoryName}&quot;
                </h4>
                <button
                    onClick={addSurcharge}
                    className="text-xs text-amber-700 hover:text-amber-900 hover:underline"
                >
                    + Dodaj dopłatę
                </button>
            </div>

            {surcharges.length === 0 ? (
                <p className="text-xs text-amber-600">
                    Brak dopłat. Kliknij &quot;+ Dodaj dopłatę&quot; aby dodać
                    np. łączenie kolorów, wybarwienie, czarna noga itp.
                </p>
            ) : (
                <div className="space-y-2">
                    {surcharges.map((surcharge, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={surcharge.label}
                                onChange={(e) =>
                                    updateSurcharge(
                                        index,
                                        "label",
                                        e.target.value
                                    )
                                }
                                placeholder="np. łączenie kolorów"
                                className="flex-1 px-2 py-1 border border-amber-300 rounded text-sm bg-white"
                            />
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-amber-700">
                                    +
                                </span>
                                <input
                                    type="number"
                                    value={surcharge.percent}
                                    onChange={(e) =>
                                        updateSurcharge(
                                            index,
                                            "percent",
                                            e.target.value
                                        )
                                    }
                                    className="w-16 px-2 py-1 border border-amber-300 rounded text-sm text-center bg-white"
                                    min="0"
                                    max="100"
                                />
                                <span className="text-xs text-amber-700">
                                    %
                                </span>
                            </div>
                            <IconButton
                                variant="danger"
                                size="sm"
                                onClick={() => removeSurcharge(index)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </IconButton>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
