"use client";

import Image from "next/image";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageUpload } from "@/hooks/useImageUpload";
import { IconButton } from "./button";

interface ImageUploaderProps {
    value: string | null;
    onChange: (path: string | null) => void;
    producerSlug: string;
    folder?: string;
    label?: string;
    size?: "sm" | "md" | "lg";
}

const sizeStyles = {
    sm: { container: "w-16 h-16", image: 60, button: "text-xs px-2 py-1" },
    md: { container: "w-24 h-24", image: 100, button: "text-sm px-3 py-2" },
    lg: { container: "w-32 h-32", image: 128, button: "text-sm px-3 py-2" },
};

export function ImageUploader({
    value,
    onChange,
    producerSlug,
    folder = "products",
    label,
    size = "md",
}: ImageUploaderProps) {
    const { uploading, handleFileChange } = useImageUpload({
        producerSlug,
        folder,
        onSuccess: onChange,
    });

    const styles = sizeStyles[size];

    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                </label>
            )}
            <div className="flex items-start gap-3">
                {value ? (
                    <div className="relative">
                        <img
                            src={value}
                            alt=""
                            width={styles.image}
                            height={styles.image}
                            className="rounded-lg object-contain"
                        />
                        <IconButton
                            variant="danger"
                            size="sm"
                            className="absolute -top-2 -right-2 bg-red-500 text-white hover:bg-red-600 hover:text-white rounded-full"
                            onClick={() => onChange(null)}
                        >
                            <X className="w-3 h-3" />
                        </IconButton>
                    </div>
                ) : (
                    <div
                        className={cn(
                            styles.container,
                            "bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"
                        )}
                    >
                        Brak
                    </div>
                )}
                <label
                    className={cn(
                        "flex items-center gap-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
                        styles.button
                    )}
                >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Wysyłanie..." : "Wybierz plik"}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                            const path = await handleFileChange(e);
                            if (path) onChange(path);
                        }}
                        className="hidden"
                        disabled={uploading}
                    />
                </label>
            </div>
        </div>
    );
}
