const { z } = require('zod');

const usersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

module.exports = { usersQuerySchema };
