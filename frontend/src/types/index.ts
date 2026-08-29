export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
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

export interface User {
  id: number;
  email: string;
  role: UserRole;
  patientId?: number;
  patientCode?: string;
  doctorId?: number;
  doctorCode?: string;
  fullName?: string;
  profile?: any;
}

export interface Patient {
  id: number;
  user_id: number;
  patient_id_code: string;
  full_name: string;
  dob: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  email?: string;
  address: string;
  blood_group: string;
  emergency_contact: string;
  risk_flag_level: number;
  no_show_count: number;
  cancellation_count: number;
  notes?: string;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  icon: string;
  status: 'ACTIVE' | 'INACTIVE';
  doctor_count?: number;
}

export interface Doctor {
  id: number;
  user_id: number;
  doctor_id_code: string;
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
  department_name?: string;
  department_code?: string;
}

export interface Appointment {
  id: number;
  appointment_code: string;
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
  created_at: string;

  // Joined
  patient_name?: string;
  patient_code?: string;
  patient_phone?: string;
  patient_gender?: string;
  patient_dob?: string;
  doctor_name?: string;
  doctor_code?: string;
  doctor_specialization?: string;
  doctor_room?: string;
  doctor_status?: DoctorStatus;
  department_name?: string;
  queue_number?: string;
  queue_status?: QueueStatus;
  queue_position?: number;
  estimated_wait_minutes?: number;
}

export interface QueueEntry {
  id: number;
  queue_number: string;
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

  // Joined
  patient_name?: string;
  patient_code?: string;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  doctor_name?: string;
  doctor_room?: string;
  doctor_status?: DoctorStatus;
  department_name?: string;
  patientsAhead?: number;
  currentlyServingNumber?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata_json?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_email?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  details_json?: string;
  ip_address?: string;
  created_at: string;
}

export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description?: string;
  updated_at?: string;
}
