"use client";

import { getEditorForManufacturer } from "./editors";
import { AlertCircle } from "lucide-react";

interface ManufacturerEditorAdvancedProps {
    initialData: Record<string, any>;
    manufacturerName: string;
    onSave: (data: Record<string, any>) => Promise<void>;
}

export default function ManufacturerEditorAdvanced({
    initialData,
    manufacturerName,
    onSave,
}: ManufacturerEditorAdvancedProps) {
    // Pobierz edytor dla producenta
    const EditorComponent = getEditorForManufacturer(manufacturerName);

    if (!EditorComponent) {
        return (
            <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
                <div className="text-center py-12 text-gray-500">
                    <AlertCircle
                        size={48}
                        className="mx-auto mb-4 text-gray-400"
                    />
                    <p>Brak edytora dla producenta: {manufacturerName}</p>
                    <p className="text-sm text-gray-400 mt-2">
                        Zarejestruj edytor w components/editors/index.ts
                    </p>
                </div>
            </div>
        );
    }

    return (
        <EditorComponent
            initialData={initialData}
            manufacturerName={manufacturerName}
            onSave={onSave}
        />
    );
}
