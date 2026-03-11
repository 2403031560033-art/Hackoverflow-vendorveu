import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import Admin from '../models/Admin.js';

dotenv.config();

async function main() {
  const username = process.env.ADMIN_SEED_USERNAME || 'admin';
  const password = process.env.ADMIN_SEED_PASSWORD || 'admin12345';

  if (!process.env.ADMIN_JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET is required in .env');
  }

  await connectDB();

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists. Nothing to do.`);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  await Admin.create({ username, password: hashed });

  console.log(`Seeded admin "${username}".`);
  console.log('You can now login via POST /api/admin/login');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

