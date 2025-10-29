import fs from "fs";
import path from "path";
import SidebarClient from "./SidebarClient";

export default function SidebarServer() {
    const producersDir = path.join(process.cwd(), "data");
    const files = fs.readdirSync(producersDir);

    const producers = files.map((file) => {
        const name = path.parse(file).name;
        return {
            producerId: name,
            displayName: name
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
        };
    });

    return <SidebarClient producers={producers} />;
}
