"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchResult {
    name: string;
    previousName?: string;
    producerSlug: string;
    producerName: string;
    productId: string;
}

// Funkcja do podświetlania pasujących fragmentów tekstu
function highlightMatch(text: string, query: string) {
    if (!query.trim()) return text;

    const regex = new RegExp(
        `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, i) =>
        regex.test(part) ? (
            <mark key={i} className="bg-yellow-200/80 text-black rounded">
                {part}
            </mark>
        ) : (
            part
        )
    );
}

export default function GlobalSearch() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch wyników z debounce (min 2 znaki)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!search.trim() || search.trim().length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/search?q=${encodeURIComponent(search)}`
                );
                const data = await res.json();
                setResults(data.results || []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [search]);

    useEffect(() => {
        setSelectedIndex(-1);
    }, [search]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const clearSearch = useCallback(() => {
        setSearch("");
        setSelectedIndex(-1);
        inputRef.current?.focus();
    }, []);

    const navigateToProduct = useCallback(
        (result: SearchResult) => {
            const url = `/p/${result.producerSlug}?search=${encodeURIComponent(
                result.name
            )}#${result.productId}`;
            setIsFocused(false);
            setSearch("");
            setSelectedIndex(-1);
            router.push(url);
        },
        [router]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!results.length) return;
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < results.length - 1 ? prev + 1 : prev
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < results.length) {
                        navigateToProduct(results[selectedIndex]);
                    }
                    break;
                case "Escape":
                    setIsFocused(false);
                    setSelectedIndex(-1);
                    break;
            }
        },
        [results, selectedIndex, navigateToProduct]
    );

    const showDropdown = isFocused && search.trim().length >= 2;

    return (
        <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
            <div className="relative">
                <div className="absolute -inset-[2px] rounded-full bg-gray-100" />
                {!isFocused && (
                    <div className="absolute -inset-[2px] rounded-full overflow-hidden">
                        <div
                            className="absolute inset-0 blur-sm animate-google-border"
                            style={{
                                background:
                                    "conic-gradient(from 0deg, #4285F4 0deg, #4285F4 30deg, #EA4335 45deg, #EA4335 75deg, #FBBC05 90deg, #FBBC05 120deg, #34A853 135deg, #34A853 165deg, transparent 180deg, transparent 360deg)",
                            }}
                        />
                    </div>
                )}
                <div className="absolute inset-0 rounded-full bg-gray-200" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <Input
                    ref={inputRef}
                    type="text"
                    className="relative w-full h-12 pl-12 pr-10 rounded-full bg-transparent shadow-2xl text-base border-0 focus:ring-0 focus:outline-none z-10"
                    placeholder="Szukaj produktu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={handleKeyDown}
                />
                {search && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="px-4 py-8 text-center text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        </div>
                    ) : results.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                            {results.map((result, idx) => (
                                <li
                                    key={`${result.producerSlug}-${result.name}-${idx}`}
                                >
                                    <button
                                        onClick={() =>
                                            navigateToProduct(result)
                                        }
                                        onMouseEnter={() =>
                                            setSelectedIndex(idx)
                                        }
                                        className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 transition-colors text-left ${
                                            selectedIndex === idx
                                                ? "bg-gray-100"
                                                : "hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                                {highlightMatch(
                                                    result.name,
                                                    search
                                                )}
                                            </p>
                                            {result.previousName && (
                                                <p className="text-xs text-gray-500 truncate">
                                                    poprzednio:{" "}
                                                    {highlightMatch(
                                                        result.previousName,
                                                        search
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                        <span className="ml-3 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full shrink-0">
                                            {result.producerName}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-8 text-center text-gray-500">
                            <p className="text-sm">
                                Brak wyników dla &quot;{search}&quot;
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
