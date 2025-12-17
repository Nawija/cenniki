// app/api/scheduled-changes/apply/route.ts
// Automatyczne zastosowanie zaplanowanych zmian które osiągnęły datę

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SCHEDULED_FILE = path.join(
    process.cwd(),
    "data",
    "scheduled-changes.json"
);

interface ScheduledChange {
    id: string;
    producerSlug: string;
    producerName: string;
    scheduledDate: string;
    createdAt: string;
    changes: any[];
    summary: any;
    updatedData: Record<string, any>;
    status: "pending" | "applied" | "cancelled";
}

interface ScheduledChangesFile {
    scheduledChanges: ScheduledChange[];
}

function readScheduledChanges(): ScheduledChangesFile {
    try {
        if (fs.existsSync(SCHEDULED_FILE)) {
            const content = fs.readFileSync(SCHEDULED_FILE, "utf-8");
            return JSON.parse(content);
        }
    } catch (error) {
        console.error("Error reading scheduled changes:", error);
    }
    return { scheduledChanges: [] };
}

function writeScheduledChanges(data: ScheduledChangesFile): void {
    fs.writeFileSync(SCHEDULED_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// POST - zastosuj wszystkie zmiany które osiągnęły datę
export async function POST(request: NextRequest) {
    try {
        const data = readScheduledChanges();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const appliedChanges: string[] = [];
        const errors: string[] = [];

        for (const change of data.scheduledChanges) {
            if (change.status !== "pending") continue;

            const changeDate = new Date(change.scheduledDate);
            changeDate.setHours(0, 0, 0, 0);

            // Sprawdź czy data zmiany już nadeszła (lub jest dzisiaj)
            if (changeDate <= now) {
                try {
                    // Zastosuj zmiany do pliku producenta
                    const producerFile = path.join(
                        process.cwd(),
                        "data",
                        `${change.producerSlug}.json`
                    );

                    if (fs.existsSync(producerFile)) {
                        fs.writeFileSync(
                            producerFile,
                            JSON.stringify(change.updatedData, null, 2),
                            "utf-8"
                        );
                        change.status = "applied";
                        appliedChanges.push(
                            `${change.producerName}: ${change.summary.totalChanges} zmian`
                        );
                        console.log(
                            `Applied scheduled change for ${change.producerName} (${change.id})`
                        );
                    } else {
                        errors.push(
                            `Nie znaleziono pliku dla ${change.producerName}`
                        );
                    }
                } catch (error: any) {
                    errors.push(`${change.producerName}: ${error.message}`);
                }
            }
        }

        writeScheduledChanges(data);

        return NextResponse.json({
            success: true,
            applied: appliedChanges,
            errors,
            message:
                appliedChanges.length > 0
                    ? `Zastosowano ${appliedChanges.length} zaplanowanych zmian`
                    : "Brak zmian do zastosowania",
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// GET - sprawdź ile zmian jest do zastosowania
export async function GET() {
    const data = readScheduledChanges();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const pendingToApply = data.scheduledChanges.filter((c) => {
        if (c.status !== "pending") return false;
        const changeDate = new Date(c.scheduledDate);
        changeDate.setHours(0, 0, 0, 0);
        return changeDate <= now;
    });

    return NextResponse.json({
        success: true,
        pendingCount: pendingToApply.length,
        pending: pendingToApply.map((c) => ({
            id: c.id,
            producer: c.producerName,
            scheduledDate: c.scheduledDate,
            changes: c.summary.totalChanges,
        })),
    });
}
