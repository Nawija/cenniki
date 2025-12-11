"use client";

import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { PuszmanData, PuszmanProduct, Surcharge } from "@/lib/types";

interface Props {
    data: PuszmanData;
    title?: string;
    priceGroups?: string[];
}

const DEFAULT_GROUPS = [
    "grupa I",
    "grupa II",
    "grupa III",
    "grupa IV",
    "grupa V",
    "grupa VI",
];

// Mobile card component
function ProductCard({
    product,
    groupNames,
}: {
    product: PuszmanProduct;
    groupNames: string[];
}) {
    return (
        <Card className="border-zinc-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">{product.MODEL}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {/* Price groups grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {groupNames.map((group) => {
                        const price = product[group] as number | undefined;
                        return (
                            <div
                                key={group}
                                className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"
                            >
                                <span className="text-xs text-gray-500 uppercase">
                                    {group}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                    {price ? `${price} zł` : "-"}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Leg color */}
                {product["KOLOR NOGI"] && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                            Kolor nogi:
                        </span>
                        <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800"
                        >
                            {product["KOLOR NOGI"]}
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function PuszmanLayout({ data, title, priceGroups }: Props) {
    const [search, setSearch] = useState("");
    const groupNames = priceGroups || DEFAULT_GROUPS;
    const surcharges: Surcharge[] = data.surcharges || [];

    const allProducts: PuszmanProduct[] = (data.Arkusz1 || []).filter(
        (item) => item && item.MODEL && typeof item.MODEL === "string"
    );

    // Filtruj produkty po nazwie modelu lub poprzedniej nazwie
    const products = useMemo(() => {
        if (!search.trim()) return allProducts;
        const query = search.toLowerCase();
        return allProducts.filter(
            (p) =>
                p.MODEL.toLowerCase().includes(query) ||
                (p.previousName && p.previousName.toLowerCase().includes(query))
        );
    }, [allProducts, search]);

    return (
        <div className="min-h-screen p-4 md:p-6 anim-opacity">
            <PageHeader
                title={title}
                search={search}
                onSearchChange={setSearch}
            />

            {/* SURCHARGES */}
            {surcharges.length > 0 && (
                <Card className="mt-8 max-w-7xl mx-auto border-zinc-200">
                    <CardContent className="p-4 md:p-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Dopłaty:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {surcharges.map((s, idx) => (
                                <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5"
                                >
                                    {s.label}: +{s.percent}%
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="max-w-7xl mx-auto mt-8 md:mt-12">
                {/* Mobile: Card view */}
                <div className="md:hidden space-y-4">
                    {products.map((product, idx) => (
                        <ProductCard
                            key={idx}
                            product={product}
                            groupNames={groupNames}
                        />
                    ))}
                </div>

                {/* Desktop: Table view */}
                <Card className="hidden md:block border-zinc-200 overflow-hidden p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-100">
                                <TableHead className="min-w-[200px]">
                                    Model
                                </TableHead>
                                {groupNames.map((group) => (
                                    <TableHead
                                        key={group}
                                        className="text-center whitespace-nowrap"
                                    >
                                        {group}
                                    </TableHead>
                                ))}
                                <TableHead className="min-w-[150px]">
                                    Kolor nogi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product, idx) => (
                                <TableRow
                                    key={idx}
                                    className={
                                        idx % 2 === 0
                                            ? "bg-white"
                                            : "bg-gray-50"
                                    }
                                >
                                    <TableCell className="font-semibold text-gray-900">
                                        {product.MODEL}
                                    </TableCell>
                                    {groupNames.map((group) => {
                                        const price = product[group] as
                                            | number
                                            | undefined;
                                        return (
                                            <TableCell
                                                key={group}
                                                className="text-center text-sm font-medium text-gray-800"
                                            >
                                                {price ? (
                                                    <span className="inline-flex items-center justify-center min-w-[80px] px-2 py-1 text-gray-900 rounded-lg font-semibold">
                                                        {price} zł
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        -
                                                    </span>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-sm text-gray-700">
                                        {product["KOLOR NOGI"] ? (
                                            <Badge
                                                variant="secondary"
                                                className="bg-amber-100 text-amber-800"
                                            >
                                                {product["KOLOR NOGI"]}
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-400">
                                                Brak
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                {products.length === 0 && (
                    <p className="text-center text-gray-500 text-lg mt-10">
                        Brak produktów pasujących do wyszukiwania.
                    </p>
                )}
            </div>
        </div>
    );
}
