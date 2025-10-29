import fs from "fs";
import path from "path";
import ProductsTable from "@/components/ProductsTable";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
    params: {
        manufacturer: string;
    };
}

export default function ProducentPage({ params }: Props) {
    const { manufacturer } = params;

    // Kapitalizacja pierwszej litery dla nazwy pliku
    const manufacturerName =
        manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1);

    const filePath = path.join(
        process.cwd(),
        "data",
        `${manufacturerName}.json`
    );

    // Sprawdź czy plik istnieje
    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const title = data.title || `Cennik ${manufacturerName}`;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header z tytułem i datą */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {manufacturerName}
                            </h1>
                            <p className="text-lg text-gray-600 mt-1">
                                {title}
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            ← Powrót
                        </Link>
                    </div>
                </div>
            </div>

            {/* Tabela produktów */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <ProductsTable products={data} />
            </div>
        </div>
    );
}

// Generowanie statycznych ścieżek dla wszystkich producentów
export async function generateStaticParams() {
    const dataDir = path.join(process.cwd(), "data");
    const files = fs.readdirSync(dataDir);

    return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => ({
            manufacturer: file.replace(".json", "").toLowerCase(),
        }));
}
