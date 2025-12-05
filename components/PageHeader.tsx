"use client";

import SearchInput from "@/components/SearchInput";

interface PageHeaderProps {
    title?: string;
    search: string;
    onSearchChange: (value: string) => void;
}

export default function PageHeader({
    title = "Cennik",
    search,
    onSearchChange,
}: PageHeaderProps) {
    return (
        <div className="flex flex-col items-center justify-center space-y-6 pt-8 md:pt-12 px-4">
            <h1 className="text-gray-900 text-2xl md:text-4xl font-bold text-center">
                {title}
            </h1>

            <SearchInput value={search} onChange={onSearchChange} />
        </div>
    );
}
