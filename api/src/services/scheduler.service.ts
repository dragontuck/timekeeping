import cron from 'node-cron';
import { prisma } from '../config/database';
import { sendDailyReminderEmail, sendWeeklySummaryEmail } from './email.service';
import { logger } from '../utils/logger.util';
import { decrypt } from '../utils/crypto.util';
import { format, startOfWeek, endOfWeek } from 'date-fns';

/** Groups an array by a key function */
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
    return arr.reduce<Record<string, T[]>>((acc, item) => {
        const k = key(item);
        (acc[k] ??= []).push(item);
        return acc;
    }, {});
}

async function runDailyAlerts(): Promise<void> {
    logger.info('Running daily alert job');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    try {
        // Get all active daily alerts
        const alerts = await prisma.alert.findMany({
            where: { type: 'DAILY', isEnabled: true, user: { isActive: true } },
            include: {
                user: { select: { id: true, email: true, firstName: true, gmailUser: true, gmailAppPasswordEnc: true } },
                project: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        client: { select: { name: true } },
                    },
                },
            },
        });

        // Get today's logged entries for all affected users
        const userIds = [...new Set(alerts.map((a) => a.userId))];
        const todayEntries = await prisma.timeEntry.findMany({
            where: { userId: { in: userIds }, date: today },
            select: { userId: true, projectId: true },
        });

        const loggedSet = new Set(todayEntries.map((e) => `${e.userId}:${e.projectId}`));

        // Find missing entries per user
        const missing: Array<{
            userId: string;
            email: string;
            firstName: string;
            gmailUser: string | null;
            gmailAppPasswordEnc: string | null;
            projectName: string;
            clientName: string;
        }> = [];

        for (const alert of alerts) {
            if (!alert.project.isActive) continue;
            const key = `${alert.userId}:${alert.projectId}`;
            if (!loggedSet.has(key)) {
                missing.push({
                    userId: alert.userId,
                    email: alert.user.email,
                    firstName: alert.user.firstName,
                    gmailUser: alert.user.gmailUser,
                    gmailAppPasswordEnc: alert.user.gmailAppPasswordEnc,
                    projectName: alert.project.name,
                    clientName: alert.project.client.name,
                });
            }
        }

        // Group by user and send one email per user
        const byUser = groupBy(missing, (m) => m.userId);
        const sendPromises = Object.values(byUser).map((entries) => {
            const first = entries[0]!;
            if (!first.gmailUser || !first.gmailAppPasswordEnc) {
                logger.warn('Skipping daily alert – Gmail not configured', { userId: first.userId });
                return Promise.resolve();
            }
            const gmailAppPassword = decrypt(first.gmailAppPasswordEnc);
            return sendDailyReminderEmail(
                {
                    to: first.email,
                    firstName: first.firstName,
                    missingProjects: entries.map((e) => ({
                        projectName: e.projectName,
                        clientName: e.clientName,
                    })),
                },
                { gmailUser: first.gmailUser, gmailAppPassword },
            ).catch((err) => logger.error('Failed to send daily alert', { email: first.email, err }));
        });

        await Promise.allSettled(sendPromises);
        logger.info(`Daily alerts sent to ${Object.keys(byUser).length} user(s)`);
    } catch (err) {
        logger.error('Daily alert job failed', { err });
    }
}

async function runWeeklyAlerts(): Promise<void> {
    logger.info('Running weekly alert job');
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });     // Sunday
    weekStart.setUTCHours(0, 0, 0, 0);
    weekEnd.setUTCHours(23, 59, 59, 999);

    try {
        const alerts = await prisma.alert.findMany({
            where: { type: 'WEEKLY', isEnabled: true, user: { isActive: true } },
            include: {
                user: { select: { id: true, email: true, firstName: true, gmailUser: true, gmailAppPasswordEnc: true } },
                project: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        costPerHour: true,
                        client: { select: { name: true } },
                    },
                },
            },
        });

        // Get weekly time entries for all affected users
        const userIds = [...new Set(alerts.map((a) => a.userId))];
        const weekEntries = await prisma.timeEntry.findMany({
            where: { userId: { in: userIds }, date: { gte: weekStart, lte: weekEnd } },
            select: { userId: true, projectId: true, hours: true },
        });

        // Build a map: userId:projectId → totalHours
        const hoursMap = new Map<string, number>();
        for (const e of weekEntries) {
            const key = `${e.userId}:${e.projectId}`;
            hoursMap.set(key, (hoursMap.get(key) ?? 0) + Number(e.hours));
        }

        // Build per-user summaries
        const userSummaries = new Map<string, {
            email: string;
            firstName: string;
            gmailUser: string | null;
            gmailAppPasswordEnc: string | null;
            summaries: Array<{ projectName: string; clientName: string; hours: number; cost: number }>;
        }>();

        for (const alert of alerts) {
            if (!alert.project.isActive) continue;
            const hours = hoursMap.get(`${alert.userId}:${alert.projectId}`) ?? 0;
            const cost = hours * Number(alert.project.costPerHour);

            const existing = userSummaries.get(alert.userId) ?? {
                email: alert.user.email,
                firstName: alert.user.firstName,
                gmailUser: alert.user.gmailUser,
                gmailAppPasswordEnc: alert.user.gmailAppPasswordEnc,
                summaries: [],
            };
            existing.summaries.push({
                projectName: alert.project.name,
                clientName: alert.project.client.name,
                hours,
                cost,
            });
            userSummaries.set(alert.userId, existing);
        }

        const weekRange = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

        const sendPromises = [...userSummaries.entries()].map(([, data]) => {
            if (!data.gmailUser || !data.gmailAppPasswordEnc) {
                logger.warn('Skipping weekly summary – Gmail not configured', { email: data.email });
                return Promise.resolve();
            }
            const gmailAppPassword = decrypt(data.gmailAppPasswordEnc);
            const totalHours = data.summaries.reduce((s, r) => s + r.hours, 0);
            const totalCost = data.summaries.reduce((s, r) => s + r.cost, 0);
            return sendWeeklySummaryEmail(
                {
                    to: data.email,
                    firstName: data.firstName,
                    weekRange,
                    summaries: data.summaries,
                    totalHours,
                    totalCost,
                },
                { gmailUser: data.gmailUser, gmailAppPassword },
            ).catch((err) => logger.error('Failed to send weekly summary', { email: data.email, err }));
        });

        await Promise.allSettled(sendPromises);
        logger.info(`Weekly summaries sent to ${userSummaries.size} user(s)`);
    } catch (err) {
        logger.error('Weekly alert job failed', { err });
    }
}

export function startScheduler(): void {
    // Daily reminders: 9:00 AM, Monday–Friday
    cron.schedule('0 9 * * 1-5', () => {
        void runDailyAlerts();
    });

    // Weekly summaries: 4:00 PM every Friday
    cron.schedule('0 16 * * 5', () => {
        void runWeeklyAlerts();
    });

    logger.info('Scheduler started: daily (Mon–Fri 9am), weekly (Fri 4pm)');
}
