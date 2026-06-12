import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import clientsRoutes from './clients.routes';
import projectsRoutes from './projects.routes';
import timeEntriesRoutes from './timeEntries.routes';
import reportsRoutes from './reports.routes';
import alertsRoutes from './alerts.routes';
import invoicesRoutes from './invoices.routes';
import auditRoutes from './audit.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/clients', clientsRoutes);
router.use('/projects', projectsRoutes);
router.use('/time-entries', timeEntriesRoutes);
router.use('/reports', reportsRoutes);
router.use('/alerts', alertsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/settings', settingsRoutes);

export default router;
