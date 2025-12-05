"use client";

import { useState } from "react";

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
        <div className="pt-6 flex justify-center">
            <input
                type="text"
                className="w-full min-w-md bg-white border border-gray-300 text-[16px] pl-6 p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
