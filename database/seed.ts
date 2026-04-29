import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Role, User } from '../src/users/entities/user.entity';

dotenv.config();

const dbType = process.env.DB_TYPE ?? 'better-sqlite3';

const ds = new DataSource(
  dbType === 'better-sqlite3'
    ? {
        type: 'better-sqlite3',
        database: process.env.DB_NAME ?? './dev.db',
        entities: [User],
        synchronize: true,
      }
    : {
        type: 'mysql',
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 3306),
        username: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASS ?? '',
        database: process.env.DB_NAME ?? 'users_api',
        entities: [User],
        synchronize: true,
      },
);

async function seed() {
  await ds.initialize();
  const repo = ds.getRepository(User);

  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    await ds.destroy();
    return;
  }

  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'Admin1234!', 10);
  const admin = repo.create({
    name: process.env.ADMIN_NAME ?? 'Admin',
    email,
    password,
    role: Role.ADMIN,
  });

  await repo.save(admin);
  console.log(`Admin user created: ${email}`);
  await ds.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
