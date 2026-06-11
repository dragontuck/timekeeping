import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
    createInvoiceSchema,
    updateInvoiceSchema,
    updateInvoiceStatusSchema,
    invoiceListQuerySchema,
} from '../schemas/invoices.schema';
import * as ctrl from '../controllers/invoices.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(invoiceListQuerySchema, 'query'), ctrl.list);
router.post('/', validate(createInvoiceSchema), ctrl.create);
router.get('/:id', ctrl.getById);
router.patch('/:id', validate(updateInvoiceSchema), ctrl.update);
router.delete('/:id', ctrl.remove);
router.patch('/:id/status', validate(updateInvoiceStatusSchema), ctrl.updateStatus);
router.post('/:id/send', ctrl.send);
router.get('/:id/pdf', ctrl.getPdf);

export default router;
