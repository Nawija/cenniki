import { Calendar, Percent } from "lucide-react";
import {
    getScheduledChangesForBanner,
    getScheduledFactorChangesForBanner,
} from "@/lib/scheduledChanges";

interface Props {
    producerSlug?: string;
    showAll?: boolean;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function getDaysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const changeDate = new Date(dateStr);
    changeDate.setHours(0, 0, 0, 0);
    const diffTime = changeDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Server Component - banner informujący o zaplanowanych zmianach cen
 * Dane pobierane bezpośrednio z pliku JSON (bez fetch API)
 */
export default function ScheduledChangesBannerServer({
    producerSlug,
    showAll = false,
}: Props) {
    const changes = getScheduledChangesForBanner(producerSlug);
    const factorChanges = getScheduledFactorChangesForBanner(producerSlug);

    if (changes.length === 0 && factorChanges.length === 0) {
        return null;
    }

    // Dla pojedynczego producenta - pokaż pierwszy zaplanowany
    if (producerSlug && !showAll) {
        const factorChange = factorChanges[0];
        const priceChange = changes[0];

        // Jeśli jest zmiana faktora, pokaż ją
        if (factorChange) {
            const daysUntil = getDaysUntil(factorChange.scheduledDate);
            const isToday = daysUntil === 0;
            const isTomorrow = daysUntil === 1;

            return (
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 space-y-3">
                    <div
                        className={`rounded-lg p-3 sm:p-4 border ${
                            isToday
                                ? "bg-red-50 border-red-200"
                                : "bg-amber-50 border-amber-200"
                        }`}
                    >
                        <div className="flex items-start gap-2 sm:gap-3">
                            <div
                                className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                                    isToday ? "bg-red-100" : "bg-amber-100"
                                }`}
                            >
                                <Percent
                                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                        isToday
                                            ? "text-red-600"
                                            : "text-amber-600"
                                    }`}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4
                                        className={`font-semibold text-sm sm:text-base ${
                                            isToday
                                                ? "text-red-800"
                                                : "text-amber-800"
                                        }`}
                                    >
                                        {isToday
                                            ? "Zmiana cen dzisiaj!"
                                            : isTomorrow
                                            ? "Zmiana cen jutro!"
                                            : "Zmiana cen"}
                                    </h4>
                                    <span
                                        className={`text-sm font-semibold
                                            ${
                                                factorChange.percentChange > 0
                                                    ? "text-red-600"
                                                    : "text-green-600"
                                            }
                                        `}
                                    >
                                        {factorChange.percentChange > 0
                                            ? "+"
                                            : ""}
                                        {factorChange.percentChange}%
                                    </span>
                                </div>
                                <p
                                    className={`text-xs sm:text-sm mt-1 ${
                                        isToday
                                            ? "text-red-700"
                                            : "text-amber-700"
                                    }`}
                                >
                                    {isToday
                                        ? `Nowe ceny obowiązuje od dzisiaj (${formatDate(
                                              factorChange.scheduledDate
                                          )})`
                                        : isTomorrow
                                        ? `Nowe ceny od jutra (${formatDate(
                                              factorChange.scheduledDate
                                          )})`
                                        : `Nowe ceny od ${formatDate(
                                              factorChange.scheduledDate
                                          )} (za ${daysUntil} dni)`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Jeśli nie ma zmiany faktora, pokaż zmianę cen (jeśli jest)
        if (!priceChange) return null;

        const daysUntil = getDaysUntil(priceChange.scheduledDate);
        const isToday = daysUntil === 0;
        const isTomorrow = daysUntil === 1;

        return (
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
                <div
                    className={`rounded-lg p-3 sm:p-4 border ${
                        isToday
                            ? "bg-red-50 border-red-200"
                            : "bg-amber-50 border-amber-200"
                    }`}
                >
                    <div className="flex items-start gap-2 sm:gap-3">
                        <div
                            className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                                isToday ? "bg-red-100" : "bg-amber-100"
                            }`}
                        >
                            <Calendar
                                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                    isToday ? "text-red-600" : "text-amber-600"
                                }`}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4
                                className={`font-semibold text-sm sm:text-base ${
                                    isToday ? "text-red-800" : "text-amber-800"
                                }`}
                            >
                                {isToday
                                    ? "Zmiana cen DZISIAJ!"
                                    : isTomorrow
                                    ? "Zmiana cen jutro!"
                                    : "Planowana zmiana"}
                            </h4>
                            <p
                                className={`text-xs sm:text-sm mt-1 ${
                                    isToday ? "text-red-700" : "text-amber-700"
                                }`}
                            >
                                {isToday
                                    ? `Nowe ceny obowiązują od dzisiaj (${formatDate(
                                          priceChange.scheduledDate
                                      )})`
                                    : isTomorrow
                                    ? `Nowe ceny od jutra (${formatDate(
                                          priceChange.scheduledDate
                                      )})`
                                    : `Nowe ceny od ${formatDate(
                                          priceChange.scheduledDate
                                      )} (za ${daysUntil} dni)`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs">
                                <span
                                    className={`px-2 py-1 rounded ${
                                        isToday
                                            ? "bg-red-100 text-red-700"
                                            : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                    {priceChange.summary.totalChanges} zmian
                                </span>
                                {priceChange.summary.priceIncrease > 0 && (
                                    <span className="text-red-600">
                                        ↑ {priceChange.summary.priceIncrease}{" "}
                                        podwyżek
                                    </span>
                                )}
                                {priceChange.summary.priceDecrease > 0 && (
                                    <span className="text-green-600">
                                        ↓ {priceChange.summary.priceDecrease}{" "}
                                        obniżek
                                    </span>
                                )}
                                {priceChange.summary.avgChangePercent !== 0 && (
                                    <span
                                        className={
                                            priceChange.summary
                                                .avgChangePercent > 0
                                                ? "text-red-600"
                                                : "text-green-600"
                                        }
                                    >
                                        Średnio:{" "}
                                        {priceChange.summary.avgChangePercent >
                                        0
                                            ? "+"
                                            : ""}
                                        {priceChange.summary.avgChangePercent.toFixed(
                                            1
                                        )}
                                        %
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Dla strony głównej - pokaż wszystkie zaplanowane
    return (
        <div className="space-y-3 mb-6">
            {/* Zmiany faktorów */}
            {factorChanges.map((change) => {
                const daysUntil = getDaysUntil(change.scheduledDate);
                const isToday = daysUntil === 0;
                const isTomorrow = daysUntil === 1;

                return (
                    <div
                        key={change.id}
                        className={`rounded-lg p-3 sm:p-4 border ${
                            isToday
                                ? "bg-red-50 border-red-200"
                                : "bg-amber-50 border-amber-200"
                        }`}
                    >
                        <div className="flex items-start gap-2 sm:gap-3">
                            <div
                                className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                                    isToday ? "bg-red-100" : "bg-amber-100"
                                }`}
                            >
                                <Percent
                                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                        isToday
                                            ? "text-red-600"
                                            : "text-amber-600"
                                    }`}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4
                                    className={`font-semibold text-sm sm:text-base ${
                                        isToday
                                            ? "text-red-800"
                                            : "text-amber-800"
                                    }`}
                                >
                                    {change.producerName}
                                    {isToday && " — Zmiana faktora DZISIAJ!"}
                                    {isTomorrow && " — Zmiana faktora jutro!"}
                                </h4>
                                <p
                                    className={`text-xs sm:text-sm mt-1 ${
                                        isToday
                                            ? "text-red-700"
                                            : "text-amber-700"
                                    }`}
                                >
                                    Zmiana cen od{" "}
                                    {formatDate(change.scheduledDate)}
                                    {!isToday &&
                                        !isTomorrow &&
                                        ` (za ${daysUntil} dni)`}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                                    <span
                                        className={`px-2 py-1 rounded ${
                                            isToday
                                                ? "bg-red-100 text-red-700"
                                                : "bg-amber-100 text-amber-700"
                                        }`}
                                    >
                                        Ceny
                                    </span>
                                    <span
                                        className={`text-sm font-semibold ${
                                            change.percentChange > 0
                                                ? "text-red-600"
                                                : "text-green-600"
                                        }`}
                                    >
                                        {change.percentChange > 0 ? "+" : ""}
                                        {change.percentChange}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Zmiany cen */}
            {changes.map((change) => {
                const daysUntil = getDaysUntil(change.scheduledDate);
                const isToday = daysUntil === 0;
                const isTomorrow = daysUntil === 1;

                return (
                    <div
                        key={change.id}
                        className={`rounded-lg p-3 sm:p-4 border ${
                            isToday
                                ? "bg-red-50 border-red-200"
                                : "bg-amber-50 border-amber-200"
                        }`}
                    >
                        <div className="flex items-start gap-2 sm:gap-3">
                            <div
                                className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                                    isToday ? "bg-red-100" : "bg-amber-100"
                                }`}
                            >
                                <Calendar
                                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                        isToday
                                            ? "text-red-600"
                                            : "text-amber-600"
                                    }`}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4
                                    className={`font-semibold text-sm sm:text-base ${
                                        isToday
                                            ? "text-red-800"
                                            : "text-amber-800"
                                    }`}
                                >
                                    {change.producerName}
                                    {isToday && " — Zmiana cen DZISIAJ!"}
                                    {isTomorrow && " — Zmiana cen jutro!"}
                                </h4>
                                <p
                                    className={`text-xs sm:text-sm mt-1 ${
                                        isToday
                                            ? "text-red-700"
                                            : "text-amber-700"
                                    }`}
                                >
                                    Nowe ceny od{" "}
                                    {formatDate(change.scheduledDate)}
                                    {!isToday &&
                                        !isTomorrow &&
                                        ` (za ${daysUntil} dni)`}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs">
                                    <span
                                        className={`px-2 py-1 rounded ${
                                            isToday
                                                ? "bg-red-100 text-red-700"
                                                : "bg-amber-100 text-amber-700"
                                        }`}
                                    >
                                        {change.summary.totalChanges} zmian
                                    </span>
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
                    </div>
                );
            })}
        </div>
    );
}
