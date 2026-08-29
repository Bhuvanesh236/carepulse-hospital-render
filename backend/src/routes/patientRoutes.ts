import { Router } from 'express';
import {
  getPatientProfile,
  updatePatientProfile,
  getPatientAppointments,
  getActivePatientQueue,
  getPatientNotifications,
  markNotificationRead,
  updateProfileSchema
} from '../controllers/patientController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['PATIENT', 'ADMIN']));

router.get('/me', getPatientProfile);
router.put('/me', validateBody(updateProfileSchema), updatePatientProfile);
router.get('/appointments', getPatientAppointments);
router.get('/queue', getActivePatientQueue);
router.get('/notifications', getPatientNotifications);
router.put('/notifications/:id/read', markNotificationRead);

export default router;
