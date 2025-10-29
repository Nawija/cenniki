import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import Image from "next/image";

type Params = { params: { producerName: string } };

export default function ProducerPage({ params }: Params) {
    const filePath = path.join(process.cwd(), "data", `Bomar.json`);
    if (!fs.existsSync(filePath)) return notFound();

    const producerData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const krzesła = producerData.categories?.krzesła || {};
    const krzesłaEntries = Object.entries(krzesła);

    const stoły = producerData.categories?.stoły || {};
    const stołyEntries = Object.entries(stoły);

    return (
        <div className="flex flex-col items-center justify-center anim-opacity space-y-6 pb-12 px-4">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">
                {producerData.title || "CENNIK STYCZEŃ 2025"}
            </h1>

            {/* NAWIGACJA */}
            <div className="flex gap-4 mb-8">
                <a
                    href="#krzesła"
                    className="px-6 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
                >
                    Krzeseła
                </a>
                <a
                    href="#stoly"
                    className="px-6 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
                >
                    Stoły
                </a>
            </div>

            {/* KRZESŁA */}
            <div id="krzesła" className="w-full max-w-7xl scroll-mt-8">
                <p className="text-start w-full text-2xl font-semibold mb-6">
                    Krzesła:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {krzesłaEntries.map(
                        ([name, data]: [string, any], idx: number) => (
                            <div
                                key={name + idx}
                                className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
                            >
                                {data.previousName && (
                                    <p className="text-sm text-gray-500 mb-3 absolute bottom-0 right-3">
                                        ({data.previousName})
                                    </p>
                                )}
                                {data.notes && (
                                    <span className="absolute right-4 top-4 text-xs py-1 px-3 rounded-full bg-red-600 text-white font-semibold">
                                        {data.notes}
                                    </span>
                                )}

                                <div className="flex justify-center mb-4">
                                    <Image
                                        src={data.image}
                                        alt={name}
                                        height={200}
                                        width={200}
                                        className="h-48 w-48 object-contain"
                                    />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {name}
                                </h3>

                                <p className="text-sm font-semibold text-gray-700 mb-3">
                                    {data.material}
                                </p>

                                <div className="border-t border-gray-200 pt-4 mb-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                        Ceny brutto:
                                    </p>
                                    <div>
                                        {Object.entries(data.prices).map(
                                            ([group, price]: [string, any]) => (
                                                <div
                                                    key={group}
                                                    className="flex justify-between text-sm border-b border-dotted odd:bg-gray-50 hover:bg-green-100 border-gray-100"
                                                >
                                                    <span className="text-gray-600">
                                                        {group}:
                                                    </span>
                                                    <span className="font-semibold text-gray-900">
                                                        {price} zł
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                {data.options && data.options.length > 0 && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <p className="text-sm font-semibold text-gray-700 mb-2">
                                            Dostępne opcje:
                                        </p>
                                        <ul className="space-y-1">
                                            {data.options.map(
                                                (option: string, i: number) => (
                                                    <li
                                                        key={i}
                                                        className="text-xs text-gray-600 leading-relaxed"
                                                    >
                                                        • {option}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* STOŁY */}
            <div id="stoly" className="w-full max-w-7xl mt-12">
                <p className="text-start w-full text-2xl font-semibold mb-6">
                    Stoły:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stołyEntries.map(
                        ([name, data]: [string, any], idx: number) => (
                            <div
                                key={name + idx}
                                className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
                            >
                                {data.previousName && (
                                    <p className="text-sm text-gray-500 mb-3 absolute bottom-0 right-3">
                                        ({data.previousName})
                                    </p>
                                )}
                                <div className="flex justify-center mb-4">
                                    <Image
                                        src={data.image}
                                        alt={name}
                                        height={200}
                                        width={200}
                                        className="h-48 w-48 object-contain"
                                    />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {name}
                                </h3>

                                <p className="text-sm font-semibold text-gray-700 mb-3">
                                    {data.material}
                                </p>

                                <div className="border-t border-gray-200 pt-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">
                                        Dostępne wymiary i ceny brutto:
                                    </p>
                                    <div>
                                        {data.sizes &&
                                            data.sizes.map(
                                                (size: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className="text-sm border-b border-dotted odd:bg-gray-50 hover:bg-green-100 flex justify-between border-gray-100 py-1 last:border-0"
                                                    >
                                                        <div className="font-semibold text-gray-900">
                                                            {size.dimension}
                                                        </div>
                                                        <div className="text-gray-600">
                                                            {size.prices} zł
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                    </div>
                                </div>

                                {data.description &&
                                    data.description.length > 0 && (
                                        <div className="border-t border-gray-200 pt-4">
                                            <p className="text-sm font-semibold text-gray-700 mb-2">
                                                Opis:
                                            </p>
                                            <ul className="space-y-1">
                                                {data.description.map(
                                                    (
                                                        desc: string,
                                                        i: number
                                                    ) => (
                                                        <li
                                                            key={i}
                                                            className="text-xs text-gray-600 leading-relaxed"
                                                        >
                                                            • {desc}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
