import { getDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

async function reset() {
  const db = await getDatabase();
  const adminPass = await bcrypt.hash('Admin@2026', 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', [adminPass, 'admin@hospital.com']);
  console.log('✅ Admin password updated to Admin@2026');
}

reset().then(() => process.exit(0));
