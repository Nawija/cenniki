"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Upload,
    X,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

interface Producer {
    slug: string;
    displayName: string;
    dataFile: string;
    layoutType: "bomar" | "mpnidzica" | "puszman";
    title?: string;
    color?: string;
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default function AdminProducerPage({ params }: PageProps) {
    const { slug } = use(params);
    const [producer, setProducer] = useState<Producer | null>(null);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchData();
    }, [slug]);

    async function fetchData() {
        try {
            const res = await fetch(`/api/producers/${slug}/data`);
            const result = await res.json();
            setProducer(result.producer);
            setData(result.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }

    async function saveData() {
        if (!data) return;
        setSaving(true);

        try {
            await fetch(`/api/producers/${slug}/data`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            setHasChanges(false);
            alert("Zapisano pomyślnie!");
        } catch (error) {
            console.error("Error saving data:", error);
            alert("Błąd podczas zapisywania");
        } finally {
            setSaving(false);
        }
    }

    function updateData(newData: any) {
        setData(newData);
        setHasChanges(true);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!producer || !data) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Nie znaleziono producenta</p>
                <Link
                    href="/admin"
                    className="text-blue-600 hover:underline mt-2 block"
                >
                    Wróć do listy
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{
                                backgroundColor: producer.color || "#6b7280",
                            }}
                        >
                            {producer.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {producer.displayName}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Typ: {producer.layoutType}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={saveData}
                    disabled={!hasChanges || saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        hasChanges
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                    <Save className="w-5 h-5" />
                    {saving ? "Zapisywanie..." : "Zapisz zmiany"}
                </button>
            </div>

            {/* Unsaved changes warning */}
            {hasChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
                    ⚠️ Masz niezapisane zmiany. Kliknij &quot;Zapisz
                    zmiany&quot; aby je zachować.
                </div>
            )}

            {/* Editor based on layout type */}
            {producer.layoutType === "bomar" && (
                <BomarEditor
                    data={data}
                    onChange={updateData}
                    producer={producer}
                />
            )}
            {producer.layoutType === "puszman" && (
                <PuszmanEditor data={data} onChange={updateData} />
            )}
            {producer.layoutType === "mpnidzica" && (
                <MpNidzicaEditor
                    data={data}
                    onChange={updateData}
                    producer={producer}
                />
            )}
        </div>
    );
}

// ============================================
// BOMAR EDITOR
// ============================================

function BomarEditor({
    data,
    onChange,
    producer,
}: {
    data: any;
    onChange: (data: any) => void;
    producer: Producer;
}) {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(
        null
    );
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newProductName, setNewProductName] = useState("");
    const [addingProductTo, setAddingProductTo] = useState<string | null>(null);

    function addCategory() {
        if (!newCategoryName.trim()) return;
        const newData = { ...data };
        if (!newData.categories) newData.categories = {};
        newData.categories[newCategoryName.trim()] = {};
        onChange(newData);
        setNewCategoryName("");
    }

    function deleteCategory(catName: string) {
        if (!confirm(`Usunąć kategorię i wszystkie jej produkty?`)) return;
        const newData = { ...data };
        delete newData.categories[catName];
        onChange(newData);
    }

    function addProduct(catName: string) {
        if (!newProductName.trim()) return;
        const newData = { ...data };
        newData.categories[catName][newProductName.trim()] = {
            image: null,
            material: "",
            prices: {},
            sizes: [],
            options: [],
            description: [],
        };
        onChange(newData);
        setNewProductName("");
        setAddingProductTo(null);
        setExpandedProduct(`${catName}__${newProductName.trim()}`);
    }

    function deleteProduct(catName: string, prodName: string) {
        if (!confirm(`Usunąć produkt "${prodName}"?`)) return;
        const newData = { ...data };
        delete newData.categories[catName][prodName];
        onChange(newData);
    }

    function updateProduct(
        catName: string,
        prodName: string,
        productData: any
    ) {
        const newData = { ...data };
        newData.categories[catName][prodName] = productData;
        onChange(newData);
    }

    return (
        <div className="space-y-4">
            {/* Title */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tytuł cennika (w JSON)
                </label>
                <input
                    type="text"
                    value={data.title || ""}
                    onChange={(e) =>
                        onChange({ ...data, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="np. CENNIK STYCZEŃ 2025"
                />
            </div>

            {/* Categories */}
            <div className="space-y-3">
                {Object.entries(data.categories || {}).map(
                    ([catName, products]: [string, any]) => (
                        <div
                            key={catName}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                        >
                            {/* Category Header */}
                            <div
                                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                onClick={() =>
                                    setExpandedCategory(
                                        expandedCategory === catName
                                            ? null
                                            : catName
                                    )
                                }
                            >
                                <div className="flex items-center gap-3">
                                    {expandedCategory === catName ? (
                                        <ChevronUp className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    )}
                                    <h3 className="font-semibold text-gray-900 capitalize">
                                        {catName}
                                    </h3>
                                    <span className="text-sm text-gray-500">
                                        ({Object.keys(products).length}{" "}
                                        produktów)
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteCategory(catName);
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Category Content */}
                            {expandedCategory === catName && (
                                <div className="p-4 space-y-3">
                                    {/* Products */}
                                    {Object.entries(products).map(
                                        ([prodName, prodData]: [
                                            string,
                                            any
                                        ]) => (
                                            <div
                                                key={prodName}
                                                className="border border-gray-200 rounded-lg overflow-hidden"
                                            >
                                                {/* Product Header */}
                                                <div
                                                    className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                                    onClick={() =>
                                                        setExpandedProduct(
                                                            expandedProduct ===
                                                                `${catName}__${prodName}`
                                                                ? null
                                                                : `${catName}__${prodName}`
                                                        )
                                                    }
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {prodData.image && (
                                                            <Image
                                                                src={
                                                                    prodData.image
                                                                }
                                                                alt=""
                                                                width={40}
                                                                height={40}
                                                                className="rounded object-cover"
                                                            />
                                                        )}
                                                        <span className="font-medium">
                                                            {prodName}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteProduct(
                                                                catName,
                                                                prodName
                                                            );
                                                        }}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Product Editor */}
                                                {expandedProduct ===
                                                    `${catName}__${prodName}` && (
                                                    <ProductEditor
                                                        productData={prodData}
                                                        onChange={(newData) =>
                                                            updateProduct(
                                                                catName,
                                                                prodName,
                                                                newData
                                                            )
                                                        }
                                                        producer={producer}
                                                    />
                                                )}
                                            </div>
                                        )
                                    )}

                                    {/* Add Product */}
                                    {addingProductTo === catName ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newProductName}
                                                onChange={(e) =>
                                                    setNewProductName(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Nazwa produktu"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter")
                                                        addProduct(catName);
                                                    if (e.key === "Escape")
                                                        setAddingProductTo(
                                                            null
                                                        );
                                                }}
                                            />
                                            <button
                                                onClick={() =>
                                                    addProduct(catName)
                                                }
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                Dodaj
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setAddingProductTo(null)
                                                }
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                            >
                                                Anuluj
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() =>
                                                setAddingProductTo(catName)
                                            }
                                            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Dodaj produkt
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Add Category */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nazwa nowej kategorii"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") addCategory();
                    }}
                />
                <button
                    onClick={addCategory}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Dodaj kategorię
                </button>
            </div>
        </div>
    );
}

// ============================================
// PRODUCT EDITOR (for Bomar)
// ============================================

function ProductEditor({
    productData,
    onChange,
    producer,
}: {
    productData: any;
    onChange: (data: any) => void;
    producer: Producer;
}) {
    const [uploading, setUploading] = useState(false);

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("producer", producer.slug);
        formData.append("folder", "products");

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const result = await res.json();
            if (result.path) {
                onChange({ ...productData, image: result.path });
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Błąd podczas uploadu");
        } finally {
            setUploading(false);
        }
    }

    function updatePrice(group: string, value: string) {
        const newPrices = { ...productData.prices };
        const numValue = parseInt(value) || 0;
        if (numValue > 0) {
            newPrices[group] = numValue;
        } else {
            delete newPrices[group];
        }
        onChange({ ...productData, prices: newPrices });
    }

    function addPriceGroup() {
        const groupName = prompt("Nazwa grupy cenowej (np. Grupa I):");
        if (!groupName) return;
        updatePrice(groupName, "0");
    }

    function updateSize(index: number, field: string, value: string) {
        const newSizes = [...(productData.sizes || [])];
        newSizes[index] = { ...newSizes[index], [field]: value };
        onChange({ ...productData, sizes: newSizes });
    }

    function addSize() {
        const newSizes = [
            ...(productData.sizes || []),
            { dimension: "", prices: "" },
        ];
        onChange({ ...productData, sizes: newSizes });
    }

    function removeSize(index: number) {
        const newSizes = [...(productData.sizes || [])];
        newSizes.splice(index, 1);
        onChange({ ...productData, sizes: newSizes });
    }

    function updateOption(index: number, value: string) {
        const newOptions = [...(productData.options || [])];
        newOptions[index] = value;
        onChange({ ...productData, options: newOptions });
    }

    function addOption() {
        const newOptions = [...(productData.options || []), ""];
        onChange({ ...productData, options: newOptions });
    }

    function removeOption(index: number) {
        const newOptions = [...(productData.options || [])];
        newOptions.splice(index, 1);
        onChange({ ...productData, options: newOptions });
    }

    return (
        <div className="p-4 space-y-4 bg-white">
            {/* Image */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zdjęcie
                </label>
                <div className="flex items-start gap-4">
                    {productData.image ? (
                        <div className="relative">
                            <Image
                                src={productData.image}
                                alt=""
                                width={100}
                                height={100}
                                className="rounded-lg object-cover"
                            />
                            <button
                                onClick={() =>
                                    onChange({ ...productData, image: null })
                                }
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                            Brak
                        </div>
                    )}
                    <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        {uploading ? "Wysyłanie..." : "Wybierz plik"}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {/* Material */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materiał
                </label>
                <input
                    type="text"
                    value={productData.material || ""}
                    onChange={(e) =>
                        onChange({ ...productData, material: e.target.value })
                    }
                    placeholder="np. BUK / DĄB"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {/* Previous Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poprzednia nazwa
                </label>
                <input
                    type="text"
                    value={productData.previousName || ""}
                    onChange={(e) =>
                        onChange({
                            ...productData,
                            previousName: e.target.value,
                        })
                    }
                    placeholder="opcjonalnie"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {/* Prices (for chairs) */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Ceny (grupy cenowe)
                    </label>
                    <button
                        onClick={addPriceGroup}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Dodaj grupę
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(productData.prices || {}).map(
                        ([group, price]) => (
                            <div
                                key={group}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={group}
                                    disabled
                                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm bg-gray-50"
                                />
                                <input
                                    type="number"
                                    value={price as number}
                                    onChange={(e) =>
                                        updatePrice(group, e.target.value)
                                    }
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <span className="text-sm text-gray-500">
                                    zł
                                </span>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Sizes (for tables) */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Wymiary i ceny (dla stołów)
                    </label>
                    <button
                        onClick={addSize}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Dodaj wymiar
                    </button>
                </div>
                <div className="space-y-2">
                    {(productData.sizes || []).map(
                        (size: any, index: number) => (
                            <div
                                key={index}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={size.dimension}
                                    onChange={(e) =>
                                        updateSize(
                                            index,
                                            "dimension",
                                            e.target.value
                                        )
                                    }
                                    placeholder="np. Ø110x210"
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <input
                                    type="text"
                                    value={size.prices}
                                    onChange={(e) =>
                                        updateSize(
                                            index,
                                            "prices",
                                            e.target.value
                                        )
                                    }
                                    placeholder="cena"
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <span className="text-sm text-gray-500">
                                    zł
                                </span>
                                <button
                                    onClick={() => removeSize(index)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Options */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Opcje dodatkowe
                    </label>
                    <button
                        onClick={addOption}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Dodaj opcję
                    </button>
                </div>
                <div className="space-y-2">
                    {(productData.options || []).map(
                        (option: string, index: number) => (
                            <div
                                key={index}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) =>
                                        updateOption(index, e.target.value)
                                    }
                                    placeholder="np. mechanizm obrotowy +160zł"
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <button
                                    onClick={() => removeOption(index)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// PUSZMAN EDITOR
// ============================================

function PuszmanEditor({
    data,
    onChange,
}: {
    data: any;
    onChange: (data: any) => void;
}) {
    const products = data.Arkusz1 || [];
    const groups = [
        "grupa I",
        "grupa II",
        "grupa III",
        "grupa IV",
        "grupa V",
        "grupa VI",
    ];

    function updateProduct(index: number, field: string, value: any) {
        const newProducts = [...products];
        newProducts[index] = { ...newProducts[index], [field]: value };
        onChange({ ...data, Arkusz1: newProducts });
    }

    function addProduct() {
        const newProduct = {
            MODEL: "Nowy model",
            "grupa I": 0,
            "grupa II": 0,
            "grupa III": 0,
            "grupa IV": 0,
            "grupa V": 0,
            "grupa VI": 0,
            "KOLOR NOGI": "",
        };
        onChange({ ...data, Arkusz1: [...products, newProduct] });
    }

    function deleteProduct(index: number) {
        if (!confirm("Usunąć ten produkt?")) return;
        const newProducts = [...products];
        newProducts.splice(index, 1);
        onChange({ ...data, Arkusz1: newProducts });
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                Model
                            </th>
                            {groups.map((g) => (
                                <th
                                    key={g}
                                    className="px-2 py-2 text-center text-sm font-medium text-gray-700"
                                >
                                    {g}
                                </th>
                            ))}
                            <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                                Kolor nogi
                            </th>
                            <th className="px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product: any, index: number) => (
                            <tr
                                key={index}
                                className="border-b border-gray-100 hover:bg-gray-50"
                            >
                                <td className="px-3 py-2">
                                    <input
                                        type="text"
                                        value={product.MODEL || ""}
                                        onChange={(e) =>
                                            updateProduct(
                                                index,
                                                "MODEL",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                                    />
                                </td>
                                {groups.map((g) => (
                                    <td key={g} className="px-2 py-2">
                                        <input
                                            type="number"
                                            value={product[g] || 0}
                                            onChange={(e) =>
                                                updateProduct(
                                                    index,
                                                    g,
                                                    parseInt(e.target.value) ||
                                                        0
                                                )
                                            }
                                            className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center"
                                        />
                                    </td>
                                ))}
                                <td className="px-3 py-2">
                                    <input
                                        type="text"
                                        value={product["KOLOR NOGI"] || ""}
                                        onChange={(e) =>
                                            updateProduct(
                                                index,
                                                "KOLOR NOGI",
                                                e.target.value
                                            )
                                        }
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <button
                                        onClick={() => deleteProduct(index)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={addProduct}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Dodaj produkt
                </button>
            </div>
        </div>
    );
}

// ============================================
// MP-NIDZICA EDITOR
// ============================================

function MpNidzicaEditor({
    data,
    onChange,
    producer,
}: {
    data: any;
    onChange: (data: any) => void;
    producer: Producer;
}) {
    const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

    function updateMeta(field: string, value: string) {
        onChange({
            ...data,
            meta_data: { ...data.meta_data, [field]: value },
        });
    }

    function addProduct() {
        const newProduct = {
            name: "Nowy produkt",
            image: null,
            technicalImage: null,
            elements: [],
        };
        onChange({
            ...data,
            products: [...(data.products || []), newProduct],
        });
        setExpandedProduct((data.products || []).length);
    }

    function updateProduct(index: number, productData: any) {
        const newProducts = [...(data.products || [])];
        newProducts[index] = productData;
        onChange({ ...data, products: newProducts });
    }

    function deleteProduct(index: number) {
        if (!confirm("Usunąć ten produkt?")) return;
        const newProducts = [...(data.products || [])];
        newProducts.splice(index, 1);
        onChange({ ...data, products: newProducts });
    }

    return (
        <div className="space-y-4">
            {/* Meta Data */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">
                    Informacje o cenniku
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Firma
                        </label>
                        <input
                            type="text"
                            value={data.meta_data?.company || ""}
                            onChange={(e) =>
                                updateMeta("company", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Ważny od
                        </label>
                        <input
                            type="text"
                            value={data.meta_data?.valid_from || ""}
                            onChange={(e) =>
                                updateMeta("valid_from", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Email zamówień
                        </label>
                        <input
                            type="email"
                            value={data.meta_data?.contact_orders || ""}
                            onChange={(e) =>
                                updateMeta("contact_orders", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Email reklamacji
                        </label>
                        <input
                            type="email"
                            value={data.meta_data?.contact_claims || ""}
                            onChange={(e) =>
                                updateMeta("contact_claims", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Products */}
            <div className="space-y-3">
                {(data.products || []).map((product: any, index: number) => (
                    <div
                        key={index}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                    >
                        <div
                            className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                            onClick={() =>
                                setExpandedProduct(
                                    expandedProduct === index ? null : index
                                )
                            }
                        >
                            <div className="flex items-center gap-3">
                                {expandedProduct === index ? (
                                    <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                                <span className="font-medium">
                                    {product.name}
                                </span>
                                <span className="text-sm text-gray-500">
                                    ({(product.elements || []).length}{" "}
                                    elementów)
                                </span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteProduct(index);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {expandedProduct === index && (
                            <MpNidzicaProductEditor
                                product={product}
                                onChange={(newData) =>
                                    updateProduct(index, newData)
                                }
                                producer={producer}
                            />
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={addProduct}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
                <Plus className="w-5 h-5" />
                Dodaj produkt
            </button>
        </div>
    );
}

function MpNidzicaProductEditor({
    product,
    onChange,
    producer,
}: {
    product: any;
    onChange: (data: any) => void;
    producer: Producer;
}) {
    const [uploading, setUploading] = useState(false);

    async function handleImageUpload(
        e: React.ChangeEvent<HTMLInputElement>,
        field: "image" | "technicalImage"
    ) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("producer", producer.slug);
        formData.append("folder", "products");

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const result = await res.json();
            if (result.path) {
                onChange({ ...product, [field]: result.path });
            }
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setUploading(false);
        }
    }

    function addElement() {
        const elements = Array.isArray(product.elements)
            ? product.elements
            : [];
        onChange({
            ...product,
            elements: [
                ...elements,
                {
                    code: "NOWY",
                    prices: {},
                    description: [],
                },
            ],
        });
    }

    function updateElement(index: number, elementData: any) {
        const elements = [...(product.elements || [])];
        elements[index] = elementData;
        onChange({ ...product, elements });
    }

    function deleteElement(index: number) {
        const elements = [...(product.elements || [])];
        elements.splice(index, 1);
        onChange({ ...product, elements });
    }

    return (
        <div className="p-4 space-y-4">
            {/* Product Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nazwa produktu
                </label>
                <input
                    type="text"
                    value={product.name || ""}
                    onChange={(e) =>
                        onChange({ ...product, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {/* Images */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zdjęcie główne
                    </label>
                    <div className="flex items-center gap-2">
                        {product.image && (
                            <Image
                                src={product.image}
                                alt=""
                                width={60}
                                height={60}
                                className="rounded object-cover"
                            />
                        )}
                        <label className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-sm">
                            <Upload className="w-3 h-3" />
                            {uploading ? "..." : "Upload"}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, "image")}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rysunek techniczny
                    </label>
                    <div className="flex items-center gap-2">
                        {product.technicalImage && (
                            <Image
                                src={product.technicalImage}
                                alt=""
                                width={60}
                                height={60}
                                className="rounded object-cover"
                            />
                        )}
                        <label className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-sm">
                            <Upload className="w-3 h-3" />
                            {uploading ? "..." : "Upload"}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    handleImageUpload(e, "technicalImage")
                                }
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* Elements */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Elementy
                    </label>
                    <button
                        onClick={addElement}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Dodaj element
                    </button>
                </div>

                <div className="space-y-2">
                    {(Array.isArray(product.elements)
                        ? product.elements
                        : []
                    ).map((element: any, index: number) => (
                        <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-3 space-y-2"
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={element.code || ""}
                                    onChange={(e) =>
                                        updateElement(index, {
                                            ...element,
                                            code: e.target.value,
                                        })
                                    }
                                    placeholder="Kod elementu"
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <button
                                    onClick={() => deleteElement(index)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Prices for element */}
                            <div className="pl-4 space-y-1">
                                <p className="text-xs text-gray-500">Ceny:</p>
                                {Object.entries(element.prices || {}).map(
                                    ([group, price]) => (
                                        <div
                                            key={group}
                                            className="flex items-center gap-2"
                                        >
                                            <span className="text-xs text-gray-600 w-20">
                                                {group}:
                                            </span>
                                            <input
                                                type="number"
                                                value={price as number}
                                                onChange={(e) => {
                                                    const newPrices = {
                                                        ...element.prices,
                                                    };
                                                    newPrices[group] =
                                                        parseInt(
                                                            e.target.value
                                                        ) || 0;
                                                    updateElement(index, {
                                                        ...element,
                                                        prices: newPrices,
                                                    });
                                                }}
                                                className="w-20 px-2 py-1 border border-gray-200 rounded text-xs"
                                            />
                                        </div>
                                    )
                                )}
                                <button
                                    onClick={() => {
                                        const groupName = prompt(
                                            "Nazwa grupy cenowej:"
                                        );
                                        if (groupName) {
                                            const newPrices = {
                                                ...element.prices,
                                                [groupName]: 0,
                                            };
                                            updateElement(index, {
                                                ...element,
                                                prices: newPrices,
                                            });
                                        }
                                    }}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    + Dodaj grupę cenową
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
