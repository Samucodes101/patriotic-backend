const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../middleware/errorHandler');
const { verifyToken } = require('../../middleware/auth');
const prisma = require('../../lib/prisma');

const router = express.Router();
router.use(verifyToken);

const storySchema = z.object({
  type: z.enum(['video', 'article']),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  thumbnail: z.string().trim().url(),
  featured: z.boolean().default(false),
  duration: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  youtubeId: z.string().optional(),
  readTime: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  excerpt: z.string().optional(),
  body: z.string().optional(),
});

router.post('/', asyncHandler(async (req, res) => {
  const parsed = storySchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    });
  }
  
  let story;
  await prisma.$transaction(async (tx) => {
    if (parsed.data.featured) {
      await tx.story.updateMany({
        where: { type: parsed.data.type, featured: true },
        data: { featured: false },
      });
    }
    
    story = await tx.story.create({
      data: parsed.data,
    });
  });
  
  res.status(201).json({
    success: true,
    data: story,
  });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const parsed = storySchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    });
  }
  
  const existing = await prisma.story.findUnique({
    where: { id: req.params.id },
  });
  
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Story not found',
      code: 'NOT_FOUND',
    });
  }
  
  let story;
  await prisma.$transaction(async (tx) => {
    if (parsed.data.featured && existing.type === parsed.data.type) {
      await tx.story.updateMany({
        where: { type: parsed.data.type, featured: true, id: { not: req.params.id } },
        data: { featured: false },
      });
    }
    
    story = await tx.story.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
  });
  
  res.status(200).json({
    success: true,
    data: story,
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
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
  
  await prisma.story.delete({
    where: { id: req.params.id },
  });
  
  res.status(200).json({
    success: true,
    message: 'Story deleted successfully',
  });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid IDs array',
      code: 'VALIDATION_ERROR',
    });
  }
  
  const result = await prisma.story.deleteMany({
    where: { id: { in: ids } },
  });
  
  res.status(200).json({
    success: true,
    message: `${result.count} stories deleted`,
    data: { deleted: result.count },
  });
}));

router.patch('/:id/featured', asyncHandler(async (req, res) => {
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
  
  let updated;
  await prisma.$transaction(async (tx) => {
    await tx.story.updateMany({
      where: { type: story.type, featured: true },
      data: { featured: false },
    });
    
    updated = await tx.story.update({
      where: { id: req.params.id },
      data: { featured: !story.featured },
    });
  });
  
  res.status(200).json({
    success: true,
    data: updated,
  });
}));

module.exports = router;