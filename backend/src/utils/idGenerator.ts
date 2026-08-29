import { db } from '../config/database';

export async function generatePatientId(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db.query<{ count: number }>(
    "SELECT COUNT(*) as count FROM patients WHERE patient_id_code LIKE ?",
    [`PAT-${year}-%`]
  );
  const count = (rows[0]?.count || 0) + 1;
  return `PAT-${year}-${String(count).padStart(6, '0')}`;
}

export async function generateDoctorId(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db.query<{ count: number }>(
    "SELECT COUNT(*) as count FROM doctors WHERE doctor_id_code LIKE ?",
    [`DOC-${year}-%`]
  );
  const count = (rows[0]?.count || 0) + 1;
  return `DOC-${year}-${String(count).padStart(3, '0')}`;
}

export async function generateAppointmentCode(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db.query<{ count: number }>(
    "SELECT COUNT(*) as count FROM appointments WHERE appointment_code LIKE ?",
    [`APT-${year}-%`]
  );
  const count = (rows[0]?.count || 0) + 1;
  return `APT-${year}-${String(count).padStart(6, '0')}`;
}

export async function generateQueueNumber(doctorId: number, dateStr: string): Promise<string> {
  // Find highest queue number for this doctor today
  const rows = await db.query<{ queue_number: string }>(
    `SELECT q.queue_number 
     FROM queue_entries q
     JOIN appointments a ON q.appointment_id = a.id
     WHERE q.doctor_id = ? AND a.appointment_date = ?
     ORDER BY q.id DESC LIMIT 1`,
    [doctorId, dateStr]
  );

  let nextNum = 1;
  if (rows.length > 0 && rows[0].queue_number) {
    const numPart = parseInt(rows[0].queue_number.replace('Q-', ''), 10);
    if (!isNaN(numPart)) {
      nextNum = numPart + 1;
    }
  }

  return `Q-${String(nextNum).padStart(3, '0')}`;
}
