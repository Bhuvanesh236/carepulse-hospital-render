import { Router } from 'express';
import { registerPatient, login, logout, getMe, registerSchema, loginSchema } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', validateBody(registerSchema), registerPatient);
router.post('/login', validateBody(loginSchema), login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);

export default router;
