"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { useSidebar } from "@/lib/SidebarContext";
import type { SidebarProducer } from "./SidebarServer";

// ============================================
// KOMPONENT GŁÓWNY
// ============================================

interface Props {
    producers: SidebarProducer[];
}

export default function SidebarClient({ producers }: Props) {
    const { isOpen, toggle, width } = useSidebar();
    const [mobileOpen, setMobileOpen] = useState(false); // Mobile: menu
    const pathname = usePathname();

    const closeMobile = () => setMobileOpen(false);

    return (
        <>
            {/* ========== MOBILE: Przycisk hamburger ========== */}
            <MobileMenuButton
                isOpen={mobileOpen}
                onClick={() => setMobileOpen(!mobileOpen)}
            />

            {/* ========== SIDEBAR ========== */}
            <aside
                style={{ width }}
                className={`
                    fixed top-0 left-0 h-[100dvh] z-50
                    bg-white border-r border-gray-200
                    flex flex-col
                    transition-all duration-300 ease-in-out
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
                    lg:translate-x-0
                `}
            >
                {/* Logo + Toggle */}
                <SidebarHeader
                    isOpen={isOpen}
                    onToggle={toggle}
                    onLogoClick={closeMobile}
                />

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
                        {[...producers]
                            .sort((a, b) =>
                                a.displayName.localeCompare(b.displayName, "pl")
                            )
                            .map((producer) => (
                                <ProducerLink
                                    key={producer.slug}
                                    producer={producer}
                                    isOpen={isOpen}
                                    isActive={
                                        pathname === `/p/${producer.slug}`
                                    }
                                    onClick={closeMobile}
                                />
                            ))}
                    </ul>
                </nav>

                {/* Stopka */}
                <SidebarFooter isOpen={isOpen} />
            </aside>

            {/* ========== MOBILE: Overlay ========== */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity"
                    onClick={closeMobile}
                />
            )}

            {/* ========== SPACER dla main content ========== */}
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

function MobileMenuButton({
    isOpen,
    onClick,
}: {
    isOpen: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className="lg:hidden fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg p-2.5 shadow-md hover:bg-gray-50 transition-colors"
            onClick={onClick}
            aria-label={isOpen ? "Zamknij menu" : "Otwórz menu"}
        >
            <Menu size={20} className="text-gray-700" />
        </button>
    );
}

function SidebarHeader({
    isOpen,
    onToggle,
    onLogoClick,
}: {
    isOpen: boolean;
    onToggle: () => void;
    onLogoClick: () => void;
}) {
    return (
        <div className="flex items-center justify-between p-4 mb-4 z-50">
            {/* Logo */}
            <Link
                href="/"
                onClick={onLogoClick}
                className={`transition-opacity duration-200 `}
            >
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

            {/* Toggle button - tylko na desktop */}
            <button
                onClick={onToggle}
                className={`hidden lg:flex z-50 items-center cursor-pointer justify-center rounded-lg hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-700 ${
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
    onClick,
}: {
    producer: SidebarProducer;
    isOpen: boolean;
    isActive: boolean;
    onClick: () => void;
}) {
    // Pierwsza litera nazwy
    const initial = producer.displayName.charAt(0).toUpperCase();

    return (
        <li>
            <Link
                href={`/p/${producer.slug}`}
                onClick={onClick}
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
                {/* Avatar z pierwszą literą */}
                <div
                    className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
                    style={{ backgroundColor: producer.color }}
                >
                    {initial}
                </div>

                {/* Nazwa - tylko gdy otwarty */}
                <span
                    className={`
                        whitespace-nowrap overflow-hidden
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
    return (
        <div
            className={`
                p-4 text-xs text-gray-400 border-t border-gray-100
                transition-all duration-200
                ${isOpen ? "text-center" : "text-center"}
            `}
        >
            {isOpen ? (
                <span>© {new Date().getFullYear()} Konrad Wielgórski</span>
            ) : (
                <span>KW</span>
            )}
        </div>
    );
}
