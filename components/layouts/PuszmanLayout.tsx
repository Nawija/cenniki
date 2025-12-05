"use client";

import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import type { PuszmanData, PuszmanProduct } from "@/lib/types";

interface Props {
    data: PuszmanData;
    title?: string;
    priceGroups?: string[];
}

const DEFAULT_GROUPS = [
    "grupa I",
    "grupa II",
    "grupa III",
    "grupa IV",
    "grupa V",
    "grupa VI",
];

export default function PuszmanLayout({ data, title, priceGroups }: Props) {
    const [search, setSearch] = useState("");
    const groupNames = priceGroups || DEFAULT_GROUPS;

    const allProducts: PuszmanProduct[] = (data.Arkusz1 || []).filter(
        (item) => item && item.MODEL && typeof item.MODEL === "string"
    );

    // Filtruj produkty po nazwie modelu
    const products = useMemo(() => {
        if (!search.trim()) return allProducts;
        const query = search.toLowerCase();
        return allProducts.filter((p) => p.MODEL.toLowerCase().includes(query));
    }, [allProducts, search]);

    return (
        <div className="min-h-screen p-6 anim-opacity">
            <PageHeader
                title={title}
                search={search}
                onSearchChange={setSearch}
            />

            <div className="max-w-7xl mx-auto mt-12">
                {/* Tabela */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            {/* Nagłówek tabeli */}
                            <thead>
                                <tr className="bg-zinc-100 border-b border-zinc-200">
                                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-900 min-w-[200px]">
                                        Model
                                    </th>
                                    {groupNames.map((group) => (
                                        <th
                                            key={group}
                                            className="px-3 py-3 text-center font-semibold text-sm text-gray-900 whitespace-nowrap"
                                        >
                                            {group}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-900 min-w-[150px]">
                                        Kolor nogi
                                    </th>
                                </tr>
                            </thead>

                            {/* Ciało tabeli */}
                            <tbody>
                                {products.map((product, idx) => (
                                    <tr
                                        key={idx}
                                        className={`border-b border-zinc-200 transition-colors hover:bg-blue-50 ${
                                            idx % 2 === 0
                                                ? "bg-white"
                                                : "bg-gray-50"
                                        }`}
                                    >
                                        {/* Nazwa modelu */}
                                        <td className="px-4 py-3 font-semibold text-gray-900">
                                            {product.MODEL}
                                        </td>

                                        {/* Ceny grup */}
                                        {groupNames.map((group) => {
                                            const price = product[group] as
                                                | number
                                                | undefined;
                                            return (
                                                <td
                                                    key={group}
                                                    className="px-3 py-3 text-center text-sm font-medium text-gray-800"
                                                >
                                                    {price ? (
                                                        <span className="inline-flex items-center justify-center min-w-[80px] px-2 py-1 text-gray-900 rounded-lg font-semibold">
                                                            {price} zł
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">
                                                            -
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {/* Kolor nogi */}
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {product["KOLOR NOGI"] ? (
                                                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-medium">
                                                    {product["KOLOR NOGI"]}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">
                                                    Brak
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {products.length === 0 && (
                    <p className="text-center text-gray-500 text-lg mt-10">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </div>
    );
}
