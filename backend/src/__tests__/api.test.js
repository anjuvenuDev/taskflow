const request = require('supertest');
const app = require('../app');
const prisma = require('../config/database');

// ─── Setup & Teardown ────────────────────────────────────────────────────────
beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up test data
  await prisma.task.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
});

// ─── Auth Tests ──────────────────────────────────────────────────────────────
describe('Authentication API', () => {
  let userToken;
  let adminToken;
  let userId;

  const testUser = {
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'Password123',
  };

  const adminUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin123!',
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined();
      userToken = res.body.data.token;
      userId = res.body.data.user.id;
    });

    it('should reject duplicate email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Weak User',
        email: 'weak@example.com',
        password: '123',
      });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test',
        email: 'not-an-email',
        password: 'Password123',
      });
      expect(res.status).toBe(422);
    });

    it('should register admin user', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(adminUser);
      expect(res.status).toBe(201);
      // Manually promote to admin
      await prisma.user.update({
        where: { email: adminUser.email },
        data: { role: 'ADMIN' },
      });
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: adminUser.email,
        password: adminUser.password,
      });
      adminToken = loginRes.body.data.token;
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      userToken = res.body.data.token;
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com',
        password: 'Password123',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.status).toBe(401);
    });
  });

  // ─── Tasks Tests ────────────────────────────────────────────────────────────
  describe('Tasks API', () => {
    let taskId;

    describe('POST /api/v1/tasks', () => {
      it('should create a task', async () => {
        const res = await request(app)
          .post('/api/v1/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ title: 'Test Task', description: 'A test task', priority: 'HIGH' });
        expect(res.status).toBe(201);
        expect(res.body.data.task.title).toBe('Test Task');
        taskId = res.body.data.task.id;
      });

      it('should reject empty title', async () => {
        const res = await request(app)
          .post('/api/v1/tasks')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ title: '' });
        expect(res.status).toBe(422);
      });

      it('should reject unauthenticated task creation', async () => {
        const res = await request(app).post('/api/v1/tasks').send({ title: 'Unauthorized' });
        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/v1/tasks', () => {
      it('should return paginated tasks for user', async () => {
        const res = await request(app)
          .get('/api/v1/tasks')
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.pagination).toBeDefined();
      });

      it('should return all tasks for admin', async () => {
        const res = await request(app)
          .get('/api/v1/tasks')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
      });

      it('should filter tasks by status', async () => {
        const res = await request(app)
          .get('/api/v1/tasks?status=TODO')
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        res.body.data.forEach(task => expect(task.status).toBe('TODO'));
      });

      it('should reject task list query with invalid limit', async () => {
        const res = await request(app)
          .get('/api/v1/tasks?limit=1000')
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(422);
      });
    });

    describe('GET /api/v1/tasks/:id', () => {
      it('should get a task by id', async () => {
        const res = await request(app)
          .get(`/api/v1/tasks/${taskId}`)
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.task.id).toBe(taskId);
      });

      it('should return 404 for non-existent task', async () => {
        const res = await request(app)
          .get('/api/v1/tasks/nonexistentid123')
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(404);
      });
    });

    describe('PUT /api/v1/tasks/:id', () => {
      it('should update own task', async () => {
        const res = await request(app)
          .put(`/api/v1/tasks/${taskId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ status: 'IN_PROGRESS', title: 'Updated Task' });
        expect(res.status).toBe(200);
        expect(res.body.data.task.status).toBe('IN_PROGRESS');
        expect(res.body.data.task.title).toBe('Updated Task');
      });
    });

    describe('GET /api/v1/tasks/stats', () => {
      it('should return task statistics', async () => {
        const res = await request(app)
          .get('/api/v1/tasks/stats')
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.stats.total).toBeGreaterThanOrEqual(0);
        expect(res.body.data.stats.byStatus).toBeDefined();
      });
    });

    describe('DELETE /api/v1/tasks/:id', () => {
      it('should delete own task', async () => {
        const res = await request(app)
          .delete(`/api/v1/tasks/${taskId}`)
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 404 after deletion', async () => {
        const res = await request(app)
          .get(`/api/v1/tasks/${taskId}`)
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(404);
      });
    });
  });

  // ─── Admin Users Tests ──────────────────────────────────────────────────────
  describe('Admin Users API', () => {
    describe('GET /api/v1/users', () => {
      it('should allow admin to list users', async () => {
        const res = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
      });

      it('should deny non-admin access', async () => {
        const res = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(403);
      });

      it('should reject invalid users query params', async () => {
        const res = await request(app)
          .get('/api/v1/users?page=0')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(422);
      });
    });

    describe('PATCH /api/v1/users/:id/role', () => {
      it('should update user role', async () => {
        const res = await request(app)
          .patch(`/api/v1/users/${userId}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'ADMIN' });
        expect(res.status).toBe(200);
        expect(res.body.data.user.role).toBe('ADMIN');
      });

      it('should reject invalid role', async () => {
        const res = await request(app)
          .patch(`/api/v1/users/${userId}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'SUPERUSER' });
        expect(res.status).toBe(400);
      });
    });

    describe('DELETE /api/v1/users/:id', () => {
      it('should allow admin to delete another user', async () => {
        const disposableUser = {
          name: 'Disposable User',
          email: `disposable-${Date.now()}@example.com`,
          password: 'Password123',
        };

        const registerRes = await request(app)
          .post('/api/v1/auth/register')
          .send(disposableUser);
        expect(registerRes.status).toBe(201);

        const targetUserId = registerRes.body.data.user.id;
        const res = await request(app)
          .delete(`/api/v1/users/${targetUserId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const deletedUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        expect(deletedUser).toBeNull();
      });

      it('should reject admin deleting own account', async () => {
        const adminData = await prisma.user.findUnique({
          where: { email: adminUser.email },
          select: { id: true },
        });

        const res = await request(app)
          .delete(`/api/v1/users/${adminData.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
      });

      it('should return 404 when deleting non-existent user', async () => {
        const res = await request(app)
          .delete('/api/v1/users/nonexistentid123')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });
    });
  });

  // ─── Health & Misc Tests ────────────────────────────────────────────────────
  describe('Utility Endpoints', () => {
    it('GET /health should return 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET / should return API info', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('TaskFlow');
    });

    it('Unknown routes should return 404', async () => {
      const res = await request(app).get('/api/v1/unknown-route');
      expect(res.status).toBe(404);
    });
  });
});
