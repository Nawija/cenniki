// lib/producers.ts
// Konfiguracja wszystkich producentów - teraz czyta z JSON!

import { ProducerConfig } from "./types";
import fs from "fs";
import path from "path";

const PRODUCERS_FILE = path.join(process.cwd(), "data", "producers.json");

// Funkcja do wczytania producentów z pliku JSON
function loadProducersFromFile(): ProducerConfig[] {
    try {
        if (fs.existsSync(PRODUCERS_FILE)) {
            const data = fs.readFileSync(PRODUCERS_FILE, "utf-8");
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Error loading producers.json:", error);
    }

    // Fallback do domyślnych danych
    return [
        {
            slug: "bomar",
            displayName: "Bomar",
            dataFile: "Bomar.json",
            layoutType: "bomar",
            title: "Cennik Bomar",
            color: "#7a4b18",
        },
        {
            slug: "mp-nidzica",
            displayName: "MP Nidzica",
            dataFile: "mp.json",
            layoutType: "mpnidzica",
            title: "CENNIK 06.12.25",
            color: "#7a1822",
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
}

// Eksportuj producentów (wczytywane dynamicznie)
export const producers: ProducerConfig[] = loadProducersFromFile();

/**
 * Pobierz konfigurację producenta po slug
 */
export function getProducerBySlug(slug: string): ProducerConfig | undefined {
    const currentProducers = loadProducersFromFile();
    return currentProducers.find((p) => p.slug === slug);
}

/**
 * Pobierz wszystkie slugi producentów (dla generateStaticParams)
 */
export function getAllProducerSlugs(): string[] {
    const currentProducers = loadProducersFromFile();
    return currentProducers.map((p) => p.slug);
}

/**
 * Pobierz wszystkich producentów (świeże dane)
 */
export function getAllProducers(): ProducerConfig[] {
    return loadProducersFromFile();
}
