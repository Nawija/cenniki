"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AdminContextType {
    hasChanges: boolean;
    setHasChanges: (value: boolean) => void;
    saveFunction: (() => Promise<void>) | null;
    setSaveFunction: (fn: (() => Promise<void>) | null) => void;
    saving: boolean;
    setSaving: (value: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
    const [hasChanges, setHasChanges] = useState(false);
    const [saveFunction, setSaveFunction] = useState<
        (() => Promise<void>) | null
    >(null);
    const [saving, setSaving] = useState(false);

    return (
        <AdminContext.Provider
            value={{
                hasChanges,
                setHasChanges,
                saveFunction,
                setSaveFunction: (fn) => setSaveFunction(() => fn),
                saving,
                setSaving,
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
