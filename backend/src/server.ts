import http from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/env';
import { getDatabase } from './config/database';
import { setSocketIO } from './services/notificationService';
import { errorHandler } from './middleware/errorHandler';
import apiRouter from './routes';
import { seedDatabase } from './database/seed';

const app = express();
const server = http.createServer(app);

// 1. Security & Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost, Vite dev server, and same-origin
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 2. Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 3. Socket.IO Real-Time Engine Setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setSocketIO(io);

io.on('connection', (socket) => {
  // Join user private room
  socket.on('user:join', (userId: number) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  // Join doctor queue room
  socket.on('doctor:join_queue', (doctorId: number) => {
    if (doctorId) {
      socket.join(`doctor:queue:${doctorId}`);
    }
  });

  socket.on('doctor:leave_queue', (doctorId: number) => {
    if (doctorId) {
      socket.leave(`doctor:queue:${doctorId}`);
    }
  });
});

// 4. API Routes
app.use('/api', apiRouter);

// 5. Serve Frontend Static Assets if available (Production Web Service on Render)
const candidateDistPaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, '../../../frontend/dist'),
  path.join(process.cwd(), 'frontend/dist'),
  path.join(process.cwd(), '../frontend/dist')
];
const frontendDistPath = candidateDistPaths.find((p) => fs.existsSync(p));
if (frontendDistPath) {
  console.log(`📦 Serving static frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 6. Global Error Handler
app.use(errorHandler);

// 6. Bootstrap Server & Database
async function bootstrap() {
  try {
    console.log('🚀 Initializing Database connection...');
    await getDatabase();

    console.log('🌱 Checking seed data...');
    await seedDatabase();

    server.listen(config.port, () => {
      console.log(`===========================================================`);
      console.log(`🏥 CarePulse Hospital API Server running on port ${config.port}`);
      console.log(`🔗 API Base: http://localhost:${config.port}/api`);
      console.log(`⚡ WebSocket Server Active`);
      console.log(`===========================================================`);
    });
  } catch (error) {
    console.error('❌ Failed to start Hospital Server:', error);
    process.exit(1);
  }
}

bootstrap();
