import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
    createUserSchema,
    updateUserSchema,
    changePasswordSchema,
    userListQuerySchema,
} from '../schemas/users.schema';
import * as ctrl from '../controllers/users.controller';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN'), validate(userListQuerySchema, 'query'), ctrl.list);
router.post('/', authorize('ADMIN'), validate(createUserSchema), ctrl.create);
router.get('/:id', ctrl.getById);
router.patch('/:id', validate(updateUserSchema), ctrl.update);
router.patch('/:id/disable', authorize('ADMIN'), ctrl.disable);
router.post('/:id/password', validate(changePasswordSchema), ctrl.changePassword);

export default router;
