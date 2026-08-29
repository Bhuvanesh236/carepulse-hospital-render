import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { bookAppointment, rescheduleAppointment, cancelAppointment } from '../services/appointmentService';
import { Appointment, Patient } from '../types';

export const bookAppointmentSchema = z.object({
  doctorId: z.number().positive('Doctor selection is required'),
  departmentId: z.number().positive('Department selection is required'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date is required (YYYY-MM-DD)'),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Valid time slot is required'),
  reason: z.string().min(3, 'Please specify the reason for consultation (min 3 characters)'),
  priority: z.enum(['EMERGENCY', 'HIGH', 'NORMAL', 'LOW']).optional()
});

export const rescheduleSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid new date is required (YYYY-MM-DD)'),
  newStartTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Valid new time slot is required')
});

export const cancelSchema = z.object({
  reason: z.string().optional()
});

export async function createAppointment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let patientId = req.user!.patientId;

    // If patientId not in token (or admin booking on behalf), look it up
    if (!patientId) {
      const pat = await db.getOne<Patient>('SELECT id FROM patients WHERE user_id = ?', [req.user!.userId]);
      if (!pat) {
        return res.status(400).json({
          success: false,
          message: 'Patient profile not found. Please complete your registration.'
        });
      }
      patientId = pat.id;
    }

    const { doctorId, departmentId, appointmentDate, startTime, reason, priority } = req.body;

    const appointment = await bookAppointment({
      patientId,
      doctorId,
      departmentId,
      appointmentDate,
      startTime,
      reason,
      priority,
      userId: req.user!.userId,
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
}

export async function getAppointmentById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const apptId = parseInt(req.params.id, 10);
    if (isNaN(apptId)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }

    const appointment = await db.getOne<Appointment>(
      `SELECT a.*, p.full_name as patient_name, p.patient_id_code as patient_code, p.phone as patient_phone,
              p.gender as patient_gender, p.dob as patient_dob,
              d.full_name as doctor_name, d.doctor_id_code as doctor_code,
              d.specialization as doctor_specialization, d.room_number as doctor_room,
              dep.name as department_name,
              q.queue_number, q.status as queue_status, q.queue_position, q.estimated_wait_minutes
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       LEFT JOIN queue_entries q ON a.id = q.appointment_id
       WHERE a.id = ?`,
      [apptId]
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Role access control: Patients can only view their own appointments
    if (req.user!.role === 'PATIENT' && req.user!.patientId && appointment.patient_id !== req.user!.patientId) {
      return res.status(403).json({ success: false, message: 'Access denied to this appointment.' });
    }

    return res.status(200).json({
      success: true,
      appointment
    });
  } catch (error) {
    next(error);
  }
}

export async function reschedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const apptId = parseInt(req.params.id, 10);
    const { newDate, newStartTime } = req.body;

    const pat = await db.getOne<Patient>('SELECT id FROM patients WHERE user_id = ?', [req.user!.userId]);
    const patientId = req.user!.patientId || pat?.id;

    if (!patientId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updatedAppointment = await rescheduleAppointment({
      appointmentId: apptId,
      newDate,
      newStartTime,
      userId: req.user!.userId,
      patientId: patientId || 0,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const apptId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    const pat = await db.getOne<Patient>('SELECT id FROM patients WHERE user_id = ?', [req.user!.userId]);
    const patientId = req.user!.patientId || pat?.id;

    await cancelAppointment({
      appointmentId: apptId,
      reason,
      userId: req.user!.userId,
      userRole: req.user!.role,
      patientId,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
}
