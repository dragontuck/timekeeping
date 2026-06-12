import { z } from 'zod';

// Parse query-string booleans strictly so "false" does not become true.
export const booleanFromQuery = z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return value;
}, z.boolean());
