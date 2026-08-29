import { db, TransactionContext } from '../config/database';
import { Appointment, PriorityLevel, TimeSlot } from '../types';
import { generateAppointmentCode } from '../utils/idGenerator';
import { logAudit } from './auditService';
import { sendNotification } from './notificationService';
import { recalculateDoctorQueue } from './queueEngine';
import { config } from '../config/env';

/**
 * Generates available time slots for a doctor on a specific date.
 */
export async function getDoctorAvailableSlots(doctorId: number, dateStr: string): Promise<TimeSlot[]> {
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday...

  // 1. Check if doctor is on approved leave
  const leave = await db.getOne(
    "SELECT id FROM doctor_leaves WHERE doctor_id = ? AND leave_date = ? AND status = 'APPROVED'",
    [doctorId, dateStr]
  );
  if (leave) {
    return [];
  }

  // 2. Check doctor's schedule for this day of week
  const schedule = await db.getOne<{
    start_time: string;
    end_time: string;
    break_start: string;
    break_end: string;
    slot_duration_minutes: number;
    is_active: number;
  }>(
    'SELECT * FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1',
    [doctorId, dayOfWeek]
  );

  if (!schedule) {
    return [];
  }

  const slotDuration = schedule.slot_duration_minutes || 15;
  const breakStart = schedule.break_start || '13:00:00';
  const breakEnd = schedule.break_end || '14:00:00';

  // 3. Fetch existing active bookings for this doctor on this date
  const bookedAppointments = await db.query<{ start_time: string; end_time: string }>(
    `SELECT start_time, end_time FROM appointments 
     WHERE doctor_id = ? AND appointment_date = ? 
       AND status NOT IN ('CANCELLED', 'RESCHEDULED')`,
    [doctorId, dateStr]
  );

  const bookedSet = new Set(bookedAppointments.map((a) => a.start_time.slice(0, 5)));

  // 4. Generate discrete slots
  const slots: TimeSlot[] = [];
  const [startH, startM] = schedule.start_time.split(':').map(Number);
  const [endH, endM] = schedule.end_time.split(':').map(Number);
  const [bStartH, bStartM] = breakStart.split(':').map(Number);
  const [bEndH, bEndM] = breakEnd.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const breakStartMinutes = bStartH * 60 + bStartM;
  const breakEndMinutes = bEndH * 60 + bEndM;

  const now = new Date();
  const isToday = dateStr === now.toISOString().slice(0, 10);
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  while (currentMinutes + slotDuration <= endMinutes) {
    // Check if slot falls in break time
    const slotEndMin = currentMinutes + slotDuration;
    const isBreak =
      (currentMinutes >= breakStartMinutes && currentMinutes < breakEndMinutes) ||
      (slotEndMin > breakStartMinutes && slotEndMin <= breakEndMinutes);

    const startHourStr = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
    const startMinStr = String(currentMinutes % 60).padStart(2, '0');
    const timeKey = `${startHourStr}:${startMinStr}`;

    const endHourStr = String(Math.floor(slotEndMin / 60)).padStart(2, '0');
    const endMinStr = String(slotEndMin % 60).padStart(2, '0');
    const endKey = `${endHourStr}:${endMinStr}`;

    if (!isBreak) {
      const isPast = isToday && currentMinutes <= currentTotalMinutes;
      const isBooked = bookedSet.has(timeKey);

      slots.push({
        startTime: `${timeKey}:00`,
        endTime: `${endKey}:00`,
        available: !isBooked && !isPast,
        reason: isBooked ? 'Already booked' : isPast ? 'Time has passed' : undefined
      });
    }

    currentMinutes += slotDuration;
  }

  return slots;
}

/**
 * Books an appointment using a transactional check to guarantee NO double-booking race condition.
 */
export async function bookAppointment(params: {
  patientId: number;
  doctorId: number;
  departmentId: number;
  appointmentDate: string;
  startTime: string;
  reason: string;
  priority?: PriorityLevel;
  userId: number;
  ipAddress?: string;
}): Promise<Appointment> {
  const priority = params.priority || 'NORMAL';

  // 1. Anti-abuse check: Limit active future appointments per patient
  const activeCountRows = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM appointments 
     WHERE patient_id = ? 
       AND status IN ('BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE')
       AND appointment_date >= CURRENT_DATE`,
    [params.patientId]
  );

  const maxLimit = config.hospital.maxActiveAppointmentsPerPatient;
  if ((activeCountRows[0]?.count || 0) >= maxLimit) {
    const error: any = new Error(
      `You have reached the maximum active appointment limit (${maxLimit}). Please complete or cancel an existing appointment before booking another.`
    );
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  // 2. Compute slot end time (start time + doctor consultation duration)
  const doctor = await db.getOne<{ consultation_duration_minutes: number; full_name: string }>(
    'SELECT consultation_duration_minutes, full_name FROM doctors WHERE id = ?',
    [params.doctorId]
  );
  if (!doctor) {
    const error: any = new Error('Doctor not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  const duration = doctor.consultation_duration_minutes || 15;
  const [h, m] = params.startTime.split(':').map(Number);
  const endMinutes = h * 60 + m + duration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`;
  const startTimeFormatted = params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime;

  // 3. Database Transaction with row-level validation
  return await db.transaction<Appointment>(async (trx: TransactionContext) => {
    // Check if slot is already occupied
    const existing = await trx.getOne(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND start_time = ? 
         AND status NOT IN ('CANCELLED', 'RESCHEDULED')`,
      [params.doctorId, params.appointmentDate, startTimeFormatted]
    );

    if (existing) {
      const error: any = new Error(
        'This appointment slot is no longer available. Please select another time slot.'
      );
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    const appointmentCode = await generateAppointmentCode();

    const insertResult = await trx.execute(
      `INSERT INTO appointments 
       (appointment_code, patient_id, doctor_id, department_id, appointment_date, start_time, end_time, reason, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED')`,
      [
        appointmentCode,
        params.patientId,
        params.doctorId,
        params.departmentId,
        params.appointmentDate,
        startTimeFormatted,
        endTime,
        params.reason,
        priority
      ]
    );

    const appointmentId = insertResult.insertId;

    // Log audit
    await logAudit({
      userId: params.userId,
      action: 'APPOINTMENT_BOOK',
      entityType: 'appointment',
      entityId: appointmentId,
      details: {
        appointmentCode,
        doctorId: params.doctorId,
        date: params.appointmentDate,
        time: startTimeFormatted
      },
      ipAddress: params.ipAddress
    });

    // Send in-app notification
    await sendNotification({
      userId: params.userId,
      title: 'Appointment Confirmed',
      message: `Your appointment (${appointmentCode}) with Dr. ${doctor.full_name} is booked for ${params.appointmentDate} at ${startTimeFormatted.slice(0, 5)}.`,
      type: 'APPOINTMENT_BOOKED',
      metadata: { appointmentId, appointmentCode }
    });

    let fullAppointment = await trx.getOne<Appointment>(
      `SELECT a.*, p.full_name as patient_name, p.patient_id_code as patient_code,
              d.full_name as doctor_name, d.specialization as doctor_specialization,
              d.room_number as doctor_room, dep.name as department_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    if (!fullAppointment) {
      const baseAppt = await trx.getOne<any>('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
      const pat = await trx.getOne<any>('SELECT full_name, patient_id_code FROM patients WHERE id = ?', [params.patientId]);
      const doc = await trx.getOne<any>('SELECT full_name, specialization, room_number FROM doctors WHERE id = ?', [params.doctorId]);
      const dep = await trx.getOne<any>('SELECT name FROM departments WHERE id = ?', [params.departmentId]);
      fullAppointment = {
        ...baseAppt,
        patient_name: pat?.full_name,
        patient_code: pat?.patient_id_code,
        doctor_name: doc?.full_name,
        doctor_specialization: doc?.specialization,
        doctor_room: doc?.room_number,
        department_name: dep?.name
      };
    }

    return fullAppointment!;
  });
}

/**
 * Reschedules an appointment to a new date and time slot transactionally.
 */
export async function rescheduleAppointment(params: {
  appointmentId: number;
  newDate: string;
  newStartTime: string;
  userId: number;
  patientId: number;
  ipAddress?: string;
}): Promise<Appointment> {
  return await db.transaction<Appointment>(async (trx: TransactionContext) => {
    // 1. Fetch current appointment
    const current = await trx.getOne<Appointment>(
      'SELECT * FROM appointments WHERE id = ?',
      [params.appointmentId]
    );

    if (!current) {
      const error: any = new Error('Appointment not found.');
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    if (current.patient_id !== params.patientId) {
      const error: any = new Error('You are not authorized to reschedule this appointment.');
      error.statusCode = 403;
      error.isOperational = true;
      throw error;
    }

    if (['COMPLETED', 'CANCELLED', 'IN_PROGRESS'].includes(current.status)) {
      const error: any = new Error(
        `Cannot reschedule an appointment that is already ${current.status.toLowerCase()}.`
      );
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    // 2. Validate new slot
    const startTimeFormatted = params.newStartTime.length === 5 ? `${params.newStartTime}:00` : params.newStartTime;
    const existing = await trx.getOne(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND start_time = ? 
         AND id != ?
         AND status NOT IN ('CANCELLED', 'RESCHEDULED')`,
      [current.doctor_id, params.newDate, startTimeFormatted, current.id]
    );

    if (existing) {
      const error: any = new Error(
        'The selected new slot is no longer available. Please choose another time.'
      );
      error.statusCode = 409;
      error.isOperational = true;
      throw error;
    }

    // Calculate new end time
    const doctor = await trx.getOne<{ consultation_duration_minutes: number; full_name: string }>(
      'SELECT consultation_duration_minutes, full_name FROM doctors WHERE id = ?',
      [current.doctor_id]
    );
    const duration = doctor?.consultation_duration_minutes || 15;
    const [h, m] = params.newStartTime.split(':').map(Number);
    const endMinutes = h * 60 + m + duration;
    const newEndTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`;

    // 3. Update appointment
    await trx.execute(
      `UPDATE appointments 
       SET appointment_date = ?, start_time = ?, end_time = ?, status = 'BOOKED' 
       WHERE id = ?`,
      [params.newDate, startTimeFormatted, newEndTime, current.id]
    );

    // If had a queue entry, remove or reset it
    await trx.execute('DELETE FROM queue_entries WHERE appointment_id = ?', [current.id]);

    // Recalculate queue if doctor was active today
    await recalculateDoctorQueue(current.doctor_id);

    // Audit log
    await logAudit({
      userId: params.userId,
      action: 'APPOINTMENT_RESCHEDULE',
      entityType: 'appointment',
      entityId: current.id,
      details: {
        from: { date: current.appointment_date, time: current.start_time },
        to: { date: params.newDate, time: startTimeFormatted }
      },
      ipAddress: params.ipAddress
    });

    // Notify patient
    await sendNotification({
      userId: params.userId,
      title: 'Appointment Rescheduled',
      message: `Your appointment (${current.appointment_code}) with Dr. ${doctor?.full_name} has been rescheduled to ${params.newDate} at ${startTimeFormatted.slice(0, 5)}.`,
      type: 'APPOINTMENT_RESCHEDULED',
      metadata: { appointmentId: current.id }
    });

    const updated = await trx.getOne<Appointment>(
      `SELECT a.*, p.full_name as patient_name, p.patient_id_code as patient_code,
              d.full_name as doctor_name, d.specialization as doctor_specialization,
              d.room_number as doctor_room, dep.name as department_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       WHERE a.id = ?`,
      [current.id]
    );

    return updated!;
  });
}

/**
 * Cancels an appointment and releases its slot and queue position.
 */
export async function cancelAppointment(params: {
  appointmentId: number;
  reason?: string;
  userId: number;
  userRole: string;
  patientId?: number;
  ipAddress?: string;
}): Promise<void> {
  const current = await db.getOne<Appointment>(
    'SELECT * FROM appointments WHERE id = ?',
    [params.appointmentId]
  );

  if (!current) {
    const error: any = new Error('Appointment not found.');
    error.statusCode = 404;
    error.isOperational = true;
    throw error;
  }

  // Permission check
  if (params.userRole === 'PATIENT' && current.patient_id !== params.patientId) {
    const error: any = new Error('You are not authorized to cancel this appointment.');
    error.statusCode = 403;
    error.isOperational = true;
    throw error;
  }

  if (['COMPLETED', 'CANCELLED'].includes(current.status)) {
    const error: any = new Error(`Appointment is already ${current.status.toLowerCase()}.`);
    error.statusCode = 400;
    error.isOperational = true;
    throw error;
  }

  await db.transaction(async (trx) => {
    // 1. Update appointment status
    await trx.execute(
      `UPDATE appointments 
       SET status = 'CANCELLED', cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [params.reason || 'Cancelled by user', current.id]
    );

    // 2. Increment patient cancellation count
    await trx.execute(
      'UPDATE patients SET cancellation_count = cancellation_count + 1 WHERE id = ?',
      [current.patient_id]
    );

    // 3. Remove/update queue entry if checked in
    await trx.execute(
      "UPDATE queue_entries SET status = 'SKIPPED', notes = 'Appointment cancelled' WHERE appointment_id = ?",
      [current.id]
    );

    // 4. Recalculate remaining queue
    await recalculateDoctorQueue(current.doctor_id);

    // 5. Log audit
    await logAudit({
      userId: params.userId,
      action: 'APPOINTMENT_CANCEL',
      entityType: 'appointment',
      entityId: current.id,
      details: { reason: params.reason || 'Cancelled by user' },
      ipAddress: params.ipAddress
    });

    // 6. Notify patient
    const patientUser = await trx.getOne<{ user_id: number }>('SELECT user_id FROM patients WHERE id = ?', [current.patient_id]);
    if (patientUser) {
      await sendNotification({
        userId: patientUser.user_id,
        title: 'Appointment Cancelled',
        message: `Your appointment (${current.appointment_code}) on ${current.appointment_date} has been cancelled.`,
        type: 'APPOINTMENT_CANCELLED',
        metadata: { appointmentId: current.id }
      });
    }
  });
}
