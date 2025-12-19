"use client";

import { useState } from "react";
import { Flag, Send, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ReportButtonProps {
    producerName: string;
    productName: string;
}

export default function ReportButton({
    producerName,
    productName,
}: ReportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        description: "",
        contactEmail: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.description.trim()) {
            toast.error("Wypełnij opis problemu");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    producerName,
                    productName,
                    ...formData,
                }),
            });

            if (!response.ok) {
                throw new Error("Błąd wysyłania zgłoszenia");
            }

            toast.success("Zgłoszenie zostało wysłane!");
            setFormData({ description: "", contactEmail: "" });
            setIsOpen(false);
        } catch {
            toast.error("Wystąpił błąd podczas wysyłania zgłoszenia");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Inline flag button */}
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center justify-center w-5 h-5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Zgłoś błąd"
            >
                <Flag size={14} />
            </button>

            {/* Modal */}
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Zgłoś błąd"
                maxWidth="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Produkt</Label>
                        <div className="px-3 py-2 bg-gray-50 border border-input rounded-md text-sm font-medium">
                            {productName}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">
                            Opis problemu{" "}
                            <span className="text-red-500">*</span>
                        </Label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                }))
                            }
                            placeholder="Opisz jaki błąd zauważyłeś"
                            className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md text-sm bg-background resize-y"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contactEmail">
                            Twój email (opcjonalnie)
                        </Label>
                        <Input
                            id="contactEmail"
                            type="email"
                            value={formData.contactEmail}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    contactEmail: e.target.value,
                                }))
                            }
                            placeholder="twoj@email.pl"
                        />
                        <p className="text-xs text-muted-foreground">
                            Podaj email jeśli chcesz otrzymać odpowiedź
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isSubmitting}
                        >
                            Anuluj
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Wysyłanie...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Wyślij zgłoszenie
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
