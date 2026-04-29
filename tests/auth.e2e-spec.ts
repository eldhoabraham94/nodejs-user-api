import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { clearDatabase, createTestApp } from './setup/test-app.factory';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(app);
  });

  const validRegisterBody = {
    data: {
      type: 'users',
      attributes: { name: 'Alice', email: 'alice@example.com', password: 'Password1!' },
    },
  };

  // ─── POST /auth/register ───────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('201 — creates user and returns access_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegisterBody)
        .expect(201);

      expect(res.body.data.type).toBe('users');
      expect(res.body.data.attributes.access_token).toBeDefined();
      expect(res.body.data.attributes.password).toBeUndefined();
    });

    it('409 — duplicate email', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(validRegisterBody);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validRegisterBody)
        .expect(409);

      expect(res.body.errors[0].status).toBe('409');
    });

    it('422 — missing name', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ data: { type: 'users', attributes: { email: 'alice@example.com', password: 'Password1!' } } })
        .expect(422);

      expect(res.body.errors[0].source.pointer).toBe('/data/attributes/name');
    });

    it('422 — invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ data: { type: 'users', attributes: { name: 'Alice', email: 'not-an-email', password: 'Password1!' } } })
        .expect(422);

      expect(res.body.errors[0].source.pointer).toBe('/data/attributes/email');
    });

    it('422 — password too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ data: { type: 'users', attributes: { name: 'Alice', email: 'alice@example.com', password: 'short' } } })
        .expect(422);

      expect(res.body.errors[0].source.pointer).toBe('/data/attributes/password');
    });
  });

  // ─── POST /auth/login ──────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(validRegisterBody);
    });

    it('200 — returns access_token on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ data: { type: 'users', attributes: { email: 'alice@example.com', password: 'Password1!' } } })
        .expect(200);

      expect(res.body.data.attributes.access_token).toBeDefined();
    });

    it('401 — wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ data: { type: 'users', attributes: { email: 'alice@example.com', password: 'WrongPass1!' } } })
        .expect(401);

      expect(res.body.errors).toBeDefined();
    });

    it('401 — unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ data: { type: 'users', attributes: { email: 'nobody@example.com', password: 'Password1!' } } })
        .expect(401);

      expect(res.body.errors).toBeDefined();
    });
  });
});
