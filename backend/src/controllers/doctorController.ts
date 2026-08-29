import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { Doctor, Department } from '../types';
import { getDoctorAvailableSlots } from '../services/appointmentService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { getSocketIO } from '../services/notificationService';

export async function getAllDoctors(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, departmentId, status } = req.query;

    let sql = `
      SELECT d.*, dep.name as department_name, dep.code as department_code 
      FROM doctors d
      JOIN departments dep ON d.department_id = dep.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (departmentId && departmentId !== 'all') {
      sql += ' AND d.department_id = ?';
      params.push(departmentId);
    }

    if (status && status !== 'all') {
      sql += ' AND d.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (d.full_name LIKE ? OR d.specialization LIKE ? OR dep.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY dep.name ASC, d.full_name ASC';

    const doctors = await db.query<Doctor>(sql, params);
    const departments = await db.query<Department>('SELECT * FROM departments WHERE status = "ACTIVE" ORDER BY name ASC');

    return res.status(200).json({
      success: true,
      doctors,
      departments
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorById(req: Request, res: Response, next: NextFunction) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    if (isNaN(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
    }

    const doctor = await db.getOne<Doctor>(
      `SELECT d.*, dep.name as department_name, dep.code as department_code, dep.description as department_description 
       FROM doctors d
       JOIN departments dep ON d.department_id = dep.id
       WHERE d.id = ?`,
      [doctorId]
    );

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Fetch weekly schedules
    const schedules = await db.query(
      'SELECT * FROM doctor_schedules WHERE doctor_id = ? AND is_active = 1 ORDER BY day_of_week ASC',
      [doctorId]
    );

    return res.status(200).json({
      success: true,
      doctor,
      schedules
    });
  } catch (error) {
    next(error);
  }
}

export async function getDoctorAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const doctorId = parseInt(req.params.id, 10);
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    if (isNaN(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ success: false, message: 'Invalid date format (use YYYY-MM-DD)' });
    }

    const slots = await getDoctorAvailableSlots(doctorId, dateStr);

    return res.status(200).json({
      success: true,
      doctorId,
      date: dateStr,
      slots,
      totalSlots: slots.length,
      availableSlots: slots.filter((s) => s.available).length
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDoctorStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    if (!['AVAILABLE', 'ON_LEAVE', 'BUSY', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor status' });
    }

    const doctor = await db.getOne<Doctor>('SELECT * FROM doctors WHERE user_id = ?', [req.user!.userId]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    await db.execute('UPDATE doctors SET status = ? WHERE id = ?', [status, doctor.id]);

    await logAudit({
      userId: req.user!.userId,
      action: 'DOCTOR_STATUS_UPDATE',
      entityType: 'doctor',
      entityId: doctor.id,
      details: { from: doctor.status, to: status },
      ipAddress: req.ip
    });

    const io = getSocketIO();
    if (io) {
      io.emit('doctor:status_changed', {
        doctorId: doctor.id,
        status,
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: `Doctor status updated to ${status}`,
      status
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllDepartments(_req: Request, res: Response, next: NextFunction) {
  try {
    const departments = await db.query<Department>(
      `SELECT dep.*, COUNT(d.id) as doctor_count 
       FROM departments dep 
       LEFT JOIN doctors d ON dep.id = d.department_id AND d.status != 'INACTIVE'
       GROUP BY dep.id 
       ORDER BY dep.name ASC`
    );

    return res.status(200).json({
      success: true,
      departments
    });
  } catch (error) {
    next(error);
  }
}
