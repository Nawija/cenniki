import { producers } from "@/lib/producers";
import SidebarClient from "./SidebarClient";

export interface SidebarProducer {
    slug: string;
    displayName: string;
    color: string;
}

// Domyślne kolory Google-style
const DEFAULT_COLORS = [
    "#4285F4", // niebieski
    "#EA4335", // czerwony
    "#FBBC04", // żółty
    "#34A853", // zielony
    "#FF6D01", // pomarańczowy
    "#46BDC6", // turkusowy
    "#7B1FA2", // fioletowy
];

export default function SidebarServer() {
    const sidebarProducers: SidebarProducer[] = producers.map((p, index) => ({
        slug: p.slug,
        displayName: p.displayName,
        color: p.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));

    return <SidebarClient producers={sidebarProducers} />;
}
