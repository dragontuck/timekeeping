import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { auditLogQuerySchema } from '../schemas/audit.schema';
import * as ctrl from '../controllers/audit.controller';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', validate(auditLogQuerySchema, 'query'), ctrl.list);

export default router;
