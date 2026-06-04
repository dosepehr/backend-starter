# NestJS Large-Scale Starter

A production-ready NestJS starter built for large-scale applications. Ships with authentication, authorization, audit trails, file management, caching, admin panel, structured logging, and a set of reusable utilities designed to scale.

---

## Stack

- **Framework**: NestJS 11 (Express)
- **Language**: TypeScript (CommonJS, nodenext resolution)
- **Database**: MySQL via TypeORM 0.3
- **Cache**: Redis via ioredis
- **Auth**: JWT (access + refresh) + OTP flow
- **Admin Panel**: AdminJS 7 (session-based)
- **Logging**: Winston
- **Docs**: Swagger / OpenAPI
- **File Processing**: Multer + Sharp

---

## What's Included

### Authentication
- Mobile + password login
- OTP-based login and signup (2-step)
- JWT access tokens (15 min) + refresh tokens (7 days, Redis-backed)
- Token blacklisting on logout
- Forgot password / reset password via OTP
- Cryptographically secure OTP generation (`crypto.randomInt`)
- OTP rate limiting (3 attempts per 10 minutes per mobile)
- Profile update (name, password)

### Authorization
- Role-based access control (`USER`, `ADMIN`)
- Global `AuthGuard` — validates JWT, checks blacklist
- Global `RolesGuard` — enforces `@Roles()` decorator
- `@Public()` decorator to opt out of auth on specific routes

### Audit Trail
- Automatic tracking of `createdBy`, `updatedBy`, `deletedBy`, `recoveredBy` on every entity
- Powered by TypeORM `EntitySubscriber` + `AsyncLocalStorage` — no manual wiring per service
- Soft delete and recovery support built into `GlobalEntity`

### Caching
- Redis-backed `CacheService` with `get`, `set`, `del`, `getOrSet`, `delByPattern`, `exists`, `ttl`
- Configurable key prefix and default TTL
- Graceful disconnect on shutdown

### File Management
- Upload with configurable destination per category
- Image resize and format conversion via Sharp
- File validation (MIME type, size)
- Automatic cleanup of uploaded files on request error

### Query Infrastructure
- `QueryService` — single facade for filter + search + order + paginate
- `BaseService` — base class for all services, exposes `findAll` using `ListConfig<T>`
- `ListConfig<T>` — type-safe definition of orderable, searchable, and filterable fields
- `ListQueryDto` — single DTO for all list endpoints (`ordering`, `search`, `page`, `limit`)

### Admin Panel
- AdminJS at `/admin`, protected by session auth
- Login requires `role = ADMIN` verified against the DB
- All resource actions gated with `isAccessible` — non-admin sessions blocked
- Auto-discovers all entities via TypeORM `DataSource`
- Global guards bypass `/admin/*` — no JWT interference

### Logging
- Winston with console (colorized) + file transports (`error.log`, `combined.log`)
- Request/response logging with duration and request ID
- Per-request UUID propagated via middleware (`X-Request-ID` header supported)

### Health Checks
- `GET /api/health` — checks DB, Redis, heap memory, disk
- Custom Redis health indicator

### Observability & Resilience
- Global timeout interceptor (30s default, per-route override via `@Timeout()`)
- Standardized response envelope: `{ status, message?, data? }`
- Standardized error envelope: `{ status: false, message, errors?, requestId? }`
- Rate limiting: 10 req/s (short), 100 req/60s (long) via `@nestjs/throttler`
- Helmet for HTTP security headers
- CORS configured via env

### API Documentation
- Swagger at `/docs` with persistent bearer auth
- `@DocsResponse()` — single source of truth for runtime message + Swagger description
- `@DocsErrors()` — per-code Swagger error documentation

---

## Project Structure

```
src/
├── modules/
│   ├── auth/          # Auth flows, JWT, OTP, profile
│   ├── users/         # User entity and role enum
│   └── file/          # File upload and storage
├── admin/             # AdminJS module and resource configs
├── app.module.ts
└── main.ts

utils/
├── guards/            # AuthGuard, RolesGuard, AppThrottlerGuard
├── interceptors/      # Response, Timeout, Logging, CleanupFiles
├── decorators/        # @Public, @Roles, @CurrentUser, @DocsResponse, @DocsErrors, @Timeout
├── filters/           # Global HTTP exception filter
├── middlewares/       # Request ID middleware
├── common/
│   ├── audit/         # AuditSubscriber, AuditInterceptor, AuditTransformInterceptor
│   ├── logger/        # AppLogger, LoggingInterceptor
│   ├── health/        # Health controller and Redis indicator
│   ├── query/         # QueryService, QueryModule
│   ├── pagination/    # PaginationService, PaginationDto
│   ├── ordering/      # OrderingService
│   ├── searching/     # SearchService
│   ├── filtering/     # FilterService
│   └── services/      # BaseService
├── cache/             # CacheService, CacheModule
├── global/            # GlobalEntity, GlobalRepository
├── env/               # Env validation with class-validator
├── interfaces/        # Shared TypeScript interfaces
├── funcs/             # Password hashing utilities
└── types/             # Express request augmentation

config/
├── db.config.ts
├── logger.config.ts
├── swagger.config.ts
├── throttler.config.ts
└── multer.config.ts
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Start in development (watch mode)
npm run start:dev
```

- API: `http://localhost:<PORT>/api`
- Swagger docs: `http://localhost:<PORT>/docs`
- Admin panel: `http://localhost:<PORT>/admin`

---

## Environment Variables

| Variable               | Description                          |
|------------------------|--------------------------------------|
| `NODE_ENV`             | `development` / `production` / `test` |
| `PORT`                 | Server port (1024–65535)             |
| `DB_HOST`              | MySQL host                           |
| `DB_PORT`              | MySQL port                           |
| `DB_USERNAME`          | MySQL username                       |
| `DB_PASSWORD`          | MySQL password                       |
| `DB_NAME`              | MySQL database name                  |
| `JWT_SECRET`           | Secret for signing access tokens     |
| `ADMIN_SESSION_SECRET` | Secret for AdminJS session cookies   |
| `CORS_ORIGIN`          | Allowed CORS origin                  |
| `REDIS_HOST`           | Redis host                           |
| `REDIS_PORT`           | Redis port                           |
| `REDIS_PASSWORD`       | Redis password (optional)            |
| `REDIS_DB`             | Redis DB index                       |
| `REDIS_KEY_PREFIX`     | Key prefix for all cache keys        |
| `REDIS_DEFAULT_TTL`    | Default cache TTL in seconds         |

---

## Adding a New Module

1. Create entity extending `GlobalEntity` (inherits audit fields, soft delete, `BaseEntity`)
2. Create service extending `BaseService<YourEntity>` and inject `QueryService`
3. Define a `ListConfig<YourEntity>` with `filterableFields`, `orderableFields`, `searchableFields`
4. Call `this.findAll(query, config)` in the list endpoint — pagination, search, filter, order handled automatically
5. Add an AdminJS resource config in `src/admin/resources/` and register it in `admin.module.ts`

---

## Suggested Features for Future Milestones

Below are features commonly required in large-scale production applications that are not yet in this starter. They are grouped by priority.

### High Priority

| Feature | Why |
|---|---|
| **Email / SMS provider integration** | OTPs are currently returned in the API response. Production requires a real delivery channel (e.g. Kavenegar, Twilio, SendGrid). |
| **Database migrations** | `synchronize: true` is only safe in development. TypeORM migrations give you versioned, reversible schema changes safe for production deploys. |
| **Event system** (`@nestjs/event-emitter`) | Decouple side effects (send OTP, log action, trigger webhook) from business logic. Prevents service coupling as the app grows. |
| **Queue / background jobs** (BullMQ + Redis) | Offload slow operations (email, image processing, report generation) to background workers. Prevents request timeouts on heavy tasks. |
| **Automated tests** (Jest) | Unit tests for services, e2e tests for controllers. Without them, refactoring at scale becomes dangerous. |
| **Docker + docker-compose** | Consistent dev/prod environments. Essential for team onboarding and CI pipelines. |

### Medium Priority

| Feature | Why |
|---|---|
| **Notifications module** | Push notifications (FCM/APNs), in-app notification feed with read/unread state. Required by almost every user-facing app. |
| **Soft delete admin UI** | AdminJS currently shows only active records. A filter for deleted records and a restore action gives ops teams visibility. |
| **Pagination cursor support** | Offset pagination breaks on large datasets with frequent inserts. Cursor-based pagination scales better for feeds and timelines. |
| **API versioning strategy** | URI versioning is set up (`/api/v1`). Define a clear deprecation policy and add version headers so clients can detect breaking changes. |
| **Request validation pipe hardening** | Add `forbidNonWhitelisted: true` and `forbidUnknownValues: true` globally to reject unknown fields in request bodies. |
| **i18n / localization** (`nestjs-i18n`) | Error messages and responses in the user's language. Required once the app targets multiple locales. |
| **Structured audit log storage** | Current audit writes to entity columns. A separate `audit_logs` table gives queryable history without polluting the main tables. |

### Infrastructure & DevOps

| Feature | Why |
|---|---|
| **CI/CD pipeline** (GitHub Actions) | Automate lint, typecheck, tests, and Docker build on every push. Catches regressions before they hit production. |
| **Environment-specific configs** | Separate `.env.production`, `.env.test` files with validation. Prevents dev secrets leaking into production builds. |
| **Distributed tracing** (OpenTelemetry) | Trace requests across services with span IDs. Critical when the app splits into microservices or uses external APIs. |
| **Metrics endpoint** (Prometheus) | Expose request counts, error rates, latency histograms. Feeds into Grafana dashboards for SLA monitoring. |
| **Log aggregation** (ELK / Loki) | Ship Winston logs to a central store. Local log files don't survive container restarts or horizontal scaling. |
| **Secret management** (Vault / AWS Secrets Manager) | Env files don't belong in infrastructure. Centralised secrets with rotation support is required at scale. |

### Security

| Feature | Why |
|---|---|
| **Refresh token rotation** | Issue a new refresh token on every refresh call and invalidate the old one. Limits the blast radius of a stolen refresh token. |
| **Device / session management** | Let users see and revoke active sessions (like GitHub's "active sessions" page). |
| **Account lockout after failed logins** | Prevent brute-force attacks on the password login endpoint. |
| **CSRF protection** | Required when the admin panel or any session-based endpoint is accessed from a browser. |
| **Input sanitization** | Strip HTML and script tags from string inputs to prevent stored XSS. |
| **Audit log for admin actions** | Track what admins changed in the panel (who edited which user, when). |
