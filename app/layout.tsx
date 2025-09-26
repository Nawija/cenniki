// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import fs from "fs";
import path from "path";

function getProducers() {
    const producersDir = path.join(process.cwd(), "data", "producers");
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
            <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
                <div style={{ display: "flex", minHeight: "100vh" }}>
                    <aside
                        style={{
                            width: "250px",
                            backgroundColor: "#1f2937",
                            color: "white",
                            padding: "20px",
                        }}
                    >
                        <h2 style={{ color: "#fbbf24" }}>Producenci</h2>
                        <ul style={{ listStyle: "none", padding: 0 }}>
                            {producers.map((p) => (
                                <li
                                    key={p.producerId}
                                    style={{ marginBottom: "10px" }}
                                >
                                    <Link
                                        href={`/producent/${p.producerId}`}
                                        style={{
                                            color: "white",
                                            textDecoration: "none",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {p.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </aside>
                    <main
                        style={{
                            flex: 1,
                            padding: "20px",
                            backgroundColor: "#f3f4f6",
                        }}
                    >
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
