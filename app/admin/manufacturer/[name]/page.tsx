import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import ManufacturerEditorAdvanced from "@/components/ManufacturerEditorAdvanced";


interface Props {
    params: Promise<{
        name: string;
    }>;
}

async function saveManufacturerData(name: string, data: Record<string, any>) {
    "use server";
    try {
        const fileName =
            name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        const filePath = path.join(process.cwd(), "data", `${fileName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        throw error;
    }
}

export default async function ManufacturerEditorPage({ params }: Props) {
    const { name } = await params;
    const fileName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const filePath = path.join(process.cwd(), "data", `${fileName}.json`);

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    return (
        <ManufacturerEditorAdvanced
            manufacturerName={name}
            initialData={data}
            onSave={async (newData) => {
                "use server";
                try {
                    const fileName =
                        name.charAt(0).toUpperCase() +
                        name.slice(1).toLowerCase();
                    const filePath = path.join(
                        process.cwd(),
                        "data",
                        `${fileName}.json`
                    );
                    fs.writeFileSync(
                        filePath,
                        JSON.stringify(newData, null, 2)
                    );
                } catch (error) {
                    throw new Error(
                        error instanceof Error
                            ? error.message
                            : "Błąd podczas zapisywania"
                    );
                }
            }}
        />
    );
}
