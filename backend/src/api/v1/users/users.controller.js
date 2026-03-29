const prisma = require('../../../config/database');
const { sendSuccess, sendError } = require('../../../utils/response');
const logger = require('../../../utils/logger');

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of all users
 *       403:
 *         description: Admin access required
 */
const getUsers = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true, name: true, email: true, role: true, createdAt: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Users retrieved',
      data: users,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   patch:
 *     summary: Update a user's role (Admin only)
 *     tags: [Users (Admin)]
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Invalid role
 *       404:
 *         description: User not found
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return sendError(res, 'Invalid role. Must be USER or ADMIN.', 400);
    }

    if (id === req.user.id) {
      return sendError(res, 'You cannot change your own role.', 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sendError(res, 'User not found.', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    logger.info(`User ${id} role changed to ${role} by admin ${req.user.id}`);
    return sendSuccess(res, { user: updated }, 'User role updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete yourself
 *       404:
 *         description: User not found
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return sendError(res, 'You cannot delete your own account.', 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sendError(res, 'User not found.', 404);

    await prisma.user.delete({ where: { id } });

    logger.info(`User ${id} deleted by admin ${req.user.id}`);
    return sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, updateUserRole, deleteUser };
