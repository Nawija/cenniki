"use client";

import { useState, useRef } from "react";
import {
    FileText,
    Plus,
    Trash2,
    ExternalLink,
    Pencil,
    Check,
    X,
    Link,
    Upload,
    Loader2,
} from "lucide-react";
import type { FabricPdf } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
    producerSlug: string;
    fabrics: FabricPdf[];
    onUpdate: (fabrics: FabricPdf[]) => void;
}

type AddMode = "upload" | "link";

export function FabricsEditor({ producerSlug, fabrics, onUpdate }: Props) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editUrl, setEditUrl] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [addMode, setAddMode] = useState<AddMode>("upload");
    const [newName, setNewName] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            alert("Dozwolone są tylko pliki PDF");
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("producer", producerSlug);

            const res = await fetch("/api/upload-pdf", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                const newFabric: FabricPdf = {
                    name: data.name,
                    url: data.url,
                };
                onUpdate([...fabrics, newFabric]);
                setShowAddForm(false);
            } else {
                alert(data.error || "Błąd podczas uploadu");
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Błąd podczas uploadu pliku");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleAddLink = () => {
        if (!newName.trim() || !newUrl.trim()) {
            alert("Podaj nazwę i link");
            return;
        }

        const newFabric: FabricPdf = {
            name: newName.trim(),
            url: newUrl.trim(),
        };
        onUpdate([...fabrics, newFabric]);
        setNewName("");
        setNewUrl("");
        setShowAddForm(false);
    };

    const handleDelete = async (index: number) => {
        if (!confirm("Czy na pewno usunąć ten plik?")) return;

        const fabricToDelete = fabrics[index];

        // Usuń plik z serwera (jeśli to lokalny plik)
        try {
            await fetch("/api/delete-pdf", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: fabricToDelete.url }),
            });
        } catch (err) {
            console.error("Błąd usuwania pliku:", err);
        }

        // Usuń z listy
        const updated = fabrics.filter((_, i) => i !== index);
        onUpdate(updated);
    };

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditName(fabrics[index].name);
        setEditUrl(fabrics[index].url);
    };

    const saveEdit = () => {
        if (editingIndex === null) return;
        if (!editName.trim() || !editUrl.trim()) {
            alert("Podaj nazwę i link");
            return;
        }
        const updated = [...fabrics];
        updated[editingIndex] = { name: editName.trim(), url: editUrl.trim() };
        onUpdate(updated);
        setEditingIndex(null);
        setEditName("");
        setEditUrl("");
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditName("");
        setEditUrl("");
    };

    const moveUp = (index: number) => {
        if (index === 0) return;
        const updated = [...fabrics];
        [updated[index - 1], updated[index]] = [
            updated[index],
            updated[index - 1],
        ];
        onUpdate(updated);
    };

    const moveDown = (index: number) => {
        if (index === fabrics.length - 1) return;
        const updated = [...fabrics];
        [updated[index], updated[index + 1]] = [
            updated[index + 1],
            updated[index],
        ];
        onUpdate(updated);
    };

    return (
        <div className="space-y-3">
            {/* Lista linków */}
            {fabrics.length > 0 ? (
                <div className="space-y-2">
                    {fabrics.map((fabric, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group"
                        >
                            <FileText className="w-5 h-5 text-red-500 shrink-0" />

                            {editingIndex === index ? (
                                <div className="flex-1 space-y-2">
                                    <Input
                                        value={editName}
                                        onChange={(e) =>
                                            setEditName(e.target.value)
                                        }
                                        placeholder="Nazwa"
                                        className="h-7 text-sm"
                                        autoFocus
                                    />
                                    <Input
                                        value={editUrl}
                                        onChange={(e) =>
                                            setEditUrl(e.target.value)
                                        }
                                        placeholder="Link (Google Drive, Dropbox...)"
                                        className="h-7 text-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") saveEdit();
                                            if (e.key === "Escape")
                                                cancelEdit();
                                        }}
                                    />
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={saveEdit}
                                            className="text-green-600 hover:text-green-700 h-7"
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            Zapisz
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={cancelEdit}
                                            className="h-7"
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Anuluj
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {fabric.name}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {fabric.url}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Strzałki do sortowania */}
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => moveUp(index)}
                                            disabled={index === 0}
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Przesuń w górę"
                                        >
                                            ↑
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => moveDown(index)}
                                            disabled={
                                                index === fabrics.length - 1
                                            }
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Przesuń w dół"
                                        >
                                            ↓
                                        </Button>

                                        {/* Edycja */}
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => startEditing(index)}
                                            title="Edytuj"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>

                                        {/* Podgląd */}
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            asChild
                                            title="Otwórz link"
                                        >
                                            <a
                                                href={fabric.url}
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </Button>

                                        {/* Usuń */}
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => handleDelete(index)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            title="Usuń"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500 py-2">
                    Brak dodanych linków do tkanin
                </p>
            )}

            {/* Formularz dodawania */}
            {showAddForm ? (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    {/* Tabs - wybór trybu */}
                    <div className="flex gap-1 p-1 bg-white rounded-lg border">
                        <button
                            onClick={() => setAddMode("upload")}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                addMode === "upload"
                                    ? "bg-blue-500 text-white"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Wgraj PDF
                        </button>
                        <button
                            onClick={() => setAddMode("link")}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                addMode === "link"
                                    ? "bg-blue-500 text-white"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            <Link className="w-3.5 h-3.5" />
                            Zewnętrzny link
                        </button>
                    </div>

                    {addMode === "upload" ? (
                        /* Upload mode */
                        <div className="space-y-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleUpload}
                                className="hidden"
                                id={`fabric-upload-${producerSlug}`}
                                disabled={uploading}
                            />
                            <Label
                                htmlFor={`fabric-upload-${producerSlug}`}
                                className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                    uploading
                                        ? "border-blue-300 bg-blue-50 cursor-wait"
                                        : "border-gray-300 hover:border-blue-400 hover:bg-white"
                                }`}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        <span className="text-sm text-blue-600">
                                            Zapisywanie...
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            Kliknij i wybierz PDF
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            Zapisze do: public/pdf/tkaniny/
                                            {producerSlug}/
                                        </span>
                                    </>
                                )}
                            </Label>
                        </div>
                    ) : (
                        /* External link mode */
                        <div className="space-y-2">
                            <Label className="text-xs text-gray-600">
                                Nazwa wyświetlana
                            </Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="np. Cennik Tkanin 2025"
                                className="h-8"
                                autoFocus
                            />
                            <Label className="text-xs text-gray-600">
                                Link (Google Drive, Dropbox...)
                            </Label>
                            <Input
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="https://drive.google.com/..."
                                className="h-8"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddLink();
                                    if (e.key === "Escape")
                                        setShowAddForm(false);
                                }}
                            />
                            <Button
                                size="sm"
                                onClick={handleAddLink}
                                className="h-7 w-full"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Dodaj link
                            </Button>
                        </div>
                    )}

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setShowAddForm(false);
                            setNewName("");
                            setNewUrl("");
                        }}
                        className="h-7 w-full"
                        disabled={uploading}
                    >
                        Anuluj
                    </Button>
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(true)}
                    className="gap-1"
                >
                    <Plus className="w-4 h-4" />
                    Dodaj tkaniny
                </Button>
            )}
        </div>
    );
}
