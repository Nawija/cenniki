import Link from "next/link";
import { Tag, Calendar, Percent, ArrowRight } from "lucide-react";
import { producers } from "@/lib/producers";
import GlobalSearch from "@/components/GlobalSearch";
import ScheduledChangesBanner from "@/components/ScheduledChangesBanner";
import fs from "fs";
import path from "path";

// W pełni statyczna strona - odświeża się tylko przy nowym buildzie (push na GitHub/Vercel)
export const dynamic = "force-static";

// Funkcja do ładowania danych producentów
async function loadProducersData() {
    const producersData = [];

    for (const producer of producers) {
        try {
            const dataPath = path.join(
                process.cwd(),
                "data",
                producer.dataFile
            );
            if (fs.existsSync(dataPath)) {
                const fileContent = fs.readFileSync(dataPath, "utf-8");
                const data = JSON.parse(fileContent);
                producersData.push({
                    slug: producer.slug,
                    displayName: producer.displayName,
                    layoutType: producer.layoutType,
                    data,
                });
            }
        } catch (error) {
            console.error(
                `Error loading data for ${producer.displayName}:`,
                error
            );
        }
    }

    return producersData;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
    });
}

function getDaysLeft(toDate: string): string | null {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return "Ostatni dzień!";
    if (diffDays === 1) return "Kończy się jutro!";
    if (diffDays <= 30) return `Zostało ${diffDays} dni`;
    return null;
}

function isPromotionActive(promotion?: {
    text: string;
    from?: string;
    to?: string;
    enabled?: boolean;
}): boolean {
    if (!promotion) return false;

    // Sprawdź czy promocja jest włączona
    if (promotion.enabled === false) return false;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (promotion.from) {
        const fromDate = new Date(promotion.from);
        fromDate.setHours(0, 0, 0, 0);
        if (now < fromDate) return false;
    }

    if (promotion.to) {
        const toDate = new Date(promotion.to);
        toDate.setHours(23, 59, 59, 999);
        if (now > toDate) return false;
    }

    return true;
}

export default async function HomePage() {
    // Tylko producenci z aktywnymi promocjami (włączone + w terminie)
    const producersWithPromo = producers.filter((p) =>
        isPromotionActive(p.promotion)
    );

    // Załaduj dane wszystkich producentów dla wyszukiwarki
    const producersData = await loadProducersData();

    return (
        <div className="min-h-screen bg-gray-100 anim-opacity">
            {/* HEADER */}
            <div className="bg-white border-b border-gray-200 py-32 md:py-48">
                <div className="max-w-5xl mx-auto px-10 text-center">
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
                        Wyszukiwarka
                    </h1>
                    <p className="text-gray-500 mb-6">
                        Wpisz nazwę starą lub nową produktu, aby wyszukać
                    </p>

                    {/* Wyszukiwarka globalna */}
                    <GlobalSearch producersData={producersData} />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 space-y-12">
                {/* PLANOWANE ZMIANY CEN */}
                <ScheduledChangesBanner showAll />

                {/* LINK DO FAKTORÓW */}
                <Link
                    href="/p/faktory"
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Percent className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800">
                                Faktory Producentów
                            </h3>
                            <p className="text-sm text-gray-500">
                                Faktory dla wszystkich producentów
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
                {/* AKTYWNE PROMOCJE */}
                {producersWithPromo.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4 ml-1">
                            <div className="w-8 h-8 bg-linear-to-bl from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
                                <Tag className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                Aktualne promocje
                            </h2>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {producersWithPromo.map((producer) => {
                                const daysLeft = producer.promotion?.to
                                    ? getDaysLeft(producer.promotion.to)
                                    : null;
                                const isUrgent =
                                    daysLeft &&
                                    (daysLeft.includes("Ostatni") ||
                                        daysLeft.includes("jutro") ||
                                        (daysLeft.includes("dni") &&
                                            parseInt(daysLeft) <= 7));

                                return (
                                    <Link
                                        key={producer.slug}
                                        href={`/p/${producer.slug}`}
                                        className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Avatar */}
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        producer.color ||
                                                        "#6b7280",
                                                }}
                                            >
                                                {producer.displayName
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {/* Nazwa + strzałka */}
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold text-gray-800">
                                                        {producer.displayName}
                                                    </h3>
                                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                                                </div>

                                                {/* Treść promocji */}
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                    {producer.promotion?.text}
                                                </p>

                                                {/* Meta info */}
                                                <div className="flex items-center gap-3 mt-2">
                                                    {producer.promotion?.from &&
                                                        producer.promotion
                                                            ?.to && (
                                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDate(
                                                                    producer
                                                                        .promotion
                                                                        .from
                                                                )}{" "}
                                                                -{" "}
                                                                {formatDate(
                                                                    producer
                                                                        .promotion
                                                                        .to
                                                                )}
                                                            </span>
                                                        )}
                                                    {daysLeft && (
                                                        <span
                                                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                                isUrgent
                                                                    ? "bg-red-100 text-red-600"
                                                                    : "bg-amber-100 text-amber-600"
                                                            }`}
                                                        >
                                                            {daysLeft}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* PUSTA LISTA */}
                {producersWithPromo.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Brak aktywnych promocji</p>
                    </div>
                )}
            </div>
        </div>
    );
}
