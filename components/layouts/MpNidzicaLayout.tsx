"use client";

import Image from "next/image";
import { useState } from "react";
import ElementSelector from "@/components/ElementSelector";
import PageHeader from "@/components/PageHeader";
import type { MpNidzicaData, MpNidzicaProduct, Surcharge } from "@/lib/types";

interface Props {
    data: MpNidzicaData;
    title: string | undefined;
}

export default function MpNidzicaLayout({ data, title }: Props) {
    const products: MpNidzicaProduct[] = data.products || [];
    const surcharges: Surcharge[] = data.surcharges || [];

    const [search, setSearch] = useState<string>("");

    const filteredProducts = products.filter((p) => {
        const query = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(query) ||
            (p.previousName && p.previousName.toLowerCase().includes(query))
        );
    });

    return (
        <div className="min-h-screen p-4 md:p-6 anim-opacity">
            <PageHeader
                title={title}
                search={search}
                onSearchChange={setSearch}
            />

            <div className="max-w-7xl w-full mx-auto py-6 md:py-10 px-3 md:px-6 ">
                {filteredProducts.length > 0 ? (
                    <div className="space-y-8 md:space-y-20">
                        {filteredProducts.map((product, i) => (
                            <ProductSection
                                key={i}
                                product={product}
                                surcharges={surcharges}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 text-base md:text-lg mt-10 md:mt-20">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </div>
    );
}

function ProductSection({
    product,
    surcharges,
}: {
    product: MpNidzicaProduct;
    surcharges: Surcharge[];
}) {
    let elementGroups: string[] = [];

    if (Array.isArray(product.elements)) {
        elementGroups = Object.keys(product.elements[0]?.prices || {});
    } else if (product.elements && typeof product.elements === "object") {
        elementGroups = Object.keys(
            Object.values(product.elements)[0]?.prices || {}
        );
    }

    return (
        <div className="bg-white rounded-xl md:rounded-2xl shadow-md md:shadow-lg p-4 md:p-8 relative overflow-hidden">
            {/* DISCOUNT BADGE */}
            {product.discount && product.discount > 0 && (
                <div className="absolute top-0 right-0 z-10">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-bl-2xl shadow-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black">
                                -{product.discount}%
                            </span>
                            {product.discountLabel && (
                                <span className="text-xs opacity-90">
                                    {product.discountLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER: Nazwa + Zdjęcie */}
            <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
                {/* IMAGE */}
                <div className="flex justify-center md:justify-start relative">
                    {product.discount && product.discount > 0 && (
                        <div className="absolute -left-2 -top-2 md:-left-4 md:-top-4 w-16 h-16 md:w-20 md:h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg z-10 rotate-[-12deg]">
                            <span className="text-white font-black text-lg md:text-xl">
                                PROMO
                            </span>
                        </div>
                    )}
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
                    {product.discount && product.discount > 0 && (
                        <p className="text-center md:text-end text-red-600 font-semibold text-sm md:text-base">
                            🔥 Promocja -{product.discount}% na wszystkie
                            elementy!
                        </p>
                    )}
                </div>
            </div>

            {/* ELEMENT SELECTOR */}
            {product.elements && (
                <ElementSelector
                    elements={
                        product.elements as unknown as Record<string, any>
                    }
                    groups={elementGroups}
                    discount={product.discount}
                />
            )}

            {/* SURCHARGES */}
            {surcharges.length > 0 && (
                <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
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
