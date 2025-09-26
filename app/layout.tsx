// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import fs from "fs";
import path from "path";

function getProducers() {
    const producersDir = path.join(process.cwd(), "data");
    const files = fs.readdirSync(producersDir);

    return files.map((file) => {
        const name = path.parse(file).name; // nazwa pliku bez rozszerzenia
        return { producerId: name, name };
    });
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const producers = getProducers();

    return (
        <html lang="pl">
            <body className="m-0 font-sans">
                <div className="flex min-h-screen">
                    <aside className="w-[250px] bg-gradient-to-b from-gray-900 to-gray-800 text-white p-5 block">
                        <h2 className="font-medium text-center text-amber-300 text-xl tracking-widest mb-4 uppercase">
                            Producenci:
                        </h2>
                        <ul className="p-0 text-start w-full flex flex-col space-y-3">
                            {producers.map((p, i) => (
                                <Link
                                    key={i}
                                    href={`/producent/${p.producerId}`}
                                    className="text-gray-300 text-lg font-medium  hover:text-white transition-all w-full hover:border-white hover:border-l-4 pl-2"
                                >
                                    {p.name}
                                </Link>
                            ))}
                        </ul>
                    </aside>
                    <main className="flex-1 p-5 bg-gradient-to-t from-blue-50 to-gray-100 text-gray-800">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
