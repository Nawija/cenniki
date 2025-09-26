// app/product/[id]/page.tsx

import React from "react";
import bomarData from "../../../../data/Bomar.json";
import { notFound } from "next/navigation";

export default function BomarProductPage({
    params,
}: {
    params: { productName: string };
}) {
    const product = bomarData.products.find(
        (p) => p.name === params.productName
    );
    if (!product) {
        return notFound();
    }

    // Konwersja cen na tablicę do tabeli
    const priceEntries: { option: string; config: string; price: number }[] =
        [];
    if (product.pricesNetto) {
        for (const [option, price] of Object.entries(product.pricesNetto)) {
            priceEntries.push({ option, config: "-", price: Number(price) });
        }
    }

    return (
        <div className="anim-opacity p-8">
            <h1 className="text-2xl font-bold mb-4 text-gray-900">
                Bomar - {product.name}
            </h1>

            {product.margin && (
                <h3 className="mt-2 text-gray-700">
                    Faktor ({product.margin})
                </h3>
            )}

            <table className="w-full border-collapse mt-5">
                <thead>
                    <tr className="bg-gray-100 text-left">
                        <th className="p-2 border-b">Tkaniny</th>
                        <th className="p-2 border-b">Opis</th>
                        <th className="p-2 border-b">Cena brutto</th>
                    </tr>
                </thead>
                <tbody>
                    {priceEntries.map((p) => (
                        <tr
                            key={`${p.option}-${p.config}`}
                            className="odd:bg-white even:bg-gray-50"
                        >
                            <td className="p-2 border-b">{p.option}</td>
                            <td className="p-2 border-b">{p.config}</td>
                            <td className="p-2 border-b">
                                <strong>
                                    {(product.margin
                                        ? p.price * product.margin
                                        : p.price
                                    ).toFixed(2)}{" "}
                                    zł
                                </strong>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {product.extra_options && product.extra_options.length > 0 && (
                <div className="mt-5">
                    <h4 className="font-semibold mb-2">
                        Dodatkowe opcje (odpłatne)
                    </h4>
                    <ul className="list-disc pl-6">
                        {product.extra_options.map((opt: string) => (
                            <li key={opt}>{opt}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
