const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole, deleteUser } = require('./users.controller');
const { authenticate, authorize } = require('../../../middleware/auth');
const { validateQuery } = require('../../../middleware/validate');
const { usersQuerySchema } = require('./users.schema');

// All user management routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/', validateQuery(usersQuerySchema), getUsers);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

module.exports = router;
