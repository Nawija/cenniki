"use client";

interface FileDiffUploadManagerProps {
    manufacturerName: string;
    onDataUpdate: (newData: Record<string, any>) => void;
}

// Stub komponent - do zaimplementowania później
export default function FileDiffUploadManager({
    manufacturerName,
    onDataUpdate,
}: FileDiffUploadManagerProps) {
    return (
        <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            <p>Upload Manager dla {manufacturerName}</p>
            <p className="text-sm">(Do zaimplementowania)</p>
        </div>
    );
}
