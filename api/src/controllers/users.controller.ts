import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await usersService.listUsers(req.query as never);
        res.json(result);
    } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await usersService.getUserById(req.params['id']!);
        res.json({ data: user });
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await usersService.createUser(req.body);
        res.status(201).json({ data: user });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await usersService.updateUser(req.params['id']!, req.body);
        res.json({ data: user });
    } catch (err) { next(err); }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // Allow admins to change any user's password; standard users only own
        const targetId = req.user!.role === 'ADMIN'
            ? (req.params['id'] ?? req.user!.id)
            : req.user!.id;
        await usersService.changePassword(targetId, req.body);
        res.status(200).json({ data: { message: 'Password updated' } });
    } catch (err) { next(err); }
}

export async function disable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await usersService.disableUser(req.params['id']!, req.user!.id);
        res.json({ data: user });
    } catch (err) { next(err); }
}
