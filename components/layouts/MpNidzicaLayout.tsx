"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ElementSelector from "@/components/ElementSelector";
import SearchInput from "@/components/SearchInput";
import type {
    MpNidzicaData,
    MpNidzicaProduct,
    MpNidzicaMetaData,
} from "@/lib/types";

interface Props {
    data: MpNidzicaData;
}

export default function MpNidzicaLayout({ data }: Props) {
    const meta: MpNidzicaMetaData = data.meta_data || {};
    const products: MpNidzicaProduct[] = data.products || [];

    const [search, setSearch] = useState<string>("");

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            {/* META INFO */}
            <div className="p-3 md:p-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs md:text-sm">
                <p className="text-gray-600">{meta.valid_from}</p>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
                    <Link
                        href={`mailto:${meta.contact_orders}`}
                        className="text-blue-600 hover:underline"
                    >
                        {meta.contact_orders}
                    </Link>
                    <Link
                        href={`mailto:${meta.contact_claims}`}
                        className="text-blue-600 hover:underline"
                    >
                        {meta.contact_claims}
                    </Link>
                </div>
            </div>

            <SearchInput value={search} onChange={setSearch} />

            <div className="max-w-7xl mx-auto py-6 md:py-10 px-3 md:px-6">
                {filteredProducts.length > 0 ? (
                    <div className="space-y-8 md:space-y-20">
                        {filteredProducts.map((product, i) => (
                            <ProductSection key={i} product={product} />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 text-base md:text-lg mt-10 md:mt-20">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </>
    );
}

function ProductSection({ product }: { product: MpNidzicaProduct }) {
    let elementGroups: string[] = [];

    if (Array.isArray(product.elements)) {
        elementGroups = Object.keys(product.elements[0]?.prices || {});
    } else if (product.elements && typeof product.elements === "object") {
        elementGroups = Object.keys(
            Object.values(product.elements)[0]?.prices || {}
        );
    }

    return (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-md md:shadow-lg p-4 md:p-8">
            {/* HEADER: Nazwa + Zdjęcie */}
            <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
                {/* IMAGE */}
                <div className="flex justify-center md:justify-start">
                    {product.image ? (
                        <Image
                            src={product.image}
                            alt={product.name}
                            width={400}
                            height={400}
                            className="object-contain max-h-48 md:h-64 w-auto"
                        />
                    ) : (
                        <div className="h-32 md:h-44 w-full max-w-96 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                            Brak zdjęcia
                        </div>
                    )}
                </div>

                {/* TITLE */}
                <div className="flex flex-col justify-center">
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-orange-800 text-center md:text-end mb-2 md:mb-6">
                        {product.name}
                    </h2>
                </div>
            </div>

            {/* ELEMENT SELECTOR */}
            {product.elements && (
                <ElementSelector
                    elements={
                        product.elements as unknown as Record<string, any>
                    }
                    groups={elementGroups}
                />
            )}

            {/* TECHNICAL IMAGE */}
            {product.technicalImage && (
                <div className="relative h-48 md:h-96 rounded-lg overflow-hidden mt-6 md:mt-12 bg-gray-50">
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
