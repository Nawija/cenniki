"use client";

import * as React from "react";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResponsiveTooltipProps {
    children: React.ReactNode; // Trigger element
    content: React.ReactNode; // Tooltip/Modal content
    title?: string; // Modal title for mobile
    side?: "top" | "right" | "bottom" | "left";
    className?: string; // Additional class for tooltip content
}

/**
 * ResponsiveTooltip - pokazuje tooltip na desktop, a modal na mobile
 * Na urządzeniach dotykowych (mobile/tablet) otwiera modal po kliknięciu
 * Na desktopie działa jak standardowy tooltip (hover)
 */
export function ResponsiveTooltip({
    children,
    content,
    title,
    side = "top",
    className,
}: ResponsiveTooltipProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Sprawdzamy czy urządzenie obsługuje hover (nie jest dotykowe)
    // Używamy media query dla hover capability
    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
        // Sprawdź czy to urządzenie dotykowe
        const isTouchDevice =
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            window.matchMedia("(pointer: coarse)").matches;

        if (isTouchDevice) {
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(true);
        }
    };

    return (
        <>
            {/* Desktop: Tooltip */}
            <div className="hidden md:block">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="cursor-pointer">{children}</div>
                    </TooltipTrigger>
                    <TooltipContent side={side} className={className}>
                        {content}
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* Mobile: Klikalne z modalem */}
            <div className="md:hidden">
                <div
                    onClick={handleClick}
                    onTouchEnd={handleClick}
                    className="cursor-pointer"
                >
                    {children}
                </div>
            </div>

            {/* Modal dla mobile */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-sm w-[90vw]">
                    {title && (
                        <DialogHeader>
                            <DialogTitle>{title}</DialogTitle>
                        </DialogHeader>
                    )}
                    <div className="py-2">{content}</div>
                </DialogContent>
            </Dialog>
        </>
    );
}
