import { prisma } from '../config/database';
import { UpdateSettingsInput } from '../schemas/settings.schema';

const SINGLETON_ID = 'singleton';

export async function getSettings() {
    // Upsert ensures the singleton row always exists
    return prisma.appSettings.upsert({
        where: { id: SINGLETON_ID },
        update: {},
        create: { id: SINGLETON_ID },
    });
}

export async function updateSettings(input: UpdateSettingsInput) {
    return prisma.appSettings.upsert({
        where: { id: SINGLETON_ID },
        update: {
            sharedCompanyName: input.sharedCompanyName ?? null,
        },
        create: {
            id: SINGLETON_ID,
            sharedCompanyName: input.sharedCompanyName ?? null,
        },
    });
}
