const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('./auth.controller');
const { authenticate } = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const { registerSchema, loginSchema } = require('./auth.schema');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getMe);

module.exports = router;
