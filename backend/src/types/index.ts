export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type DoctorStatus = 'AVAILABLE' | 'ON_LEAVE' | 'BUSY' | 'INACTIVE';
export type PriorityLevel = 'EMERGENCY' | 'HIGH' | 'NORMAL' | 'LOW';
export type AppointmentStatus =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_QUEUE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type QueueStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'NO_SHOW';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: number;
  user_id: number;
  patient_id_code: string; // e.g. PAT-2026-000001
  full_name: string;
  dob: string;
  gender: Gender;
  phone: string;
  address: string;
  blood_group: string;
  emergency_contact: string;
  risk_flag_level: number; // 0=Clean, 1=Warning, 2=Flagged
  no_show_count: number;
  cancellation_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  email?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  icon: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  doctor_count?: number;
}

export interface Doctor {
  id: number;
  user_id: number;
  doctor_id_code: string; // e.g. DOC-2026-001
  department_id: number;
  full_name: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  contact_phone: string;
  contact_email: string;
  profile_image: string;
  consultation_duration_minutes: number;
  room_number: string;
  bio: string;
  status: DoctorStatus;
  created_at: string;
  updated_at: string;
  department_name?: string;
  department_code?: string;
}

export interface DoctorSchedule {
  id: number;
  doctor_id: number;
  day_of_week: number; // 0=Sunday..6=Saturday
  start_time: string; // "09:00:00"
  end_time: string; // "17:00:00"
  break_start: string; // "13:00:00"
  break_end: string; // "14:00:00"
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface DoctorLeave {
  id: number;
  doctor_id: number;
  leave_date: string;
  reason: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  created_at: string;
}

export interface Appointment {
  id: number;
  appointment_code: string; // e.g. APT-2026-000001
  patient_id: number;
  doctor_id: number;
  department_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  priority: PriorityLevel;
  status: AppointmentStatus;
  cancellation_reason?: string;
  cancelled_at?: string;
  rescheduled_from_id?: number;
  created_at: string;
  updated_at: string;

  // Joined fields
  patient_name?: string;
  patient_code?: string;
  patient_phone?: string;
  doctor_name?: string;
  doctor_code?: string;
  doctor_specialization?: string;
  doctor_room?: string;
  department_name?: string;
  queue_number?: string;
  queue_status?: QueueStatus;
  queue_position?: number;
  estimated_wait_minutes?: number;
}

export interface QueueEntry {
  id: number;
  queue_number: string; // e.g. Q-023
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  priority_level: PriorityLevel;
  priority_score: number;
  check_in_time: string;
  called_time?: string;
  start_time?: string;
  completed_time?: string;
  estimated_wait_minutes: number;
  status: QueueStatus;
  queue_position: number;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Joined details
  patient_name?: string;
  patient_code?: string;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  doctor_name?: string;
  doctor_room?: string;
  doctor_status?: DoctorStatus;
  department_name?: string;
}

export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
  updated_by?: number;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata_json?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  details_json?: string;
  ip_address?: string;
  created_at: string;
  user_email?: string;
  user_role?: string;
}

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: UserRole;
  patientId?: number;
  doctorId?: number;
  patientCode?: string;
  doctorCode?: string;
  fullName?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
}
