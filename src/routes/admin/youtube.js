const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../middleware/errorHandler');
const { verifyToken } = require('../../middleware/auth');
const { getVideoMetadata } = require('../../lib/youtube');

const router = express.Router();
router.use(verifyToken);

const urlSchema = z.object({
  url: z.string().url().refine(
    url => url.includes('youtube.com') || url.includes('youtu.be'),
    { message: 'Must be a YouTube URL' }
  ),
});

router.get('/resolve', asyncHandler(async (req, res) => {
  const parsed = urlSchema.safeParse(req.query);
  
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Valid YouTube URL required',
      code: 'VALIDATION_ERROR',
    });
  }
  
  const metadata = await getVideoMetadata(parsed.data.url);
  
  res.status(200).json({
    success: true,
    data: metadata,
  });
}));

module.exports = router;