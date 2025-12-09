"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAdmin } from "../AdminContext";
import type {
    ProducerConfig,
    BomarData,
    PuszmanData,
    MpNidzicaData,
    TopLineData,
} from "@/lib/types";
import {
    BomarEditor,
    PuszmanEditor,
    MpNidzicaEditor,
    TopLineEditor,
} from "@/components/admin";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default function AdminProducerPage({ params }: PageProps) {
    const { slug } = use(params);
    const [producer, setProducer] = useState<ProducerConfig | null>(null);
    const [data, setData] = useState<
        BomarData | PuszmanData | MpNidzicaData | TopLineData | null
    >(null);
    const [loading, setLoading] = useState(true);
    const { setHasChanges, setSaveFunction, setSaving } = useAdmin();

    // ============================================
    // DATA FETCHING
    // ============================================

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/producers/${slug}/data`);
                const result = await res.json();
                setProducer(result.producer);
                setData(result.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [slug]);

    // ============================================
    // SAVE FUNCTION
    // ============================================

    const saveData = useCallback(async () => {
        if (!data) return;
        setSaving(true);

        try {
            await fetch(`/api/producers/${slug}/data`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            setHasChanges(false);
            alert("Zapisano pomyślnie!");
        } catch (error) {
            console.error("Error saving data:", error);
            alert("Błąd podczas zapisywania");
        } finally {
            setSaving(false);
        }
    }, [data, slug, setHasChanges, setSaving]);

    useEffect(() => {
        setSaveFunction(saveData);
        return () => setSaveFunction(null);
    }, [saveData, setSaveFunction]);

    // ============================================
    // UPDATE HANDLER
    // ============================================

    const updateData = (newData: any) => {
        setData(newData);
        setHasChanges(true);
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!producer || !data) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Nie znaleziono producenta</p>
                <Link
                    href="/admin"
                    className="text-blue-600 hover:underline mt-2 block"
                >
                    Wróć do listy
                </Link>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{
                                backgroundColor: producer.color || "#6b7280",
                            }}
                        >
                            {producer.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {producer.displayName}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Typ: {producer.layoutType}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editor based on layout type */}
            {producer.layoutType === "bomar" && (
                <BomarEditor
                    data={data as BomarData}
                    onChange={updateData}
                    producer={producer}
                />
            )}
            {producer.layoutType === "puszman" && (
                <PuszmanEditor
                    data={data as PuszmanData}
                    onChange={updateData}
                />
            )}
            {producer.layoutType === "mpnidzica" && (
                <MpNidzicaEditor
                    data={data as MpNidzicaData}
                    onChange={updateData}
                    producer={producer}
                />
            )}
            {producer.layoutType === "topline" && (
                <TopLineEditor
                    data={data as TopLineData}
                    onChange={updateData}
                    producer={producer}
                />
            )}
        </div>
    );
}
