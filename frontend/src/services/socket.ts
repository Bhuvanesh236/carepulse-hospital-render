import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const envSocket = (import.meta as any).env?.VITE_SOCKET_URL || (import.meta as any).env?.VITE_API_URL;
    const socketUrl = envSocket ? envSocket.replace(/\/$/, '') : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

    socketInstance = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });
  }
  return socketInstance;
}

export function joinUserRoom(userId: number) {
  const socket = getSocket();
  socket.emit('user:join', userId);
}

export function joinDoctorQueue(doctorId: number) {
  const socket = getSocket();
  socket.emit('doctor:join_queue', doctorId);
}

export function leaveDoctorQueue(doctorId: number) {
  const socket = getSocket();
  socket.emit('doctor:leave_queue', doctorId);
}
