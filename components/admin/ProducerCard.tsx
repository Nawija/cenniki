"use client";

import Link from "next/link";
import { Edit2, ExternalLink, Trash2 } from "lucide-react";
import type { ProducerConfig } from "@/lib/types";
import { FormInput, IconButton } from "@/components/ui";
import { getTodayISO } from "@/lib/utils";

interface Props {
    producer: ProducerConfig;
    index: number;
    onUpdate: (index: number, updates: Partial<ProducerConfig>) => void;
    onTogglePromotion: (index: number) => void;
    onUpdatePromotion: (
        index: number,
        field: "text" | "from" | "to",
        value: string
    ) => void;
    onDelete: (slug: string) => void;
}

export function ProducerCard({
    producer,
    index,
    onUpdate,
    onTogglePromotion,
    onUpdatePromotion,
    onDelete,
}: Props) {
    const isPromotionActive = (): boolean => {
        if (!producer.promotion?.enabled) return false;
        const today = getTodayISO();
        const from = producer.promotion.from;
        const to = producer.promotion.to;
        if (from && today < from) return false;
        if (to && today > to) return false;
        return true;
    };

    const isActive = isPromotionActive();
    const today = getTodayISO();
    const isExpired = producer.promotion?.to && producer.promotion.to < today;

    return (
        <div
            className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
                producer.promotion?.enabled
                    ? "border-green-200"
                    : "border-gray-100"
            }`}
        >
            <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: Avatar & Basic Info */}
                    <div className="flex items-center gap-4 lg:w-72 shrink-0">
                        <div className="relative group">
                            <input
                                type="color"
                                value={producer.color || "#6b7280"}
                                onChange={(e) =>
                                    onUpdate(index, { color: e.target.value })
                                }
                                className="w-14 h-14 rounded-2xl cursor-pointer border-0 shadow-inner"
                                title="Zmień kolor"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                value={producer.displayName}
                                onChange={(e) =>
                                    onUpdate(index, {
                                        displayName: e.target.value,
                                    })
                                }
                                className="font-bold text-gray-900 text-lg w-full bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
                            />
                            <p className="text-xs text-gray-400 mt-0.5 font-mono">
                                /{producer.slug}
                            </p>
                        </div>
                    </div>

                    {/* Middle: Settings */}
                    <div className="flex-1 flex flex-wrap items-center gap-4">
                        {/* Title */}
                        <FormInput
                            label="Tytuł cennika"
                            value={producer.title || ""}
                            onChange={(e) =>
                                onUpdate(index, { title: e.target.value })
                            }
                            placeholder="np. CENNIK 2025"
                            className="flex-1 min-w-[180px]"
                        />

                        {/* Price Factor */}
                        <div className="w-28">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                Faktor
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.1"
                                max="10"
                                value={producer.priceFactor ?? 1}
                                onChange={(e) =>
                                    onUpdate(index, {
                                        priceFactor:
                                            parseFloat(e.target.value) || 1,
                                    })
                                }
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                            />
                        </div>

                        {/* Promotion Toggle */}
                        <div className="w-32">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                Promocja
                            </label>
                            <button
                                onClick={() => onTogglePromotion(index)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                    producer.promotion?.enabled
                                        ? isActive
                                            ? "bg-green-50 text-green-600 shadow-sm shadow-green-200"
                                            : "bg-amber-50 text-amber-600 shadow-sm shadow-amber-200"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                            >
                                <span
                                    className={`w-3 h-3 rounded-full transition-colors ${
                                        producer.promotion?.enabled
                                            ? isActive
                                                ? "bg-green-500"
                                                : "bg-amber-500"
                                            : "bg-gray-400"
                                    }`}
                                />
                                {producer.promotion?.enabled
                                    ? isActive
                                        ? "Aktywna"
                                        : "Planowana"
                                    : "Wyłączona"}
                            </button>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center mt-5 gap-1 lg:shrink-0">
                        <Link
                            href={`/admin/${producer.slug}`}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Edit2 className="w-4 h-4" />
                            Produkty
                        </Link>
                        <Link
                            href={`/p/${producer.slug}`}
                            target="_blank"
                            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            title="Podgląd strony"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                        <IconButton
                            variant="danger"
                            onClick={() => onDelete(producer.slug)}
                            title="Usuń"
                        >
                            <Trash2 className="w-4 h-4" />
                        </IconButton>
                    </div>
                </div>
            </div>

            {/* Promotion Details */}
            {producer.promotion?.enabled && (
                <div className="px-5 pb-5 pt-4 border-t border-green-100 bg-gradient-to-r from-green-50 to-emerald-50/30">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Tekst promocji
                            </label>
                            <input
                                type="text"
                                value={producer.promotion?.text || ""}
                                onChange={(e) =>
                                    onUpdatePromotion(
                                        index,
                                        "text",
                                        e.target.value
                                    )
                                }
                                placeholder="np. -20% na wszystko"
                                className="w-full px-3 py-2 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Od
                            </label>
                            <input
                                type="date"
                                value={producer.promotion?.from || ""}
                                onChange={(e) =>
                                    onUpdatePromotion(
                                        index,
                                        "from",
                                        e.target.value
                                    )
                                }
                                className="w-full px-3 py-2 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Do
                            </label>
                            <input
                                type="date"
                                value={producer.promotion?.to || ""}
                                onChange={(e) =>
                                    onUpdatePromotion(
                                        index,
                                        "to",
                                        e.target.value
                                    )
                                }
                                className="w-full px-3 py-2 border border-green-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            />
                        </div>
                    </div>
                    {isExpired && (
                        <p className="text-xs text-red-600 mt-3 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg">
                            <span>⚠️</span> Data promocji minęła - zostanie
                            automatycznie wyłączona przy zapisie
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
