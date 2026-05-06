
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const contactRoutes = require('./routes/contact');
const diasporaRoutes = require('./routes/diaspora');
const newsletterRoutes = require('./routes/newsletter');
const storyRoutes = require('./routes/stories');
const adminAuthRoutes = require('./routes/admin/auth');
const adminStoryRoutes = require('./routes/admin/stories');
const adminUploadRoutes = require('./routes/admin/upload');
const adminYoutubeRoutes = require('./routes/admin/youtube');
const adminSubmissionRoutes = require('./routes/admin/submissions');

const app = express();

// fix
app.set('trust proxy', 1);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet());

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ✅ same config for preflight


app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global rate limiter
app.use(globalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// Public routes
app.use('/contact', contactRoutes);
app.use('/diaspora', diasporaRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/stories', storyRoutes);

// Admin routes
app.use('/admin/auth', adminAuthRoutes);
app.use('/admin/stories', adminStoryRoutes);
app.use('/admin/upload', adminUploadRoutes);
app.use('/admin/youtube', adminYoutubeRoutes);
app.use('/admin/submissions', adminSubmissionRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

module.exports = app;
