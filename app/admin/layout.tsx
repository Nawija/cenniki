// app/admin/layout.tsx
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Panel Admin - Cenniki",
    description: "Panel administracyjny do zarządzania cennikami",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Admin Header */}
            <header className="bg-white text-gray-900 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">Panel Admin</h1>
                        <nav className="hidden md:flex gap-4 ml-8">
                            <Link
                                href="/admin"
                                className="text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                Producenci
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </div>
    );
}
