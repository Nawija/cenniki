import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive:
                    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
                outline:
                    "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-4 py-2 has-[>svg]:px-3",
                sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
                lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
                icon: "size-9",
                "icon-sm": "size-8",
                "icon-lg": "size-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot : "button";

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

// ============================================
// ICON BUTTON - mały przycisk z ikoną
// ============================================

interface IconButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "ghost" | "danger";
    size?: "sm" | "md";
}

function IconButton({
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

interface AddButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    fullWidth?: boolean;
}

function AddButton({
    children,
    className,
    fullWidth = false,
    ...props
}: AddButtonProps) {
    return (
        <button
            className={cn(
                "flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors",
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export { Button, buttonVariants, IconButton, AddButton };
