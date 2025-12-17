"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface PendingChanges {
    producerSlug: string;
    producerName: string;
    changes: any[];
    updatedData: Record<string, any>;
    summary?: {
        totalChanges: number;
        priceIncrease: number;
        priceDecrease: number;
        avgChangePercent: number;
    };
}

interface AdminContextType {
    hasChanges: boolean;
    setHasChanges: (value: boolean) => void;
    saveFunction: (() => Promise<void>) | null;
    setSaveFunction: (fn: (() => Promise<void>) | null) => void;
    saving: boolean;
    setSaving: (value: boolean) => void;
    // Nowe dla planowania zmian
    pendingChanges: PendingChanges | null;
    setPendingChanges: (changes: PendingChanges | null) => void;
    scheduleFunction: ((date: string) => Promise<void>) | null;
    setScheduleFunction: (fn: ((date: string) => Promise<void>) | null) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
    const [hasChanges, setHasChanges] = useState(false);
    const [saveFunction, setSaveFunction] = useState<
        (() => Promise<void>) | null
    >(null);
    const [saving, setSaving] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<PendingChanges | null>(
        null
    );
    const [scheduleFunction, setScheduleFunction] = useState<
        ((date: string) => Promise<void>) | null
    >(null);

    return (
        <AdminContext.Provider
            value={{
                hasChanges,
                setHasChanges,
                saveFunction,
                setSaveFunction: (fn) => setSaveFunction(() => fn),
                saving,
                setSaving,
                pendingChanges,
                setPendingChanges,
                scheduleFunction,
                setScheduleFunction: (fn) => setScheduleFunction(() => fn),
            }}
        >
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error("useAdmin must be used within an AdminProvider");
    }
    return context;
}
