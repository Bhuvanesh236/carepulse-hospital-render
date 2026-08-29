import { Router } from 'express';
import {
  createAppointment,
  getAppointmentById,
  reschedule,
  cancel,
  bookAppointmentSchema,
  rescheduleSchema,
  cancelSchema
} from '../controllers/appointmentController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(requireAuth);

router.post('/', validateBody(bookAppointmentSchema), createAppointment);
router.get('/:id', getAppointmentById);
router.post('/:id/reschedule', validateBody(rescheduleSchema), reschedule);
router.post('/:id/cancel', validateBody(cancelSchema), cancel);

export default router;
