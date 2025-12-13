import SidebarServer from "@/components/nav/SidebarServer";
import { SidebarProvider } from "@/lib/SidebarContext";
import { Toaster } from "@/components/ui";
import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
    title: "Cennik KW",
    description: "System cenników KW",
    robots: "noindex, nofollow",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#ffffff",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pl">
            <head>
                {/* Preconnect do zewnętrznych zasobów */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
            </head>
            <body className="m-0 font-sans text-gray-800 bg-gray-100">
                <SidebarProvider>
                    <div className="flex min-h-screen">
                        <SidebarServer />
                        <main className="flex-1 bg-gray-100 min-h-screen">
                            {children}
                        </main>
                    </div>
                </SidebarProvider>
                <Toaster position="top-right" richColors />
            </body>
        </html>
    );
}
