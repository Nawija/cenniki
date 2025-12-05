"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ElementSelector from "@/components/ElementSelector";
import data from "@/data/test.json";

export default function TestPage() {
    const meta = data.meta_data;
    const products = data.products || [];

    const [search, setSearch] = useState("");

    // Filtracja po nazwie produktu (case-insensitive)
    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <div className="p-4 bg-white border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 text-sm">
                <p>{meta.valid_from}</p>
                <div className="space-x-6">
                    <Link href={`mailto:${meta.contact_orders}`}>
                        {meta.contact_orders}
                    </Link>
                    <Link href={`mailto:${meta.contact_claims}`}>
                        {meta.contact_claims}
                    </Link>
                </div>
            </div>

            {/* SEARCH INPUT */}
            <div className="pt-6 flex justify-center">
                <input
                    type="text"
                    className="w-full max-w-md bg-gray-50 border border-gray-300 text-[16px] p-3 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition"
                    placeholder="Szukaj produktu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="max-w-7xl mx-auto py-10 px-6">
                {filteredProducts.length > 0 ? (
                    <div className="space-y-20">
                        {filteredProducts.map((product, i) => (
                            <ProductSection key={i} product={product} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 text-lg mt-20">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </>
    );
}

function ProductSection({ product }) {
    const elementGroups =
        product.elements && typeof product.elements === "object"
            ? Object.keys(Object.values(product.elements)[0]?.prices || {})
            : [];

    return (
        <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* IMAGE */}
                <div>
                    <div className="">
                        {product.image ? (
                            <Image
                                src={product.image}
                                alt={product.name}
                                width={400}
                                height={400}
                                className="object-contain"
                            />
                        ) : (
                            <div className="h-44 max-w-96 flex items-center justify-center text-gray-400 bg-gray-50">
                                Brak zdjęcia
                            </div>
                        )}
                    </div>
                </div>

                {/* TITLE */}
                <div className="flex flex-col justify-center">
                    <h2 className="text-5xl font-extrabold text-orange-800 text-end mb-6">
                        {product.name}
                    </h2>
                </div>
            </div>

            {/* ELEMENT SELECTOR */}
            {product.elements && (
                <ElementSelector
                    elements={product.elements}
                    groups={elementGroups}
                />
            )}

            {/* TECHNICAL IMAGE */}
            {product.technicalImage && (
                <div className="relative h-96 rounded overflow-hidden mt-12 bg-gray-50">
                    <Image
                        src={product.technicalImage}
                        alt="technical"
                        fill
                        className="object-contain"
                    />
                </div>
            )}
        </div>
    );
}
