import Link from "next/link";
import { Tag, Calendar, ExternalLink } from "lucide-react";
import { producers } from "@/lib/producers";

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

export default function HomePage() {
    // Tylko producenci z aktywnymi promocjami (włączone + w terminie)
    const producersWithPromo = producers.filter((p) =>
        isPromotionActive(p.promotion)
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* HEADER */}
            <div className="bg-white border-b border-gray-200 py-8 md:py-12">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
                        Aktualne Promocje
                    </h1>
                    <p className="text-gray-500">
                        Wybierz producenta, aby zobaczyć cennik
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                {/* AKTYWNE PROMOCJE */}
                {producersWithPromo.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Tag className="w-5 h-5 text-red-500" />
                            <h2 className="text-lg font-semibold text-gray-800">
                                Aktualne promocje
                            </h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {producersWithPromo.map((producer) => (
                                <Link
                                    key={producer.slug}
                                    href={`/p/${producer.slug}`}
                                    className="group relative bg-gradient-to-br from-amber-50 to-orange-100 border-2 border-amber-200 rounded-xl p-5 hover:border-amber-300 hover:shadow- transition-all"
                                >
                                    <span className="absolute -top-3 -right-3 bg-linear-to-bl from-red-600 to-red-400 text-white text-[10px] font-bold px-4 py-2 rounded-full shadow">
                                        {producer.promotion?.to &&
                                        getDaysLeft(producer.promotion.to)
                                            ? getDaysLeft(producer.promotion.to)
                                            : "PROMOCJA"}
                                    </span>

                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                                            style={{
                                                backgroundColor:
                                                    producer.color || "#6b7280",
                                            }}
                                        >
                                            {producer.displayName
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {/* Nazwa producenta */}
                                            <h3 className="font-bold text-gray-700 text-lg transition-colors flex items-center gap-2">
                                                {producer.displayName}
                                                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </h3>

                                            {/* Promocja */}
                                            <div className="bg-white/80 rounded-lg px-3 py-2 mt-2">
                                                <p className="text-amber-800 font-semibold text-sm">
                                                    🔥{" "}
                                                    {producer.promotion?.text}
                                                </p>
                                                {producer.promotion?.from &&
                                                    producer.promotion?.to && (
                                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
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
                                                        </p>
                                                    )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* PUSTA LISTA */}
                {producersWithPromo.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p>Brak aktywnych promocji</p>
                    </div>
                )}
            </div>
        </div>
    );
}
