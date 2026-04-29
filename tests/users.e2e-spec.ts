import { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Role, User } from '../src/users/entities/user.entity';
import { clearDatabase, createTestApp } from './setup/test-app.factory';

async function register(
  app: INestApplication,
  attrs: { name: string; email: string; password: string },
): Promise<{ id: string; token: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ data: { type: 'users', attributes: attrs } });
  return { id: res.body.data.id as string, token: res.body.data.attributes.access_token as string };
}

async function loginAs(app: INestApplication, email: string, password: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ data: { type: 'users', attributes: { email, password } } });
  return res.body.data.attributes.access_token as string;
}

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(app);

    // Register a regular user
    ({ id: userId, token: userToken } = await register(app, {
      name: 'Regular User',
      email: 'user@example.com',
      password: 'UserPass1!',
    }));

    // Register second user and promote to ADMIN via direct DB update — or
    // register and then login; for simplicity register an admin via the same
    // register endpoint and patch role via the repo directly.
    // Since we can't promote via HTTP without an existing admin, we register
    // a second user and use the service to set its role.
    const adminReg = await register(app, {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'AdminPass1!',
    });
    adminId = adminReg.id;

    // Promote to ADMIN directly via TypeORM
    const ds = app.get<DataSource>(getDataSourceToken());
    await ds.getRepository(User).update(adminId, { role: Role.ADMIN });

    adminToken = await loginAs(app, 'admin@example.com', 'AdminPass1!');
  });

  // ─── GET /users ───────────────────────────────────────────────────────────

  describe('GET /api/v1/users', () => {
    it('401 — no token', () => request(app.getHttpServer()).get('/api/v1/users').expect(401));

    it('403 — USER role', () =>
      request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403));

    it('200 — ADMIN receives array with meta.count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.count).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── GET /users/:id ───────────────────────────────────────────────────────

  describe('GET /api/v1/users/:id', () => {
    it('401 — no token', () => request(app.getHttpServer()).get(`/api/v1/users/${userId}`).expect(401));

    it('200 — USER views own record', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(userId);
    });

    it('403 — USER views foreign record', () =>
      request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403));

    it('200 — ADMIN views any user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(userId);
    });

    it('404 — ADMIN views non-existent user', () =>
      request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404));
  });

  // ─── PATCH /users/:id ─────────────────────────────────────────────────────

  describe('PATCH /api/v1/users/:id', () => {
    it('200 — USER updates own name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: { type: 'users', id: userId, attributes: { name: 'New Name' } } })
        .expect(200);

      expect(res.body.data.attributes.name).toBe('New Name');
    });

    it('200 — USER role change is silently ignored', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: { type: 'users', id: userId, attributes: { role: 'ADMIN' } } })
        .expect(200);

      expect(res.body.data.attributes.role).toBe('USER');
    });

    it('200 — ADMIN changes role of another user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { type: 'users', id: userId, attributes: { role: 'ADMIN' } } })
        .expect(200);

      expect(res.body.data.attributes.role).toBe('ADMIN');
    });

    it('403 — USER updates foreign record', () =>
      request(app.getHttpServer())
        .patch(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: { type: 'users', id: adminId, attributes: { name: 'Hacker' } } })
        .expect(403));

    it('404 — ADMIN patches non-existent user', () =>
      request(app.getHttpServer())
        .patch('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { type: 'users', id: '00000000-0000-0000-0000-000000000000', attributes: { name: 'X' } } })
        .expect(404));

    it('409 — body id does not match URL id', () =>
      request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ data: { type: 'users', id: 'different-id', attributes: { name: 'X' } } })
        .expect(409));

    it('422 — invalid email', () =>
      request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ data: { type: 'users', id: userId, attributes: { email: 'not-an-email' } } })
        .expect(422));
  });

  // ─── DELETE /users/:id ────────────────────────────────────────────────────

  describe('DELETE /api/v1/users/:id', () => {
    it('403 — USER cannot delete', () =>
      request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403));

    it('403 — ADMIN cannot self-delete', () =>
      request(app.getHttpServer())
        .delete(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403));

    it('204 — ADMIN deletes another user', () =>
      request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204));

    it('404 — ADMIN deletes non-existent user', () =>
      request(app.getHttpServer())
        .delete('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404));
  });
});
