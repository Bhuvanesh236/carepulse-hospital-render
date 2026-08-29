import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../config/database';
import { signToken } from '../utils/jwt';
import { generatePatientId } from '../utils/idGenerator';
import { logAudit } from '../services/auditService';
import { AuthenticatedRequest } from '../middleware/auth';
import { User, Patient, Doctor } from '../types';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Date of Birth is required (YYYY-MM-DD)'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export async function registerPatient(req: Request, res: Response, next: NextFunction) {
  try {
    const { fullName, dob, gender, phone, email, address, password } = req.body;

    // Check duplicate email
    const existingUser = await db.getOne<User>('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Check duplicate phone
    const existingPhone = await db.getOne<Patient>('SELECT id FROM patients WHERE phone = ?', [phone]);
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'A patient with this phone number is already registered.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Auto-generate Patient ID code e.g. PAT-2026-000001
    const patientIdCode = await generatePatientId();

    const result = await db.transaction(async (trx) => {
      // Create user record
      const userRes = await trx.execute(
        `INSERT INTO users (email, password_hash, role, status) 
         VALUES (?, ?, 'PATIENT', 'ACTIVE')`,
        [email.toLowerCase(), passwordHash]
      );
      const userId = userRes.insertId;

      // Create patient profile
      const patRes = await trx.execute(
        `INSERT INTO patients (user_id, patient_id_code, full_name, dob, gender, phone, address, risk_flag_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [userId, patientIdCode, fullName, dob, gender, phone, address]
      );
      const patientId = patRes.insertId;

      return { userId, patientId };
    });

    // Generate JWT token
    const token = signToken({
      userId: result.userId,
      email: email.toLowerCase(),
      role: 'PATIENT',
      patientId: result.patientId,
      patientCode: patientIdCode,
      fullName
    });

    // Log audit
    await logAudit({
      userId: result.userId,
      action: 'PATIENT_REGISTER',
      entityType: 'patient',
      entityId: result.patientId,
      details: { patientIdCode, email: email.toLowerCase() },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      patientId: patientIdCode,
      token,
      user: {
        id: result.userId,
        patientId: result.patientId,
        patientCode: patientIdCode,
        fullName,
        email: email.toLowerCase(),
        role: 'PATIENT'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await db.getOne<User>(
      'SELECT id, email, password_hash, role, status FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact hospital administration.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    let profileData: any = {};
    if (user.role === 'PATIENT') {
      const patient = await db.getOne<Patient>('SELECT * FROM patients WHERE user_id = ?', [user.id]);
      if (patient) {
        profileData = {
          patientId: patient.id,
          patientCode: patient.patient_id_code,
          fullName: patient.full_name,
          riskFlagLevel: patient.risk_flag_level
        };
      }
    } else if (user.role === 'DOCTOR') {
      const doctor = await db.getOne<Doctor>('SELECT * FROM doctors WHERE user_id = ?', [user.id]);
      if (doctor) {
        profileData = {
          doctorId: doctor.id,
          doctorCode: doctor.doctor_id_code,
          fullName: doctor.full_name,
          departmentId: doctor.department_id,
          specialization: doctor.specialization
        };
      }
    } else if (user.role === 'ADMIN') {
      profileData = {
        fullName: 'Hospital Administrator'
      };
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      ...profileData
    });

    await logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      details: { role: user.role },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        ...profileData
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user.userId,
        action: 'USER_LOGOUT',
        entityType: 'user',
        entityId: req.user.userId,
        ipAddress: req.ip
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await db.getOne<User>(
      'SELECT id, email, role, status, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let details: any = {};
    let extraFields: any = {};
    if (user.role === 'PATIENT') {
      details = await db.getOne<Patient>('SELECT * FROM patients WHERE user_id = ?', [user.id]);
      if (details) {
        extraFields = {
          patientId: details.id,
          patientCode: details.patient_id_code,
          fullName: details.full_name,
          phone: details.phone,
          dob: details.dob,
          gender: details.gender,
          address: details.address,
          bloodGroup: details.blood_group,
          emergencyContact: details.emergency_contact,
          riskFlagLevel: details.risk_flag_level
        };
      }
    } else if (user.role === 'DOCTOR') {
      details = await db.getOne<Doctor>(
        `SELECT d.*, dep.name as department_name 
         FROM doctors d 
         JOIN departments dep ON d.department_id = dep.id 
         WHERE d.user_id = ?`,
        [user.id]
      );
      if (details) {
        extraFields = {
          doctorId: details.id,
          doctorCode: details.doctor_id_code,
          fullName: details.full_name,
          departmentId: details.department_id,
          specialization: details.specialization,
          roomNumber: details.room_number,
          doctorStatus: details.status
        };
      }
    } else if (user.role === 'ADMIN') {
      extraFields = {
        fullName: 'Hospital Administrator'
      };
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        ...extraFields,
        profile: details
      }
    });
  } catch (error) {
    next(error);
  }
}
