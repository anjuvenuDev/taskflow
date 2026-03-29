# 🚀 TaskFlow — Scalable REST API with Auth & RBAC

A production-quality full-stack application featuring **JWT authentication**, **role-based access control**, **task CRUD**, **Swagger + Postman API docs**, and a beautiful **React dashboard**.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| ORM | Prisma + PostgreSQL |
| Auth | JWT (jsonwebtoken) |
| Password | bcrypt (12 rounds) |
| Validation | Zod |
| API Docs | Swagger UI (OpenAPI 3.0) + Postman collection |
| Logging | Winston |
| Security | Helmet, CORS, Rate Limiting |
| Frontend | React 18 + Vite |
| HTTP Client | Axios |
| Styling | Vanilla CSS (custom design system) |

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Docker (recommended for PostgreSQL)

### 1. Clone and Install

```bash
git clone <repository-url>
cd api

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Environment Setup

```bash
cd backend
cp .env.example .env
# Default DATABASE_URL targets local PostgreSQL on port 5432
```

### 3. Setup Database

```bash
# From project root, start PostgreSQL
docker compose up -d postgres

# Then initialize schema
cd backend
npm run db:generate   # Generate Prisma client
npm run db:push       # Create PostgreSQL tables
```

### 4. Start Development Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → http://localhost:5000
# → API Docs: http://localhost:5000/api/docs
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## 📚 API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login, receive JWT |
| GET | `/me` | ✅ | Get current user |

### Tasks (`/api/v1/tasks`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | USER/ADMIN | List tasks (own / all) |
| GET | `/stats` | ✅ | USER/ADMIN | Task statistics |
| GET | `/:id` | ✅ | USER/ADMIN | Get single task |
| POST | `/` | ✅ | USER/ADMIN | Create task |
| PUT | `/:id` | ✅ | USER/ADMIN | Update task |
| DELETE | `/:id` | ✅ | USER/ADMIN | Delete task |

### Users — Admin Only (`/api/v1/users`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✅ | ADMIN | List all users |
| PATCH | `/:id/role` | ✅ | ADMIN | Update user role |
| DELETE | `/:id` | ✅ | ADMIN | Delete user |

**Query parameters for `GET /tasks`:**
- `page`, `limit` — Pagination
- `status` — `TODO` / `IN_PROGRESS` / `DONE`
- `priority` — `LOW` / `MEDIUM` / `HIGH`
- `search` — Title/description search
- `sortBy` — `createdAt`, `updatedAt`, `dueDate`, `priority`, `title`
- `sortOrder` — `asc` / `desc`

Validation constraints:
- `limit` max is `100`
- `search` max length is `120`

---

## 🗄️ Database Schema

```
User
├── id         String (CUID)
├── email      String (unique)
├── password   String (bcrypt hash)
├── name       String
├── role       String (USER | ADMIN)
├── createdAt  DateTime
└── tasks      Task[]

Task
├── id          String (CUID)
├── title       String
├── description String?
├── status      String (TODO | IN_PROGRESS | DONE)
├── priority    String (LOW | MEDIUM | HIGH)
├── dueDate     DateTime?
├── userId      String (FK → User)
├── createdAt   DateTime
└── updatedAt   DateTime
```

---

## 🔒 Security

- **Passwords**: bcrypt with 12 salt rounds
- **JWT**: Signed with `HS256`, configurable expiry (default 7d)
- **Rate Limiting**: 200 req/15min global, 20 req/15min on auth routes
- **Helmet**: Sets secure HTTP headers
- **CORS**: Configured per allowed origin
- **Input Validation**: Zod schemas on every endpoint
- **Input Sanitization**: Script-tag and control-character sanitization on free-text fields
- **Error Sanitization**: Stack traces hidden in production

---

## 🧪 Testing

```bash
cd backend
npm test
```

**35 tests** covering:
- Registration / login / invalid credentials
- JWT authentication & invalid tokens
- CRUD operations on tasks
- Role-based access (USER vs ADMIN)
- Admin user role updates and account deletion safeguards
- Input validation (empty title, weak password, invalid email, invalid query params)
- Edge cases (404, 409, 422)

---

## 📖 API Documentation

Swagger UI is available at **http://localhost:5000/api/docs**

Features:
- All endpoints documented with request/response schemas
- Built-in authentication (paste JWT token once)
- Try-it-out for every endpoint

Postman collection is available at:
- `postman/TaskFlow.postman_collection.json`

---

## 🐳 Docker

```bash
# From project root
docker compose up --build
# PostgreSQL → localhost:5432
# Backend    → http://localhost:5000
# Frontend   → http://localhost:5173 (via nginx)
```

---

## 🏗️ Project Structure

```
api/
├── backend/
│   ├── src/
│   │   ├── api/v1/
│   │   │   ├── auth/    (controller, routes, schema)
│   │   │   ├── tasks/   (controller, routes, schema)
│   │   │   └── users/   (controller, routes)
│   │   ├── middleware/  (auth, validate, errorHandler)
│   │   ├── config/      (database, swagger)
│   │   ├── utils/       (logger, response)
│   │   ├── __tests__/   (api.test.js)
│   │   ├── app.js
│   │   └── server.js
│   └── prisma/schema.prisma
├── frontend/
│   └── src/
│       ├── api/         (axios client)
│       ├── components/  (Sidebar, ProtectedRoute)
│       ├── contexts/    (AuthContext, ToastContext)
│       └── pages/       (Auth, Dashboard, Tasks, Admin)
├── docker-compose.yml
├── postman/TaskFlow.postman_collection.json
├── README.md
└── SCALABILITY.md
```
