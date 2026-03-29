# 📐 Scalability Notes — TaskFlow API

## Current Architecture

The current stack is a **monolithic Node.js/Express** service with PostgreSQL + Prisma, designed to be easily decomposed into microservices as load grows.

---

## Horizontal Scaling Path

### Phase 1 — Stateless API (Current)
- JWT-based auth = **stateless** → any instance can serve any request
- No session stored server-side
- **Ready to run multiple instances behind a load balancer today**

```
Client → Load Balancer (nginx/HAProxy) → [API Instance 1, 2, 3] → PostgreSQL
```

### Phase 2 — Caching Layer (Redis)
```bash
# Add to docker-compose
redis:
  image: redis:alpine
```
- Cache `GET /tasks/stats` responses (TTL: 30s) — avoids heavy DB aggregation
- Cache `GET /auth/me` responses (TTL: 5min) — avoids DB hit per request
- Store rate-limit counters in Redis (shared across instances)
- Session blacklist for logout (JWT revocation)

### Phase 3 — Database Scaling
- **Read replicas**: Route `GET` queries to replicas, writes to primary
- **Connection pooling**: Use PgBouncer or Prisma's built-in pool (`connection_limit`)
- **Indexing**: Add indexes on `userId`, `status`, `priority`, `createdAt` for query speed

```prisma
@@index([userId, status])
@@index([createdAt])
```

### Phase 4 — Microservices Decomposition

| Service | Responsibility |
|---------|---------------|
| `auth-service` | Register, login, token validation |
| `task-service` | Task CRUD, stats |
| `user-service` | Admin user management |
| `notification-service` | Email alerts for due tasks |

Communication via REST or message queue (RabbitMQ / Kafka).

### Phase 5 — Event-Driven / Queue
- Long-running jobs (email, reports) → push to message queue
- Avoids blocking HTTP responses
- Decouples services for independent scaling

---

## Load Balancing

```nginx
upstream taskflow_api {
    least_conn;
    server api1:5000;
    server api2:5000;
    server api3:5000;
}
```

- **Least connections** strategy for even load distribution
- Health check endpoint (`/health`) used by load balancer

---

## Security at Scale

| Concern | Solution |
|---------|---------|
| DDoS | Rate limiting + CDN (Cloudflare) |
| JWT revocation | Redis blacklist on logout |
| Secrets | Environment variables / AWS Secrets Manager |
| HTTPS | TLS termination at load balancer |
| SQL injection | Prisma ORM (parameterized queries) |

---

## Monitoring & Observability

- **Structured logging** via Winston → ship to ELK Stack or Datadog
- **Health endpoint** at `/health` → wire to uptime monitor
- **Metrics**: Prometheus + Grafana for request rates, latency, error rates
- **Tracing**: OpenTelemetry for distributed traces across microservices

---

## Estimated Capacity (single instance)

| Metric | Value |
|--------|-------|
| Concurrent connections | ~10,000 (Node.js event loop) |
| Requests/sec | ~2,000–5,000 (CRUD, no caching) |
| With Redis caching | ~10,000+ |
| DB connections | 10 (Prisma pool, configurable) |

Scale horizontally by adding instances — no code changes needed.
