import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
    createTimeEntrySchema,
    updateTimeEntrySchema,
    timeEntryListQuerySchema,
    weeklyQuerySchema,
} from '../schemas/timeEntries.schema';
import * as ctrl from '../controllers/timeEntries.controller';

const router = Router();

router.use(authenticate);

router.get('/weekly', validate(weeklyQuerySchema, 'query'), ctrl.weekly);
router.get('/', validate(timeEntryListQuerySchema, 'query'), ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(createTimeEntrySchema), ctrl.create);
router.patch('/:id', validate(updateTimeEntrySchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
