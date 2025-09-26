import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";

type Params = { params: { producerName: string } };

export default function ProducerPage({ params }: Params) {
    const filePath = path.join(process.cwd(), "data", `Halex.json`);
    if (!fs.existsSync(filePath)) return notFound();

    const producerData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const products = producerData.products;

    return (
        <div className="flex flex-col items-center justify-center anim-opacity">
            <h1 className="text-gray-900 py-12 text-4xl font-bold">Bomar</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((prod: any) => (
                    <Link
                        key={prod.productId}
                        href={`/producent/bomarr/${encodeURIComponent(
                            prod.name
                        )}`}
                        className="px-4 py-2 text-sm text-center font-bold bg-white border border-zinc-200 rounded-xl"
                    >
                        {prod.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}
