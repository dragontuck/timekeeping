import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createClientSchema, updateClientSchema, clientListQuerySchema } from '../schemas/clients.schema';
import * as ctrl from '../controllers/clients.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(clientListQuerySchema, 'query'), ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(createClientSchema), ctrl.create);
router.patch('/:id', validate(updateClientSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
