import { Router } from 'express';
import authRoutes from './authRoutes';
import patientRoutes from './patientRoutes';
import doctorRoutes from './doctorRoutes';
import appointmentRoutes from './appointmentRoutes';
import queueRoutes from './queueRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/queue', queueRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'Intelligent Hospital Appointment and Queue Optimization System',
    timestamp: new Date().toISOString()
  });
});

export default router;
