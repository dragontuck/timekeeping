import { Request, Response, NextFunction } from 'express';
import * as auditService from '../services/audit.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await auditService.listAuditLogs(req.query as never);
        res.json(result);
    } catch (err) { next(err); }
}
