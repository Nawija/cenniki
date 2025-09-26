// app/product/[id]/page.tsx
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

type Params = { params: { id: string } };

export default function ProductPage({ params }: Params) {
    const producersDir = path.join(process.cwd(), "data", "producers");
    const files = fs.readdirSync(producersDir);

    type Params = { params: { producerName: string; productName: string } };

    let product: any = null;
    let producerName = "";

    for (const file of files) {
        if (
            path.parse(file).name.toLowerCase() !==
            params.producerName.toLowerCase()
        )
            continue;

        const producerData = JSON.parse(
            fs.readFileSync(path.join(producersDir, file), "utf-8")
        );
        const found = producerData.products.find(
            (p: any) =>
                p.name.toLowerCase() === params.productName.toLowerCase()
        );

        if (found) {
            product = found;
            producerName = path.parse(file).name;
            break;
        }
    }

    if (!product) return notFound();

    // Konwersja cen na tablicę do tabeli
    const priceEntries: { option: string; config: string; price: number }[] =
        [];
    if (product.prices) {
        for (const [option, configs] of Object.entries(product.prices)) {
            if (typeof configs === "object") {
                for (const [config, price] of Object.entries(configs as any)) {
                    priceEntries.push({ option, config, price: Number(price) });
                }
            } else {
                priceEntries.push({
                    option,
                    config: "-",
                    price: Number(configs),
                });
            }
        }
    }

    return (
        <div style={{ padding: "20px" }}>
            <h1 style={{ color: "#111827" }}>
                {producerName} - {product.name}
            </h1>

            {product.margin && (
                <h3 style={{ marginTop: "10px", color: "#374151" }}>
                    Ceny z uwzględnieniem marży ({product.margin})
                </h3>
            )}

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "20px",
                }}
            >
                <thead>
                    <tr
                        style={{
                            backgroundColor: "#f3f4f6",
                            textAlign: "left",
                        }}
                    >
                        <th
                            style={{
                                padding: "8px",
                                borderBottom: "1px solid #ddd",
                            }}
                        >
                            Tkaniny
                        </th>
                        <th
                            style={{
                                padding: "8px",
                                borderBottom: "1px solid #ddd",
                            }}
                        >
                            Opis
                        </th>
                        <th
                            style={{
                                padding: "8px",
                                borderBottom: "1px solid #ddd",
                            }}
                        >
                            Cena brutto
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {priceEntries.map((p) => (
                        <tr
                            key={`${p.option}-${p.config}`}
                            style={{
                                backgroundColor:
                                    (p.option + p.config).length % 2 === 0
                                        ? "#ffffff"
                                        : "#f9fafb",
                            }}
                        >
                            <td
                                style={{
                                    padding: "8px",
                                    borderBottom: "1px solid #eee",
                                }}
                            >
                                {p.option}
                            </td>
                            <td
                                style={{
                                    padding: "8px",
                                    borderBottom: "1px solid #eee",
                                }}
                            >
                                {p.config}
                            </td>
                            <td
                                style={{
                                    padding: "8px",
                                    borderBottom: "1px solid #eee",
                                }}
                            >
                                <strong>
                                    {(product.margin
                                        ? p.price * product.margin
                                        : p.price
                                    ).toFixed(2)}{" "}
                                    zł
                                </strong>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {product.extra_options && product.extra_options.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                    <h4>Dodatkowe opcje (odpłatne)</h4>
                    <ul>
                        {product.extra_options.map((opt: string) => (
                            <li key={opt}>{opt}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
