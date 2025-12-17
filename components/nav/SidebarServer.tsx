import { producers } from "@/lib/producers";
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

    return <SidebarClient producers={sidebarProducers} />;
}
