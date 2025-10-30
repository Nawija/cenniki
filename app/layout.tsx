import SidebarServer from "@/components/nav/SidebarServer";
import "./globals.css";


export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pl">
            <body className="m-0 font-sans text-gray-800 bg-gray-100">
                {/* <ScrollToTopButton /> */}
                <div className="flex min-h-screen">
                    <SidebarServer />
                    <main className="flex-1 md:ml-[260px] p-6 bg-gray-100 min-h-screen">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
