import React from "react";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PromotionBannerProps {
    text: string;
    from?: string;
    to?: string;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
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

function PromotionBanner({ text, from, to }: PromotionBannerProps) {
    // Sprawdź czy promocja jest aktywna
    if (!isPromotionActive(from, to)) {
        return null;
    }

    const dateRange =
        from && to
            ? `${formatDate(from)} - ${formatDate(to)}`
            : from
            ? `od ${formatDate(from)}`
            : to
            ? `do ${formatDate(to)}`
            : null;

    return (
        <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3 text-amber-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-center sm:text-left">
                    <span className="font-semibold flex items-center gap-2">
                        <Tag size={18} className="flex-shrink-0" />
                        {text}
                    </span>
                    {dateRange && (
                        <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 border-green-200"
                        >
                            {dateRange}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}

export default React.memo(PromotionBanner);
