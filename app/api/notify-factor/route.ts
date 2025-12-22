import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { producerName, currentFactor, newFactor, percentChange } = body;

        if (!producerName || newFactor === undefined) {
            return NextResponse.json(
                { error: "Brak wymaganych danych" },
                { status: 400 }
            );
        }

        const notificationEmail = process.env.NOTIFICATION_EMAIL;
        if (!notificationEmail) {
            return NextResponse.json(
                { error: "Nie skonfigurowano adresu email do powiadomień" },
                { status: 500 }
            );
        }

        const subject = `Zmiana faktora dla ${producerName}`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #92400e;">Propozycja zmiany faktora</h2>
                
                <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0; font-size: 18px;">
                        <strong>Producent:</strong> ${producerName}
                    </p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                            <strong>Aktualny faktor:</strong>
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                            ${currentFactor}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                            <strong>Proponowany faktor:</strong>
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #92400e; font-weight: bold;">
                            ${newFactor}
                        </td>
                    </tr>
                    ${
                        percentChange !== undefined
                            ? `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                            <strong>Zmiana procentowa:</strong>
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${
                            percentChange >= 0 ? "#16a34a" : "#dc2626"
                        };">
                            ${percentChange >= 0 ? "+" : ""}${percentChange}%
                        </td>
                    </tr>
                    `
                            : ""
                    }
                </table>
                
                <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                    Wiadomość wygenerowana automatycznie z systemu cenników.
                </p>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: notificationEmail,
            subject: subject,
            html: htmlContent,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Błąd wysyłania powiadomienia:", error);
        return NextResponse.json(
            { error: "Błąd wysyłania powiadomienia" },
            { status: 500 }
        );
    }
}
