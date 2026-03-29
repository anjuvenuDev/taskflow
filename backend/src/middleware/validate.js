const { ZodError } = require('zod');
const { sendError } = require('../utils/response');

/**
 * Validates request body against a Zod schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return sendError(res, 'Validation failed', 422, errors);
      }
      next(error);
    }
  };
};

/**
 * Validates request query params against a Zod schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return sendError(res, 'Invalid query parameters', 422, errors);
      }
      next(error);
    }
  };
};

module.exports = { validate, validateQuery };
