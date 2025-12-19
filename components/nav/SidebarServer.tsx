import { producers } from "@/lib/producers";
import { getProducersWithPendingChangesArray } from "@/lib/scheduledChanges";
import SidebarClient from "./SidebarClient";

export interface SidebarProducer {
    slug: string;
    displayName: string;
    color: string;
}

const DEFAULT_COLORS = ["#a8a8a8", "#88716e"];

export default function SidebarServer() {
    const sidebarProducers: SidebarProducer[] = producers.map((p, index) => ({
        slug: p.slug,
        displayName: p.displayName,
        color: p.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));

    // Pobierz listę producentów z pending changes (server-side)
    const producersWithChanges = getProducersWithPendingChangesArray();

    return (
        <SidebarClient
            producers={sidebarProducers}
            producersWithPendingChanges={producersWithChanges}
        />
    );
}
