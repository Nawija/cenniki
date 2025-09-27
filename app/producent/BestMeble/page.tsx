import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";
import Image from "next/image";

type Params = { params: { producerName: string } };

export default function ProducerPage({ params }: Params) {
    const filePath = path.join(process.cwd(), "data", `BestMeble.json`);
    if (!fs.existsSync(filePath)) return notFound();

    const meble = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (!Array.isArray(meble)) return notFound();

    return (
        <div className="flex flex-col items-center justify-center anim-opacity space-y-6 pb-12">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">
                BestMeble
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {meble.map((item: any, idx: number) => (
                    <Link
                        key={idx}
                        href={`/producent/BestMeble/${encodeURIComponent(
                            item.nazwa
                        )}`}
                        className="px-4 py-2 text-sm text-center font-bold bg-white border border-zinc-200 hover:border-yellow-400 transition-colors rounded-xl group"
                    >
                    
                        <Image
                            width={150}
                            height={150}
                            alt=".."
                            src={item.img}
                            className="h-40 w-40 mx-auto flex items-center justify-center bg-zinc-100 text-zinc-400 rounded-lg"
                        />
                        <p className="mt-2">{item.nazwa}</p>
                        <p className="text-sm text-gray-600">
                            Cena: {item.brutto} zł
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
