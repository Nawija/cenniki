import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";
import Image from "next/image";

type Params = { params: { producerName: string } };

export default function ProducerPage({ params }: Params) {
    const filePath = path.join(process.cwd(), "data", `BestMeble.json`);
    if (!fs.existsSync(filePath)) return notFound();

    const producerData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Pobieramy produkty z kategorii "krzesła"
    const meble = producerData.categories?.meble || {};
    const mebleEntries = Object.entries(meble);


    return (
        <div className="flex flex-col items-center justify-center anim-opacity space-y-6 pb-12">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">
                BestMeble
            </h1>

            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mebleEntries.map(
                        ([name, data]: [string, any], idx: number) => (
                            <Link
                                key={name + idx}
                                href={`/producent/BestMeble/${encodeURIComponent(
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
