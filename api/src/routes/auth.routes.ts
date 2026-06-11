import { Router } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { loginSchema } from '../schemas/auth.schema';
import * as ctrl from '../controllers/auth.controller';

const router = Router();

router.post('/login', authRateLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', authRateLimiter, ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);

export default router;
