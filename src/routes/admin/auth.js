const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { asyncHandler } = require('../../middleware/errorHandler');
const { generateToken } = require('../../middleware/auth');
const { strictLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

router.post('/login', strictLimiter, asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    });
  }
  
  const { email, password } = parsed.data;
  
  if (email !== process.env.ADMIN_EMAIL) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    });
  }
  
  const isValid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    });
  }
  
  const token = generateToken(email);
  
  res.status(200).json({
    success: true,
    data: { token },
  });
}));

module.exports = router;