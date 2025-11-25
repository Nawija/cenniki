"use client";

import TableEditorBase from "./TableEditorBase";

export interface PuszmanEditorProps {
    initialData: Record<string, any>;
    manufacturerName: string;
    onSave: (data: Record<string, any>) => Promise<void>;
}

export default function PuszmanEditor({
    initialData,
    manufacturerName,
    onSave,
}: PuszmanEditorProps) {
    const columns = [
        { key: "MODEL", label: "MODEL", type: "text" as const },
        { key: "grupa I", label: "Grupa I", type: "number" as const },
        { key: "grupa II", label: "Grupa II", type: "number" as const },
        { key: "grupa III", label: "Grupa III", type: "number" as const },
        { key: "grupa IV", label: "Grupa IV", type: "number" as const },
        { key: "grupa V", label: "Grupa V", type: "number" as const },
        { key: "grupa VI", label: "Grupa VI", type: "number" as const },
        { key: "KOLOR NOGI", label: "KOLOR NOGI", type: "text" as const },
    ];

    return (
        <TableEditorBase
            initialData={initialData}
            manufacturerName={manufacturerName}
            onSave={onSave}
            columns={columns}
            dataKey="Arkusz1"
        />
    );
}
