"use client";

import Link from "next/link";
import { Percent, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export function AdminFactorsLink() {
    const { isAdmin } = useAuth();

    if (!isAdmin) return null;

    return (
        <Link
            href="/p/faktory"
            className="flex items-center mb-8 md:mb-12 justify-between bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:border-gray-300 hover:shadow-md transition-all group"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Percent className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-800">
                        Faktory Producentów
                    </h3>
                    <p className="text-sm text-gray-500">
                        Faktory dla wszystkich producentów
                    </p>
                </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
        </Link>
    );
}

export default AdminFactorsLink;
