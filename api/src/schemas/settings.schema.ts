import { z } from 'zod';

export const updateSettingsSchema = z.object({
    sharedCompanyName: z.string().max(200).optional().nullable(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
