"use client";

import { HelpCircle } from "lucide-react";
import { ResponsiveTooltip } from "@/components/ui";
import { useAuth } from "@/lib/AuthContext";

interface ProductInfoTooltipProps {
    previousName?: string | null;
    priceFactor?: number;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ProductInfoTooltip({
    previousName,
    priceFactor = 1,
    size = "sm",
    className = "",
}: ProductInfoTooltipProps) {
    const { isAdmin } = useAuth();

    // Pokaż priceFactor tylko dla admina
    const showPriceFactor = isAdmin && priceFactor !== 1;
    const hasInfo = previousName || showPriceFactor;
    if (!hasInfo) return null;

    const iconSizes = {
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5",
    };

    const buttonSizes = {
        sm: "w-5 h-5",
        md: "w-5 h-5",
        lg: "w-5 h-5",
    };

    return (
        <ResponsiveTooltip
            title="Informacje o produkcie"
            content={
                <div className="space-y-1">
                    {previousName && <p>Poprzednia nazwa: {previousName}</p>}
                    {showPriceFactor && (
                        <p>Faktor: x{priceFactor.toFixed(2)}</p>
                    )}
                </div>
            }
        >
            <button
                className={`inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors ${buttonSizes[size]} ${className}`}
            >
                <HelpCircle className={iconSizes[size]} />
            </button>
        </ResponsiveTooltip>
    );
}

export default ProductInfoTooltip;
