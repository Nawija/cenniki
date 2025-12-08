"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant =
    | "primary"
    | "secondary"
    | "danger"
    | "ghost"
    | "outline"
    | "success";

type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "text-red-500 hover:bg-red-50",
    ghost: "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
    outline: "border border-gray-200 text-gray-600 hover:bg-gray-50",
    success:
        "bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
    icon: "p-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { variant = "primary", size = "md", className, children, ...props },
        ref
    ) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

// ============================================
// ICON BUTTON - mały przycisk z ikoną
// ============================================

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "ghost" | "danger";
    size?: "sm" | "md";
}

export function IconButton({
    variant = "ghost",
    size = "md",
    className,
    children,
    ...props
}: IconButtonProps) {
    const variantClass =
        variant === "danger"
            ? "text-red-500 hover:bg-red-50"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100";

    const sizeClass = size === "sm" ? "p-1" : "p-2";

    return (
        <button
            className={cn(
                "rounded-lg transition-colors",
                variantClass,
                sizeClass,
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

// ============================================
// ADD BUTTON - przycisk do dodawania z border dashed
// ============================================

interface AddButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    fullWidth?: boolean;
}

export function AddButton({
    children,
    className,
    fullWidth = false,
    ...props
}: AddButtonProps) {
    return (
        <button
            className={cn(
                "flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
