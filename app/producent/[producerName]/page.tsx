// app/producent/[producerName]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";

type Params = { params: { producerName: string } };

export default function ProducerPage({ params }: Params) {
    const filePath = path.join(
        process.cwd(),
        "data",
        "producers",
        `${params.producerName}.json`
    );
    if (!fs.existsSync(filePath)) return notFound();

    const producerData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const products = producerData.products;

    return (
        <div>
            <h1 style={{ color: "#111827" }}>
                {params.producerName} - Produkty
            </h1>
            <div className="flex items-start justify-start space-x-2">
                {products.map((prod: any) => (
                    <Link
                        key={prod.productId}
                        href={`/producent/${
                            params.producerName
                        }/${encodeURIComponent(prod.name)}`}
                        className="px-4 py-2 text-sm font-bold bg-white border border-zinc-200 rounded-xl"
                    >
                        {prod.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}
