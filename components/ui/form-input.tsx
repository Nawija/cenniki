"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================
// INPUT STYLES (reużywalne klasy) - dla zachowania kompatybilności
// ============================================

export const inputBaseStyles =
    "w-full px-3 py-2 border border-input rounded-md text-sm transition-colors";

export const inputBgStyles = "bg-background";

export const inputSmStyles = "px-2 py-1 text-sm";

export const inputPromoStyles =
    "border-green-200 focus:ring-green-500 focus:border-green-500 bg-white";

// ============================================
// FORM INPUT COMPONENT
// ============================================

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    labelClassName?: string;
    variant?: "default" | "promo" | "inline";
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
    (
        { label, labelClassName, className, variant = "default", ...props },
        ref
    ) => {
        const variantStyles = {
            default: "",
            promo: "border-green-200 focus-visible:ring-green-500",
            inline: "bg-transparent border-0 border-b-2 border-transparent hover:border-gray-200 focus-visible:border-primary focus-visible:ring-0 rounded-none shadow-none",
        };

        const input = (
            <Input
                ref={ref}
                className={cn(variantStyles[variant], className)}
                {...props}
            />
        );

        if (!label) return input;

        return (
            <div className="space-y-1.5">
                <Label
                    className={cn(
                        "text-xs text-muted-foreground",
                        labelClassName
                    )}
                >
                    {label}
                </Label>
                {input}
            </div>
        );
    }
);

FormInput.displayName = "FormInput";

// ============================================
// FORM SELECT COMPONENT
// ============================================

interface FormSelectProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
}

export function FormSelect({
    label,
    options,
    className,
    ...props
}: FormSelectProps) {
    const select = (
        <select
            className={cn(
                "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );

    if (!label) return select;

    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {select}
        </div>
    );
}
