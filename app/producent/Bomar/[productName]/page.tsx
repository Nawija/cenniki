import React from "react";
import bomarData from "../../../../data/Bomar.json";
import { notFound } from "next/navigation";
import Image from "next/image";

export default function BomarProductPage({
    params,
}: {
    params: { productName: string };
}) {
    // Pobranie produktu po nazwie (klucz obiektu)
    const product = bomarData.categories.krzesła[params.productName];

    if (!product) {
        return notFound();
    }

    // Konwersja cen na tablicę do tabeli
    const priceEntries: {
        option: string;
        available_options: string;
        price: number;
    }[] = [];
    if (product.pricesNetto) {
        for (const [option, price] of Object.entries(product.pricesNetto)) {
            priceEntries.push({
                option,
                available_options: product.available_options,
                price: Number(price),
            });
        }
    }

    return (
        <div className="anim-opacity p-6">
            {product.margin && (
                <h3 className="mt-2 text-gray-700 text-end">
                    Faktor ({product.margin})
                </h3>
            )}
            <h1 className="text-4xl font-bold mb-4 text-center py-6 text-gray-900">
                {params.productName}
            </h1>

            <div className="flex flex-col md:flex-row md:items-start md:space-x-6 mt-4">
                <Image
                    src={product.image}
                    alt={params.productName}
                    width={400}
                    height={300}
                    className="mx-auto rounded-lg shadow-xl"
                />
                <div className="w-full">
                    <table className="w-full mt-5 md:mt-0">
                        <thead>
                            <tr className="bg-blue-100 text-left">
                                <th className="p-2 border-b border-gray-300">Tkaniny</th>
                                <th className="p-2 border-b border-gray-300">Opis</th>
                                <th className="p-2 border-b border-gray-300">Cena brutto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priceEntries.map((p) => (
                                <tr
                                    key={`${p.option}-${p.available_options}`}
                                    className="odd:bg-white even:bg-gray-100 hover:bg-blue-50"
                                >
                                    <td className="p-2 border-b border-gray-300">{p.option}</td>
                                    <td className="p-2 border-b border-gray-300">
                                        {p.available_options}
                                    </td>
                                    <td className="p-2 border-b border-gray-300">
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
                    {product.extra_options &&
                        product.extra_options.length > 0 && (
                            <div className="mt-5 text-emerald-800 text-xl p-4 border border-emerald-300 rounded-lg bg-emerald-50">
                                <h4 className="font-semibold mb-2">
                                    Dodatkowe opcje (odpłatne)
                                </h4>
                                <ul className="list-disc pl-6">
                                    {product.extra_options.map(
                                        (opt: string) => (
                                            <li key={opt}>{opt}</li>
                                        )
                                    )}
                                </ul>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}
