import { Router } from 'express';
import {
  checkIn,
  getDoctorQueue,
  getPublicQueueBoard,
  callPatient,
  startConsultation,
  completeConsultation,
  markNoShow,
  skipPatient,
  escalatePriority,
  checkInSchema,
  priorityUpdateSchema
} from '../controllers/queueController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

// Public live board
router.get('/public-board', getPublicQueueBoard);

// Patient check-in
router.post('/check-in', requireAuth, validateBody(checkInSchema), checkIn);

// Doctor live queue status
router.get('/doctor/:doctorId', requireAuth, getDoctorQueue);

// Doctor & Admin queue actions
router.post('/:id/call', requireAuth, requireRole(['DOCTOR', 'ADMIN']), callPatient);
router.post('/:id/start', requireAuth, requireRole(['DOCTOR', 'ADMIN']), startConsultation);
router.post('/:id/complete', requireAuth, requireRole(['DOCTOR', 'ADMIN']), completeConsultation);
router.post('/:id/no-show', requireAuth, requireRole(['DOCTOR', 'ADMIN']), markNoShow);
router.post('/:id/skip', requireAuth, requireRole(['DOCTOR', 'ADMIN']), skipPatient);
router.post('/:id/priority', requireAuth, requireRole(['DOCTOR', 'ADMIN']), validateBody(priorityUpdateSchema), escalatePriority);

export default router;
