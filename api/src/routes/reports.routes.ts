import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
    monthlyReportQuerySchema,
    quarterlyReportQuerySchema,
    yearlyReportQuerySchema,
} from '../schemas/reports.schema';
import * as ctrl from '../controllers/reports.controller';

const router = Router();

router.use(authenticate);

router.get('/monthly', validate(monthlyReportQuerySchema, 'query'), ctrl.monthly);
router.get('/quarterly', validate(quarterlyReportQuerySchema, 'query'), ctrl.quarterly);
router.get('/yearly', validate(yearlyReportQuerySchema, 'query'), ctrl.yearly);

export default router;
