const nodemailer = require('nodemailer');
const prisma = require('./prisma');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // MUST be false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },

  // IMPORTANT FIXES
  requireTLS: true,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,

  family: 4, // FORCE IPv4
});

const sendEmail = async (to, subject, text, html = null) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Fire-and-forget email sending with logging
const sendEmailAsync = async (to, subject, text, html = null) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    console.log(`✓ Email sent to ${to} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`✗ Email send failed for ${to}:`, error.message);
    // Still return success to not block the user
    return { success: false, error: error.message };
  }
};

const handleContactSubmission = async (name, email, subject, message) => {
  const submission = await prisma.contactSubmission.create({
    data: { name, email, subject, message, emailSent: false },
  });
  
  const emailBody = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  
  // Send email in background without blocking response
  sendEmailAsync(
    process.env.EMAIL_TO,
    `[Contact] ${subject}`,
    emailBody
  ).then(async (emailResult) => {
    if (emailResult.success) {
      await prisma.contactSubmission.update({
        where: { id: submission.id },
        data: { emailSent: true },
      });
    }
  }).catch((error) => {
    console.error('Error in background email task:', error.message);
  });
  
  return { submission, emailSent: false }; // Always return false since we don't wait
};

const handleDiasporaSubmission = async (name, email, phone, country, profession, interest, message) => {
  const submission = await prisma.diasporaSubmission.create({
    data: { name, email, phone, country, profession, interest, message, emailSent: false },
  });
  
  const emailBody = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nCountry: ${country}\nProfession: ${profession || 'Not specified'}\nInterest: ${interest}\n\nMessage:\n${message}`;
  
  // Send email in background without blocking response
  sendEmailAsync(
    process.env.EMAIL_TO,
    `[Diaspora Gateway] ${interest}`,
    emailBody
  ).then(async (emailResult) => {
    if (emailResult.success) {
      await prisma.diasporaSubmission.update({
        where: { id: submission.id },
        data: { emailSent: true },
      });
    }
  }).catch((error) => {
    console.error('Error in background email task:', error.message);
  });
  
  return { submission, emailSent: false }; // Always return false since we don't wait
};

const handleNewsletterSubscription = async (email) => {
  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });
  
  // Send email in background without blocking response
  sendEmailAsync(
    email,
    'Welcome to Patriotic NG Newsletter',
    'Thank you for subscribing to our newsletter! You\'ll receive weekly updates on Nigeria\'s progress stories.'
  ).catch((error) => {
    console.error('Error in newsletter welcome email task:', error.message);
  });
  
  return { subscriber, emailSent: false }; // Always return false since we don't wait
};

module.exports = {
  sendEmail,
  handleContactSubmission,
  handleDiasporaSubmission,
  handleNewsletterSubscription,
};