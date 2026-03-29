const express = require('express');
const router = express.Router();
const { getTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats } = require('./tasks.controller');
const { authenticate } = require('../../../middleware/auth');
const { validate, validateQuery } = require('../../../middleware/validate');
const { createTaskSchema, updateTaskSchema, taskQuerySchema } = require('./tasks.schema');

router.use(authenticate);

router.get('/stats', getTaskStats);
router.get('/', validateQuery(taskQuerySchema), getTasks);
router.get('/:id', getTaskById);
router.post('/', validate(createTaskSchema), createTask);
router.put('/:id', validate(updateTaskSchema), updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
