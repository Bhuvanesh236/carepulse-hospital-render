# 🏥 CarePulse | Intelligent Hospital Appointment & Queue Optimization System

An enterprise-grade, full-stack hospital operational platform designed to eliminate waiting room congestion, prevent double bookings with transactional concurrency locks, dynamically optimize consultation queues using weighted multi-factor scoring, and provide real-time WebSocket telemetry to patients, physicians, and clinical administrators.

---

## 🌟 Key Highlights & System Architecture

- **⚡ Sub-Second Live Queue Telemetry**: Bi-directional WebSockets (`Socket.IO`) propagate consultation room transitions, token advancement, and wait time adjustments instantly to all connected screens.
- **🛡️ Concurrency-Safe Transactional Mutex**: Slot reservation engine with atomic row-level locks preventing race-condition double-booking.
- **🧠 Multi-Factor Queue Optimization Engine**: Deterministic priority formula calculating emergency bonuses, schedule alignment, arrival tie-breakers, and dynamic remaining wait estimations.
- **🚫 Anti-Abuse & Risk Mitigations**: 3 active appointment caps, automatic account risk flags for chronic no-shows, and configurable check-in windows.
- **📊 Executive Analytics & Throughput Reporting**: Native SVG operational telemetry monitoring physician utilization, peak consultation load, and department volume distributions.

---

## 🏗️ System Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────────┐
   │                   React 18 Frontend SPA                    │
   │   (Vite + TypeScript + Tailwind CSS + Lucide Icons + WSS)  │
   └──────────────────────────────┬─────────────────────────────┘
                                  │ REST / WebSockets
                                  ▼
   ┌────────────────────────────────────────────────────────────┐
   │              Express 4.x + Socket.IO Server                │
   │  (TypeScript, Zod Validation, JWT Auth, Role Guards)       │
   └──────────────┬──────────────────────────────┬──────────────┘
                  │                              │
                  ▼                              ▼
   ┌──────────────────────────────┐ ┌───────────────────────────┐
   │ Dynamic Queue Engine         │ │ Audit & Security Logger   │
   │ • Priority scoring           │ │ • Access tracking         │
   │ • Dynamic wait times         │ │ • Risk flags              │
   └──────────────┬───────────────┘ └────────────┬──────────────┘
                  │                              │
                  ▼                              ▼
   ┌────────────────────────────────────────────────────────────┐
   │     Universal Relational DB Layer (MySQL / Embedded ACID)  │
   │  • Transaction isolation  • Strict foreign keys  • Seeds   │
   └────────────────────────────────────────────────────────────┘
```

### Tech Stack:
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Socket.IO Client, React Router v6
- **Backend**: Node.js v20, Express 4.x, TypeScript (`tsx`), Socket.IO, Zod Schema Validation, JWT, BcryptJS
- **Database**: Universal Relational Engine supporting live MySQL 8.0 or embedded ACID relational storage with transactional rollback support.

---

## 👥 Demo Evaluation Accounts

All accounts are pre-seeded and ready for immediate login with 1-click presets on the login page:

| Role | Email | Password | Access Capabilities |
|---|---|---|---|
| **👑 Hospital Admin** | `admin@hospital.com` | `Admin@2026` | Global Queue Supervisor, Reports, Doctors/Departments, System Settings, Audit Logs |
| **👨‍⚕️ Cardiologist** | `doctor.sarah@hospital.com` | `Doctor@2026` | Room 201 Queue Manager, Call Next, Clinical Notes, Diagnosis, Priority Escalations |
| **👨‍⚕️ Neurologist** | `doctor.robert@hospital.com` | `Doctor@2026` | Room 304 Queue Manager, Practice Dashboard, Patient Prescriptions |
| **🧑 Patient (Seeded)**| `patient.john@example.com` | `Patient@2026` | `PAT-2026-000001`, Live Queue Tracker, Digital Check-in, Appointment History |
| **🧑 Patient (New)** | Register via UI / API | Any password | Automatically generates unique formatted Patient ID (`PAT-2026-XXXXXX`) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ (tested on v20.18.0)
- npm or yarn

### 2. Starting the Backend Server
```bash
cd backend
npm run dev
# Server listening on http://localhost:5000 (API: http://localhost:5000/api)
```

### 3. Starting the Frontend Client
```bash
cd frontend
npm run dev
# Application available at http://localhost:5173
```

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Registers a new patient, auto-generating a unique `PAT-2026-XXXXXX` ID.
- `POST /api/auth/login` - Authenticates user (Patient, Doctor, Admin) and returns JWT bearer token.
- `GET /api/auth/me` - Validates token and returns current user profile.

### Clinical Specialists & Availability (`/api/doctors`)
- `GET /api/doctors` - Directory of active doctors, filterable by department ID and search query.
- `GET /api/doctors/departments` - List of clinical hospital departments with icons & codes.
- `GET /api/doctors/:id` - Full doctor profile with consultation duration & assigned examination room.
- `GET /api/doctors/:id/availability?date=YYYY-MM-DD` - Generates 15-minute time slots marking booked vs available slots.
- `PUT /api/doctors/me/status` - Updates doctor status (`AVAILABLE`, `BUSY`, `ON_LEAVE`).

### Appointment Booking & Lifecycle (`/api/appointments`)
- `GET /api/appointments` - Retrieves patient appointments (filtered by `status=UPCOMING|PAST|ALL`).
- `POST /api/appointments` - Concurrency-locked transactional booking with anti-abuse validation.
- `GET /api/appointments/:id` - Retrieves detailed appointment record with consultation notes.
- `PUT /api/appointments/:id/reschedule` - Reschedules appointment to a new date and time.
- `PUT /api/appointments/:id/cancel` - Cancels appointment and frees the time slot.

### Dynamic Queue & Clinical Room Management (`/api/queue`)
- `GET /api/queue/public-board` - Public monitor showing current token in consultation and waiting counts per room.
- `POST /api/queue/check-in` - Patient check-in generating queue token and computing initial priority score.
- `GET /api/queue/doctor/:doctorId` - Live doctor consultation queue ranked by priority score.
- `POST /api/queue/:id/call` - Physician announces and calls patient into examination room.
- `POST /api/queue/:id/start` - Physician commences clinical consultation.
- `POST /api/queue/:id/complete` - Physician concludes visit, enters diagnosis/prescription, and auto-advances the queue.
- `POST /api/queue/:id/no-show` - Physician flags unattended patient (updates no-show counter).
- `POST /api/queue/:id/skip` - Postpones patient to back of queue.
- `POST /api/queue/:id/priority` - Admin/Physician priority score escalation (`EMERGENCY`, `HIGH`, `NORMAL`, `LOW`).

### Executive Administration & Supervision (`/api/admin`)
- `GET /api/admin/dashboard` - Executive operational KPIs and today's throughput.
- `GET /api/admin/reports` - Analytics dataset for daily volume trends, department share, and physician utilization.
- `GET /api/admin/patients` - Comprehensive patient registry with risk flag supervisor.
- `POST /api/admin/patients/:id/unflag` - Clears no-show warning flags.
- `GET /api/admin/doctors` - Doctor configuration and schedule management.
- `POST /api/admin/doctors` - Registers a new doctor into the clinical roster.
- `PUT /api/admin/doctors/:id` - Updates doctor specialization, room, and duration.
- `GET /api/admin/settings` - Hospital system rules editor (window thresholds, score weights).
- `PUT /api/admin/settings` - Updates operational rules.
- `GET /api/admin/audit-logs` - Security audit trail tracking all clinical and operational actions.

---

## ⚡ WebSocket Events (`Socket.IO`)

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `queue:update` | Server ➔ Clients | `{ doctorId, queue, currentPatient }` | Broadcast whenever a doctor queue order, status, or wait time shifts |
| `appointment:update` | Server ➔ Clients | `{ appointmentId, status, doctorId }` | Broadcast when an appointment is booked, rescheduled, or cancelled |
| `doctor:status` | Server ➔ Clients | `{ doctorId, status }` | Broadcast when a physician toggles their availability status |
| `public:board_update` | Server ➔ Clients | `{ rooms: [...] }` | Broadcast to public display monitors with live room tokens |

---

## 📐 Deterministic Queue Scoring Formula

$$\text{Priority Score} = W_{\text{priority}} + \max\left(0, \frac{T_{\text{slot}} - T_{\text{now}}}{60}\right) \times 10 + \frac{1000}{\text{Arrival Sequence}}$$

- **Base Weights ($W_{\text{priority}}$)**:
  - `EMERGENCY`: **10,000 pts** (Always preempts standard queues)
  - `HIGH`: **5,000 pts**
  - `NORMAL`: **1,000 pts**
  - `LOW`: **500 pts**
- **Dynamic Estimated Wait Time ($EWT$)**:
  $$\text{Wait Time} = (\text{Queue Position} - 1) \times \text{Doctor Consultation Duration}$$

---

## 🔒 Security & Data Integrity

1. **Password Hashing**: Bcrypt with 10 salt rounds.
2. **JWT Authentication**: Encrypted stateless bearer tokens with role-based authorization guards (`PATIENT`, `DOCTOR`, `ADMIN`).
3. **Zod Validation**: Strict runtime schema validation across every incoming request payload.
4. **Audit Trail**: Every authentication, appointment booking, check-in, priority escalation, and consultation completion is permanently immutably logged with timestamp, user ID, and client IP.
