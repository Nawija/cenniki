"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, LogOut } from "lucide-react";
import { useSidebar } from "@/lib/SidebarContext";
import { useAuth } from "@/lib/AuthContext";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetClose,
} from "@/components/ui/sheet";
import type { SidebarProducer } from "./SidebarServer";

// ============================================
// KOMPONENT GŁÓWNY
// ============================================

interface Props {
    producers: SidebarProducer[];
    producersWithPendingChanges?: string[];
}

export default function SidebarClient({
    producers,
    producersWithPendingChanges = [],
}: Props) {
    const { isOpen, toggle, width } = useSidebar();
    const pathname = usePathname();

    // Konwertuj tablicę na Set dla szybkiego sprawdzania
    const pendingChangesSet = new Set(producersWithPendingChanges);

    // Sorted producers
    const sortedProducers = [...producers].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "pl")
    );

    return (
        <>
            {/* ========== MOBILE: Sheet z shadcn ========== */}
            <div className="lg:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <button
                            className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 bg-white border border-gray-200 rounded-lg p-2 sm:p-2.5 shadow-md hover:bg-gray-50 transition-colors active:bg-gray-100"
                            aria-label="Otwórz menu"
                        >
                            <Menu size={20} className="text-gray-700" />
                        </button>
                    </SheetTrigger>
                    <SheetContent
                        side="left"
                        className="w-[245px] p-0 flex flex-col gap-0"
                    >
                        {/* Header z logo */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <SheetClose asChild>
                                <Link href="/">
                                    <Image
                                        src="/images/logo.svg"
                                        height={120}
                                        width={120}
                                        alt="logo"
                                        className="h-10 w-auto"
                                    />
                                </Link>
                            </SheetClose>
                            {/* Ukryty tytuł dla accessibility */}
                            <SheetTitle className="sr-only">
                                Menu nawigacji
                            </SheetTitle>
                        </div>

                        {/* Nagłówek "Producenci" */}
                        <h2 className="px-4 py-2 text-center text-gray-400 text-xs uppercase tracking-wider ">
                            Producenci
                        </h2>

                        {/* Lista producentów */}
                        <nav className="flex-1 overflow-y-auto px-2 pb-4">
                            <ul className="space-y-1">
                                {sortedProducers.map((producer) => (
                                    <li key={producer.slug}>
                                        <SheetClose asChild>
                                            <Link
                                                href={`/p/${producer.slug}`}
                                                className={`
                                                    flex items-center gap-3 px-2 py-2.5 rounded-lg
                                                    transition-all duration-200
                                                    ${
                                                        pathname ===
                                                        `/p/${producer.slug}`
                                                            ? "bg-gray-100 text-gray-900 font-medium"
                                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                    }
                                                `}
                                            >
                                                {/* Avatar z pierwszą literą + żółta kropka */}
                                                <div className="relative flex-shrink-0">
                                                    <div
                                                        className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                                        style={{
                                                            backgroundColor:
                                                                producer.color,
                                                        }}
                                                    >
                                                        {producer.displayName
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    {pendingChangesSet.has(
                                                        producer.slug
                                                    ) && (
                                                        <div className="absolute top-0 right-2">
                                                            <span
                                                                className="absolute w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"
                                                                title="Zaplanowane zmiany cen"
                                                            />
                                                            <span
                                                                className="absolute w-3 h-3 bg-yellow-400 animate-ping rounded-full border-2 border-white"
                                                                title="Zaplanowane zmiany cen"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="whitespace-nowrap overflow-hidden">
                                                    {producer.displayName}
                                                </span>
                                            </Link>
                                        </SheetClose>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        {/* Stopka - wylogowanie */}
                        <MobileFooter />
                    </SheetContent>
                </Sheet>
            </div>

            {/* ========== DESKTOP: Standardowy sidebar ========== */}
            <aside
                style={{ width }}
                className={`
                    hidden lg:flex
                    fixed top-0 left-0 h-[100dvh] z-40
                    bg-white border-r border-gray-200
                    flex-col
                    transition-all duration-300 ease-in-out
                `}
            >
                {/* Logo + Toggle */}
                <SidebarHeader isOpen={isOpen} onToggle={toggle} />

                {/* Nagłówek "Producenci" */}
                <h2
                    className={`px-4 text-gray-400 font-semibold text-xs uppercase tracking-wider mb-2 ${
                        isOpen ? "opacity-100" : "opacity-0 overflow-hidden"
                    }`}
                >
                    Producenci
                </h2>

                {/* Lista producentów */}
                <nav className="flex-1 overflow-y-auto px-2 pb-4">
                    <ul className="space-y-1">
                        {sortedProducers.map((producer) => (
                            <ProducerLink
                                key={producer.slug}
                                producer={producer}
                                isOpen={isOpen}
                                isActive={pathname === `/p/${producer.slug}`}
                                hasPendingChanges={pendingChangesSet.has(
                                    producer.slug
                                )}
                            />
                        ))}
                    </ul>
                </nav>

                {/* Stopka */}
                <SidebarFooter isOpen={isOpen} />
            </aside>

            {/* ========== SPACER dla main content (tylko desktop) ========== */}
            <div
                className="hidden lg:block flex-shrink-0 transition-all duration-300"
                style={{ width }}
            />
        </>
    );
}

// ============================================
// SUBKOMPONENTY
// ============================================

function SidebarHeader({
    isOpen,
    onToggle,
}: {
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="flex items-center justify-between p-4 mb-4 z-50">
            {/* Logo */}
            <Link href="/" className="transition-opacity duration-200">
                {isOpen ? (
                    <Image
                        src="/images/logo.svg"
                        height={120}
                        width={120}
                        alt="logo"
                        className="h-10 w-auto"
                    />
                ) : (
                    <Image
                        src="/images/l.png"
                        height={50}
                        width={50}
                        alt="logo"
                        className="h-10 w-auto"
                    />
                )}
            </Link>

            {/* Toggle button */}
            <button
                onClick={onToggle}
                className={`flex z-50 items-center cursor-pointer justify-center rounded-lg hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-700 ${
                    isOpen ? "mr-0" : "-mr-12"
                }`}
                aria-label={isOpen ? "Zwiń sidebar" : "Rozwiń sidebar"}
            >
                <PanelLeftClose
                    size={22}
                    className={isOpen ? "rotate-0" : "rotate-180"}
                />
            </button>
        </div>
    );
}

function ProducerLink({
    producer,
    isOpen,
    isActive,
    hasPendingChanges,
}: {
    producer: SidebarProducer;
    isOpen: boolean;
    isActive: boolean;
    hasPendingChanges: boolean;
}) {
    const initial = producer.displayName.charAt(0).toUpperCase();

    return (
        <li>
            <Link
                href={`/p/${producer.slug}`}
                title={!isOpen ? producer.displayName : undefined}
                className={`
                    flex items-center gap-3 px-2 py-2.5 rounded-lg
                    transition-all duration-200
                    ${
                        isActive
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                `}
            >
                {/* Avatar z pierwszą literą + żółta kropka */}
                <div className="relative flex-shrink-0">
                    <div
                        className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: producer.color }}
                    >
                        {initial}
                    </div>
                    {hasPendingChanges && (
                        <div className="absolute top-0 right-2">
                            <span
                                className="absolute w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"
                                title="Zaplanowane zmiany cen"
                            />
                            <span
                                className="absolute w-3 h-3 bg-yellow-400 animate-ping rounded-full border-2 border-white"
                                title="Zaplanowane zmiany cen"
                            />
                        </div>
                    )}
                </div>

                {/* Nazwa - tylko gdy otwarty */}
                <span
                    className={`
                        whitespace-nowrap overflow-hidden flex items-center gap-2
                        transition-all duration-200
                        ${isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"}
                    `}
                >
                    {producer.displayName}
                </span>
            </Link>
        </li>
    );
}

function SidebarFooter({ isOpen }: { isOpen: boolean }) {
    const { logout } = useAuth();

    return (
        <div
            className={`
                text-xs text-gray-400 border-t border-gray-100
                transition-all duration-200
                ${isOpen ? "text-center" : "text-center"}
            `}
        >
            <button
                onClick={logout}
                className={`
                    w-full flex items-center justify-center gap-2 
                    px-3 py-3
                    text-gray-500 hover:text-red-600 hover:bg-red-100/80
                    transition-colors cursor-pointer
                `}
                title="Wyloguj się"
            >
                <LogOut size={18} />
                {isOpen && <span className="text-sm">Wyloguj</span>}
            </button>
        </div>
    );
}

function MobileFooter() {
    const { logout } = useAuth();

    return (
        <div className="border-t border-gray-100">
            <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 text-gray-500 hover:text-red-600 hover:bg-red-100/80 transition-colors cursor-pointer"
                title="Wyloguj się"
            >
                <LogOut size={18} />
                <span className="text-sm">Wyloguj</span>
            </button>
        </div>
    );
}
