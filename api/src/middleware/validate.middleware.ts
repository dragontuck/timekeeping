import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

type ValidatedFields = 'body' | 'query' | 'params';

/**
 * Returns an Express middleware that parses and validates a request field
 * against the provided Zod schema. On success, replaces the field with the
 * parsed (typed) value. On failure, passes a ZodError to the error handler.
 */
export function validate(schema: AnyZodObject, field: ValidatedFields = 'body') {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const parsed = schema.parse(req[field]);
            // Replace with coerced/transformed values
            (req as unknown as Record<string, unknown>)[field] = parsed;
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                next(err);
            } else {
                next(err);
            }
        }
    };
}
