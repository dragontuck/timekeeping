import { timeEntryListQuerySchema } from '../../src/schemas/timeEntries.schema';

describe('timeEntryListQuerySchema', () => {
    it('parses isBilled=false from query string to boolean false', () => {
        const parsed = timeEntryListQuerySchema.parse({
            clientId: 'd95bbc29-1d5b-4319-9293-ccedca813a6b',
            startDate: '2026-06-01',
            endDate: '2026-06-30',
            isBilled: 'false',
            limit: '100',
        });

        expect(parsed.isBilled).toBe(false);
        expect(parsed.limit).toBe(100);
    });

    it('parses isBilled=true from query string to boolean true', () => {
        const parsed = timeEntryListQuerySchema.parse({
            isBilled: 'true',
        });

        expect(parsed.isBilled).toBe(true);
    });

    it('applies pagination defaults when omitted', () => {
        const parsed = timeEntryListQuerySchema.parse({});

        expect(parsed.page).toBe(1);
        expect(parsed.limit).toBe(50);
    });

    it('rejects invalid boolean value for isBilled', () => {
        const result = timeEntryListQuerySchema.safeParse({
            isBilled: 'nope',
        });

        expect(result.success).toBe(false);
    });
});
