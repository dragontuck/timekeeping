import { Request, Response, NextFunction } from 'express';
import * as projectsService from '../services/projects.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await projectsService.listProjects(req.query as never);
        res.json(result);
    } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const project = await projectsService.getProjectById(req.params['id']!);
        res.json({ data: project });
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const project = await projectsService.createProject(req.body, req.user!);
        res.status(201).json({ data: project });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const project = await projectsService.updateProject(req.params['id']!, req.body, req.user!);
        res.json({ data: project });
    } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const project = await projectsService.deleteProject(req.params['id']!, req.user!);
        res.json({ data: project });
    } catch (err) { next(err); }
}
