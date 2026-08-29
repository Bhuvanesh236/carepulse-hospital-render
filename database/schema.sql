-- ======================================================================
-- Intelligent Hospital Appointment and Queue Optimization System
-- Database Schema: MySQL 8.0+ Compatible
-- ======================================================================

CREATE DATABASE IF NOT EXISTS `hospital_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hospital_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('PATIENT', 'DOCTOR', 'ADMIN') NOT NULL DEFAULT 'PATIENT',
  `status` ENUM('ACTIVE', 'SUSPENDED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `description` TEXT,
  `icon` VARCHAR(50) DEFAULT 'Activity',
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Patients Table
CREATE TABLE IF NOT EXISTS `patients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `patient_id_code` VARCHAR(30) NOT NULL UNIQUE, -- e.g. PAT-2026-000001
  `full_name` VARCHAR(150) NOT NULL,
  `dob` DATE NOT NULL,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `address` TEXT NOT NULL,
  `blood_group` VARCHAR(10) DEFAULT 'O+',
  `emergency_contact` VARCHAR(100),
  `risk_flag_level` INT NOT NULL DEFAULT 0, -- 0 = Normal, 1 = Warning, 2 = High Risk/Flagged
  `no_show_count` INT NOT NULL DEFAULT 0,
  `cancellation_count` INT NOT NULL DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_patients_code` (`patient_id_code`),
  INDEX `idx_patients_phone` (`phone`),
  INDEX `idx_patients_risk` (`risk_flag_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Doctors Table
CREATE TABLE IF NOT EXISTS `doctors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `doctor_id_code` VARCHAR(30) NOT NULL UNIQUE, -- e.g. DOC-2026-001
  `department_id` INT NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `specialization` VARCHAR(150) NOT NULL,
  `qualification` VARCHAR(150) NOT NULL,
  `experience_years` INT NOT NULL DEFAULT 0,
  `contact_phone` VARCHAR(25) NOT NULL,
  `contact_email` VARCHAR(191) NOT NULL,
  `profile_image` VARCHAR(255),
  `consultation_duration_minutes` INT NOT NULL DEFAULT 15,
  `room_number` VARCHAR(50) DEFAULT 'Room 101',
  `bio` TEXT,
  `status` ENUM('AVAILABLE', 'ON_LEAVE', 'BUSY', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
  INDEX `idx_doctors_department` (`department_id`),
  INDEX `idx_doctors_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Doctor Schedules Table
CREATE TABLE IF NOT EXISTS `doctor_schedules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` INT NOT NULL,
  `day_of_week` TINYINT NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  `start_time` TIME NOT NULL DEFAULT '09:00:00',
  `end_time` TIME NOT NULL DEFAULT '17:00:00',
  `break_start` TIME DEFAULT '13:00:00',
  `break_end` TIME DEFAULT '14:00:00',
  `slot_duration_minutes` INT NOT NULL DEFAULT 15,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_doctor_day` (`doctor_id`, `day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Doctor Leaves Table
CREATE TABLE IF NOT EXISTS `doctor_leaves` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` INT NOT NULL,
  `leave_date` DATE NOT NULL,
  `reason` VARCHAR(255),
  `status` ENUM('APPROVED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_doctor_leave_date` (`doctor_id`, `leave_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Appointments Table
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `appointment_code` VARCHAR(30) NOT NULL UNIQUE, -- e.g. APT-2026-000001
  `patient_id` INT NOT NULL,
  `doctor_id` INT NOT NULL,
  `department_id` INT NOT NULL,
  `appointment_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `reason` TEXT NOT NULL,
  `priority` ENUM('EMERGENCY', 'HIGH', 'NORMAL', 'LOW') NOT NULL DEFAULT 'NORMAL',
  `status` ENUM('BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED') NOT NULL DEFAULT 'BOOKED',
  `cancellation_reason` VARCHAR(255),
  `cancelled_at` TIMESTAMP NULL,
  `rescheduled_from_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE RESTRICT,
  INDEX `idx_appts_patient` (`patient_id`),
  INDEX `idx_appts_doctor_date` (`doctor_id`, `appointment_date`),
  INDEX `idx_appts_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Queue Entries Table
CREATE TABLE IF NOT EXISTS `queue_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `queue_number` VARCHAR(20) NOT NULL, -- e.g. Q-001
  `appointment_id` INT NOT NULL UNIQUE,
  `patient_id` INT NOT NULL,
  `doctor_id` INT NOT NULL,
  `priority_level` ENUM('EMERGENCY', 'HIGH', 'NORMAL', 'LOW') NOT NULL DEFAULT 'NORMAL',
  `priority_score` INT NOT NULL DEFAULT 1000,
  `check_in_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `called_time` TIMESTAMP NULL,
  `start_time` TIMESTAMP NULL,
  `completed_time` TIMESTAMP NULL,
  `estimated_wait_minutes` INT NOT NULL DEFAULT 0,
  `status` ENUM('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'NO_SHOW') NOT NULL DEFAULT 'WAITING',
  `queue_position` INT NOT NULL DEFAULT 1,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE CASCADE,
  INDEX `idx_queue_doc_status` (`doctor_id`, `status`),
  INDEX `idx_queue_priority` (`priority_score` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. System Settings Table
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255),
  `updated_by` INT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `metadata_json` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_notifs_user` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT NULL,
  `details_json` TEXT,
  `ip_address` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
