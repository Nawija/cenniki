import SidebarServer from "@/components/nav/SidebarServer";
import { SidebarProvider } from "@/lib/SidebarContext";
import { AuthProvider } from "@/lib/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { Toaster } from "@/components/ui";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Cennik Mebloo KW",
    description: "",
    robots: "noindex, nofollow",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pl">
            <body className="m-0 font-sans text-gray-800 bg-gray-100">
                <AuthProvider>
                    <AuthGuard>
                        <SidebarProvider>
                            <div className="flex min-h-[100dvh]">
                                <SidebarServer />
                                <main className="flex-1 bg-gray-100 min-h-[100dvh]">
                                    {children}
                                </main>
                            </div>
                        </SidebarProvider>
                        <Toaster position="top-center" richColors />
                    </AuthGuard>
                </AuthProvider>
            </body>
        </html>
    );
}
