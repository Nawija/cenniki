// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import fs from "fs";
import path from "path";
import Image from "next/image";

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
            <body className="m-0 font-sans text-gray-800">
                <div className="flex min-h-screen">
                    <aside className="w-[250px] bg-gradient-to-b fixed h-screen top-0 bg-white border-r border-gray-300 p-5 block ">
                        <Image src="/images/logo.svg" height={150} width={150} alt="logo" className="mb-12 mx-auto" />
                        <h2 className="font-medium text-start text-gray-500 mb-3">
                            Producenci:
                        </h2>
                        <ul className="p-0 text-start w-full flex flex-col space-y-1">
                            {producers.map((p, i) => (
                                <Link
                                    key={i}
                                    href={`/producent/${p.producerId}`}
                                    className="text-lg font-medium  hover:text-yellow-600 transition-colors duration-200 w-full"
                                >
                                    {p.name}
                                </Link>
                            ))}
                        </ul>
                    </aside>
                    <main className="flex-1 ml-[250px] p-5 bg-gray-100">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
