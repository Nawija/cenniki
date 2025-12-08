"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAdmin } from "./AdminContext";

export default function AdminHeader() {
    const { hasChanges, saveFunction, saving } = useAdmin();
    const [showButton, setShowButton] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Animacja wejścia/wyjścia przycisku
    useEffect(() => {
        if (hasChanges && !showButton) {
            setShowButton(true);
            setTimeout(() => setIsAnimating(true), 10);
        } else if (!hasChanges && showButton) {
            setIsAnimating(false);
            setTimeout(() => setShowButton(false), 300);
        }
    }, [hasChanges, showButton]);

    // Ostrzeżenie przed opuszczeniem strony
    useEffect(() => {
        function handleBeforeUnload(e: BeforeUnloadEvent) {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasChanges]);

    async function handleSave() {
        if (saveFunction) {
            await saveFunction();
        }
    }

    return (
        <header className="bg-white text-gray-900 border-b sticky top-0 z-50 border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold">Panel Admin</h1>
                {showButton && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${
                            isAnimating
                                ? "opacity-100 translate-x-0"
                                : "opacity-0 translate-x-4"
                        }`}
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Zapisywanie..." : "Zapisz zmiany"}
                    </button>
                )}
            </div>
        </header>
    );
}
