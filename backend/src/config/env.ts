import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'super-secure-hospital-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Database configuration
  db: {
    type: (process.env.DB_TYPE || 'auto') as 'mysql' | 'sqlite' | 'auto',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hospital_db',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    sqliteFile: process.env.SQLITE_FILE || path.resolve(__dirname, '../../../database/hospital.sqlite')
  },

  // Hospital settings defaults
  hospital: {
    name: 'CarePulse Medical & Queue Intelligence Center',
    maxActiveAppointmentsPerPatient: 3,
    checkInWindowBeforeMinutes: 60,
    checkInWindowAfterMinutes: 30,
    defaultConsultationDurationMinutes: 15
  }
};
