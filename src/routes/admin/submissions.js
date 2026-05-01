const express = require('express');
const { asyncHandler } = require('../../middleware/errorHandler');
const { verifyToken } = require('../../middleware/auth');
const prisma = require('../../lib/prisma');
const { sendEmail } = require('../../lib/email');

const router = express.Router();
router.use(verifyToken);

router.get('/pending', asyncHandler(async (req, res) => {
  const [contacts, diasporas] = await Promise.all([
    prisma.contactSubmission.findMany({
      where: { emailSent: false },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.diasporaSubmission.findMany({
      where: { emailSent: false },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  
  res.status(200).json({
    success: true,
    data: { contacts, diasporas },
  });
}));

router.post('/retry/:type/:id', asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  
  if (type === 'contact') {
    const submission = await prisma.contactSubmission.findUnique({
      where: { id },
    });
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
        code: 'NOT_FOUND',
      });
    }
    
    const emailBody = `Name: ${submission.name}\nEmail: ${submission.email}\n\nMessage:\n${submission.message}`;
    const emailResult = await sendEmail(
      process.env.EMAIL_TO,
      `[Contact] ${submission.subject}`,
      emailBody
    );
    
    if (emailResult.success) {
      await prisma.contactSubmission.update({
        where: { id },
        data: { emailSent: true },
      });
    }
    
    res.status(200).json({
      success: emailResult.success,
      message: emailResult.success ? 'Email sent successfully' : 'Failed to send email',
    });
  } else if (type === 'diaspora') {
    const submission = await prisma.diasporaSubmission.findUnique({
      where: { id },
    });
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
        code: 'NOT_FOUND',
      });
    }
    
    const emailBody = `Name: ${submission.name}\nEmail: ${submission.email}\nPhone: ${submission.phone}\nCountry: ${submission.country}\nProfession: ${submission.profession || 'Not specified'}\nInterest: ${submission.interest}\n\nMessage:\n${submission.message}`;
    const emailResult = await sendEmail(
      process.env.EMAIL_TO,
      `[Diaspora Gateway] ${submission.interest}`,
      emailBody
    );
    
    if (emailResult.success) {
      await prisma.diasporaSubmission.update({
        where: { id },
        data: { emailSent: true },
      });
    }
    
    res.status(200).json({
      success: emailResult.success,
      message: emailResult.success ? 'Email sent successfully' : 'Failed to send email',
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid submission type',
      code: 'VALIDATION_ERROR',
    });
  }
}));

module.exports = router;