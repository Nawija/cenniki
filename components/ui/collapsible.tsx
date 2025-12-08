"use client";

import Image from "next/image";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";

interface CollapsibleCardProps {
    title: ReactNode;
    subtitle?: string;
    isExpanded: boolean;
    onToggle: () => void;
    onDelete?: () => void;
    children: ReactNode;
    headerClassName?: string;
    leftIcon?: ReactNode;
}

export function CollapsibleCard({
    title,
    subtitle,
    isExpanded,
    onToggle,
    onDelete,
    children,
    headerClassName,
    leftIcon,
}: CollapsibleCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div
                className={cn(
                    "flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors",
                    headerClassName
                )}
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                    {leftIcon}
                    <span className="font-semibold text-gray-900">{title}</span>
                    {subtitle && (
                        <span className="text-sm text-gray-500">
                            {subtitle}
                        </span>
                    )}
                </div>
                {onDelete && (
                    <IconButton
                        variant="danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </IconButton>
                )}
            </div>

            {/* Content */}
            {isExpanded && <div className="p-4">{children}</div>}
        </div>
    );
}

// ============================================
// PRODUCT ITEM - mniejsza wersja dla produktów
// ============================================

interface ProductItemProps {
    name: string;
    image?: string;
    isExpanded: boolean;
    onToggle: () => void;
    onDelete?: () => void;
    children: ReactNode;
}

export function ProductItem({
    name,
    image,
    isExpanded,
    onToggle,
    onDelete,
    children,
}: ProductItemProps) {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    {image && (
                        <Image
                            src={image}
                            alt=""
                            width={40}
                            height={40}
                            className="rounded object-cover"
                        />
                    )}
                    <span className="font-medium">{name}</span>
                </div>
                {onDelete && (
                    <IconButton
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </IconButton>
                )}
            </div>

            {/* Content */}
            {isExpanded && <div className="bg-white">{children}</div>}
        </div>
    );
}
