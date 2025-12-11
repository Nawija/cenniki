"use client";

import { Input } from "@/components/ui/input";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function SearchInput({
    value,
    onChange,
    placeholder = "Szukaj produkt...",
}: SearchInputProps) {
    return (
        <div className="pt-6 flex justify-center w-full px-4 md:px-0">
            <Input
                type="text"
                className="w-full max-w-md h-12 pl-6 rounded-full shadow-lg bg-white text-base"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
