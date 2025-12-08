"use client";

import { useState, useCallback } from "react";

interface UseImageUploadOptions {
    producerSlug: string;
    folder?: string;
    onSuccess?: (path: string) => void;
    onError?: (error: Error) => void;
}

export function useImageUpload({
    producerSlug,
    folder = "products",
    onSuccess,
    onError,
}: UseImageUploadOptions) {
    const [uploading, setUploading] = useState(false);

    const upload = useCallback(
        async (file: File): Promise<string | null> => {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", file);
            formData.append("producer", producerSlug);
            formData.append("folder", folder);

            try {
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                const result = await res.json();

                if (result.path) {
                    onSuccess?.(result.path);
                    return result.path;
                }

                throw new Error("Brak ścieżki w odpowiedzi");
            } catch (error) {
                console.error("Upload error:", error);
                onError?.(error as Error);
                return null;
            } finally {
                setUploading(false);
            }
        },
        [producerSlug, folder, onSuccess, onError]
    );

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return null;
            return upload(file);
        },
        [upload]
    );

    return {
        uploading,
        upload,
        handleFileChange,
    };
}
