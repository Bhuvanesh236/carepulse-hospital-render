import { db } from '../config/database';

export interface AuditParams {
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, any> | string;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const detailsJson = typeof params.details === 'object'
      ? JSON.stringify(params.details)
      : params.details || null;

    await db.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json, ip_address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.userId || null,
        params.action,
        params.entityType,
        params.entityId || null,
        detailsJson,
        params.ipAddress || null
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
