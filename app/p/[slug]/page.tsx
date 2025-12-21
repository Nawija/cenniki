import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { getProducerBySlug, getAllProducerSlugs } from "@/lib/producers";
import { getProductChangesMap } from "@/lib/scheduledChanges";
import {
    BomarLayout,
    MpNidzicaLayout,
    PuszmanLayout,
} from "@/components/layouts";
import PromotionBanner from "@/components/PromotionBanner";
import ScheduledChangesBannerServer from "@/components/ScheduledChangesBannerServer";
import type { BomarData, MpNidzicaData, PuszmanData } from "@/lib/types";

interface PageProps {
    params: Promise<{ slug: string }>;
}

// Generuj statyczne ścieżki dla wszystkich producentów
export async function generateStaticParams() {
    return getAllProducerSlugs().map((slug) => ({ slug }));
}

// W pełni statyczna strona - odświeża się tylko przy nowym buildzie (push na GitHub/Vercel)
export const dynamic = "force-static";
export const dynamicParams = false;

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

    // Banner zaplanowanych zmian
    const scheduledBanner = (
        <ScheduledChangesBannerServer producerSlug={slug} />
    );

    // Fabryki/tkaniny przekazane do layoutów
    const fabrics = config.fabrics || [];

    // Pobierz mapę zaplanowanych zmian cen (przekazywana do layoutów zamiast client-side fetch)
    const scheduledChangesMap = getProductChangesMap(slug);

    // Renderuj odpowiedni layout w zależności od typu
    // Dostępne są 3 uniwersalne layouty:
    // - mpnidzica: lista produktów z elementami (karty)
    // - bomar: kategorie produktów (karty z grupami cenowymi/rozmiarami)
    // - puszman: tabela produktów z grupami cenowymi
    switch (config.layoutType) {
        case "bomar":
        case "halex":
            return (
                <>
                    {promotionBanner}
                    {scheduledBanner}
                    <BomarLayout
                        data={rawData as BomarData}
                        title={config.title}
                        priceFactor={config.priceFactor}
                        producerSlug={slug}
                        scheduledChangesMap={scheduledChangesMap}
                        fabrics={fabrics}
                    />
                </>
            );

        case "mpnidzica":
        case "verikon":
        case "bestmeble":
            return (
                <>
                    {promotionBanner}
                    {scheduledBanner}
                    <MpNidzicaLayout
                        data={rawData as MpNidzicaData}
                        title={config.title}
                        globalPriceFactor={config.priceFactor}
                        showVisualizer={config.showVisualizer}
                        producerSlug={slug}
                        scheduledChangesMap={scheduledChangesMap}
                        fabrics={fabrics}
                    />
                </>
            );

        case "furnirest":
            return (
                <>
                    {promotionBanner}
                    {scheduledBanner}
                    <BomarLayout
                        data={rawData as BomarData}
                        title={config.title}
                        priceFactor={config.priceFactor}
                        producerSlug={slug}
                        scheduledChangesMap={scheduledChangesMap}
                        fabrics={fabrics}
                    />
                </>
            );

        case "puszman":
            return (
                <>
                    {promotionBanner}
                    {scheduledBanner}
                    <PuszmanLayout
                        data={rawData as PuszmanData}
                        title={config.title}
                        priceGroups={config.priceGroups}
                        priceFactor={config.priceFactor}
                        producerSlug={slug}
                        scheduledChangesMap={scheduledChangesMap}
                        fabrics={fabrics}
                    />
                </>
            );

        default:
            notFound();
    }
}
