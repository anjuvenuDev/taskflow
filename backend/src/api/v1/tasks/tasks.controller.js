const prisma = require('../../../config/database');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../../../utils/response');
const logger = require('../../../utils/logger');
const { sanitizeText } = require('../../../utils/sanitize');

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     summary: Get tasks (own tasks for USER, all tasks for ADMIN)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [TODO, IN_PROGRESS, DONE] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [LOW, MEDIUM, HIGH] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated list of tasks
 */
const getTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, priority, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = page;
    const limitNum = limit;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (req.user.role !== 'ADMIN') {
      where.userId = req.user.id;
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return sendPaginated(res, tasks, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task data
 *       404:
 *         description: Task not found
 */
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = { id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const task = await prisma.task.findFirst({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!task) return sendError(res, 'Task not found.', 404);
    return sendSuccess(res, { task });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Build authentication module"
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, DONE]
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Task created
 *       422:
 *         description: Validation error
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;
    const cleanTitle = sanitizeText(title);
    const cleanDescription = description === undefined || description === null
      ? description
      : sanitizeText(description);

    if (!cleanTitle) {
      return sendError(res, 'Title is required after sanitization.', 422);
    }

    const task = await prisma.task.create({
      data: {
        title: cleanTitle,
        description: cleanDescription,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: req.user.id,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    logger.info(`Task created: ${task.id} by user ${req.user.id}`);
    return sendCreated(res, { task }, 'Task created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, DONE]
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Task not found
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = { id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existingTask = await prisma.task.findFirst({ where });
    if (!existingTask) return sendError(res, 'Task not found or access denied.', 404);

    const { title, description, status, priority, dueDate } = req.body;
    const cleanTitle = title === undefined ? undefined : sanitizeText(title);
    const cleanDescription = description === undefined || description === null
      ? description
      : sanitizeText(description);

    if (cleanTitle !== undefined && !cleanTitle) {
      return sendError(res, 'Title is required after sanitization.', 422);
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(cleanTitle !== undefined && { title: cleanTitle }),
        ...(cleanDescription !== undefined && { description: cleanDescription }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    logger.info(`Task updated: ${id} by user ${req.user.id}`);
    return sendSuccess(res, { task }, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Task not found
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const where = { id };
    if (req.user.role !== 'ADMIN') where.userId = req.user.id;

    const existingTask = await prisma.task.findFirst({ where });
    if (!existingTask) return sendError(res, 'Task not found or access denied.', 404);

    await prisma.task.delete({ where: { id } });

    logger.info(`Task deleted: ${id} by user ${req.user.id}`);
    return sendSuccess(res, null, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/tasks/stats:
 *   get:
 *     summary: Get task statistics for current user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task statistics
 */
const getTaskStats = async (req, res, next) => {
  try {
    const userId = req.user.role === 'ADMIN' ? undefined : req.user.id;

    const [total, byStatus, byPriority] = await Promise.all([
      prisma.task.count({ where: userId ? { userId } : {} }),
      prisma.task.groupBy({
        by: ['status'],
        _count: { status: true },
        where: userId ? { userId } : {},
      }),
      prisma.task.groupBy({
        by: ['priority'],
        _count: { priority: true },
        where: userId ? { userId } : {},
      }),
    ]);

    const stats = {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, { TODO: 0, IN_PROGRESS: 0, DONE: 0 }),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.priority;
        return acc;
      }, { LOW: 0, MEDIUM: 0, HIGH: 0 }),
    };

    return sendSuccess(res, { stats });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats };
