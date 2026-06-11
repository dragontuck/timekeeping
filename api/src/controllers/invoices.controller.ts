import { Request, Response, NextFunction } from 'express';
import * as service from '../services/invoices.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await service.listInvoices(req.query as never, req.user!);
        res.json(result);
    } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const invoice = await service.getInvoiceById(req.params['id']!, req.user!);
        res.json({ data: invoice });
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const invoice = await service.createInvoice(req.body, req.user!);
        res.status(201).json({ data: invoice });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const invoice = await service.updateInvoice(req.params['id']!, req.body, req.user!);
        res.json({ data: invoice });
    } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const invoice = await service.updateInvoiceStatus(req.params['id']!, req.body, req.user!);
        res.json({ data: invoice });
    } catch (err) { next(err); }
}

export async function send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const invoice = await service.sendInvoice(req.params['id']!, req.user!);
        res.json({ data: invoice });
    } catch (err) { next(err); }
}

export async function getPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const invoice = await service.getInvoiceById(req.params['id']!, req.user!);
        const pdfBuffer = await service.getInvoicePdf(req.params['id']!, req.user!);
        const filename = `${invoice.invoiceNumber}.pdf`;
        const disposition = req.query['download'] === 'true' ? 'attachment' : 'inline';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
        res.send(pdfBuffer);
    } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await service.deleteInvoice(req.params['id']!, req.user!);
        res.status(204).send();
    } catch (err) { next(err); }
}
