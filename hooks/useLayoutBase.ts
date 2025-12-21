"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useScrollToHash } from "@/hooks";
import type { ProductScheduledChangeServer } from "@/lib/scheduledChanges";

interface UseLayoutBaseOptions {
    propSlug?: string;
    scheduledChangesMap?: Record<string, ProductScheduledChangeServer[]>;
}

/**
 * Wspólna logika dla layoutów producentów
 * Wyekstrahowana z BomarLayout, PuszmanLayout, MpNidzicaLayout
 */
export function useLayoutBase({
    propSlug,
    scheduledChangesMap = {},
}: UseLayoutBaseOptions = {}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [simulationFactor, setSimulationFactor] = useState(1);

    // Wyciągnij slug producenta z URL lub użyj przekazanego
    const producerSlug = useMemo(() => {
        if (propSlug) return propSlug;
        const match = pathname.match(/\/p\/([^/]+)/);
        return match ? match[1] : "";
    }, [propSlug, pathname]);

    // Funkcja do pobierania zaplanowanych zmian dla produktu
    const getProductChanges = useCallback(
        (productName: string, category?: string) => {
            const key = category ? `${category}__${productName}` : productName;
            return scheduledChangesMap[key] || [];
        },
        [scheduledChangesMap]
    );

    // Synchronizuj search z URL query param
    useEffect(() => {
        const urlSearch = searchParams.get("search");
        if (urlSearch) {
            setSearch(urlSearch);
        }
    }, [searchParams]);

    // Scroll do elementu z hash po załadowaniu
    useScrollToHash();

    return {
        producerSlug,
        search,
        setSearch,
        simulationFactor,
        setSimulationFactor,
        getProductChanges,
        pathname,
    };
}
