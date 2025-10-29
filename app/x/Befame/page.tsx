import fs from "fs";
import path from "path";
import ProductsTable from "@/components/ProductsTable";

export default function Page() {
    const filePath = path.join(process.cwd(), "data", "Befame.json");
    const products = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    return <ProductsTable products={products} manufacturer="befame" />;
}
