"use client";

import { useEffect, useState } from "react";
import { Save, Calendar, X, Clock, Loader2 } from "lucide-react";
import { useAdmin } from "./AdminContext";
import { toast } from "@/components/ui";

export default function AdminHeader() {
    const {
        hasChanges,
        saveFunction,
        saving,
        pendingChanges,
        scheduleFunction,
    } = useAdmin();
    const [showButton, setShowButton] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduledDate, setScheduledDate] = useState("");
    const [isScheduling, setIsScheduling] = useState(false);

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

    async function handleSchedule() {
        if (!scheduledDate || !scheduleFunction) return;

        setIsScheduling(true);
        try {
            await scheduleFunction(scheduledDate);
            setShowScheduleModal(false);
            setScheduledDate("");
            toast.success(
                `Zmiany zaplanowane na ${new Date(
                    scheduledDate
                ).toLocaleDateString("pl-PL")}`
            );
        } catch {
            toast.error("Błąd podczas planowania zmian");
        } finally {
            setIsScheduling(false);
        }
    }

    const minDate = new Date().toISOString().split("T")[0];

    return (
        <>
            <header className="bg-white text-gray-900 border-b sticky top-0 z-50 border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">Panel Admin</h1>

                    <div
                        className={`flex items-center gap-2 transition-all duration-300 ${
                            isAnimating
                                ? "opacity-100 translate-x-0"
                                : "opacity-0 translate-x-4"
                        }`}
                    >
                        {/* Przycisk Zaplanuj zmiany - widoczny gdy są zmiany i funkcja planowania */}
                        {scheduleFunction && hasChanges && (
                            <button
                                onClick={() => setShowScheduleModal(true)}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            >
                                <Calendar className="w-4 h-4" />
                                Zaplanuj zmiany
                            </button>
                        )}

                        {/* Przycisk Zapisz zmiany */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? "Zapisywanie..." : "Zapisz zmiany"}
                        </button>
                    </div>
                </div>
            </header>

            {/* Modal planowania */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                Zaplanuj zmianę cen
                            </h3>
                            <button
                                onClick={() => {
                                    setShowScheduleModal(false);
                                    setScheduledDate("");
                                }}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Wybierz datę, od której mają obowiązywać nowe ceny.
                            Informacja o planowanej zmianie pojawi się na
                            stronie producenta.
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data wejścia w życie
                            </label>
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) =>
                                    setScheduledDate(e.target.value)
                                }
                                min={minDate}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {pendingChanges && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-blue-800">
                                    <strong>
                                        {pendingChanges.summary?.totalChanges ||
                                            "Wszystkie"}
                                    </strong>{" "}
                                    zmiany dla{" "}
                                    <strong>
                                        {pendingChanges.producerName ||
                                            "producenta"}
                                    </strong>
                                </p>
                                {pendingChanges.summary && (
                                    <div className="flex gap-4 mt-2 text-xs text-blue-700">
                                        <span>
                                            ↑{" "}
                                            {
                                                pendingChanges.summary
                                                    .priceIncrease
                                            }{" "}
                                            wzrostów
                                        </span>
                                        <span>
                                            ↓{" "}
                                            {
                                                pendingChanges.summary
                                                    .priceDecrease
                                            }{" "}
                                            spadków
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowScheduleModal(false);
                                    setScheduledDate("");
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={handleSchedule}
                                disabled={!scheduledDate || isScheduling}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isScheduling ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Planuję...
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="w-4 h-4" />
                                        Zaplanuj
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
