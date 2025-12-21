"use client";

import { useState } from "react";
import { FileText, ExternalLink } from "lucide-react";
import type { FabricPdf } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface FabricButtonProps {
    fabrics: FabricPdf[];
    variant?: "icon" | "full";
    className?: string;
}

export function FabricButton({
    fabrics,
    variant = "full",
    className = "",
}: FabricButtonProps) {
    const [open, setOpen] = useState(false);

    if (!fabrics || fabrics.length === 0) return null;

    // Jeden link - bezpośrednie przekierowanie
    if (fabrics.length === 1) {
        return (
            <Button
                variant="outline"
                size="sm"
                asChild
                className={`gap-1.5 ${className}`}
            >
                <a
                    href={fabrics[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FileText className="w-4 h-4 text-red-500" />
                    {variant === "full" && <span>Tkaniny</span>}
                </a>
            </Button>
        );
    }

    // Wiele linków - dialog z listą
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1.5 ${className}`}
                >
                    <FileText className="w-4 h-4 text-red-500" />
                    {variant === "full" && <span>Tkaniny</span>}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Katalogi tkanin</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                    {fabrics.map((fabric, index) => (
                        <a
                            key={index}
                            href={fabric.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                            onClick={() => setOpen(false)}
                        >
                            <FileText className="w-5 h-5 text-red-500 shrink-0" />
                            <span className="flex-1 text-sm font-medium">
                                {fabric.name}
                            </span>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
