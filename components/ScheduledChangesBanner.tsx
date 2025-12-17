"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, AlertCircle, X } from "lucide-react";

interface ScheduledChange {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    summary: {
        totalChanges: number;
        priceIncrease: number;
        priceDecrease: number;
        avgChangePercent: number;
    };
    status: "pending" | "applied" | "cancelled";
}

interface Props {
    producerSlug?: string; // Jeśli podany, pokazuje tylko dla tego producenta
    showAll?: boolean; // Pokazuje wszystkie zaplanowane zmiany
}

// Cache w pamięci - współdzielony między komponentami
const CACHE_KEY = "scheduled-changes-cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

interface CacheData {
    timestamp: number;
    data: ScheduledChange[];
}

function getFromCache(): ScheduledChange[] | null {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { timestamp, data }: CacheData = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_TTL) {
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function saveToCache(data: ScheduledChange[]) {
    try {
        const cacheData: CacheData = { timestamp: Date.now(), data };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch {
        // Ignore storage errors
    }
}

export function ScheduledChangesBanner({
    producerSlug,
    showAll = false,
}: Props) {
    const [changes, setChanges] = useState<ScheduledChange[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChanges = async () => {
            // Sprawdź cache najpierw
            const cached = getFromCache();
            if (cached) {
                const filtered = producerSlug
                    ? cached.filter((c) => c.producerSlug === producerSlug)
                    : cached;
                setChanges(
                    filtered.filter(
                        (c) => new Date(c.scheduledDate) >= new Date()
                    )
                );
                setLoading(false);
                return;
            }

            try {
                // Pobierz wszystkie pending zmiany (jeden request dla wszystkich)
                const response = await fetch(
                    "/api/scheduled-changes?status=pending"
                );
                const data = await response.json();

                if (data.success) {
                    // Zapisz do cache
                    saveToCache(data.changes);

                    // Filtruj według producenta jeśli podany
                    const filtered = producerSlug
                        ? data.changes.filter(
                              (c: ScheduledChange) =>
                                  c.producerSlug === producerSlug
                          )
                        : data.changes;

                    // Filtruj tylko przyszłe zmiany
                    const futureChanges = filtered.filter(
                        (c: ScheduledChange) => {
                            const changeDate = new Date(c.scheduledDate);
                            return changeDate >= new Date();
                        }
                    );
                    setChanges(futureChanges);
                }
            } catch (error) {
                console.error("Error fetching scheduled changes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChanges();
    }, [producerSlug]);

    const dismissChange = (id: string) => {
        setDismissed((prev) => new Set([...prev, id]));
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const getDaysUntil = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const changeDate = new Date(dateStr);
        changeDate.setHours(0, 0, 0, 0);
        const diffTime = changeDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const visibleChanges = changes.filter((c) => !dismissed.has(c.id));

    if (loading || visibleChanges.length === 0) {
        return null;
    }

    // Dla pojedynczego producenta - pokaż pierwszy zaplanowany
    if (producerSlug && !showAll) {
        const change = visibleChanges[0];
        const daysUntil = getDaysUntil(change.scheduledDate);
        const isToday = daysUntil === 0;
        const isTomorrow = daysUntil === 1;
        const isSoon = daysUntil <= 7;

        return (
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
                <div
                    className={`rounded-lg p-4 border ${
                        isToday
                            ? "bg-red-50 border-red-200"
                            : isSoon
                            ? "bg-amber-50 border-amber-200"
                            : "bg-blue-50 border-blue-200"
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            <div
                                className={`p-2 rounded-lg ${
                                    isToday
                                        ? "bg-red-100"
                                        : isSoon
                                        ? "bg-amber-100"
                                        : "bg-blue-100"
                                }`}
                            >
                                <Calendar
                                    className={`w-5 h-5 ${
                                        isToday
                                            ? "text-red-600"
                                            : isSoon
                                            ? "text-amber-600"
                                            : "text-blue-600"
                                    }`}
                                />
                            </div>
                            <div>
                                <h4
                                    className={`font-semibold ${
                                        isToday
                                            ? "text-red-800"
                                            : isSoon
                                            ? "text-amber-800"
                                            : "text-blue-800"
                                    }`}
                                >
                                    {isToday
                                        ? "Zmiana cen DZISIAJ!"
                                        : isTomorrow
                                        ? "Zmiana cen jutro!"
                                        : `Planowana zmiana cennika`}
                                </h4>
                                <p
                                    className={`text-sm mt-1 ${
                                        isToday
                                            ? "text-red-700"
                                            : isSoon
                                            ? "text-amber-700"
                                            : "text-blue-700"
                                    }`}
                                >
                                    {isToday
                                        ? `Nowe ceny obowiązują od dzisiaj (${formatDate(
                                              change.scheduledDate
                                          )})`
                                        : isTomorrow
                                        ? `Nowe ceny od jutra (${formatDate(
                                              change.scheduledDate
                                          )})`
                                        : `Nowe ceny od ${formatDate(
                                              change.scheduledDate
                                          )} (za ${daysUntil} dni)`}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs">
                                    <span
                                        className={`px-2 py-1 rounded ${
                                            isToday
                                                ? "bg-red-100 text-red-700"
                                                : isSoon
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-blue-100 text-blue-700"
                                        }`}
                                    >
                                        {change.summary.totalChanges} zmian
                                    </span>
                                    {change.summary.priceIncrease > 0 && (
                                        <span className="text-red-600">
                                            ↑ {change.summary.priceIncrease}{" "}
                                            podwyżek
                                        </span>
                                    )}
                                    {change.summary.priceDecrease > 0 && (
                                        <span className="text-green-600">
                                            ↓ {change.summary.priceDecrease}{" "}
                                            obniżek
                                        </span>
                                    )}
                                    {change.summary.avgChangePercent !== 0 && (
                                        <span
                                            className={
                                                change.summary
                                                    .avgChangePercent > 0
                                                    ? "text-red-600"
                                                    : "text-green-600"
                                            }
                                        >
                                            Średnio:{" "}
                                            {change.summary.avgChangePercent > 0
                                                ? "+"
                                                : ""}
                                            {change.summary.avgChangePercent.toFixed(
                                                1
                                            )}
                                            %
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => dismissChange(change.id)}
                            className="p-1 hover:bg-white/50 rounded"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Dla strony głównej - pokaż wszystkie zaplanowane
    return (
        <div className="space-y-3 mb-6">
            {visibleChanges.map((change) => {
                const daysUntil = getDaysUntil(change.scheduledDate);
                const isToday = daysUntil === 0;
                const isTomorrow = daysUntil === 1;
                const isSoon = daysUntil <= 7;

                return (
                    <div
                        key={change.id}
                        className={`rounded-lg p-4 border ${
                            isToday
                                ? "bg-red-50 border-red-200"
                                : isSoon
                                ? "bg-amber-50 border-amber-200"
                                : "bg-blue-50 border-blue-200"
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div
                                    className={`p-2 rounded-lg ${
                                        isToday
                                            ? "bg-red-100"
                                            : isSoon
                                            ? "bg-amber-100"
                                            : "bg-blue-100"
                                    }`}
                                >
                                    <Calendar
                                        className={`w-5 h-5 ${
                                            isToday
                                                ? "text-red-600"
                                                : isSoon
                                                ? "text-amber-600"
                                                : "text-blue-600"
                                        }`}
                                    />
                                </div>
                                <div>
                                    <h4
                                        className={`font-semibold ${
                                            isToday
                                                ? "text-red-800"
                                                : isSoon
                                                ? "text-amber-800"
                                                : "text-blue-800"
                                        }`}
                                    >
                                        {change.producerName}
                                        {isToday && " — Zmiana cen DZISIAJ!"}
                                        {isTomorrow && " — Zmiana cen jutro!"}
                                    </h4>
                                    <p
                                        className={`text-sm mt-1 ${
                                            isToday
                                                ? "text-red-700"
                                                : isSoon
                                                ? "text-amber-700"
                                                : "text-blue-700"
                                        }`}
                                    >
                                        Nowe ceny od{" "}
                                        {formatDate(change.scheduledDate)}
                                        {!isToday &&
                                            !isTomorrow &&
                                            ` (za ${daysUntil} dni)`}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-xs">
                                        <span
                                            className={`px-2 py-1 rounded ${
                                                isToday
                                                    ? "bg-red-100 text-red-700"
                                                    : isSoon
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-blue-100 text-blue-700"
                                            }`}
                                        >
                                            {change.summary.totalChanges} zmian
                                        </span>
                                        {change.summary.avgChangePercent !==
                                            0 && (
                                            <span
                                                className={
                                                    change.summary
                                                        .avgChangePercent > 0
                                                        ? "text-red-600"
                                                        : "text-green-600"
                                                }
                                            >
                                                Średnio:{" "}
                                                {change.summary
                                                    .avgChangePercent > 0
                                                    ? "+"
                                                    : ""}
                                                {change.summary.avgChangePercent.toFixed(
                                                    1
                                                )}
                                                %
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => dismissChange(change.id)}
                                className="p-1 hover:bg-white/50 rounded"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ScheduledChangesBanner;
