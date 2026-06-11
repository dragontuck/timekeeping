import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProjectSchema, updateProjectSchema, projectListQuerySchema } from '../schemas/projects.schema';
import * as ctrl from '../controllers/projects.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(projectListQuerySchema, 'query'), ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(createProjectSchema), ctrl.create);
router.patch('/:id', validate(updateProjectSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
