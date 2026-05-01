const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleContactSubmission } = require('../lib/email');
const { strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(10).max(5000),
});

router.post('/', strictLimiter, asyncHandler(async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    });
  }
  
  const { name, email, subject, message } = parsed.data;
  const { submission, emailSent } = await handleContactSubmission(name, email, subject, message);
  
  res.status(200).json({
    success: true,
    message: emailSent ? 'Message sent successfully' : 'Message saved, will be sent shortly',
    data: { id: submission.id, emailSent },
  });
}));

module.exports = router;