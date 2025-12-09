"use client";

import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import type { PuszmanData, PuszmanProduct, Surcharge } from "@/lib/types";

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

// Mobile card component
function ProductCard({
    product,
    groupNames,
}: {
    product: PuszmanProduct;
    groupNames: string[];
}) {
    return (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
                {product.MODEL}
            </h3>

            {/* Price groups grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                {groupNames.map((group) => {
                    const price = product[group] as number | undefined;
                    return (
                        <div
                            key={group}
                            className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"
                        >
                            <span className="text-xs text-gray-500 uppercase">
                                {group}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                                {price ? `${price} zł` : "-"}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Leg color */}
            {product["KOLOR NOGI"] && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Kolor nogi:</span>
                    <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-medium">
                        {product["KOLOR NOGI"]}
                    </span>
                </div>
            )}
        </div>
    );
}

export default function PuszmanLayout({ data, title, priceGroups }: Props) {
    const [search, setSearch] = useState("");
    const groupNames = priceGroups || DEFAULT_GROUPS;
    const surcharges: Surcharge[] = data.surcharges || [];

    const allProducts: PuszmanProduct[] = (data.Arkusz1 || []).filter(
        (item) => item && item.MODEL && typeof item.MODEL === "string"
    );

    // Filtruj produkty po nazwie modelu lub poprzedniej nazwie
    const products = useMemo(() => {
        if (!search.trim()) return allProducts;
        const query = search.toLowerCase();
        return allProducts.filter(
            (p) =>
                p.MODEL.toLowerCase().includes(query) ||
                (p.previousName && p.previousName.toLowerCase().includes(query))
        );
    }, [allProducts, search]);

    return (
        <div className="min-h-screen p-4 md:p-6 anim-opacity">
            <PageHeader
                title={title}
                search={search}
                onSearchChange={setSearch}
            />

            {/* SURCHARGES */}
            {surcharges.length > 0 && (
                <div className="mt-8 bg-white border border-zinc-200 rounded-xl max-w-7xl mx-auto p-4 md:p-6 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Dopłaty:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {surcharges.map((s, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-800 border border-amber-200"
                            >
                                {s.label}: +{s.percent}%
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto mt-8 md:mt-12">
                {/* Mobile: Card view */}
                <div className="md:hidden space-y-4">
                    {products.map((product, idx) => (
                        <ProductCard
                            key={idx}
                            product={product}
                            groupNames={groupNames}
                        />
                    ))}
                </div>

                {/* Desktop: Table view */}
                <div className="hidden md:block bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
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
