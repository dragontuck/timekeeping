import { Request, Response, NextFunction } from 'express';
import * as clientsService from '../services/clients.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await clientsService.listClients(req.query as never, req.user!);
        res.json(result);
    } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const client = await clientsService.getClientById(req.params['id']!, req.user!);
        res.json({ data: client });
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const client = await clientsService.createClient(req.body, req.user!);
        res.status(201).json({ data: client });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const client = await clientsService.updateClient(req.params['id']!, req.body, req.user!);
        res.json({ data: client });
    } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const client = await clientsService.deleteClient(req.params['id']!, req.user!);
        res.json({ data: client });
    } catch (err) { next(err); }
}
