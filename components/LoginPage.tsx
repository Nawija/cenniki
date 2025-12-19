"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Lock, User, LogIn, AlertCircle, KeyRound } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const success = await login(username, password);

        if (!success) {
            setError("Nieprawidłowy login lub hasło");
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm"
            >
                {/* Logo / Ikona */}
                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                        <KeyRound
                            className="w-10 h-10 text-gray-400"
                            strokeWidth={1.5}
                        />
                    </div>
                </div>

                {/* Tytuł */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold text-gray-800">
                        Cennik Mebloo
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Zaloguj się, aby kontynuować
                    </p>
                </div>

                {/* Formularz */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-1.5">
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-gray-600"
                            >
                                Login
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    placeholder="Wpisz login"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all outline-none"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-600"
                            >
                                Hasło
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Wpisz hasło"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all outline-none"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    Zaloguj się
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Stopka */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    © {new Date().getFullYear()} Konrad Wielgórski
                </p>
            </motion.div>
        </div>
    );
}
