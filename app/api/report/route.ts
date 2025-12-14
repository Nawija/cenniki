import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const REPORT_EMAIL = "konradwiel@interia.pl";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { producerName, productName, description, contactEmail } = body;

        // Walidacja
        if (!producerName || !productName || !description) {
            return NextResponse.json(
                { error: "Brak wymaganych pól" },
                { status: 400 }
            );
        }

        // Konfiguracja transportera
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Treść maila
        const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            background: #f9fafb;
            padding: 25px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
        }
        .field {
            margin-bottom: 20px;
        }
        .field-label {
            font-weight: 600;
            color: #374151;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .field-value {
            background: white;
            padding: 12px 15px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .description-value {
            white-space: pre-wrap;
            min-height: 60px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #6b7280;
        }
        .badge {
            display: inline-block;
            background: #fef2f2;
            color: #dc2626;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚩 Zgłoszenie błędu w cenie</h1>
    </div>
    <div class="content">
        <div class="field">
            <div class="field-label">Producent</div>
            <div class="field-value">
                <span class="badge">${producerName}</span>
            </div>
        </div>
        
        <div class="field">
            <div class="field-label">Nazwa produktu</div>
            <div class="field-value">${productName}</div>
        </div>
        
        <div class="field">
            <div class="field-label">Opis problemu</div>
            <div class="field-value description-value">${description}</div>
        </div>
        
        ${
            contactEmail
                ? `
        <div class="field">
            <div class="field-label">Email kontaktowy</div>
            <div class="field-value">
                <a href="mailto:${contactEmail}">${contactEmail}</a>
            </div>
        </div>
        `
                : ""
        }
    </div>
    <div class="footer">
        Zgłoszenie wygenerowane automatycznie z systemu cenników.<br>
        Data: ${new Date().toLocaleString("pl-PL")}
    </div>
</body>
</html>
        `.trim();

        // Wyślij mail
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: REPORT_EMAIL,
            subject: `🚩 Błąd w cenie: ${productName} (${producerName})`,
            html: emailContent,
            replyTo: contactEmail || undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Błąd wysyłania zgłoszenia:", error);
        return NextResponse.json(
            { error: "Błąd wysyłania zgłoszenia" },
            { status: 500 }
        );
    }
}
