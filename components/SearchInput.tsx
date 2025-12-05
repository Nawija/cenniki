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
    placeholder = "Szukaj produktu...",
}: SearchInputProps) {
    return (
        <div className="pt-6 flex justify-center">
            <input
                type="text"
                className="w-full max-w-md bg-gray-50 border border-gray-300 text-[16px] p-3 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-200 transition"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
