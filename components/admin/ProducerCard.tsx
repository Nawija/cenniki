"use client";

import Link from "next/link";
import { Edit2, ExternalLink, Trash2, ChevronDown } from "lucide-react";
import type { ProducerConfig } from "@/lib/types";
import { FormInput, IconButton } from "@/components/ui";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
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
        <div className="bg-white border border-gray-200 rounded-md">
            {/* Main Content */}
            <div className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: Color & Name */}
                    <div className="flex items-center gap-3 lg:w-56 shrink-0">
                        <input
                            type="color"
                            value={producer.color || "#6b7280"}
                            onChange={(e) =>
                                onUpdate(index, { color: e.target.value })
                            }
                            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                            title="Kolor"
                        />
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                value={producer.displayName}
                                onChange={(e) =>
                                    onUpdate(index, {
                                        displayName: e.target.value,
                                    })
                                }
                                className="font-medium text-gray-900 w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-400 focus:outline-none text-sm"
                            />
                            <p className="text-xs text-gray-400 font-mono">
                                /{producer.slug}
                            </p>
                        </div>
                    </div>

                    {/* Middle: Settings */}
                    <div className="flex-1 flex flex-wrap items-center gap-3">
                        <FormInput
                            label="Tytuł"
                            value={producer.title || ""}
                            onChange={(e) =>
                                onUpdate(index, { title: e.target.value })
                            }
                            placeholder="CENNIK 2025"
                            className="flex-1 min-w-[140px]"
                        />

                        <div className="w-20">
                            <label className="block text-xs text-gray-500 mb-1">
                                Mnożnik
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
                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
                            />
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 lg:shrink-0">
                        <Link
                            href={`/admin/${producer.slug}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            Produkty
                        </Link>
                        <Link
                            href={`/p/${producer.slug}`}
                            target="_blank"
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                            title="Podgląd"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                            onClick={() => onDelete(producer.slug)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            title="Usuń"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Promotion Accordion */}
            <Accordion type="single" collapsible>
                <AccordionItem
                    value="promotion"
                    className="border-t border-gray-100"
                >
                    <AccordionTrigger className="px-4 py-2.5 text-sm hover:no-underline hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    producer.promotion?.enabled
                                        ? isActive
                                            ? "bg-green-500"
                                            : "bg-yellow-500"
                                        : "bg-gray-300"
                                }`}
                            />
                            <span className="text-gray-600">Promocja</span>
                            {producer.promotion?.enabled &&
                                producer.promotion?.text && (
                                    <span className="text-xs text-gray-400">
                                        — {producer.promotion.text}
                                    </span>
                                )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                            {/* Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={
                                        producer.promotion?.enabled || false
                                    }
                                    onChange={() => onTogglePromotion(index)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                    Włącz promocję
                                </span>
                            </label>

                            {/* Fields */}
                            {producer.promotion?.enabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Tekst
                                        </label>
                                        <input
                                            type="text"
                                            value={
                                                producer.promotion?.text || ""
                                            }
                                            onChange={(e) =>
                                                onUpdatePromotion(
                                                    index,
                                                    "text",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="-20%"
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
                                            Od
                                        </label>
                                        <input
                                            type="date"
                                            value={
                                                producer.promotion?.from || ""
                                            }
                                            onChange={(e) =>
                                                onUpdatePromotion(
                                                    index,
                                                    "from",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">
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
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Expired Warning */}
                            {isExpired && producer.promotion?.enabled && (
                                <p className="text-xs text-red-600 mt-2">
                                    ⚠ Promocja wygasła
                                </p>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
