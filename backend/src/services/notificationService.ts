import { db } from '../config/database';
import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  ioInstance = io;
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export interface SendNotificationParams {
  userId: number;
  title: string;
  message: string;
  type?: string;
  metadata?: Record<string, any>;
}

export async function sendNotification(params: SendNotificationParams): Promise<void> {
  try {
    const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;
    const type = params.type || 'SYSTEM';

    const result = await db.execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, metadata_json)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [params.userId, params.title, params.message, type, metadataJson]
    );

    // Emit live event to user if connected
    if (ioInstance) {
      ioInstance.to(`user:${params.userId}`).emit('notification:new', {
        id: result.insertId,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
