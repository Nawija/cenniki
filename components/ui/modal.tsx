"use client";

import { ReactNode } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    className?: string;
    maxWidth?: "sm" | "md" | "lg" | "xl";
}

const maxWidthStyles = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
};

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    className,
    maxWidth = "lg",
}: ModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={`${maxWidthStyles[maxWidth]} ${className || ""}`}
            >
                {title && (
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                )}
                {children}
            </DialogContent>
        </Dialog>
    );
}
