"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";

type UserRole = "user" | "admin" | null;

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    isAdmin: boolean;
    role: UserRole;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = "mebloo_auth_token";
const AUTH_EXPIRY_DAYS = 7; // Token ważny przez 7 dni

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState<UserRole>(null);

    // Sprawdź czy użytkownik jest zalogowany przy starcie
    useEffect(() => {
        const checkAuth = () => {
            try {
                const stored = localStorage.getItem(AUTH_KEY);
                if (stored) {
                    const {
                        token,
                        expiresAt,
                        role: storedRole,
                    } = JSON.parse(stored);
                    if (token && expiresAt && Date.now() < expiresAt) {
                        setIsAuthenticated(true);
                        setRole(storedRole || "user");
                    } else {
                        // Token wygasł
                        localStorage.removeItem(AUTH_KEY);
                        setIsAuthenticated(false);
                        setRole(null);
                    }
                }
            } catch {
                localStorage.removeItem(AUTH_KEY);
                setIsAuthenticated(false);
                setRole(null);
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
                // Zapisz token z datą wygaśnięcia (7 dni) i rolą
                const expiresAt =
                    Date.now() + AUTH_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
                localStorage.setItem(
                    AUTH_KEY,
                    JSON.stringify({
                        token: data.token,
                        expiresAt,
                        role: data.role || "user",
                    })
                );
                setIsAuthenticated(true);
                setRole(data.role || "user");
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
        setRole(null);
    };

    const isAdmin = role === "admin";

    return (
        <AuthContext.Provider
            value={{ isAuthenticated, isLoading, isAdmin, role, login, logout }}
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
