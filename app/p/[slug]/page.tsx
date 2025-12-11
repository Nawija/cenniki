import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { getProducerBySlug, getAllProducerSlugs } from "@/lib/producers";
import {
    BomarLayout,
    MpNidzicaLayout,
    PuszmanLayout,
    TopLineLayout,
} from "@/components/layouts";
import PromotionBanner from "@/components/PromotionBanner";
import type {
    BomarData,
    MpNidzicaData,
    PuszmanData,
    TopLineData,
} from "@/lib/types";

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

    // Sprawdź czy promocja jest aktywna (enabled i w zakresie dat)
    const isPromotionActive = () => {
        if (!config.promotion?.enabled) return false;
        const today = new Date().toISOString().split("T")[0];
        if (config.promotion.from && today < config.promotion.from)
            return false;
        if (config.promotion.to && today > config.promotion.to) return false;
        return true;
    };

    // Komponent promocji (jeśli jest aktywna)
    const promotionBanner = isPromotionActive() ? (
        <PromotionBanner
            text={config.promotion!.text}
            from={config.promotion!.from}
            to={config.promotion!.to}
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
                        priceFactor={config.priceFactor}
                    />
                </>
            );

        case "mpnidzica":
            return (
                <>
                    {promotionBanner}
                    <MpNidzicaLayout
                        data={rawData as MpNidzicaData}
                        title={config.title}
                        priceFactor={config.priceFactor}
                    />
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
                        priceFactor={config.priceFactor}
                    />
                </>
            );

        case "topline":
            return (
                <>
                    {promotionBanner}
                    <TopLineLayout
                        data={rawData as TopLineData}
                        title={config.title}
                        priceFactor={config.priceFactor}
                    />
                </>
            );

        default:
            notFound();
    }
}
