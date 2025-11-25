"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

interface JSONEditorProps {
    data: any;
    onChange: (data: any) => void;
}

export default function JSONEditor({ data, onChange }: JSONEditorProps) {
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);

    const togglePath = (path: string) => {
        const newExpanded = new Set(expandedPaths);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedPaths(newExpanded);
    };

    const handleValueChange = (path: string[], value: any) => {
        const newData = JSON.parse(JSON.stringify(data));
        let current = newData;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        onChange(newData);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderValue = (value: any, path: string[] = []) => {
        const pathStr = path.join(".");
        const isExpanded = expandedPaths.has(pathStr);

        if (value === null || value === undefined) {
            return (
                <input
                    type="text"
                    value={value === null ? "null" : ""}
                    onChange={(e) => {
                        const newVal =
                            e.target.value === "null" ? null : e.target.value;
                        handleValueChange(path, newVal);
                    }}
                    className="px-2 py-1 border border-zinc-300 rounded text-sm font-mono"
                />
            );
        }

        if (typeof value === "boolean") {
            return (
                <select
                    value={value ? "true" : "false"}
                    onChange={(e) =>
                        handleValueChange(path, e.target.value === "true")
                    }
                    className="px-2 py-1 border border-zinc-300 rounded text-sm font-mono"
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }

        if (typeof value === "number") {
            return (
                <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                        handleValueChange(path, parseFloat(e.target.value))
                    }
                    className="px-2 py-1 border border-zinc-300 rounded text-sm font-mono w-24"
                />
            );
        }

        if (typeof value === "string") {
            return (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => handleValueChange(path, e.target.value)}
                    className="px-2 py-1 border border-zinc-300 rounded text-sm font-mono flex-1"
                    placeholder="string value"
                />
            );
        }

        if (Array.isArray(value)) {
            return (
                <div className="space-y-2">
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => togglePath(pathStr)}
                    >
                        {isExpanded ? (
                            <ChevronDown size={16} />
                        ) : (
                            <ChevronRight size={16} />
                        )}
                        <span className="text-sm font-semibold text-gray-700">
                            Array [{value.length}]
                        </span>
                    </div>
                    {isExpanded && (
                        <div className="ml-4 space-y-2 border-l-2 border-zinc-200 pl-4">
                            {value.map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                    <span className="text-xs text-gray-500">
                                        [{idx}]
                                    </span>
                                    {renderValue(item, [...path, String(idx)])}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (typeof value === "object") {
            return (
                <div className="space-y-2">
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => togglePath(pathStr)}
                    >
                        {isExpanded ? (
                            <ChevronDown size={16} />
                        ) : (
                            <ChevronRight size={16} />
                        )}
                        <span className="text-sm font-semibold text-gray-700">
                            Object ({Object.keys(value).length})
                        </span>
                    </div>
                    {isExpanded && (
                        <div className="ml-4 space-y-3 border-l-2 border-zinc-200 pl-4">
                            {Object.entries(value).map(([key, val]) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700">
                                        {key}:
                                    </label>
                                    {renderValue(val, [...path, key])}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return <span className="text-sm text-gray-600">{String(value)}</span>;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Edytor JSON</h3>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
                >
                    {copied ? (
                        <>
                            <Check size={16} />
                            Skopiowano
                        </>
                    ) : (
                        <>
                            <Copy size={16} />
                            Kopiuj JSON
                        </>
                    )}
                </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-3 max-h-[600px] overflow-y-auto">
                {renderValue(data)}
            </div>
        </div>
    );
}
