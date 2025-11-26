"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function SidebarClient({
    producers,
}: {
    producers: { producerId: string; displayName: string }[];
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Przycisk mobilny */}
            <button
                className="md:hidden fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg p-2 shadow-sm hover:bg-gray-50 transition"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Otwórz menu"
            >
                {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Nawigacja boczna */}
            <aside
                className={`fixed top-0 left-0 h-screen w-[260px] bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-sm p-6 flex flex-col transform transition-transform duration-300 z-40
                ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                } md:translate-x-0`}
            >
                {/* Logo */}
                <Link
                    href="/"
                    className="mb-10 mx-auto"
                    onClick={() => setIsOpen(false)}
                >
                    <Image
                        src="/images/logo.svg"
                        height={150}
                        width={150}
                        alt="logo"
                        className="mx-auto"
                    />
                </Link>

                {/* Nagłówek */}
                <h2 className="text-gray-500 font-semibold text-sm uppercase tracking-widest mb-4">
                    Producenci
                </h2>

                {/* Lista producentów */}
                <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-2">
                    <ul className="space-y-1">
                        {producers.map((p) => (
                            <li key={p.producerId}>
                                <Link
                                    href={`/p/${p.producerId.toLowerCase()}`}
                                    onClick={() => setIsOpen(false)}
                                    className="block px-3 py-2 rounded-lg text-gray-600 font-medium text-base hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                                >
                                    {p.displayName}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Stopka */}
                <div className="mt-6 text-xs text-gray-400 text-center">
                    © {new Date().getFullYear()} Konrad Wielgórski
                </div>
            </aside>

            {/* Overlay na mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
