"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "./AdminContext";

interface UnsavedChangesModalProps {
    isOpen: boolean;
    onSave: () => Promise<void>;
    onDiscard: () => void;
    onCancel: () => void;
    saving: boolean;
}

function UnsavedChangesModal({
    isOpen,
    onSave,
    onDiscard,
    onCancel,
    saving,
}: UnsavedChangesModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            />
            <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-xl w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Niezapisane zmiany
                </h3>
                <p className="text-gray-600 mb-6">
                    Masz niezapisane zmiany. Co chcesz zrobić?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
                    >
                        {saving ? "Zapisywanie..." : "Zapisz i wyjdź"}
                    </button>
                    <button
                        onClick={onDiscard}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors font-medium"
                    >
                        Odrzuć zmiany
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
                    >
                        Anuluj
                    </button>
                </div>
            </div>
        </div>
    );
}

export function UnsavedChangesGuard() {
    const { hasChanges, saveFunction, saving, setSaving, setHasChanges } =
        useAdmin();
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(
        null
    );

    // Przechwytywanie kliknięć w linki
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = e.target as HTMLElement;
            const link = target.closest("a");

            if (
                link &&
                link.href &&
                hasChanges &&
                !link.href.includes("#") &&
                link.href.startsWith(window.location.origin)
            ) {
                const path = link.href.replace(window.location.origin, "");

                // Sprawdź czy to nawigacja wewnątrz panelu admin ale poza aktualną stronę
                if (path !== window.location.pathname) {
                    e.preventDefault();
                    e.stopPropagation();
                    setPendingNavigation(path);
                    setShowModal(true);
                }
            }
        }

        document.addEventListener("click", handleClick, true);
        return () => document.removeEventListener("click", handleClick, true);
    }, [hasChanges]);

    // Przechwytywanie przycisku wstecz
    useEffect(() => {
        if (!hasChanges) return;

        // Dodaj stan do historii, żeby móc przechwycić przycisk wstecz
        window.history.pushState({ unsavedChanges: true }, "");

        function handlePopState() {
            if (hasChanges) {
                // Przywróć stan
                window.history.pushState({ unsavedChanges: true }, "");
                setPendingNavigation("back");
                setShowModal(true);
            }
        }

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [hasChanges]);

    const handleSave = useCallback(async () => {
        if (saveFunction) {
            setSaving(true);
            try {
                await saveFunction();
                setHasChanges(false);
                if (pendingNavigation === "back") {
                    window.history.go(-2);
                } else if (pendingNavigation) {
                    router.push(pendingNavigation);
                }
            } finally {
                setSaving(false);
                setShowModal(false);
                setPendingNavigation(null);
            }
        }
    }, [saveFunction, pendingNavigation, router, setSaving, setHasChanges]);

    const handleDiscard = useCallback(() => {
        setHasChanges(false);
        setShowModal(false);
        if (pendingNavigation === "back") {
            window.history.go(-2);
        } else if (pendingNavigation) {
            router.push(pendingNavigation);
        }
        setPendingNavigation(null);
    }, [pendingNavigation, router, setHasChanges]);

    const handleCancel = useCallback(() => {
        setShowModal(false);
        setPendingNavigation(null);
    }, []);

    return (
        <UnsavedChangesModal
            isOpen={showModal}
            onSave={handleSave}
            onDiscard={handleDiscard}
            onCancel={handleCancel}
            saving={saving}
        />
    );
}
