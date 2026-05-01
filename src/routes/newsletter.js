const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleNewsletterSubscription } = require('../lib/email');
const { strictLimiter } = require('../middleware/rateLimiter');
const prisma = require('../lib/prisma');

const router = express.Router();

const subscribeSchema = z.object({
  email: z.string().trim().email().max(255),
});

router.post('/subscribe', strictLimiter, asyncHandler(async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    });
  }
  
  const { email } = parsed.data;
  const { subscriber, emailSent } = await handleNewsletterSubscription(email);
  
  res.status(200).json({
    success: true,
    message: emailSent ? 'Subscribed successfully' : 'Subscription saved',
    data: { id: subscriber.id },
  });
}));

module.exports = router;