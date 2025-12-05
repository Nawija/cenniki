import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { getProducerBySlug, getAllProducerSlugs } from "@/lib/producers";
import {
    BomarLayout,
    MpNidzicaLayout,
    PuszmanLayout,
} from "@/components/layouts";
import PromotionBanner from "@/components/PromotionBanner";
import type { BomarData, MpNidzicaData, PuszmanData } from "@/lib/types";

interface PageProps {
    params: Promise<{ slug: string }>;
}

// Generuj statyczne ścieżki dla wszystkich producentów
export async function generateStaticParams() {
    return getAllProducerSlugs().map((slug) => ({ slug }));
}

export default async function ProducerPage({ params }: PageProps) {
    const { slug } = await params;

    // Znajdź konfigurację producenta
    const config = getProducerBySlug(slug);

    if (!config) {
        notFound();
    }

    // Wczytaj dane z pliku JSON
    const filePath = path.join(process.cwd(), "data", config.dataFile);

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Komponent promocji (jeśli jest)
    const promotionBanner = config.promotion ? (
        <PromotionBanner
            text={config.promotion.text}
            from={config.promotion.from}
            to={config.promotion.to}
        />
    ) : null;

    // Renderuj odpowiedni layout w zależności od typu
    switch (config.layoutType) {
        case "bomar":
            return (
                <>
                    {promotionBanner}
                    <BomarLayout
                        data={rawData as BomarData}
                        title={config.title}
                    />
                </>
            );

        case "mpnidzica":
            return (
                <>
                    {promotionBanner}
                    <MpNidzicaLayout data={rawData as MpNidzicaData} />
                </>
            );

        case "puszman":
            return (
                <>
                    {promotionBanner}
                    <PuszmanLayout
                        data={rawData as PuszmanData}
                        title={config.title}
                        priceGroups={config.priceGroups}
                    />
                </>
            );

        default:
            notFound();
    }
}
