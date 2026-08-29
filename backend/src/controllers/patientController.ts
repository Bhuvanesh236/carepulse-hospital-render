import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { Patient, Appointment } from '../types';
import { logAudit } from '../services/auditService';
import { getPatientQueueStatus } from '../services/queueEngine';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  address: z.string().min(5).optional(),
  emergencyContact: z.string().optional(),
  bloodGroup: z.string().optional()
});

export async function getPatientProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const patient = await db.getOne<Patient & { email: string }>(
      `SELECT p.*, u.email 
       FROM patients p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = ?`,
      [req.user!.userId]
    );

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    return res.status(200).json({
      success: true,
      patient
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePatientProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { fullName, phone, address, emergencyContact, bloodGroup } = req.body;

    const patient = await db.getOne<Patient>('SELECT * FROM patients WHERE user_id = ?', [req.user!.userId]);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    await db.execute(
      `UPDATE patients 
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           emergency_contact = COALESCE(?, emergency_contact),
           blood_group = COALESCE(?, blood_group)
       WHERE id = ?`,
      [fullName, phone, address, emergencyContact, bloodGroup, patient.id]
    );

    await logAudit({
      userId: req.user!.userId,
      action: 'PATIENT_PROFILE_UPDATE',
      entityType: 'patient',
      entityId: patient.id,
      ipAddress: req.ip
    });

    const updated = await db.getOne<Patient>('SELECT * FROM patients WHERE id = ?', [patient.id]);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      patient: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function getPatientAppointments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const patient = await db.getOne<Patient>('SELECT id FROM patients WHERE user_id = ?', [req.user!.userId]);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }

    const appointments = await db.query<Appointment>(
      `SELECT a.*, d.full_name as doctor_name, d.doctor_id_code as doctor_code,
              d.specialization as doctor_specialization, d.room_number as doctor_room,
              d.status as doctor_status, dep.name as department_name,
              q.queue_number, q.status as queue_status, q.queue_position, q.estimated_wait_minutes
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       LEFT JOIN queue_entries q ON a.id = q.appointment_id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [patient.id]
    );

    return res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    next(error);
  }
}

export async function getActivePatientQueue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const patient = await db.getOne<Patient>('SELECT id FROM patients WHERE user_id = ?', [req.user!.userId]);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Find today's active queue entry for patient
    const activeAppt = await db.getOne<Appointment>(
      `SELECT a.id 
       FROM appointments a
       JOIN queue_entries q ON a.id = q.appointment_id
       WHERE a.patient_id = ? 
         AND a.appointment_date = CURRENT_DATE 
         AND q.status IN ('WAITING', 'CALLED', 'IN_PROGRESS')
       ORDER BY a.id DESC LIMIT 1`,
      [patient.id]
    );

    if (!activeAppt) {
      return res.status(200).json({
        success: true,
        inQueue: false,
        message: 'No active queue entry for today.'
      });
    }

    const queueStatus = await getPatientQueueStatus(activeAppt.id);

    return res.status(200).json({
      success: true,
      inQueue: true,
      queue: queueStatus
    });
  } catch (error) {
    next(error);
  }
}

export async function getPatientNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user!.userId]
    );

    return res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const notifId = req.params.id;
    await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [
      notifId,
      req.user!.userId
    ]);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
}
