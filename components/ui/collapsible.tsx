"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import Image from "next/image";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";

function Collapsible({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
    return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
    return (
        <CollapsiblePrimitive.CollapsibleTrigger
            data-slot="collapsible-trigger"
            {...props}
        />
    );
}

function CollapsibleContent({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
    return (
        <CollapsiblePrimitive.CollapsibleContent
            data-slot="collapsible-content"
            {...props}
        />
    );
}

// ============================================
// COLLAPSIBLE CARD - karta z możliwością zwijania
// ============================================

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

function CollapsibleCard({
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
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <CollapsibleTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors",
                            headerClassName
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                            {leftIcon}
                            <span className="font-semibold text-gray-900">
                                {title}
                            </span>
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
                </CollapsibleTrigger>

                {/* Content */}
                <CollapsibleContent className="p-4">
                    {children}
                </CollapsibleContent>
            </div>
        </Collapsible>
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

function ProductItem({
    name,
    image,
    isExpanded,
    onToggle,
    onDelete,
    children,
}: ProductItemProps) {
    return (
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Header */}
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
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
                </CollapsibleTrigger>

                {/* Content */}
                <CollapsibleContent className="bg-white">
                    {children}
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

export {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
    CollapsibleCard,
    ProductItem,
};
