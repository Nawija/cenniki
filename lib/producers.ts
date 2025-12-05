// lib/producers.ts
// Konfiguracja wszystkich producentów - dodaj nowego producenta tutaj!

import { ProducerConfig } from "./types";

export const producers: ProducerConfig[] = [
    {
        slug: "bomar",
        displayName: "Bomar",
        dataFile: "Bomar.json",
        layoutType: "bomar",
        title: "Cennik Bomar",
        color: "#7a4b18",
        promotion: {
            text: "Promocja -15% na krzesła",
            from: "2025-12-01",
            to: "2025-12-31",
        },
    },
    {
        slug: "mp-nidzica",
        displayName: "MP Nidzica",
        dataFile: "mp.json",
        layoutType: "mpnidzica",
        title: "CENNIK 06.12.25",
        color: "#7a1822",
        promotion: {
            text: "Promocja -20% na wszystkie produkty",
            from: "2025-12-01",
            to: "2025-12-05",
        },
    },
    {
        slug: "puszman",
        displayName: "Puszman",
        dataFile: "puszman.json",
        layoutType: "puszman",
        title: "CENNIK 23.11.25",
        color: "#7a3318",
    },
];

/**
 * Pobierz konfigurację producenta po slug
 */
export function getProducerBySlug(slug: string): ProducerConfig | undefined {
    return producers.find((p) => p.slug === slug);
}

/**
 * Pobierz wszystkie slugi producentów (dla generateStaticParams)
 */
export function getAllProducerSlugs(): string[] {
    return producers.map((p) => p.slug);
}
