import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import Image from "next/image";

type Params = { params: { producerName: string } };

export default function ProducerPage({ params }: Params) {
    const filePath = path.join(process.cwd(), "data", `Befame.json`);
    if (!fs.existsSync(filePath)) return notFound();

    const producerData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const categories = producerData.categories || {};

    return (
        <div className="flex flex-col items-center anim-opacity space-y-10 pb-20 px-6">
            <h1 className="text-gray-900 py-12 text-4xl font-extrabold text-center">
                {producerData.title}
            </h1>

            {Object.entries(categories).map(([categoryName, collections]: [string, any]) => (
                <div key={categoryName} className="w-full max-w-7xl">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8">
                        {categoryName.replace("_", " ").toUpperCase()}
                    </h2>

                    {Object.entries(collections).map(([collectionName, collectionData]: [string, any]) => (
                        <div key={collectionName} className="mb-16">
                            {/* Nagłówek kolekcji */}
                            <div className="flex items-center space-x-6 mb-6">
                                <Image
                                    src={collectionData.image}
                                    alt={collectionName}
                                    width={120}
                                    height={120}
                                    className="object-contain rounded-lg border"
                                />
                                <h3 className="text-2xl font-semibold text-gray-900">
                                    {collectionName}
                                </h3>
                            </div>

                            {/* Produkty */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {collectionData.products.map((product: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
                                    >
                                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                                            {product.name}
                                        </h4>

                                        {product.dimensions && (
                                            <p className="text-sm text-gray-600 mb-1">
                                                <span className="font-semibold">Wymiary:</span>{" "}
                                                {product.dimensions}
                                            </p>
                                        )}

                                        {product.sleepFunction && (
                                            <p className="text-sm text-gray-600 mb-1">
                                                <span className="font-semibold">Pow. spania:</span>{" "}
                                                {product.sleepFunction}
                                            </p>
                                        )}

                                        {product.volume && (
                                            <p className="text-sm text-gray-600 mb-1">
                                                <span className="font-semibold">Objętość:</span>{" "}
                                                {product.volume}
                                            </p>
                                        )}

                                        {product.legs && (
                                            <p className="text-sm text-gray-600 mb-3">
                                                <span className="font-semibold">Nogi:</span>{" "}
                                                {product.legs}
                                            </p>
                                        )}

                                        {product.description && (
                                            <p className="text-xs italic text-gray-500 mb-3">
                                                {product.description}
                                            </p>
                                        )}

                                        {/* Ceny */}
                                        <div className="border-t border-gray-200 pt-3">
                                            <p className="text-sm font-semibold text-gray-700 mb-2">
                                                Ceny brutto:
                                            </p>
                                            <div>
                                                {Object.entries(product.prices).map(
                                                    ([group, price]: [string, any]) => (
                                                        <div
                                                            key={group}
                                                            className="flex justify-between text-sm border-b border-dotted odd:bg-gray-50 hover:bg-green-100 border-gray-100"
                                                        >
                                                            <span className="text-gray-600">
                                                                {group}
                                                            </span>
                                                            <span className="font-semibold text-gray-900">
                                                                {price} zł
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}

            {/* Informacje dodatkowe */}
            {producerData.additionalInfo && (
                <div className="w-full max-w-5xl mt-12 p-6 bg-gray-50 border rounded-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                        Informacje dodatkowe
                    </h3>
                    <ul className="list-disc list-inside text-gray-600 space-y-2">
                        {producerData.additionalInfo.map((info: string, idx: number) => (
                            <li key={idx} className="text-sm">
                                {info}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
