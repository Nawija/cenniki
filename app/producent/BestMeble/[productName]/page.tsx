import React from "react";
import bestMebleData from "../../../../data/BestMeble.json";
import { notFound } from "next/navigation";
import BackBtn from "@/components/buttons/BackBtn";
import Image from "next/image";

export default function BestMebleProductPage({
    params,
}: {
    params: { productName: string };
}) {
    // Szukanie produktu w tablicy po nazwie
    const product = bestMebleData.find(
        (p: any) => p.nazwa === params.productName
    );

    if (!product) return notFound();

    return (
        <div className="anim-opacity p-6 max-w-7xl mx-auto">
            {product.margin && (
                <h3 className="mt-2 text-gray-700 text-end">
                    Faktor ({product.margin})
                </h3>
            )}
            <BackBtn />
            <h1 className="text-4xl font-bold mb-4 text-center py-6 text-gray-900">
                {product.nazwa}
            </h1>

            <div className="flex flex-col md:flex-row md:items-start md:space-x-6 mt-4">
                {/* Placeholder zamiast obrazka */}
                <Image
                    width={150}
                    height={150}
                    alt=".."
                    src={product.img}
                    className="h-60 w-60 mx-auto flex items-center justify-center bg-zinc-100 text-zinc-400 rounded-lg"
                />

                <div className="w-full mt-6 md:mt-0">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-blue-100 text-left">
                                <th className="p-2 border-b border-gray-300">
                                    Rodzaj
                                </th>
                                <th className="p-2 border-b border-gray-300">
                                    Cena brutto
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="odd:bg-white even:bg-gray-100 hover:bg-blue-50">
                                <td className="p-2 border-b border-gray-300">
                                    {product.rodzaj}
                                </td>
                                <td className="p-2 border-b border-gray-300">
                                    <strong>
                                        {product.brutto.toFixed(2)} zł
                                    </strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <Image
                width={350}
                height={350}
                alt=".."
                src={product.scheme}
                className="mx-auto flex items-center border justify-center rounded-lg"
            />
        </div>
    );
}
