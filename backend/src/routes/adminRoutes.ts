import { Router } from 'express';
import {
  getAdminDashboardStats,
  getAllPatients,
  unflagPatient,
  createDoctor,
  updateDoctor,
  createDepartment,
  getAllAppointments,
  getSystemSettings,
  updateSystemSetting,
  getAuditLogs,
  getReportsAndAnalytics
} from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN']));

router.get('/dashboard', getAdminDashboardStats);
router.get('/patients', getAllPatients);
router.put('/patients/:id/unflag', unflagPatient);

router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctor);

router.post('/departments', createDepartment);
router.get('/appointments', getAllAppointments);

router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSetting);

router.get('/audit-logs', getAuditLogs);
router.get('/reports', getReportsAndAnalytics);

export default router;
