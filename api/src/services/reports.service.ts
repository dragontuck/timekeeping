import { prisma } from '../config/database';
import { AuthenticatedUser, MonthlyReport, QuarterlyReport, YearlyReport, ReportRow } from '../types';
import { Role } from '../generated/prisma/client';
import {
    MonthlyReportQuery,
    QuarterlyReportQuery,
    YearlyReportQuery,
} from '../schemas/reports.schema';

interface RawReportRow {
    clientId: string;
    clientName: string;
    projectId: string;
    projectName: string;
    userId: string;
    userFirstName: string;
    userLastName: string;
    rate: string;
    totalHours: string;
}

function buildSummary(rows: RawReportRow[]) {
    const reportRows: ReportRow[] = rows.map((r) => ({
        clientId: r.clientId,
        clientName: r.clientName,
        projectId: r.projectId,
        projectName: r.projectName,
        userId: r.userId,
        userFirstName: r.userFirstName,
        userLastName: r.userLastName,
        rate: Number(r.rate),
        hours: Number(r.totalHours),
        cost: Number(r.totalHours) * Number(r.rate),
    }));

    const totalHours = reportRows.reduce((s, r) => s + r.hours, 0);
    const totalCost = reportRows.reduce((s, r) => s + r.cost, 0);

    // Group by client
    const clientMap = new Map<string, { clientId: string; clientName: string; hours: number; cost: number }>();
    for (const r of reportRows) {
        const existing = clientMap.get(r.clientId) ?? { clientId: r.clientId, clientName: r.clientName, hours: 0, cost: 0 };
        existing.hours += r.hours;
        existing.cost += r.cost;
        clientMap.set(r.clientId, existing);
    }

    const projectMap = new Map<string, { projectId: string; projectName: string; hours: number; cost: number }>();
    for (const r of reportRows) {
        const existing = projectMap.get(r.projectId) ?? { projectId: r.projectId, projectName: r.projectName, hours: 0, cost: 0 };
        existing.hours += r.hours;
        existing.cost += r.cost;
        projectMap.set(r.projectId, existing);
    }

    return {
        rows: reportRows,
        totalHours,
        totalCost,
        byClient: [...clientMap.values()],
        byProject: [...projectMap.values()],
    };
}

export async function getMonthlyReport(
    query: MonthlyReportQuery,
    currentUser: AuthenticatedUser,
): Promise<MonthlyReport> {
    const effectiveUserId = currentUser.role === Role.ADMIN ? query.userId : currentUser.id;
    const start = new Date(Date.UTC(query.year, query.month - 1, 1));
    const end = new Date(Date.UTC(query.year, query.month, 0));

    // Use Prisma's native query builder instead of raw SQL to avoid injection
    const entries = await prisma.timeEntry.findMany({
        where: {
            ...(effectiveUserId && { userId: effectiveUserId }),
            ...(query.clientId && { project: { clientId: query.clientId } }),
            date: { gte: start, lte: end },
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    costPerHour: true,
                    clientId: true,
                    client: { select: { id: true, name: true } },
                },
            },
            user: { select: { id: true, firstName: true, lastName: true } },
        },
    });

    const rows: RawReportRow[] = entries.map((e) => ({
        clientId: e.project.client.id,
        clientName: e.project.client.name,
        projectId: e.project.id,
        projectName: e.project.name,
        userId: e.user.id,
        userFirstName: e.user.firstName,
        userLastName: e.user.lastName,
        rate: e.project.costPerHour.toString(),
        totalHours: e.hours.toString(),
    }));

    // Aggregate rows with same client/project/user
    const aggMap = new Map<string, RawReportRow>();
    for (const row of rows) {
        const key = `${row.clientId}:${row.projectId}:${row.userId}`;
        const existing = aggMap.get(key);
        if (existing) {
            existing.totalHours = (Number(existing.totalHours) + Number(row.totalHours)).toString();
        } else {
            aggMap.set(key, { ...row });
        }
    }

    return {
        ...buildSummary([...aggMap.values()]),
        year: query.year,
        month: query.month,
    };
}

export async function getQuarterlyReport(
    query: QuarterlyReportQuery,
    currentUser: AuthenticatedUser,
): Promise<QuarterlyReport> {
    const months = [1, 2, 3].map((offset) => ((query.quarter - 1) * 3) + offset);
    const monthReports = await Promise.all(
        months.map((month) =>
            getMonthlyReport(
                { year: query.year, month, clientId: query.clientId, userId: query.userId },
                currentUser,
            ),
        ),
    );

    const totalHours = monthReports.reduce((s, r) => s + r.totalHours, 0);
    const totalCost = monthReports.reduce((s, r) => s + r.totalCost, 0);

    return { year: query.year, quarter: query.quarter, months: monthReports, totalHours, totalCost };
}

export async function getYearlyReport(
    query: YearlyReportQuery,
    currentUser: AuthenticatedUser,
): Promise<YearlyReport> {
    const monthReports = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
            getMonthlyReport(
                { year: query.year, month: i + 1, clientId: query.clientId, userId: query.userId },
                currentUser,
            ),
        ),
    );

    const totalHours = monthReports.reduce((s, r) => s + r.totalHours, 0);
    const totalCost = monthReports.reduce((s, r) => s + r.totalCost, 0);

    const quarters = [1, 2, 3, 4].map((q) => ({
        quarter: q,
        hours: monthReports
            .slice((q - 1) * 3, q * 3)
            .reduce((s, r) => s + r.totalHours, 0),
        cost: monthReports
            .slice((q - 1) * 3, q * 3)
            .reduce((s, r) => s + r.totalCost, 0),
    }));

    return { year: query.year, months: monthReports, quarters, totalHours, totalCost };
}
