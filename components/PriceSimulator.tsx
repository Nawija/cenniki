"use client";

import { useState, useEffect, useRef } from "react";
import { Calculator, X, Percent, Hash, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

type InputMode = "factor" | "percent";

interface PriceSimulatorProps {
    currentFactor: number;
    onFactorChange: (factor: number) => void;
    producerName?: string;
    baseFactor?: number; // oryginalny faktor z bazy (producers.json)
}

export default function PriceSimulator({
    currentFactor,
    onFactorChange,
    producerName,
    baseFactor,
}: PriceSimulatorProps) {
    const { isAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [inputMode, setInputMode] = useState<InputMode>("factor");
    const [inputValue, setInputValue] = useState(currentFactor.toString());
    const [percentValue, setPercentValue] = useState("0");
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, inputMode]);

    useEffect(() => {
        setInputValue(currentFactor.toString());
        // Reset percent to 0 when factor changes externally
        setPercentValue("0");
    }, [currentFactor]);

    // Calculate new factor: baseFactor + percent of baseFactor
    const percentNum = parseFloat(percentValue.replace(",", ".") || "0");
    const baseFactorValue = baseFactor || 1;
    const calculatedFactor = baseFactorValue * (1 + percentNum / 100);

    // Only render for admin users
    if (!isAdmin) return null;

    const handleApply = () => {
        if (inputMode === "factor") {
            const parsed = parseFloat(inputValue.replace(",", "."));
            if (!isNaN(parsed) && parsed > 0) {
                onFactorChange(parsed);
                setIsOpen(false);
            }
        } else {
            const parsed = parseFloat(percentValue.replace(",", "."));
            if (!isNaN(parsed)) {
                const baseFactorVal = baseFactor || 1;
                const newFactor = baseFactorVal * (1 + parsed / 100);
                if (newFactor > 0) {
                    onFactorChange(newFactor);
                    setIsOpen(false);
                }
            }
        }
    };

    const handleReset = () => {
        setInputValue("1");
        setPercentValue("0");
        onFactorChange(1);
    };

    const handleSendToKonrad = async () => {
        if (!producerName) return;

        setIsSending(true);
        setSendSuccess(false);

        try {
            const newFactor =
                inputMode === "factor"
                    ? parseFloat(inputValue.replace(",", "."))
                    : calculatedFactor;

            const percentChange = baseFactor
                ? ((newFactor / baseFactor - 1) * 100).toFixed(2)
                : undefined;

            const response = await fetch("/api/notify-factor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    producerName,
                    currentFactor: baseFactor || currentFactor,
                    newFactor: newFactor.toFixed(4).replace(/\.?0+$/, ""),
                    percentChange,
                }),
            });

            if (response.ok) {
                setSendSuccess(true);
                setTimeout(() => setSendSuccess(false), 3000);
            }
        } catch (error) {
            console.error("Błąd wysyłania:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handlePercentChange = (value: string) => {
        setPercentValue(value);
    };

    const handleFactorChange = (value: string) => {
        setInputValue(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleApply();
        }
        if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 hidden md:block">
            {/* Ikona kalkulatora */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-full transition-all duration-300 ${
                    isOpen
                        ? "bg-white text-amber-800 shadow-lg scale-110"
                        : " text-gray-500 hover:text-gray-600 hover:bg-gray-200/80"
                }`}
                title="Symulacja cen"
            >
                <Calculator className="w-5 h-5" />
                {currentFactor !== 1 && !isOpen && (
                    <span className="absolute -top-1 -right-1 bg-amber-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        x{Number(currentFactor.toFixed(3))}
                    </span>
                )}
            </button>

            {/* Panel symulacji */}
            <div
                className={`absolute -top-1 -right-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300 origin-top-right ${
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                }`}
            >
                <div className="p-4 min-w-[280px]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-amber-800" />
                            <span className="font-semibold text-gray-800">
                                Symulacja cen
                            </span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 mb-3">
                        {inputMode === "factor"
                            ? currentFactor === 1
                                ? "Faktor 1 = ceny netto"
                                : "Wpisz faktor aby przeliczyć wszystkie ceny"
                            : `Dodaj % do faktora producenta (${
                                  baseFactor || 1
                              })`}
                    </p>

                    {/* Mode toggle */}
                    <div className="flex mb-3 bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setInputMode("factor")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                inputMode === "factor"
                                    ? "bg-white text-amber-800 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <Hash className="w-3.5 h-3.5" />
                            Faktor
                        </button>
                        <button
                            onClick={() => setInputMode("percent")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                                inputMode === "percent"
                                    ? "bg-white text-amber-800 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <Percent className="w-3.5 h-3.5" />
                            Procent
                        </button>
                    </div>

                    {inputMode === "factor" ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                Faktor:
                            </span>
                            <Input
                                ref={inputRef}
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={inputValue}
                                onChange={(e) =>
                                    handleFactorChange(e.target.value)
                                }
                                onKeyDown={handleKeyDown}
                                className="w-20 h-9 text-center text-sm font-medium"
                                placeholder="1.0"
                            />
                            <Button
                                size="sm"
                                onClick={handleApply}
                                className="h-9 px-4 bg-amber-800 hover:bg-amber-800"
                            >
                                Zastosuj
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                    Podwyżka:
                                </span>
                                <div className="relative">
                                    <Input
                                        ref={inputRef}
                                        type="number"
                                        step="0.1"
                                        value={percentValue}
                                        onChange={(e) =>
                                            handlePercentChange(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        className="w-20 h-9 text-center text-sm font-medium pr-6"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                        %
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleApply}
                                    className="h-9 px-4 bg-amber-800 hover:bg-amber-800"
                                >
                                    Zastosuj
                                </Button>
                            </div>
                            {/* Show calculated factor */}
                            <div className="text-xs text-gray-500 bg-gray-50 rounded-md px-2 py-1.5">
                                {baseFactor || 1} + {percentNum}% ={" "}
                                <span className="font-semibold text-amber-800">
                                    {isNaN(calculatedFactor)
                                        ? "—"
                                        : calculatedFactor
                                              .toFixed(4)
                                              .replace(/\.?0+$/, "")}
                                </span>
                            </div>
                        </div>
                    )}

                    {currentFactor !== 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                                Aktualny faktor:{" "}
                                <span className="font-semibold text-amber-800">
                                    x{Number(currentFactor.toFixed(3))}
                                </span>
                            </span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleReset}
                                className="h-8 text-gray-500 hover:text-gray-700"
                            >
                                Reset
                            </Button>
                        </div>
                    )}

                    {/* Bazowy faktor producenta */}
                    {baseFactor && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500 mb-2">
                                Faktor producenta:{" "}
                                <span className="font-semibold text-gray-700">
                                    {baseFactor}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Przycisk wyślij do Konrada */}
                    {producerName && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSendToKonrad}
                                disabled={isSending}
                                className={`w-full h-9 text-sm transition-all ${
                                    sendSuccess
                                        ? "bg-green-50 border-green-300 text-green-700"
                                        : "hover:bg-amber-50 hover:border-amber-300"
                                }`}
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Wysyłanie...
                                    </>
                                ) : sendSuccess ? (
                                    <>✓ Wysłano do Konrada</>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Wyślij zmianę do Konrada
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
