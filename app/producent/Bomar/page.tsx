import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";
import Image from "next/image";

type Params = { params: { producerName: string } };

export default function ProducerPage({ params }: Params) {
    const filePath = path.join(process.cwd(), "data", `Bomar.json`);
    if (!fs.existsSync(filePath)) return notFound();

    const producerData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Pobieramy produkty z kategorii "krzesła"
    const krzesła = producerData.categories?.krzesła || {};
    const krzesłaEntries = Object.entries(krzesła);
    // Pobieramy produkty z kategorii "stoły"
    const stoły = producerData.categories?.stoły || {};
    const stołyEntries = Object.entries(stoły);

    return (
        <div className="flex flex-col items-center justify-center anim-opacity space-y-6 pb-12">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">Bomar</h1>
            <div>
                <p className="text-start w-full text-2xl font-semibold mb-4">
                    Krzesła:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {krzesłaEntries.map(
                        ([name, data]: [string, any], idx: number) => (
                            <Link
                                key={name + idx}
                                href={`/producent/Bomar/${encodeURIComponent(
                                    name
                                )}`}
                                className="px-4 py-2 text-sm text-center font-bold bg-white border border-zinc-200 hover:border-yellow-400 transition-colors rounded-xl group"
                            >
                                <Image
                                    src={data.image}
                                    alt={name}
                                    height={150}
                                    width={150}
                                    className="h-40 w-40 object-contain group-hover:scale-95 transition-transform duration-500"
                                />
                                <p>{name}</p>
                            </Link>
                        )
                    )}
                </div>
            </div>
            <div>
                <p className="text-start w-full text-2xl font-semibold mb-4">
                    Stoły:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stołyEntries.map(
                        ([name, data]: [string, any], idx: number) => (
                            <Link
                                key={name + idx}
                                href={`/producent/Bomar/${encodeURIComponent(
                                    name
                                )}`}
                                className="px-4 py-2 text-sm text-center font-bold bg-white border border-zinc-200 hover:border-yellow-400 transition-colors rounded-xl group"
                            >
                                <Image
                                    src={data.image}
                                    alt={name}
                                    height={150}
                                    width={150}
                                    className="h-40 w-40 object-contain group-hover:scale-95 transition-transform duration-500"
                                />
                                <p>{name}</p>
                            </Link>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
