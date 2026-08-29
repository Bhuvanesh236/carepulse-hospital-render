import { Router } from 'express';
import {
  getAllDoctors,
  getDoctorById,
  getDoctorAvailability,
  updateDoctorStatus,
  getAllDepartments
} from '../controllers/doctorController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Public / Patient endpoints
router.get('/departments', getAllDepartments);
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/availability', getDoctorAvailability);

// Doctor status management
router.put('/me/status', requireAuth, requireRole(['DOCTOR', 'ADMIN']), updateDoctorStatus);

export default router;
