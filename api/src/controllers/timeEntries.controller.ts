import { Request, Response, NextFunction } from 'express';
import * as service from '../services/timeEntries.service';
import { logger } from '../utils/logger.util';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        logger.debug('timeEntries.list request', {
            userId: req.user?.id,
            role: req.user?.role,
            query: req.query,
        });
        const result = await service.listTimeEntries(req.query as never, req.user!);
        logger.debug('timeEntries.list success', {
            userId: req.user?.id,
            count: result.data.length,
            page: result.meta.page,
            total: result.meta.total,
        });
        res.json(result);
    } catch (err) {
        logger.warn('timeEntries.list failed', {
            userId: req.user?.id,
            message: err instanceof Error ? err.message : 'Unknown error',
        });
        next(err);
    }
}

export async function weekly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        logger.debug('timeEntries.weekly request', {
            userId: req.user?.id,
            role: req.user?.role,
            query: req.query,
        });
        const result = await service.getWeeklyEntries(req.query as never, req.user!);
        logger.debug('timeEntries.weekly success', {
            userId: req.user?.id,
            weekStart: result.weekStart,
            totalHours: result.totalHours,
        });
        res.json({ data: result });
    } catch (err) {
        logger.warn('timeEntries.weekly failed', {
            userId: req.user?.id,
            message: err instanceof Error ? err.message : 'Unknown error',
        });
        next(err);
    }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        logger.debug('timeEntries.getById request', {
            userId: req.user?.id,
            entryId: req.params['id'],
        });
        const entry = await service.getTimeEntryById(req.params['id']!, req.user!);
        logger.debug('timeEntries.getById success', {
            userId: req.user?.id,
            entryId: entry.id,
        });
        res.json({ data: entry });
    } catch (err) {
        logger.warn('timeEntries.getById failed', {
            userId: req.user?.id,
            entryId: req.params['id'],
            message: err instanceof Error ? err.message : 'Unknown error',
        });
        next(err);
    }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        logger.info('timeEntries.create request', {
            userId: req.user?.id,
            projectId: req.body?.projectId,
            date: req.body?.date,
        });
        const entry = await service.createTimeEntry(req.body, req.user!);
        logger.info('timeEntries.create success', {
            userId: req.user?.id,
            entryId: entry.id,
        });
        res.status(201).json({ data: entry });
    } catch (err) {
        logger.warn('timeEntries.create failed', {
            userId: req.user?.id,
            projectId: req.body?.projectId,
            message: err instanceof Error ? err.message : 'Unknown error',
        });
        next(err);
    }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        logger.info('timeEntries.update request', {
            userId: req.user?.id,
            entryId: req.params['id'],
            fields: Object.keys(req.body ?? {}),
        });
        const entry = await service.updateTimeEntry(req.params['id']!, req.body, req.user!);
        logger.info('timeEntries.update success', {
            userId: req.user?.id,
            entryId: entry.id,
        });
        res.json({ data: entry });
    } catch (err) {
        logger.warn('timeEntries.update failed', {
            userId: req.user?.id,
            entryId: req.params['id'],
            message: err instanceof Error ? err.message : 'Unknown error',
        });
        next(err);
    }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const reason = typeof req.query['reason'] === 'string' ? req.query['reason'] : undefined;
        logger.info('timeEntries.remove request', {
            userId: req.user?.id,
            entryId: req.params['id'],
            hasReason: Boolean(reason),
        });
        await service.deleteTimeEntry(req.params['id']!, req.user!, reason);
        logger.info('timeEntries.remove success', {
            userId: req.user?.id,
            entryId: req.params['id'],
        });
        res.status(204).send();
    } catch (err) {
        logger.warn('timeEntries.remove failed', {
            userId: req.user?.id,
            entryId: req.params['id'],
            message: err instanceof Error ? err.message : 'Unknown error',
        });
        next(err);
    }
}
