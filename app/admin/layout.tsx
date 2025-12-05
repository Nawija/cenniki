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
            <header className="bg-gray-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">🛠️ Panel Admin</h1>
                        <nav className="hidden md:flex gap-4 ml-8">
                            <Link
                                href="/admin"
                                className="text-gray-300 hover:text-white transition-colors"
                            >
                                Producenci
                            </Link>
                            <Link
                                href="/"
                                className="text-gray-300 hover:text-white transition-colors"
                            >
                                ← Wróć do strony
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
