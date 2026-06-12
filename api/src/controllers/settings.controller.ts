import { Request, Response, NextFunction } from 'express';
import * as service from '../services/settings.service';

export async function get(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const settings = await service.getSettings();
        res.json({ data: settings });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const settings = await service.updateSettings(req.body);
        res.json({ data: settings });
    } catch (err) { next(err); }
}
