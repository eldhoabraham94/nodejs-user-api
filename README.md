# Users API

A RESTful API for user management built with **NestJS**, **TypeORM**, and **MySQL**.  
Follows the [JSON:API 1.0](https://jsonapi.org/format/) specification and demonstrates SOLID principles via TypeScript.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS (Express) |
| Language | TypeScript (strict) |
| Database | MySQL 8 (TypeORM) |
| Auth | JWT (passport-jwt) |
| Validation | class-validator + class-transformer |
| Docs | Swagger / OpenAPI |
| Testing | Jest + Supertest (SQLite in-memory for e2e) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Docker (for the local MySQL instance)

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

```bash
docker compose up -d
```

This starts a MySQL 8 container on port `3306` with database `users_api` and root password `secret`.

### 3. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` match the Docker Compose setup — no edits required for local development.

### 4. Start the API

```bash
npm run start:dev
```

The server starts on **http://localhost:3000**.  
Swagger UI is available at **http://localhost:3000/api/docs**.

### 5. Seed the initial admin user

```bash
npm run seed
```

This creates the admin user defined in `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).  
Use these credentials to obtain an admin token via `POST /api/v1/auth/login`.

---

## Try it in Swagger

1. Open **http://localhost:3000/api/docs**
2. Expand **POST /auth/login** → **Try it out**, paste the body below, and click **Execute**:

```json
{
  "data": {
    "type": "users",
    "attributes": {
      "email": "admin@example.com",
      "password": "Admin1234!"
    }
  }
}
```

3. Copy the `access_token` from the response body.
4. Click **Authorize** (top-right lock icon), paste the token (**no** `Bearer` prefix — Swagger adds it), click **Authorize** → **Close**.

All protected endpoints are now unlocked for the session.

---

## API Reference

Base URL: `/api/v1`  
All requests and responses use `Content-Type: application/vnd.api+json`.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Login and receive `access_token` |

### Users

| Method | Path | Auth | Access |
|---|---|---|---|
| GET | `/users` | Bearer | ADMIN only |
| GET | `/users/:id` | Bearer | Own record or ADMIN |
| PATCH | `/users/:id` | Bearer | Own record or ADMIN |
| DELETE | `/users/:id` | Bearer | ADMIN only (no self-delete) |

### Request format

```json
{
  "data": {
    "type": "users",
    "attributes": {
      "name": "Alice",
      "email": "alice@example.com",
      "password": "Password1!"
    }
  }
}
```

### Response format

```json
{
  "data": {
    "type": "users",
    "id": "uuid",
    "attributes": {
      "name": "Alice",
      "email": "alice@example.com",
      "role": "USER"
    }
  }
}
```

### Error format

```json
{
  "errors": [
    {
      "status": "422",
      "title": "Validation Error",
      "detail": "email must be a valid email address",
      "source": { "pointer": "/data/attributes/email" }
    }
  ]
}
```

### HTTP status codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 204 | No Content (DELETE) |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate email, body `id` mismatch) |
| 422 | Validation Error |

---

## Running Tests

```bash
# Unit tests (no database required)
npm test

# Unit tests with coverage report
npm run test:cov

# E2E tests (SQLite in-memory — no database required)
npm run test:e2e
```

---

## Authorization Rules

| Action | USER | ADMIN |
|---|---|---|
| View own profile | ✅ | ✅ |
| View other profiles | ❌ → 403 | ✅ |
| Update own profile | ✅ | ✅ |
| Update own role | ❌ (silently ignored) | ✅ |
| Update other profiles | ❌ → 403 | ✅ |
| Delete users | ❌ → 403 | ✅ |
| Delete self | ❌ → 403 | ❌ → 403 |

---

## Architecture

```
src/
  auth/           JWT strategy, guards, register/login endpoints
  users/          User entity, repository interface, service, CRUD endpoints
  common/         Global interceptor (JSON:API), exception filter, interfaces
  config/         Database and JWT configuration
```

**SOLID principles in practice:**

- **S** — Controller handles HTTP; Service owns business rules; Repository owns persistence
- **O** — `IUserRepository` is the extension point; swap MySQL for Elasticsearch without touching `UsersService`
- **L** — `UserRepository` satisfies `IUserRepository` fully; e2e tests use a SQLite-backed implementation transparently
- **I** — `JwtPayload` is a lean interface used by middleware; guards never depend on the full `User` entity
- **D** — `UsersService` injects `IUserRepository` (abstraction); `AuthService` injects `UsersService` (abstraction); concrete classes are wired at the module level

---

## Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |
| `npm run seed` | Create initial admin user |
| `npm test` | Unit tests |
| `npm run test:cov` | Unit tests + coverage |
| `npm run test:e2e` | E2E tests |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Prettier format |
