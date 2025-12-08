// app/admin/layout.tsx
import { Metadata } from "next";
import { AdminProvider } from "./AdminContext";
import AdminHeader from "./AdminHeader";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

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
        <AdminProvider>
            <div className="min-h-screen bg-gray-100">
                {/* Admin Header */}
                <AdminHeader />

                {/* Content */}
                <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>

                {/* Unsaved Changes Guard */}
                <UnsavedChangesGuard />
            </div>
        </AdminProvider>
    );
}
