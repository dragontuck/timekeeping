import { Request, Response, NextFunction } from 'express';
import * as service from '../services/alerts.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await service.listAlerts(req.query as never, req.user!);
        res.json(result);
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const alert = await service.createAlert(req.body, req.user!);
        res.status(201).json({ data: alert });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const alert = await service.updateAlert(req.params['id']!, req.body, req.user!);
        res.json({ data: alert });
    } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await service.deleteAlert(req.params['id']!, req.user!);
        res.status(204).send();
    } catch (err) { next(err); }
}
