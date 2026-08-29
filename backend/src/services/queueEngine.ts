import { db } from '../config/database';
import { PriorityLevel, QueueEntry, QueueStatus } from '../types';
import { getSocketIO } from './notificationService';

export interface PriorityWeights {
  EMERGENCY: number;
  HIGH: number;
  NORMAL: number;
  LOW: number;
}

const DEFAULT_WEIGHTS: PriorityWeights = {
  EMERGENCY: 10000,
  HIGH: 5000,
  NORMAL: 1000,
  LOW: 500
};

/**
 * Calculates a deterministic priority score.
 * Higher score = served sooner.
 * Factors:
 * 1. Base category weight (Emergency = 10k, High = 5k, Normal = 1k, Low = 500)
 * 2. Scheduled appointment time urgency (earlier appointments have higher bonus)
 * 3. Check-in timestamp tie-breaker (earlier check-in gives slight bonus)
 */
export function calculatePriorityScore(
  priorityLevel: PriorityLevel,
  appointmentTime: string, // "HH:MM:SS" or "HH:MM"
  checkInTime: Date = new Date()
): number {
  const base = DEFAULT_WEIGHTS[priorityLevel] || DEFAULT_WEIGHTS.NORMAL;

  // Time urgency: converts time to minutes from 00:00. Earlier time in day = higher score bonus (max 1440 mins)
  const timeParts = appointmentTime.split(':').map(Number);
  const apptMinutes = (timeParts[0] || 9) * 60 + (timeParts[1] || 0);
  const timeScore = Math.max(0, 1440 - apptMinutes); // e.g. 09:00 = 1440 - 540 = 900 points

  // Check-in tie breaker: early check-in gives up to 100 points
  const checkInHours = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  const checkInScore = Math.max(0, Math.floor((1440 - checkInHours) / 20));

  return base + timeScore + checkInScore;
}

/**
 * Recalculates all queue positions and dynamic estimated wait times for a doctor's active queue.
 */
export async function recalculateDoctorQueue(doctorId: number): Promise<QueueEntry[]> {
  // 1. Get doctor details (consultation duration, status)
  const doctor = await db.getOne<{
    id: number;
    consultation_duration_minutes: number;
    status: string;
    full_name: string;
  }>('SELECT id, consultation_duration_minutes, status, full_name FROM doctors WHERE id = ?', [doctorId]);

  const avgDuration = doctor?.consultation_duration_minutes || 15;

  // 2. Fetch all non-completed, non-cancelled queue entries for this doctor today
  const entries = await db.query<any>(
    `SELECT q.*, a.start_time as appointment_time, a.appointment_date, a.appointment_code,
            p.full_name as patient_name, p.patient_id_code as patient_code, p.phone as patient_phone
     FROM queue_entries q
     JOIN appointments a ON q.appointment_id = a.id
     JOIN patients p ON q.patient_id = p.id
     WHERE q.doctor_id = ? 
       AND q.status IN ('WAITING', 'CALLED', 'IN_PROGRESS')
     ORDER BY 
       CASE 
         WHEN q.status = 'IN_PROGRESS' THEN 1
         WHEN q.status = 'CALLED' THEN 2
         WHEN q.status = 'WAITING' THEN 3
         ELSE 4
       END,
       q.priority_score DESC,
       q.check_in_time ASC`,
    [doctorId]
  );

  let currentServingRemaining = 0;
  const inProgressEntry = entries.find((e) => e.status === 'IN_PROGRESS');
  if (inProgressEntry && inProgressEntry.start_time) {
    const elapsedMinutes = Math.floor(
      (Date.now() - new Date(inProgressEntry.start_time).getTime()) / (1000 * 60)
    );
    currentServingRemaining = Math.max(2, avgDuration - elapsedMinutes);
  } else if (inProgressEntry) {
    currentServingRemaining = avgDuration;
  }

  // 3. Assign sequential positions and dynamic wait times for WAITING and CALLED entries
  let waitingIndex = 0;
  const updatedEntries: QueueEntry[] = [];

  for (const entry of entries) {
    let position = 0;
    let waitTime = 0;

    if (entry.status === 'IN_PROGRESS') {
      position = 0;
      waitTime = 0;
    } else if (entry.status === 'CALLED') {
      position = 1;
      waitTime = 0;
    } else if (entry.status === 'WAITING') {
      waitingIndex++;
      // Position is 1 + (1 if called/in_progress exists) + waitingIndex - 1
      const activePreceding = inProgressEntry ? 1 : 0;
      position = activePreceding + waitingIndex;
      // Dynamic EWT: active consultation remaining time + (patients ahead * avgDuration)
      waitTime = currentServingRemaining + (waitingIndex - 1) * avgDuration;
    }

    // Update in database if position or wait time changed
    if (entry.queue_position !== position || entry.estimated_wait_minutes !== waitTime) {
      await db.execute(
        'UPDATE queue_entries SET queue_position = ?, estimated_wait_minutes = ? WHERE id = ?',
        [position, waitTime, entry.id]
      );
      entry.queue_position = position;
      entry.estimated_wait_minutes = waitTime;
    }

    updatedEntries.push(entry);
  }

  // 4. Emit live update event to WebSocket rooms
  const io = getSocketIO();
  if (io) {
    io.to(`doctor:queue:${doctorId}`).emit('queue:updated', {
      doctorId,
      doctorName: doctor?.full_name,
      doctorStatus: doctor?.status,
      queue: updatedEntries,
      inProgress: inProgressEntry || null,
      totalWaiting: updatedEntries.filter((e) => e.status === 'WAITING').length,
      updatedAt: new Date().toISOString()
    });

    // Also broadcast to public / admin live queue board
    io.emit('queue:board_updated', {
      doctorId,
      updatedAt: new Date().toISOString()
    });
  }

  return updatedEntries;
}

/**
 * Gets live queue status for a specific patient's appointment
 */
export async function getPatientQueueStatus(appointmentId: number) {
  let entry = await db.getOne<any>(
    `SELECT q.*, a.appointment_code, a.appointment_date, a.start_time as appointment_time,
            d.full_name as doctor_name, d.room_number as doctor_room, d.status as doctor_status,
            d.consultation_duration_minutes, dep.name as department_name,
            p.full_name as patient_name, p.patient_id_code as patient_code
     FROM queue_entries q
     JOIN appointments a ON q.appointment_id = a.id
     JOIN doctors d ON q.doctor_id = d.id
     JOIN departments dep ON d.department_id = dep.id
     JOIN patients p ON q.patient_id = p.id
     WHERE q.appointment_id = ?`,
    [appointmentId]
  );

  if (!entry) {
    const baseQ = await db.getOne<any>('SELECT * FROM queue_entries WHERE appointment_id = ?', [appointmentId]);
    if (!baseQ) return null;
    const appt = await db.getOne<any>('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    const doc = await db.getOne<any>('SELECT * FROM doctors WHERE id = ?', [baseQ.doctor_id]);
    const dep = doc ? await db.getOne<any>('SELECT * FROM departments WHERE id = ?', [doc.department_id]) : null;
    const pat = await db.getOne<any>('SELECT * FROM patients WHERE id = ?', [baseQ.patient_id]);
    entry = {
      ...baseQ,
      appointment_code: appt?.appointment_code,
      appointment_date: appt?.appointment_date,
      appointment_time: appt?.start_time,
      doctor_name: doc?.full_name,
      doctor_room: doc?.room_number,
      doctor_status: doc?.status,
      consultation_duration_minutes: doc?.consultation_duration_minutes,
      department_name: dep?.name,
      patient_name: pat?.full_name,
      patient_code: pat?.patient_id_code
    };
  }

  if (!entry) return null;

  // Calculate patients ahead
  const aheadCountRows = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM queue_entries 
     WHERE doctor_id = ? 
       AND status IN ('WAITING', 'CALLED', 'IN_PROGRESS')
       AND ((priority_score > ?) OR (priority_score = ? AND check_in_time < ?))
       AND id != ?`,
    [entry.doctor_id, entry.priority_score, entry.priority_score, entry.check_in_time, entry.id]
  );

  // Get currently serving patient
  const currentlyServing = await db.getOne<{ queue_number: string }>(
    `SELECT queue_number FROM queue_entries 
     WHERE doctor_id = ? AND status = 'IN_PROGRESS' 
     LIMIT 1`,
    [entry.doctor_id]
  );

  return {
    ...entry,
    patientsAhead: aheadCountRows[0]?.count || 0,
    currentlyServingNumber: currentlyServing?.queue_number || 'None'
  };
}
