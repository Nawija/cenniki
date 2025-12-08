"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

// ============================================
// INPUT STYLES (reużywalne klasy)
// ============================================

export const inputBaseStyles =
    "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export const inputBgStyles = "bg-gray-50 focus:bg-white";

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
            default: cn(inputBaseStyles, inputBgStyles),
            promo: cn(inputBaseStyles, inputPromoStyles),
            inline: cn(
                "bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
            ),
        };

        const input = (
            <input
                ref={ref}
                className={cn(variantStyles[variant], className)}
                {...props}
            />
        );

        if (!label) return input;

        return (
            <div>
                <label
                    className={cn(
                        "block text-xs font-medium text-gray-500 mb-1.5",
                        labelClassName
                    )}
                >
                    {label}
                </label>
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
            className={cn(inputBaseStyles, inputBgStyles, className)}
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
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
            </label>
            {select}
        </div>
    );
}
