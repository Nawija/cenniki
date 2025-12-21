"use client";

import { useState, useEffect, useRef } from "react";
import { Calculator, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PriceSimulatorProps {
    currentFactor: number;
    onFactorChange: (factor: number) => void;
}

export default function PriceSimulator({
    currentFactor,
    onFactorChange,
}: PriceSimulatorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(currentFactor.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        setInputValue(currentFactor.toString());
    }, [currentFactor]);

    const handleApply = () => {
        const parsed = parseFloat(inputValue.replace(",", "."));
        if (!isNaN(parsed) && parsed > 0) {
            onFactorChange(parsed);
            setIsOpen(false);
        }
    };

    const handleReset = () => {
        setInputValue("1");
        onFactorChange(1);
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
        <div className="absolute top-4 right-4 z-50 hidden md:block">
            {/* Ikona kalkulatora */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-full transition-all duration-300 ${
                    isOpen
                        ? "bg-white text-amber-800 shadow-lg scale-110"
                        : " text-gray-300 hover:text-gray-400 hover:bg-gray-200/80"
                }`}
                title="Symulacja cen"
            >
                <Calculator className="w-5 h-5" />
                {currentFactor !== 1 && !isOpen && (
                    <span className="absolute -top-1 -right-1 bg-amber-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        x{currentFactor}
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
                        Wpisz faktor aby przeliczyć wszystkie ceny
                    </p>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Faktor:</span>
                        <Input
                            ref={inputRef}
                            type="number"
                            min="1"
                            step="0.01"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
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

                    {currentFactor !== 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                                Aktualny faktor:{" "}
                                <span className="font-semibold text-amber-800">
                                    x{currentFactor}
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
                </div>
            </div>
        </div>
    );
}
