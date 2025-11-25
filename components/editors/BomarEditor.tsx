"use client";

import { useState } from "react";
import NestedEditorBase from "./NestedEditorBase";

export interface BomarEditorProps {
    initialData: Record<string, any>;
    manufacturerName: string;
    onSave: (data: Record<string, any>) => Promise<void>;
}

export default function BomarEditor({
    initialData,
    manufacturerName,
    onSave,
}: BomarEditorProps) {
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const handleImageUpload = async (
        path: string[],
        file: File
    ): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("manufacturer", manufacturerName);
        formData.append("category", path[1] || "general");

        try {
            const response = await fetch("/api/upload-image", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            setMessage({ type: "success", text: "Zdjęcie wgrane!" });
            setTimeout(() => setMessage(null), 2000);

            return result.path;
        } catch (error) {
            const errorMsg =
                error instanceof Error
                    ? error.message
                    : "Błąd podczas wgrywania zdjęcia";

            setMessage({
                type: "error",
                text: errorMsg,
            });

            throw error;
        }
    };

    return (
        <NestedEditorBase
            initialData={initialData}
            manufacturerName={manufacturerName}
            onSave={onSave}
            onImageUpload={handleImageUpload}
        />
    );
}
