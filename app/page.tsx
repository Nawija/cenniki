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

function isPromotionActive(from?: string, to?: string): boolean {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        if (now < fromDate) return false;
    }

    if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        if (now > toDate) return false;
    }

    return true;
}

export default function HomePage() {
    // Producenci z aktywnymi promocjami
    const producersWithPromo = producers.filter(
        (p) =>
            p.promotion && isPromotionActive(p.promotion.from, p.promotion.to)
    );

    // Producenci bez aktywnych promocji
    const producersWithoutPromo = producers.filter(
        (p) =>
            !p.promotion || !isPromotionActive(p.promotion.from, p.promotion.to)
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* HEADER */}
            <div className="bg-white border-b border-gray-200 py-8 md:py-12">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
                        Cenniki Producentów
                    </h1>
                    <p className="text-gray-500">
                        Wybierz producenta, aby zobaczyć aktualny cennik
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
                                Aktywne promocje
                            </h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {producersWithPromo.map((producer) => (
                                <Link
                                    key={producer.slug}
                                    href={`/p/${producer.slug}`}
                                    className="group relative bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 hover:border-amber-400 hover:shadow- transition-all"
                                >
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded-full shadow">
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
                                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-amber-700 transition-colors flex items-center gap-2">
                                                {producer.displayName}
                                                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </h3>

                                            {/* Tytuł cennika */}
                                            {producer.title && (
                                                <p className="text-sm text-gray-500 mb-2">
                                                    {producer.title}
                                                </p>
                                            )}

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

                {/* WSZYSCY PRODUCENCI */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        {producersWithPromo.length > 0
                            ? "Pozostali producenci"
                            : "Wszyscy producenci"}
                    </h2>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {producersWithoutPromo.map((producer) => (
                            <Link
                                key={producer.slug}
                                href={`/p/${producer.slug}`}
                                className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-md transition-all flex items-center gap-4"
                            >
                                {/* Avatar */}
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
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
                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {producer.displayName}
                                    </h3>
                                    {producer.title && (
                                        <p className="text-xs text-gray-500 truncate">
                                            {producer.title}
                                        </p>
                                    )}
                                </div>

                                <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </Link>
                        ))}
                    </div>
                </section>

                {/* PUSTA LISTA */}
                {producers.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <p>Brak producentów do wyświetlenia</p>
                    </div>
                )}
            </div>
        </div>
    );
}
