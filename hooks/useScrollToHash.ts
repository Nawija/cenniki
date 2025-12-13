"use client";

import { useEffect, useCallback } from "react";

/**
 * Hook do scrollowania do elementu z hash w URL po załadowaniu strony.
 * Używa MutationObserver do wykrywania gdy element pojawi się w DOM.
 * Nasłuchuje również na zmiany hasha (np. przy nawigacji w tej samej stronie).
 */
export function useScrollToHash() {
    const scrollToHash = useCallback(() => {
        const hash = window.location.hash;
        if (!hash) return;

        const scrollToElement = () => {
            const element = document.querySelector(hash);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                return true;
            }
            return false;
        };

        // Spróbuj natychmiast
        if (scrollToElement()) return;

        // Jeśli element jeszcze nie istnieje, obserwuj DOM
        const observer = new MutationObserver(() => {
            if (scrollToElement()) {
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // Timeout jako fallback - po 2 sekundach przestań szukać
        setTimeout(() => {
            observer.disconnect();
        }, 2000);
    }, []);

    useEffect(() => {
        // Scroll przy pierwszym renderze
        scrollToHash();

        // Nasłuchuj na zmiany hasha (np. kliknięcie w link z #product-xxx)
        window.addEventListener("hashchange", scrollToHash);

        return () => {
            window.removeEventListener("hashchange", scrollToHash);
        };
    }, [scrollToHash]);
}
