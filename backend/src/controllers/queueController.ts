import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateQueueNumber } from '../utils/idGenerator';
import { calculatePriorityScore, recalculateDoctorQueue, getPatientQueueStatus } from '../services/queueEngine';
import { logAudit } from '../services/auditService';
import { sendNotification } from '../services/notificationService';
import { Appointment, Doctor, Patient, PriorityLevel, QueueEntry } from '../types';

export const checkInSchema = z.object({
  appointmentId: z.number().positive('Valid appointment ID is required')
});

export const priorityUpdateSchema = z.object({
  priority: z.enum(['EMERGENCY', 'HIGH', 'NORMAL', 'LOW']),
  reason: z.string().min(3, 'Reason for priority change is required')
});

export async function checkIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { appointmentId } = req.body;

    const appointment = await db.getOne<Appointment>(
      'SELECT * FROM appointments WHERE id = ?',
      [appointmentId]
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Role check: Patient must own the appointment or user is staff/admin
    if (req.user!.role === 'PATIENT' && req.user!.patientId && appointment.patient_id !== req.user!.patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to check in for this appointment' });
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot check in for an appointment that is ${appointment.status.toLowerCase()}.`
      });
    }

    // Check if already in queue
    const existingQueue = await db.getOne<QueueEntry>(
      'SELECT * FROM queue_entries WHERE appointment_id = ?',
      [appointmentId]
    );

    if (existingQueue && ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(existingQueue.status)) {
      const status = await getPatientQueueStatus(appointmentId);
      return res.status(200).json({
        success: true,
        message: 'Already checked in.',
        queue: status
      });
    }

    // Verify appointment date is today
    const todayStr = new Date().toISOString().slice(0, 10);
    if (appointment.appointment_date !== todayStr) {
      return res.status(400).json({
        success: false,
        message: `Check-in is only available on the day of appointment (${appointment.appointment_date}). Today is ${todayStr}.`
      });
    }

    // Calculate priority score
    const priorityScore = calculatePriorityScore(
      appointment.priority || 'NORMAL',
      appointment.start_time,
      new Date()
    );

    const queueNumber = await generateQueueNumber(appointment.doctor_id, todayStr);

    const queueEntry = await db.transaction(async (trx) => {
      // Insert queue entry
      const qRes = await trx.execute(
        `INSERT INTO queue_entries 
         (queue_number, appointment_id, patient_id, doctor_id, priority_level, priority_score, status)
         VALUES (?, ?, ?, ?, ?, ?, 'WAITING')`,
        [
          queueNumber,
          appointment.id,
          appointment.patient_id,
          appointment.doctor_id,
          appointment.priority || 'NORMAL',
          priorityScore
        ]
      );

      // Update appointment status to IN_QUEUE
      await trx.execute(
        "UPDATE appointments SET status = 'IN_QUEUE' WHERE id = ?",
        [appointment.id]
      );

      return qRes.insertId;
    });

    // Recalculate doctor queue to assign exact positions and wait times
    await recalculateDoctorQueue(appointment.doctor_id);

    // Audit log
    await logAudit({
      userId: req.user!.userId,
      action: 'QUEUE_CHECKIN',
      entityType: 'queue_entry',
      entityId: queueEntry,
      details: { queueNumber, appointmentCode: appointment.appointment_code },
      ipAddress: req.ip
    });

    // Send notification
    await sendNotification({
      userId: req.user!.userId,
      title: 'Checked In Successfully',
      message: `You have checked in for your appointment. Your queue number is ${queueNumber}.`,
      type: 'CHECKIN_CONFIRMED',
      metadata: { queueNumber, appointmentId }
    });

    const status = await getPatientQueueStatus(appointment.id);

    return res.status(200).json({
      success: true,
      message: `Check-in successful. Your queue number is ${queueNumber}.`,
      queue: status
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorQueue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let doctorId = parseInt(req.params.doctorId, 10);

    // If caller is doctor and no doctorId specified, use token doctorId
    if (isNaN(doctorId) && req.user?.role === 'DOCTOR') {
      const doc = await db.getOne<Doctor>('SELECT id FROM doctors WHERE user_id = ?', [req.user.userId]);
      doctorId = doc?.id || 0;
    }

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Valid doctor ID is required' });
    }

    const doctor = await db.getOne<Doctor>('SELECT * FROM doctors WHERE id = ?', [doctorId]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const queue = await recalculateDoctorQueue(doctorId);

    const currentlyServing = queue.find((q) => q.status === 'IN_PROGRESS') || null;
    const nextPatient = queue.find((q) => q.status === 'CALLED' || q.status === 'WAITING') || null;

    return res.status(200).json({
      success: true,
      doctor,
      queue,
      currentlyServing,
      nextPatient,
      totalWaiting: queue.filter((q) => q.status === 'WAITING').length
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicQueueBoard(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const doctors = await db.query<any>(
      `SELECT d.id, d.full_name, d.specialization, d.room_number, d.status,
              dep.name as department_name,
              COUNT(CASE WHEN q.status = 'WAITING' THEN 1 END) as waiting_count,
              MAX(CASE WHEN q.status = 'IN_PROGRESS' THEN q.queue_number END) as currently_serving,
              MAX(CASE WHEN q.status = 'CALLED' THEN q.queue_number END) as currently_called
       FROM doctors d
       JOIN departments dep ON d.department_id = dep.id
       LEFT JOIN queue_entries q ON d.id = q.doctor_id AND q.created_at >= CURRENT_DATE
       WHERE d.status != 'INACTIVE'
       GROUP BY d.id
       ORDER BY dep.name ASC, d.full_name ASC`
    );

    return res.status(200).json({
      success: true,
      board: doctors
    });
  } catch (error) {
    next(error);
  }
}

export async function callPatient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const queueId = parseInt(req.params.id, 10);
    const entry = await db.getOne<QueueEntry>('SELECT * FROM queue_entries WHERE id = ?', [queueId]);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Queue entry not found' });
    }

    await db.execute(
      "UPDATE queue_entries SET status = 'CALLED', called_time = CURRENT_TIMESTAMP WHERE id = ?",
      [queueId]
    );

    await recalculateDoctorQueue(entry.doctor_id);

    // Notify patient
    const pat = await db.getOne<{ user_id: number; full_name: string }>('SELECT user_id, full_name FROM patients WHERE id = ?', [entry.patient_id]);
    if (pat) {
      await sendNotification({
        userId: pat.user_id,
        title: "Your Turn! Please proceed to doctor's room",
        message: `Queue number ${entry.queue_number} has been called. Please proceed immediately to consultation room.`,
        type: 'QUEUE_CALL',
        metadata: { queueNumber: entry.queue_number }
      });
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'QUEUE_CALL_PATIENT',
      entityType: 'queue_entry',
      entityId: queueId,
      details: { queueNumber: entry.queue_number },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Patient ${entry.queue_number} called.`
    });
  } catch (error) {
    next(error);
  }
}

export async function startConsultation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const queueId = parseInt(req.params.id, 10);
    const entry = await db.getOne<QueueEntry>('SELECT * FROM queue_entries WHERE id = ?', [queueId]);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Queue entry not found' });
    }

    await db.transaction(async (trx) => {
      // Set queue entry to IN_PROGRESS
      await trx.execute(
        "UPDATE queue_entries SET status = 'IN_PROGRESS', start_time = CURRENT_TIMESTAMP WHERE id = ?",
        [queueId]
      );
      // Set appointment to IN_PROGRESS
      await trx.execute(
        "UPDATE appointments SET status = 'IN_PROGRESS' WHERE id = ?",
        [entry.appointment_id]
      );
      // Set doctor status to BUSY
      await trx.execute(
        "UPDATE doctors SET status = 'BUSY' WHERE id = ?",
        [entry.doctor_id]
      );
    });

    await recalculateDoctorQueue(entry.doctor_id);

    await logAudit({
      userId: req.user!.userId,
      action: 'QUEUE_START_CONSULTATION',
      entityType: 'queue_entry',
      entityId: queueId,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Consultation started for ${entry.queue_number}.`
    });
  } catch (error) {
    next(error);
  }
}

export async function completeConsultation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const queueId = parseInt(req.params.id, 10);
    const { notes } = req.body;
    const entry = await db.getOne<QueueEntry>('SELECT * FROM queue_entries WHERE id = ?', [queueId]);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Queue entry not found' });
    }

    await db.transaction(async (trx) => {
      // Set queue entry to COMPLETED
      await trx.execute(
        "UPDATE queue_entries SET status = 'COMPLETED', completed_time = CURRENT_TIMESTAMP, notes = ? WHERE id = ?",
        [notes || null, queueId]
      );
      // Set appointment to COMPLETED
      await trx.execute(
        "UPDATE appointments SET status = 'COMPLETED' WHERE id = ?",
        [entry.appointment_id]
      );
      // Set doctor status back to AVAILABLE
      await trx.execute(
        "UPDATE doctors SET status = 'AVAILABLE' WHERE id = ?",
        [entry.doctor_id]
      );
    });

    // Auto-advance: Recalculate remaining queue
    await recalculateDoctorQueue(entry.doctor_id);

    // Notify patient
    const pat = await db.getOne<{ user_id: number }>('SELECT user_id FROM patients WHERE id = ?', [entry.patient_id]);
    if (pat) {
      await sendNotification({
        userId: pat.user_id,
        title: 'Consultation Completed',
        message: 'Your medical consultation is complete. Thank you for visiting our hospital.',
        type: 'SYSTEM',
        metadata: { queueNumber: entry.queue_number }
      });
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'QUEUE_COMPLETE_CONSULTATION',
      entityType: 'queue_entry',
      entityId: queueId,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Consultation completed for ${entry.queue_number}. Queue automatically updated.`
    });
  } catch (error) {
    next(error);
  }
}

export async function markNoShow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const queueId = parseInt(req.params.id, 10);
    const entry = await db.getOne<QueueEntry>('SELECT * FROM queue_entries WHERE id = ?', [queueId]);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Queue entry not found' });
    }

    await db.transaction(async (trx) => {
      await trx.execute(
        "UPDATE queue_entries SET status = 'NO_SHOW' WHERE id = ?",
        [queueId]
      );
      await trx.execute(
        "UPDATE appointments SET status = 'NO_SHOW' WHERE id = ?",
        [entry.appointment_id]
      );
      // Increment patient no-show counter and auto-flag if threshold reached
      await trx.execute(
        `UPDATE patients 
         SET no_show_count = no_show_count + 1,
             risk_flag_level = CASE 
               WHEN no_show_count + 1 >= 3 THEN 2 
               WHEN no_show_count + 1 >= 2 THEN 1 
               ELSE risk_flag_level 
             END
         WHERE id = ?`,
        [entry.patient_id]
      );
      // Reset doctor status
      await trx.execute(
        "UPDATE doctors SET status = 'AVAILABLE' WHERE id = ?",
        [entry.doctor_id]
      );
    });

    await recalculateDoctorQueue(entry.doctor_id);

    await logAudit({
      userId: req.user!.userId,
      action: 'QUEUE_MARK_NOSHOW',
      entityType: 'queue_entry',
      entityId: queueId,
      details: { queueNumber: entry.queue_number, patientId: entry.patient_id },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Patient ${entry.queue_number} marked as NO-SHOW. Flagging updated.`
    });
  } catch (error) {
    next(error);
  }
}

export async function skipPatient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const queueId = parseInt(req.params.id, 10);
    const entry = await db.getOne<QueueEntry>('SELECT * FROM queue_entries WHERE id = ?', [queueId]);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Queue entry not found' });
    }

    // Lower priority score slightly so they are placed behind current waiting patients
    const newScore = Math.max(100, entry.priority_score - 1500);

    await db.execute(
      "UPDATE queue_entries SET status = 'WAITING', priority_score = ? WHERE id = ?",
      [newScore, queueId]
    );

    await recalculateDoctorQueue(entry.doctor_id);

    await logAudit({
      userId: req.user!.userId,
      action: 'QUEUE_SKIP_PATIENT',
      entityType: 'queue_entry',
      entityId: queueId,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Patient ${entry.queue_number} skipped and re-queued.`
    });
  } catch (error) {
    next(error);
  }
}

export async function escalatePriority(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const queueId = parseInt(req.params.id, 10);
    const { priority, reason } = req.body;

    const entry = await db.getOne<QueueEntry>('SELECT * FROM queue_entries WHERE id = ?', [queueId]);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Queue entry not found' });
    }

    const appt = await db.getOne<Appointment>('SELECT start_time FROM appointments WHERE id = ?', [entry.appointment_id]);
    const newScore = calculatePriorityScore(priority as PriorityLevel, appt?.start_time || '09:00:00', new Date());

    await db.transaction(async (trx) => {
      await trx.execute(
        'UPDATE queue_entries SET priority_level = ?, priority_score = ?, notes = ? WHERE id = ?',
        [priority, newScore, `Priority escalated to ${priority}: ${reason}`, queueId]
      );
      await trx.execute(
        'UPDATE appointments SET priority = ? WHERE id = ?',
        [priority, entry.appointment_id]
      );
    });

    // Reorder queue with emergency/high-priority priority insertion
    await recalculateDoctorQueue(entry.doctor_id);

    await logAudit({
      userId: req.user!.userId,
      action: 'PRIORITY_ESCALATION',
      entityType: 'queue_entry',
      entityId: queueId,
      details: { from: entry.priority_level, to: priority, reason },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Patient ${entry.queue_number} prioritized as ${priority}.`
    });
  } catch (error) {
    next(error);
  }
}
