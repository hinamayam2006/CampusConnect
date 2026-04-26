import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import ridesRoutes from './routes/rides.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import userRoutes from './routes/user.routes.js';
import requestRoutes from './routes/request.routes.js';
import chatRoutes from './routes/chat.routes.js';
import notesRoutes from './routes/notes.routes.js';
import tutorsRoutes from './routes/tutors.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import borrowRoutes from './routes/borrow.routes.js';
import lostnFoundRoutes from './routes/lostnfound.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';
import adminRoutes from './routes/admin.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import appealRoutes from './routes/appeal.routes.js';
import errorHandler from './middleware/error.middleware.js'; // M-6 FIX: was 0-byte stub

const app = express();
const isDevelopment = process.env.NODE_ENV !== 'production';

// Parse allowed origins from environment variable and include local dev ports
const allowedOrigins = new Set([
  ...(process.env.FRONTEND_URL || '').split(',').map(o => o.trim()),
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 3000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
  message: { success: false, message: 'Too many requests, slow down.' },
});

// Security headers
app.use(helmet());

// CORS — allow configured frontend and localhost fallback ports
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl) 
      // or check against the allowedOrigins Set
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

// Parse JSON body
app.use(express.json({ limit: '10mb' }));

// General API rate limiting
app.use(apiLimiter);

// Health check route - to verify server is running
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CampusConnect API is running' });
});

// Route definitions
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/tutors', tutorsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/lostnfound', lostnFoundRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/appeal', appealRoutes);

// 404 handler — for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — must be last, after all routes.
// M-6 FIX: replaced inline 4-line stub with full errorHandler (handles Mongoose, JWT, etc.)
app.use(errorHandler);

export default app;