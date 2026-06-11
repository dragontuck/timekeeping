import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createAlertSchema, updateAlertSchema, alertListQuerySchema } from '../schemas/alerts.schema';
import * as ctrl from '../controllers/alerts.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(alertListQuerySchema, 'query'), ctrl.list);
router.post('/', validate(createAlertSchema), ctrl.create);
router.patch('/:id', validate(updateAlertSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
