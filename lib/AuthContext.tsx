"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = "mebloo_auth_token";
const AUTH_EXPIRY_DAYS = 7; // Token ważny przez 7 dni

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Sprawdź czy użytkownik jest zalogowany przy starcie
    useEffect(() => {
        const checkAuth = () => {
            try {
                const stored = localStorage.getItem(AUTH_KEY);
                if (stored) {
                    const { token, expiresAt } = JSON.parse(stored);
                    if (token && expiresAt && Date.now() < expiresAt) {
                        setIsAuthenticated(true);
                    } else {
                        // Token wygasł
                        localStorage.removeItem(AUTH_KEY);
                        setIsAuthenticated(false);
                    }
                }
            } catch {
                localStorage.removeItem(AUTH_KEY);
                setIsAuthenticated(false);
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (
        username: string,
        password: string
    ): Promise<boolean> => {
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success && data.token) {
                // Zapisz token z datą wygaśnięcia (7 dni)
                const expiresAt =
                    Date.now() + AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
                localStorage.setItem(
                    AUTH_KEY,
                    JSON.stringify({ token: data.token, expiresAt })
                );
                setIsAuthenticated(true);
                return true;
            }

            return false;
        } catch {
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, isLoading, login, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
