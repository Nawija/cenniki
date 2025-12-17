"use client";

import { useEffect } from "react";

// Cache key dla sprawdzania - raz na sesję
const LAST_CHECK_KEY = "scheduled-changes-last-check";
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 godzina

// Komponent który sprawdza i stosuje zaplanowane zmiany przy ładowaniu strony
export function ScheduledChangesApplier() {
    useEffect(() => {
        const applyScheduledChanges = async () => {
            try {
                // Sprawdź czy już sprawdzaliśmy niedawno
                const lastCheck = sessionStorage.getItem(LAST_CHECK_KEY);
                if (lastCheck) {
                    const lastCheckTime = parseInt(lastCheck, 10);
                    if (Date.now() - lastCheckTime < CHECK_INTERVAL) {
                        return; // Nie sprawdzaj częściej niż raz na godzinę
                    }
                }

                // Zapisz czas sprawdzenia
                sessionStorage.setItem(LAST_CHECK_KEY, Date.now().toString());

                // Najpierw sprawdź czy są zmiany do zastosowania
                const checkResponse = await fetch(
                    "/api/scheduled-changes/apply"
                );
                const checkData = await checkResponse.json();

                if (checkData.pendingCount > 0) {
                    console.log(
                        `Found ${checkData.pendingCount} scheduled changes to apply`
                    );

                    // Zastosuj zmiany
                    const applyResponse = await fetch(
                        "/api/scheduled-changes/apply",
                        {
                            method: "POST",
                        }
                    );
                    const applyData = await applyResponse.json();

                    if (applyData.applied?.length > 0) {
                        console.log(
                            "Applied scheduled changes:",
                            applyData.applied
                        );
                        // Wyczyść cache bannerów
                        sessionStorage.removeItem("scheduled-changes-cache");
                    }
                }
            } catch (error) {
                console.error("Error applying scheduled changes:", error);
            }
        };

        // Sprawdź zmiany po 3 sekundach od załadowania strony
        const timeout = setTimeout(applyScheduledChanges, 3000);

        return () => clearTimeout(timeout);
    }, []);

    return null;
}

export default ScheduledChangesApplier;
