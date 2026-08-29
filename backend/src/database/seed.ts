import bcrypt from 'bcryptjs';
import { db, getDatabase } from '../config/database';

export async function seedDatabase() {
  console.log('🌱 Starting Hospital Database Seeding...');
  const adapter = await getDatabase();

  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('Admin@2026', salt);
  const docPass = await bcrypt.hash('Doctor@2026', salt);
  const patPass = await bcrypt.hash('Patient@2026', salt);

  // 1. Seed System Settings
  const settings = [
    { key: 'max_active_appointments_per_patient', value: '3', desc: 'Maximum active appointments a patient can hold simultaneously' },
    { key: 'checkin_window_before_minutes', value: '60', desc: 'Allow check-in N minutes before scheduled slot' },
    { key: 'checkin_window_after_minutes', value: '30', desc: 'Allow check-in up to N minutes after scheduled slot' },
    { key: 'default_consultation_duration_minutes', value: '15', desc: 'Default consultation duration for time slot generation' },
    { key: 'priority_weight_emergency', value: '10000', desc: 'Base priority score bonus for emergency patients' },
    { key: 'priority_weight_high', value: '5000', desc: 'Base priority score bonus for high priority patients' },
    { key: 'auto_flag_noshow_threshold', value: '2', desc: 'Number of consecutive no-shows to automatically flag account' }
  ];

  for (const s of settings) {
    await db.execute(
      `INSERT INTO system_settings (setting_key, setting_value, description) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [s.key, s.value, s.desc, s.value]
    );
  }

  // 2. Seed Departments
  const departmentsData = [
    { name: 'Cardiology', code: 'CARD', description: 'Advanced cardiovascular care, ECG, and heart health center', icon: 'Heart' },
    { name: 'Neurology', code: 'NEUR', description: 'Comprehensive brain, spine, and nervous system disorders care', icon: 'Brain' },
    { name: 'Pediatrics', code: 'PED', description: 'Specialized infant, child, and adolescent healthcare and immunizations', icon: 'Baby' },
    { name: 'Orthopedics', code: 'ORTH', description: 'Bone, joint, spine, and musculoskeletal surgery & rehabilitation', icon: 'Bone' },
    { name: 'Dermatology', code: 'DERM', description: 'Skin, hair, nail treatments and specialized cosmetic dermatology', icon: 'Sparkles' },
    { name: 'General Medicine', code: 'GEN', description: 'Primary healthcare, internal medicine, diagnosis, and chronic disease management', icon: 'Stethoscope' }
  ];

  const depMap: { [code: string]: number } = {};
  for (const d of departmentsData) {
    const existing = await db.getOne<{ id: number }>('SELECT id FROM departments WHERE code = ?', [d.code]);
    if (existing) {
      depMap[d.code] = existing.id;
    } else {
      const res = await db.execute(
        'INSERT INTO departments (name, code, description, icon, status) VALUES (?, ?, ?, ?, "ACTIVE")',
        [d.name, d.code, d.description, d.icon]
      );
      depMap[d.code] = res.insertId;
    }
  }

  // 3. Seed Admin User
  let adminUser = await db.getOne<{ id: number }>('SELECT id FROM users WHERE email = ?', ['admin@hospital.com']);
  if (!adminUser) {
    const res = await db.execute(
      "INSERT INTO users (email, password_hash, role, status) VALUES ('admin@hospital.com', ?, 'ADMIN', 'ACTIVE')",
      [adminPass]
    );
    adminUser = { id: res.insertId };
  } else {
    await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [adminPass, 'admin@hospital.com']);
  }

  // 4. Seed Doctors (12 realistic doctors across departments)
  const doctorsData = [
    {
      email: 'doctor.sarah@hospital.com',
      code: 'DOC-2026-001',
      name: 'Dr. Sarah Jenkins',
      dep: 'CARD',
      spec: 'Interventional Cardiology',
      qual: 'MD, FACC, Harvard Medical',
      exp: 14,
      phone: '+1 (555) 234-5671',
      img: '/assets/doctors/dr-sarah.jpg',
      duration: 15,
      room: 'Room 201 (Cardio Wing)',
      bio: 'Board-certified cardiologist specializing in coronary artery disease, preventative cardiovascular wellness, and heart rhythm management.'
    },
    {
      email: 'doctor.robert@hospital.com',
      code: 'DOC-2026-002',
      name: 'Dr. Robert Chen',
      dep: 'NEUR',
      spec: 'Neurophysiology & Epilepsy',
      qual: 'MD, PhD, Johns Hopkins',
      exp: 16,
      phone: '+1 (555) 234-5672',
      img: '/assets/doctors/dr-robert.jpg',
      duration: 20,
      room: 'Room 304 (Neuro Wing)',
      bio: 'Leading specialist in neurodegenerative treatments, stroke recovery protocols, and advanced EEG diagnostic analysis.'
    },
    {
      email: 'doctor.emily@hospital.com',
      code: 'DOC-2026-003',
      name: 'Dr. Emily Vance',
      dep: 'PED',
      spec: 'General Pediatrics & Neonatology',
      qual: 'MD, FAAP, Stanford University',
      exp: 11,
      phone: '+1 (555) 234-5673',
      img: '/assets/doctors/dr-emily.jpg',
      duration: 15,
      room: 'Room 105 (Children Wing)',
      bio: 'Compassionate pediatrician devoted to newborn care, childhood developmental milestones, and preventive pediatric health.'
    },
    {
      email: 'doctor.marcus@hospital.com',
      code: 'DOC-2026-004',
      name: 'Dr. Marcus Thorne',
      dep: 'ORTH',
      spec: 'Joint Replacement & Sports Medicine',
      qual: 'MD, FAAOS, Mayo Clinic',
      exp: 18,
      phone: '+1 (555) 234-5674',
      img: '/assets/doctors/dr-marcus.jpg',
      duration: 15,
      room: 'Room 210 (Surgical Wing)',
      bio: 'Pioneering orthopedic surgeon specializing in minimally invasive knee and hip replacements and sports athletic rehabilitation.'
    },
    {
      email: 'doctor.aisha@hospital.com',
      code: 'DOC-2026-005',
      name: 'Dr. Aisha Patel',
      dep: 'DERM',
      spec: 'Clinical & Aesthetic Dermatology',
      qual: 'MD, FAAD, Oxford University',
      exp: 10,
      phone: '+1 (555) 234-5675',
      img: '/assets/doctors/dr-aisha.jpg',
      duration: 15,
      room: 'Room 112 (Derm Wing)',
      bio: 'Expert in chronic skin disorders, psoriasis therapies, laser skin treatment, and comprehensive skin oncology screenings.'
    },
    {
      email: 'doctor.james@hospital.com',
      code: 'DOC-2026-006',
      name: 'Dr. James Wilson',
      dep: 'GEN',
      spec: 'Internal & Preventive Medicine',
      qual: 'MD, FACP, Columbia University',
      exp: 20,
      phone: '+1 (555) 234-5676',
      img: '/assets/doctors/dr-james.jpg',
      duration: 15,
      room: 'Room 101 (Primary Care)',
      bio: 'Senior consultant in general medicine, complex internal diagnoses, hypertensive care, and diabetic management.'
    },
    {
      email: 'doctor.linda@hospital.com',
      code: 'DOC-2026-007',
      name: 'Dr. Linda Morales',
      dep: 'CARD',
      spec: 'Echocardiography & Heart Failure',
      qual: 'MD, University of Pennsylvania',
      exp: 12,
      phone: '+1 (555) 234-5677',
      img: '/assets/doctors/dr-linda.jpg',
      duration: 15,
      room: 'Room 203 (Cardio Wing)',
      bio: 'Dedicated cardiologist focusing on advanced non-invasive cardiac imaging, valve diseases, and hypertension therapeutics.'
    },
    {
      email: 'doctor.alex@hospital.com',
      code: 'DOC-2026-008',
      name: 'Dr. Alex Rivera',
      dep: 'NEUR',
      spec: 'Spine & Peripheral Nerve Disorders',
      qual: 'MD, Duke University',
      exp: 9,
      phone: '+1 (555) 234-5678',
      img: '/assets/doctors/dr-alex.jpg',
      duration: 15,
      room: 'Room 306 (Neuro Wing)',
      bio: 'Specialist in neuropathy, peripheral nerve surgery, chronic migraine management, and spinal pain interventions.'
    },
    {
      email: 'doctor.chloe@hospital.com',
      code: 'DOC-2026-009',
      name: 'Dr. Chloe Bennett',
      dep: 'PED',
      spec: 'Pediatric Allergy & Immunology',
      qual: 'MD, Boston Children’s Hospital',
      exp: 13,
      phone: '+1 (555) 234-5679',
      img: '/assets/doctors/dr-chloe.jpg',
      duration: 15,
      room: 'Room 108 (Children Wing)',
      bio: 'Recognized authority on childhood asthma, severe allergic eczema, immunological deficiencies, and food allergy management.'
    },
    {
      email: 'doctor.kevin@hospital.com',
      code: 'DOC-2026-010',
      name: 'Dr. Kevin Walsh',
      dep: 'ORTH',
      spec: 'Spine Surgery & Trauma',
      qual: 'MD, Yale University',
      exp: 15,
      phone: '+1 (555) 234-5680',
      img: '/assets/doctors/dr-kevin.jpg',
      duration: 15,
      room: 'Room 214 (Surgical Wing)',
      bio: 'Orthopedic trauma surgeon specializing in complex spinal reconstruction, disc herniation, and athletic injury repairs.'
    },
    {
      email: 'doctor.sophia@hospital.com',
      code: 'DOC-2026-011',
      name: 'Dr. Sophia Taylor',
      dep: 'DERM',
      spec: 'Pediatric & Surgical Dermatology',
      qual: 'MD, University of Michigan',
      exp: 8,
      phone: '+1 (555) 234-5681',
      img: '/assets/doctors/dr-sophia.jpg',
      duration: 15,
      room: 'Room 114 (Derm Wing)',
      bio: 'Dermatologist specializing in skin biopsy, pediatric skin allergies, mole mapping, and acne scar revision.'
    },
    {
      email: 'doctor.david@hospital.com',
      code: 'DOC-2026-012',
      name: 'Dr. David Miller',
      dep: 'GEN',
      spec: 'Geriatric & Preventive Medicine',
      qual: 'MD, UCLA Medical Center',
      exp: 22,
      phone: '+1 (555) 234-5682',
      img: '/assets/doctors/dr-daniel.jpg',
      duration: 15,
      room: 'Room 103 (Primary Care)',
      bio: 'Experienced primary care doctor focusing on senior healthcare, polypharmacy review, and metabolic syndrome treatment.'
    }
  ];

  const docIdMap: { [code: string]: number } = {};

  for (const d of doctorsData) {
    let u = await db.getOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [d.email]);
    if (!u) {
      const uRes = await db.execute(
        "INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, 'DOCTOR', 'ACTIVE')",
        [d.email, docPass]
      );
      u = { id: uRes.insertId };
    }

    let doc = await db.getOne<{ id: number }>('SELECT id FROM doctors WHERE doctor_id_code = ?', [d.code]);
    if (!doc) {
      const docRes = await db.execute(
        `INSERT INTO doctors 
         (user_id, doctor_id_code, department_id, full_name, specialization, qualification, experience_years, 
          contact_phone, contact_email, profile_image, consultation_duration_minutes, room_number, bio, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
        [
          u.id,
          d.code,
          depMap[d.dep],
          d.name,
          d.spec,
          d.qual,
          d.exp,
          d.phone,
          d.email,
          d.img,
          d.duration,
          d.room,
          d.bio
        ]
      );
      doc = { id: docRes.insertId };

      // Add schedules for Monday to Friday
      for (let day = 1; day <= 5; day++) {
        await db.execute(
          `INSERT INTO doctor_schedules 
           (doctor_id, day_of_week, start_time, end_time, break_start, break_end, slot_duration_minutes, is_active)
           VALUES (?, ?, '09:00:00', '17:00:00', '13:00:00', '14:00:00', ?, 1)`,
          [doc.id, day, d.duration]
        );
      }
    } else {
      await db.execute(
        'UPDATE doctors SET profile_image = ?, room_number = ?, bio = ? WHERE id = ?',
        [d.img, d.room, d.bio, doc.id]
      );
    }
    docIdMap[d.code] = doc.id;
  }

  // 5. Seed Patients
  const patientsData = [
    {
      email: 'patient.john@example.com',
      code: 'PAT-2026-000001',
      name: 'John Doe',
      dob: '1988-04-12',
      gender: 'MALE',
      phone: '+1 (555) 987-6541',
      address: '742 Evergreen Terrace, Springfield',
      blood: 'O+',
      contact: 'Jane Doe (+1 555-987-6540)',
      risk: 0
    },
    {
      email: 'patient.mary@example.com',
      code: 'PAT-2026-000002',
      name: 'Mary Poppins',
      dob: '1992-09-24',
      gender: 'FEMALE',
      phone: '+1 (555) 987-6542',
      address: '17 Cherry Tree Lane, London',
      blood: 'A+',
      contact: 'George Banks (+1 555-987-6500)',
      risk: 0
    },
    {
      email: 'patient.david@example.com',
      code: 'PAT-2026-000003',
      name: 'David Smith',
      dob: '1975-11-03',
      gender: 'MALE',
      phone: '+1 (555) 987-6543',
      address: '221B Baker Street, NW1',
      blood: 'B+',
      contact: 'Helen Smith (+1 555-987-6599)',
      risk: 1
    }
  ];

  const patIdMap: { [code: string]: number } = {};

  for (const p of patientsData) {
    let u = await db.getOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [p.email]);
    if (!u) {
      const uRes = await db.execute(
        "INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, 'PATIENT', 'ACTIVE')",
        [p.email, patPass]
      );
      u = { id: uRes.insertId };
    }

    let pat = await db.getOne<{ id: number }>('SELECT id FROM patients WHERE patient_id_code = ?', [p.code]);
    if (!pat) {
      const patRes = await db.execute(
        `INSERT INTO patients 
         (user_id, patient_id_code, full_name, dob, gender, phone, address, blood_group, emergency_contact, risk_flag_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, p.code, p.name, p.dob, p.gender, p.phone, p.address, p.blood, p.contact, p.risk]
      );
      pat = { id: patRes.insertId };
    }
    patIdMap[p.code] = pat.id;
  }

  // 6. Seed Sample Appointments for Today and Past
  const todayStr = new Date().toISOString().slice(0, 10);
  const sampleAppointments = [
    {
      code: 'APT-2026-000001',
      patCode: 'PAT-2026-000001',
      docCode: 'DOC-2026-001',
      depCode: 'CARD',
      date: todayStr,
      start: '09:00:00',
      end: '09:15:00',
      reason: 'Routine cardiovascular checkup and blood pressure monitoring',
      priority: 'NORMAL',
      status: 'IN_QUEUE',
      queueNum: 'Q-001',
      qStatus: 'IN_PROGRESS'
    },
    {
      code: 'APT-2026-000002',
      patCode: 'PAT-2026-000002',
      docCode: 'DOC-2026-001',
      depCode: 'CARD',
      date: todayStr,
      start: '09:15:00',
      end: '09:30:00',
      reason: 'Sudden acute palpitations and severe dizziness (Emergency referral)',
      priority: 'EMERGENCY',
      status: 'IN_QUEUE',
      queueNum: 'Q-002',
      qStatus: 'CALLED'
    },
    {
      code: 'APT-2026-000003',
      patCode: 'PAT-2026-000003',
      docCode: 'DOC-2026-001',
      depCode: 'CARD',
      date: todayStr,
      start: '09:30:00',
      end: '09:45:00',
      reason: 'Follow-up consultation on lipid lowering medications',
      priority: 'NORMAL',
      status: 'IN_QUEUE',
      queueNum: 'Q-003',
      qStatus: 'WAITING'
    }
  ];

  for (const appt of sampleAppointments) {
    const existing = await db.getOne<{ id: number }>('SELECT id FROM appointments WHERE appointment_code = ?', [appt.code]);
    if (!existing) {
      const aRes = await db.execute(
        `INSERT INTO appointments 
         (appointment_code, patient_id, doctor_id, department_id, appointment_date, start_time, end_time, reason, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          appt.code,
          patIdMap[appt.patCode],
          docIdMap[appt.docCode],
          depMap[appt.depCode],
          appt.date,
          appt.start,
          appt.end,
          appt.reason,
          appt.priority,
          appt.status
        ]
      );
      const apptId = aRes.insertId;

      if (appt.queueNum) {
        const score = appt.priority === 'EMERGENCY' ? 10900 : 1850;
        await db.execute(
          `INSERT INTO queue_entries 
           (queue_number, appointment_id, patient_id, doctor_id, priority_level, priority_score, status, queue_position, estimated_wait_minutes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 15)`,
          [
            appt.queueNum,
            apptId,
            patIdMap[appt.patCode],
            docIdMap[appt.docCode],
            appt.priority,
            score,
            appt.qStatus
          ]
        );
      }
    }
  }

  console.log('✅ Database Seeding completed successfully!');
  console.log('===========================================================');
  console.log('DEMO ACCOUNTS FOR EVALUATION:');
  console.log('  👑 Admin:   admin@hospital.com       / Admin@2026');
  console.log('  👨‍⚕️ Doctor:  doctor.sarah@hospital.com / Doctor@2026');
  console.log('  👨‍⚕️ Doctor:  doctor.robert@hospital.com/ Doctor@2026');
  console.log('  🧑 Patient: patient.john@example.com / Patient@2026');
  console.log('  🧑 Patient: patient.mary@example.com / Patient@2026');
  console.log('===========================================================');
}

// Allow direct CLI execution
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
