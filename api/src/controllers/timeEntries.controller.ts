import { Request, Response, NextFunction } from 'express';
import * as service from '../services/timeEntries.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await service.listTimeEntries(req.query as never, req.user!);
        res.json(result);
    } catch (err) { next(err); }
}

export async function weekly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await service.getWeeklyEntries(req.query as never, req.user!);
        res.json({ data: result });
    } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const entry = await service.getTimeEntryById(req.params['id']!, req.user!);
        res.json({ data: entry });
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const entry = await service.createTimeEntry(req.body, req.user!);
        res.status(201).json({ data: entry });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const entry = await service.updateTimeEntry(req.params['id']!, req.body, req.user!);
        res.json({ data: entry });
    } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const reason = typeof req.query['reason'] === 'string' ? req.query['reason'] : undefined;
        await service.deleteTimeEntry(req.params['id']!, req.user!, reason);
        res.status(204).send();
    } catch (err) { next(err); }
}
