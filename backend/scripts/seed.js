import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/index.js';
import { ROLES } from '../src/utils/constants.js';

// Dev-only password for every seeded account
const SEED_PASSWORD = 'Pass@123';

const admins = [
  { name: 'Admin One', phone: '9000000001', email: 'admin@sevavoice.test', preferredLanguage: 'en' },
];

const verifiers = [
  { name: 'Verifier Meera', phone: '9000000011', email: 'meera@sevavoice.test', preferredLanguage: 'en' },
  { name: 'Verifier Rahul', phone: '9000000012', email: 'rahul@sevavoice.test', preferredLanguage: 'hi' },
];

const farmers = [
  { name: 'Ramesh Patil', phone: '9000000101', preferredLanguage: 'mr',
    profile: { village: 'Shirur', district: 'Pune', state: 'Maharashtra', landSizeAcres: 3.5, cropType: 'Sugarcane' } },
  { name: 'Sunita Jadhav', phone: '9000000102', preferredLanguage: 'mr',
    profile: { village: 'Karjat', district: 'Ahmednagar', state: 'Maharashtra', landSizeAcres: 2, cropType: 'Jowar' } },
  { name: 'Mohan Singh', phone: '9000000103', preferredLanguage: 'hi',
    profile: { village: 'Baraut', district: 'Baghpat', state: 'Uttar Pradesh', landSizeAcres: 4, cropType: 'Wheat' } },
  { name: 'Lakshmi Devi', phone: '9000000104', preferredLanguage: 'hi',
    profile: { village: 'Nawada', district: 'Nawada', state: 'Bihar', landSizeAcres: 1.5, cropType: 'Rice' } },
  { name: 'Gopal Reddy', phone: '9000000105', preferredLanguage: 'en',
    profile: { village: 'Narsapur', district: 'Medak', state: 'Telangana', landSizeAcres: 5, cropType: 'Cotton' } },
];

const donors = [
  { name: 'Anita Sharma', phone: '9000000201', email: 'anita@sevavoice.test', preferredLanguage: 'en' },
  { name: 'Vikram Mehta', phone: '9000000202', email: 'vikram@sevavoice.test', preferredLanguage: 'en' },
  { name: 'Priya Nair', phone: '9000000203', email: 'priya@sevavoice.test', preferredLanguage: 'en' },
  { name: 'Suresh Kulkarni', phone: '9000000204', email: 'suresh@sevavoice.test', preferredLanguage: 'mr' },
];

async function seed() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production');
  }

  await connectDB();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const all = [
    ...admins.map((u) => ({ ...u, role: ROLES.ADMIN })),
    ...verifiers.map((u) => ({ ...u, role: ROLES.VERIFIER })),
    ...farmers.map((u) => ({ ...u, role: ROLES.FARMER })),
    ...donors.map((u) => ({ ...u, role: ROLES.DONOR })),
  ];

  // Remove previously seeded users (matched by phone) so the script can be re-run
  const phones = all.map((u) => u.phone);
  const old = await User.find({ phone: { $in: phones } }).select('_id');
  const oldIds = old.map((u) => u._id);
  await User.deleteMany({ _id: { $in: oldIds } });

  const created = [];
  for (const { profile, ...userData } of all) {
    const user = await User.create({ ...userData, ...profile, passwordHash });
    created.push(user);
  }

  console.log(`Seeded ${created.length} users:`);
  console.log(`  admin: ${admins.length}, verifiers: ${verifiers.length}, farmers: ${farmers.length}, donors: ${donors.length}`);
  console.log(`All accounts use password: ${SEED_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());