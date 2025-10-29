import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import ProducentPageClient from "@/components/ProducentPageClient";


interface Props {
    params: Promise<{
        manufacturer: string;
    }>;
}

export default async function ProducentPage({ params }: Props) {
    const { manufacturer } = await params;

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

    const cennikData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    return (
        <ProducentPageClient
            cennikData={cennikData}
            manufacturer={manufacturer}
        />
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
