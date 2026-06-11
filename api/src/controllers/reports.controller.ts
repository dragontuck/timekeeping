import { Request, Response, NextFunction } from 'express';
import * as service from '../services/reports.service';

export async function monthly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await service.getMonthlyReport(req.query as never, req.user!);
        res.json({ data });
    } catch (err) { next(err); }
}

export async function quarterly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await service.getQuarterlyReport(req.query as never, req.user!);
        res.json({ data });
    } catch (err) { next(err); }
}

export async function yearly(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await service.getYearlyReport(req.query as never, req.user!);
        res.json({ data });
    } catch (err) { next(err); }
}
