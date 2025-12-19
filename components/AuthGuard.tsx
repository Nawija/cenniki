"use client";

import { useAuth } from "@/lib/AuthContext";
import LoginPage from "@/components/LoginPage";
import Loading from "@/components/Loading";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    // Pokaż loading podczas sprawdzania autoryzacji
    if (isLoading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100">
                <Loading />
            </div>
        );
    }

    // Jeśli niezalogowany - pokaż stronę logowania
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Zalogowany - pokaż zawartość
    return <>{children}</>;
}
