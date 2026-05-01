const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const prisma = require('../lib/prisma');

const router = express.Router();

const querySchema = z.object({
  type: z.enum(['video', 'article']).optional(),
  category: z.string().optional(),
  featured: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

router.get('/', asyncHandler(async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    });
  }
  
  const { type, category, featured, page, limit } = parsed.data;
  const skip = (page - 1) * limit;
  
  const where = {};
  if (type) where.type = type;
  if (category) where.category = category;
  if (featured) where.featured = featured === 'true';
  
  const [stories, total] = await Promise.all([
    prisma.story.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.story.count({ where }),
  ]);
  
  res.status(200).json({
    success: true,
    data: stories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const story = await prisma.story.findUnique({
    where: { id: req.params.id },
  });
  
  if (!story) {
    return res.status(404).json({
      success: false,
      message: 'Story not found',
      code: 'NOT_FOUND',
    });
  }
  
  res.status(200).json({
    success: true,
    data: story,
  });
}));

module.exports = router;