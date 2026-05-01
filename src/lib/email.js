const nodemailer = require('nodemailer');
const prisma = require('./prisma');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
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

const handleContactSubmission = async (name, email, subject, message) => {
  const submission = await prisma.contactSubmission.create({
    data: { name, email, subject, message, emailSent: false },
  });
  
  const emailBody = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  const emailResult = await sendEmail(
    process.env.EMAIL_TO,
    `[Contact] ${subject}`,
    emailBody
  );
  
  if (emailResult.success) {
    await prisma.contactSubmission.update({
      where: { id: submission.id },
      data: { emailSent: true },
    });
  }
  
  return { submission, emailSent: emailResult.success };
};

const handleDiasporaSubmission = async (name, email, phone, country, profession, interest, message) => {
  const submission = await prisma.diasporaSubmission.create({
    data: { name, email, phone, country, profession, interest, message, emailSent: false },
  });
  
  const emailBody = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nCountry: ${country}\nProfession: ${profession || 'Not specified'}\nInterest: ${interest}\n\nMessage:\n${message}`;
  const emailResult = await sendEmail(
    process.env.EMAIL_TO,
    `[Diaspora Gateway] ${interest}`,
    emailBody
  );
  
  if (emailResult.success) {
    await prisma.diasporaSubmission.update({
      where: { id: submission.id },
      data: { emailSent: true },
    });
  }
  
  return { submission, emailSent: emailResult.success };
};

const handleNewsletterSubscription = async (email) => {
  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    update: {},
    create: { email },
  });
  
  const emailResult = await sendEmail(
    email,
    'Welcome to Patriotic NG Newsletter',
    'Thank you for subscribing to our newsletter! You\'ll receive weekly updates on Nigeria\'s progress stories.'
  );
  
  return { subscriber, emailSent: emailResult.success };
};

module.exports = {
  sendEmail,
  handleContactSubmission,
  handleDiasporaSubmission,
  handleNewsletterSubscription,
};