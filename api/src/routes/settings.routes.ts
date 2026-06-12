import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateSettingsSchema } from '../schemas/settings.schema';
import * as ctrl from '../controllers/settings.controller';

const router = Router();

router.use(authenticate);

// Any authenticated user may read settings (needed for invoice From field)
router.get('/', ctrl.get);

// Only admins may change the shared company name
router.patch('/', authorize('ADMIN'), validate(updateSettingsSchema), ctrl.update);

export default router;
