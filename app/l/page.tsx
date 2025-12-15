"use client";
import GoogleSpinner from "@/components/Loading";
import { useState } from "react";

export default async function HomePage() {
    const [loading, setLoading] = useState(true);
    if (loading) {
        return <GoogleSpinner />;
    }

    return <div>hi</div>;
}
