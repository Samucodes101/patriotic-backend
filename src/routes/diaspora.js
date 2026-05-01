const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleDiasporaSubmission } = require('../lib/email');
const { strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const diasporaSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(20),
  country: z.string().trim().min(2).max(100),
  profession: z.string().trim().max(150).optional(),
  interest: z.string().trim().min(1).max(100),
  message: z.string().trim().min(10).max(5000),
});

router.post('/', strictLimiter, asyncHandler(async (req, res) => {
  const parsed = diasporaSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    });
  }
  
  const { name, email, phone, country, profession, interest, message } = parsed.data;
  const { submission, emailSent } = await handleDiasporaSubmission(
    name, email, phone, country, profession, interest, message
  );
  
  res.status(200).json({
    success: true,
    message: emailSent ? 'Application submitted successfully' : 'Application saved, will be processed shortly',
    data: { id: submission.id, emailSent },
  });
}));

module.exports = router;