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
}

export default function ReportButton({ producerName }: ReportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        productName: "",
        description: "",
        contactEmail: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.productName.trim() || !formData.description.trim()) {
            toast.error("Wypełnij wymagane pola");
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
                    ...formData,
                }),
            });

            if (!response.ok) {
                throw new Error("Błąd wysyłania zgłoszenia");
            }

            toast.success("Zgłoszenie zostało wysłane!");
            setFormData({ productName: "", description: "", contactEmail: "" });
            setIsOpen(false);
        } catch (error) {
            toast.error("Wystąpił błąd podczas wysyłania zgłoszenia");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group"
                title="Zgłoś błąd w cenie"
            >
                <Flag className="w-6 h-6" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Zgłoś błąd w cenie
                </span>
            </button>

            {/* Modal */}
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Zgłoś błąd w cenie"
                maxWidth="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="productName">
                            Nazwa produktu{" "}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="productName"
                            value={formData.productName}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    productName: e.target.value,
                                }))
                            }
                            placeholder="np. Stół rozkładany XYZ"
                            required
                        />
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
                            placeholder="Opisz jaki błąd zauważyłeś w cenie..."
                            className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md text-sm bg-background resize-y"
                            required
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
