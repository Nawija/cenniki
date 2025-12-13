"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    toggle: () => void;
    width: number;
}

const SIDEBAR_WIDTH_OPEN = 240;
const SIDEBAR_WIDTH_CLOSED = 66;

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);

    const toggle = () => setIsOpen((prev) => !prev);
    const width = isOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;

    return (
        <SidebarContext.Provider value={{ isOpen, setIsOpen, toggle, width }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within SidebarProvider");
    }
    return context;
}

export { SIDEBAR_WIDTH_OPEN, SIDEBAR_WIDTH_CLOSED };
