"use client";

import Link from "next/link";
import { useState } from "react";
import {
    Edit2,
    ExternalLink,
    Trash2,
    FileText,
    Calendar,
    TrendingUp,
    TrendingDown,
    X,
} from "lucide-react";
import type { ProducerConfig, FabricPdf } from "@/lib/types";
import { FormInput } from "@/components/ui";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { getTodayISO } from "@/lib/utils";
import { FabricsEditor } from "./FabricsEditor";

interface ScheduledFactorChange {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    oldFactor: number;
    newFactor: number;
    percentChange: number;
    status: "pending" | "applied" | "cancelled";
}

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
    onUpdateFabrics: (index: number, fabrics: FabricPdf[]) => void;
    onDelete: (slug: string) => void;
    scheduledFactorChange?: ScheduledFactorChange | null;
    onScheduledFactorChangeUpdate?: () => void;
}

export function ProducerCard({
    producer,
    index,
    onUpdate,
    onTogglePromotion,
    onUpdatePromotion,
    onUpdateFabrics,
    onDelete,
    scheduledFactorChange,
    onScheduledFactorChangeUpdate,
}: Props) {
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [newFactorValue, setNewFactorValue] = useState("");
    const [isScheduling, setIsScheduling] = useState(false);

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

    // Funkcje do zaplanowanych zmian faktora
    const handleScheduleFactorChange = async () => {
        if (!scheduleDate || !newFactorValue) {
            toast.error("Wypełnij datę i nowy faktor");
            return;
        }

        const newFactor = parseFloat(newFactorValue);
        if (isNaN(newFactor) || newFactor <= 0) {
            toast.error("Nieprawidłowa wartość faktora");
            return;
        }

        setIsScheduling(true);
        try {
            const res = await fetch("/api/scheduled-changes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "factor",
                    producerSlug: producer.slug,
                    producerName: producer.displayName,
                    scheduledDate: new Date(scheduleDate).toISOString(),
                    oldFactor: producer.priceFactor ?? 1,
                    newFactor,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Zaplanowano zmianę faktora");
                setShowScheduleModal(false);
                setScheduleDate("");
                setNewFactorValue("");
                onScheduledFactorChangeUpdate?.();
            } else {
                toast.error(data.error || "Błąd planowania zmiany");
            }
        } catch {
            toast.error("Błąd połączenia");
        } finally {
            setIsScheduling(false);
        }
    };

    const handleDeleteScheduledFactor = async () => {
        if (!scheduledFactorChange) return;

        try {
            const res = await fetch(
                `/api/scheduled-changes?id=${scheduledFactorChange.id}&type=factor`,
                { method: "DELETE" }
            );
            const data = await res.json();
            if (data.success) {
                toast.success("Usunięto zaplanowaną zmianę faktora");
                onScheduledFactorChangeUpdate?.();
            } else {
                toast.error(data.error || "Błąd usuwania");
            }
        } catch {
            toast.error("Błąd połączenia");
        }
    };

    const handleApplyFactorNow = async () => {
        if (!scheduledFactorChange) return;

        try {
            const res = await fetch("/api/scheduled-changes", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: scheduledFactorChange.id,
                    type: "factor",
                    applyNow: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Zastosowano zmianę faktora");
                onScheduledFactorChangeUpdate?.();
                // Odśwież stronę aby zaktualizować dane
                window.location.reload();
            } else {
                toast.error(data.error || "Błąd aplikowania");
            }
        } catch {
            toast.error("Błąd połączenia");
        }
    };

    return (
        <div className="overflow-hidden bg-white rounded-lg shadow">
            {/* Main Content */}
            <CardContent>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
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
                            className="flex-1 min-w-[140px]"
                        />

                        <div className="w-20 relative">
                            <Label className="text-xs text-muted-foreground">
                                Faktor
                            </Label>
                            <div className="relative">
                                <Input
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
                                    className="h-8"
                                />
                                {/* Żółta kropka dla zaplanowanej zmiany */}
                                {scheduledFactorChange && (
                                    <div
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white shadow animate-pulse cursor-pointer"
                                        title={`Zaplanowana zmiana: ${
                                            scheduledFactorChange.oldFactor
                                        } → ${
                                            scheduledFactorChange.newFactor
                                        } (${
                                            scheduledFactorChange.percentChange >
                                            0
                                                ? "+"
                                                : ""
                                        }${
                                            scheduledFactorChange.percentChange
                                        }%)`}
                                        onClick={() =>
                                            setShowScheduleModal(true)
                                        }
                                    />
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setNewFactorValue(
                                        (producer.priceFactor ?? 1).toString()
                                    );
                                    setShowScheduleModal(true);
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 mt-0.5"
                            >
                                Zaplanuj
                            </button>
                        </div>

                        {/* Wizualizacja checkbox - tylko dla layoutu mpnidzica */}
                        {producer.layoutType === "mpnidzica" && (
                            <div className="flex items-center gap-2">
                                <Switch
                                    id={`visualizer-${producer.slug}`}
                                    checked={producer.showVisualizer || false}
                                    onCheckedChange={(checked) =>
                                        onUpdate(index, {
                                            showVisualizer: checked,
                                        })
                                    }
                                />
                                <Label
                                    htmlFor={`visualizer-${producer.slug}`}
                                    className="text-xs text-muted-foreground cursor-pointer"
                                >
                                    Wizualizacja
                                </Label>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 lg:shrink-0">
                        <Button variant="secondary" size="sm" asChild>
                            <Link href={`/admin/${producer.slug}`}>
                                <Edit2 className="w-3.5 h-3.5" />
                                Edytuj
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" asChild>
                            <Link
                                href={`/p/${producer.slug}`}
                                target="_blank"
                                title="Podgląd"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDelete(producer.slug)}
                            title="Usuń"
                            className="hover:text-red-600"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>

            {/* Accordions for Promotion and Fabrics */}
            <Accordion type="multiple" className="border-t border-gray-100">
                <AccordionItem value="promotion" className="border-b-0">
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
                            <div className="flex items-center gap-2">
                                <Switch
                                    id={`promotion-${producer.slug}`}
                                    checked={
                                        producer.promotion?.enabled || false
                                    }
                                    onCheckedChange={() =>
                                        onTogglePromotion(index)
                                    }
                                />
                                <Label
                                    htmlFor={`promotion-${producer.slug}`}
                                    className="text-sm text-gray-700 cursor-pointer"
                                >
                                    Włącz promocję
                                </Label>
                            </div>

                            {/* Fields */}
                            {producer.promotion?.enabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">
                                            Tekst
                                        </Label>
                                        <Input
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
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">
                                            Od
                                        </Label>
                                        <Input
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
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">
                                            Do
                                        </Label>
                                        <Input
                                            type="date"
                                            value={producer.promotion?.to || ""}
                                            onChange={(e) =>
                                                onUpdatePromotion(
                                                    index,
                                                    "to",
                                                    e.target.value
                                                )
                                            }
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

                {/* Fabrics/Tkaniny Accordion */}
                <AccordionItem
                    value="fabrics"
                    className="border-t border-gray-100"
                >
                    <AccordionTrigger className="px-4 py-2.5 text-sm hover:no-underline hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-500" />
                            <span className="text-gray-600">Tkaniny PDF</span>
                            {producer.fabrics &&
                                producer.fabrics.length > 0 && (
                                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                        {producer.fabrics.length}
                                    </span>
                                )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <FabricsEditor
                            producerSlug={producer.slug}
                            fabrics={producer.fabrics || []}
                            onUpdate={(fabrics) =>
                                onUpdateFabrics(index, fabrics)
                            }
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Modal planowania zmiany faktora */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Zaplanuj zmianę faktora
                            </h3>
                            <button
                                onClick={() => setShowScheduleModal(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            {producer.displayName}
                        </p>

                        {/* Aktualnie zaplanowana zmiana */}
                        {scheduledFactorChange && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                                    <Calendar className="w-4 h-4" />
                                    Zaplanowana zmiana
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-sm">
                                    <span className="text-gray-600">
                                        {scheduledFactorChange.oldFactor} →{" "}
                                        {scheduledFactorChange.newFactor}
                                    </span>
                                    <span
                                        className={`font-medium ${
                                            scheduledFactorChange.percentChange >
                                            0
                                                ? "text-red-600"
                                                : "text-green-600"
                                        }`}
                                    >
                                        {scheduledFactorChange.percentChange >
                                        0 ? (
                                            <TrendingUp className="w-4 h-4 inline mr-1" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 inline mr-1" />
                                        )}
                                        {scheduledFactorChange.percentChange > 0
                                            ? "+"
                                            : ""}
                                        {scheduledFactorChange.percentChange}%
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Data:{" "}
                                    {new Date(
                                        scheduledFactorChange.scheduledDate
                                    ).toLocaleDateString("pl-PL")}
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleApplyFactorNow}
                                        className="text-xs"
                                    >
                                        Zastosuj teraz
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={handleDeleteScheduledFactor}
                                        className="text-xs"
                                    >
                                        Usuń
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm">
                                    Aktualny faktor
                                </Label>
                                <Input
                                    value={producer.priceFactor ?? 1}
                                    disabled
                                    className="mt-1 bg-gray-50"
                                />
                            </div>

                            <div>
                                <Label className="text-sm">Nowy faktor</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.1"
                                    max="10"
                                    value={newFactorValue}
                                    onChange={(e) =>
                                        setNewFactorValue(e.target.value)
                                    }
                                    placeholder="np. 2.50"
                                    className="mt-1"
                                />
                                {newFactorValue &&
                                    !isNaN(parseFloat(newFactorValue)) && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Zmiana:{" "}
                                            {(
                                                ((parseFloat(newFactorValue) -
                                                    (producer.priceFactor ??
                                                        1)) /
                                                    (producer.priceFactor ??
                                                        1)) *
                                                100
                                            ).toFixed(1)}
                                            %
                                        </p>
                                    )}
                            </div>

                            <div>
                                <Label className="text-sm">Data zmiany</Label>
                                <Input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) =>
                                        setScheduleDate(e.target.value)
                                    }
                                    min={today}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setShowScheduleModal(false)}
                                className="flex-1"
                            >
                                Anuluj
                            </Button>
                            <Button
                                onClick={handleScheduleFactorChange}
                                disabled={
                                    isScheduling ||
                                    !scheduleDate ||
                                    !newFactorValue
                                }
                                className="flex-1"
                            >
                                {isScheduling ? "Planowanie..." : "Zaplanuj"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
