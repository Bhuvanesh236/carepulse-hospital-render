import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateDoctorId } from '../utils/idGenerator';
import { logAudit } from '../services/auditService';
import { Patient, Doctor, Appointment, AuditLog, Department } from '../types';

export async function getAdminDashboardStats(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const totalPatientsRow = await db.getOne<{ count: number }>('SELECT COUNT(*) as count FROM patients');
    const totalDoctorsRow = await db.getOne<{ count: number }>("SELECT COUNT(*) as count FROM doctors WHERE status != 'INACTIVE'");
    const availableDoctorsRow = await db.getOne<{ count: number }>("SELECT COUNT(*) as count FROM doctors WHERE status = 'AVAILABLE'");

    const todayAppts = await db.getOne<{
      total: number;
      completed: number;
      cancelled: number;
      noshow: number;
      inqueue: number;
    }>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as noshow,
         SUM(CASE WHEN status IN ('CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS') THEN 1 ELSE 0 END) as inqueue
       FROM appointments 
       WHERE appointment_date = CURRENT_DATE`
    );

    const activeQueueRow = await db.getOne<{ count: number; avg_wait: number }>(
      `SELECT COUNT(*) as count, AVG(estimated_wait_minutes) as avg_wait 
       FROM queue_entries 
       WHERE status = 'WAITING'`
    );

    const flaggedPatientsRow = await db.getOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM patients WHERE risk_flag_level > 0'
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalPatients: totalPatientsRow?.count || 0,
        totalDoctors: totalDoctorsRow?.count || 0,
        availableDoctors: availableDoctorsRow?.count || 0,
        todayTotalAppointments: todayAppts?.total || 0,
        todayCompleted: todayAppts?.completed || 0,
        todayCancelled: todayAppts?.cancelled || 0,
        todayNoShow: todayAppts?.noshow || 0,
        todayInQueue: todayAppts?.inqueue || 0,
        currentWaitingQueueSize: activeQueueRow?.count || 0,
        averageEstimatedWaitMinutes: Math.round(activeQueueRow?.avg_wait || 0),
        flaggedPatientsCount: flaggedPatientsRow?.count || 0
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllPatients(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { search, riskOnly } = req.query;

    let sql = `
      SELECT p.*, u.email, u.status as user_status 
      FROM patients p 
      JOIN users u ON p.user_id = u.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (riskOnly === 'true') {
      sql += ' AND p.risk_flag_level > 0';
    }

    if (search) {
      sql += ' AND (p.full_name LIKE ? OR p.patient_id_code LIKE ? OR p.phone LIKE ? OR u.email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY p.risk_flag_level DESC, p.created_at DESC';

    const patients = await db.query<Patient>(sql, params);

    return res.status(200).json({
      success: true,
      patients
    });
  } catch (error) {
    next(error);
  }
}

export async function unflagPatient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const patientId = parseInt(req.params.id, 10);
    const { notes } = req.body;

    const patient = await db.getOne<Patient>('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    await db.execute(
      `UPDATE patients 
       SET risk_flag_level = 0, no_show_count = 0, notes = CONCAT(COALESCE(notes, ''), ' [Admin review: Flag cleared by Admin. Notes: ', ?, ']')
       WHERE id = ?`,
      [notes || 'Administrative review approved', patientId]
    );

    await logAudit({
      userId: req.user!.userId,
      action: 'ADMIN_PATIENT_UNFLAG',
      entityType: 'patient',
      entityId: patientId,
      details: { patientCode: patient.patient_id_code, notes },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Patient ${patient.patient_id_code} flags have been cleared.`
    });
  } catch (error) {
    next(error);
  }
}

export async function createDoctor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const {
      fullName,
      email,
      password,
      departmentId,
      specialization,
      qualification,
      experienceYears,
      contactPhone,
      profileImage,
      consultationDurationMinutes,
      roomNumber,
      bio,
      schedules
    } = req.body;

    // Check duplicate email
    const existingUser = await db.getOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'DoctorPass123!', salt);
    const doctorIdCode = await generateDoctorId();

    const doctorId = await db.transaction(async (trx) => {
      // 1. Create user
      const uRes = await trx.execute(
        "INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, 'DOCTOR', 'ACTIVE')",
        [email.toLowerCase(), passwordHash]
      );
      const userId = uRes.insertId;

      // 2. Create doctor profile
      const dRes = await trx.execute(
        `INSERT INTO doctors 
         (user_id, doctor_id_code, department_id, full_name, specialization, qualification, experience_years, 
          contact_phone, contact_email, profile_image, consultation_duration_minutes, room_number, bio, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
        [
          userId,
          doctorIdCode,
          departmentId,
          fullName,
          specialization,
          qualification,
          experienceYears || 5,
          contactPhone,
          email.toLowerCase(),
          profileImage || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
          consultationDurationMinutes || 15,
          roomNumber || 'Room 101',
          bio || ''
        ]
      );
      const docId = dRes.insertId;

      // 3. Create default schedules (Mon-Fri 09:00 - 17:00 with lunch break)
      const scheduleList = Array.isArray(schedules) && schedules.length > 0
        ? schedules
        : [1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            startTime: '09:00:00',
            endTime: '17:00:00',
            breakStart: '13:00:00',
            breakEnd: '14:00:00',
            slotDurationMinutes: consultationDurationMinutes || 15
          }));

      for (const s of scheduleList) {
        await trx.execute(
          `INSERT INTO doctor_schedules 
           (doctor_id, day_of_week, start_time, end_time, break_start, break_end, slot_duration_minutes, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            docId,
            s.dayOfWeek,
            s.startTime || '09:00:00',
            s.endTime || '17:00:00',
            s.breakStart || '13:00:00',
            s.breakEnd || '14:00:00',
            s.slotDurationMinutes || 15
          ]
        );
      }

      return docId;
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'ADMIN_CREATE_DOCTOR',
      entityType: 'doctor',
      entityId: doctorId,
      details: { doctorIdCode, fullName },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: `Doctor Dr. ${fullName} (${doctorIdCode}) created successfully`,
      doctorId
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDoctor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    const {
      fullName,
      departmentId,
      specialization,
      qualification,
      experienceYears,
      contactPhone,
      roomNumber,
      bio,
      status,
      consultationDurationMinutes
    } = req.body;

    const doctor = await db.getOne<Doctor>('SELECT * FROM doctors WHERE id = ?', [doctorId]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    await db.execute(
      `UPDATE doctors 
       SET full_name = COALESCE(?, full_name),
           department_id = COALESCE(?, department_id),
           specialization = COALESCE(?, specialization),
           qualification = COALESCE(?, qualification),
           experience_years = COALESCE(?, experience_years),
           contact_phone = COALESCE(?, contact_phone),
           room_number = COALESCE(?, room_number),
           bio = COALESCE(?, bio),
           status = COALESCE(?, status),
           consultation_duration_minutes = COALESCE(?, consultation_duration_minutes)
       WHERE id = ?`,
      [
        fullName,
        departmentId,
        specialization,
        qualification,
        experienceYears,
        contactPhone,
        roomNumber,
        bio,
        status,
        consultationDurationMinutes,
        doctorId
      ]
    );

    await logAudit({
      userId: req.user!.userId,
      action: 'ADMIN_UPDATE_DOCTOR',
      entityType: 'doctor',
      entityId: doctorId,
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Doctor updated successfully'
    });
  } catch (error) {
    next(error);
  }
}

export async function createDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { name, code, description, icon } = req.body;

    const existing = await db.getOne('SELECT id FROM departments WHERE name = ? OR code = ?', [name, code]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'A department with this name or code already exists.' });
    }

    const resInsert = await db.execute(
      'INSERT INTO departments (name, code, description, icon, status) VALUES (?, ?, ?, ?, "ACTIVE")',
      [name, code.toUpperCase(), description || '', icon || 'Activity']
    );

    await logAudit({
      userId: req.user!.userId,
      action: 'ADMIN_CREATE_DEPARTMENT',
      entityType: 'department',
      entityId: resInsert.insertId,
      details: { name, code },
      ipAddress: req.ip
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully'
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllAppointments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status, doctorId, departmentId, dateFrom, dateTo, search } = req.query;

    let sql = `
      SELECT a.*, p.full_name as patient_name, p.patient_id_code as patient_code, p.phone as patient_phone,
              d.full_name as doctor_name, d.specialization as doctor_specialization, d.room_number as doctor_room,
              dep.name as department_name,
              q.queue_number, q.status as queue_status, q.queue_position
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN departments dep ON a.department_id = dep.id
       LEFT JOIN queue_entries q ON a.id = q.appointment_id
       WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (doctorId && doctorId !== 'all') {
      sql += ' AND a.doctor_id = ?';
      params.push(doctorId);
    }
    if (departmentId && departmentId !== 'all') {
      sql += ' AND a.department_id = ?';
      params.push(departmentId);
    }
    if (dateFrom) {
      sql += ' AND a.appointment_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND a.appointment_date <= ?';
      params.push(dateTo);
    }
    if (search) {
      sql += ' AND (a.appointment_code LIKE ? OR p.full_name LIKE ? OR p.patient_id_code LIKE ? OR d.full_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT 200';

    const appointments = await db.query<Appointment>(sql, params);

    return res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    next(error);
  }
}

export async function getSystemSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const settings = await db.query('SELECT * FROM system_settings ORDER BY setting_key ASC');
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSystemSetting(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { key, value } = req.body;

    await db.execute(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?`,
      [key, String(value), req.user!.userId, String(value), req.user!.userId]
    );

    await logAudit({
      userId: req.user!.userId,
      action: 'ADMIN_UPDATE_SETTING',
      entityType: 'setting',
      details: { key, value },
      ipAddress: req.ip
    });

    return res.status(200).json({
      success: true,
      message: `Setting ${key} updated successfully`
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { action, entityType, limit } = req.query;

    let sql = `
      SELECT l.*, u.email as user_email, u.role as user_role 
      FROM audit_logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action) {
      sql += ' AND l.action = ?';
      params.push(action);
    }
    if (entityType) {
      sql += ' AND l.entity_type = ?';
      params.push(entityType);
    }

    const logLimit = Math.min(200, parseInt(limit as string, 10) || 100);
    sql += ` ORDER BY l.created_at DESC LIMIT ${logLimit}`;

    const logs = await db.query<AuditLog>(sql, params);

    return res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    next(error);
  }
}

export async function getReportsAndAnalytics(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // 1. Daily appointments for the last 14 days
    const dailyTrend = await db.query(
      `SELECT 
         appointment_date as date,
         COUNT(*) as total,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show
       FROM appointments 
       WHERE appointment_date >= DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY)
       GROUP BY appointment_date 
       ORDER BY appointment_date ASC`
    );

    // 2. Department distribution
    const departmentStats = await db.query(
      `SELECT 
         dep.name as department,
         COUNT(a.id) as appointment_count,
         COUNT(DISTINCT d.id) as doctor_count
       FROM departments dep
       LEFT JOIN doctors d ON dep.id = d.department_id
       LEFT JOIN appointments a ON dep.id = a.department_id
       GROUP BY dep.id, dep.name
       ORDER BY appointment_count DESC`
    );

    // 3. Peak hours distribution
    const hourlyDistribution = await db.query(
      `SELECT 
         SUBSTRING(start_time, 1, 2) as hour,
         COUNT(*) as count 
       FROM appointments 
       GROUP BY SUBSTRING(start_time, 1, 2) 
       ORDER BY hour ASC`
    );

    // 4. Doctor utilization & performance
    const doctorStats = await db.query(
      `SELECT 
         d.full_name as doctor_name,
         dep.name as department_name,
         COUNT(a.id) as total_appointments,
         SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN a.status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_show,
         ROUND(SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.id), 0), 1) as completion_rate
       FROM doctors d
       JOIN departments dep ON d.department_id = dep.id
       LEFT JOIN appointments a ON d.id = a.doctor_id
       WHERE d.status != 'INACTIVE'
       GROUP BY d.id, d.full_name, dep.name
       ORDER BY total_appointments DESC
       LIMIT 10`
    );

    // 5. Global KPIs
    const kpiSummary = await db.getOne<{
      total: number;
      completed: number;
      cancelled: number;
      noshow: number;
    }>(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as noshow
       FROM appointments`
    );

    const totalCount = kpiSummary?.total || 1;
    const noShowRate = ((kpiSummary?.noshow || 0) * 100 / totalCount).toFixed(1);
    const cancellationRate = ((kpiSummary?.cancelled || 0) * 100 / totalCount).toFixed(1);
    const completionRate = ((kpiSummary?.completed || 0) * 100 / totalCount).toFixed(1);

    return res.status(200).json({
      success: true,
      analytics: {
        dailyTrend,
        departmentStats,
        hourlyDistribution,
        doctorStats,
        kpis: {
          totalAppointments: kpiSummary?.total || 0,
          completedAppointments: kpiSummary?.completed || 0,
          noShowRate: `${noShowRate}%`,
          cancellationRate: `${cancellationRate}%`,
          completionRate: `${completionRate}%`,
          averageConsultationMinutes: 15,
          averageWaitMinutes: 18
        }
      }
    });
  } catch (error) {
    next(error);
  }
}
