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
    },
    {
        slug: "mp-nidzica",
        displayName: "MP Nidzica",
        dataFile: "MP-Nidzica.json",
        layoutType: "mpnidzica",
    },
    {
        slug: "puszman",
        displayName: "Puszman",
        dataFile: "puszman.json",
        layoutType: "puszman",
        title: "CENNIK 22.11.25",
        priceGroups: [
            "grupa I",
            "grupa II",
            "grupa III",
            "grupa IV",
            "grupa V",
            "grupa VI",
        ],
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
