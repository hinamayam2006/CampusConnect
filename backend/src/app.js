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

const app = express();

// Security headers
app.use(helmet());

// CORS — allow only your frontend
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// Parse JSON body
app.use(express.json({ limit: '10mb' }));

// Rate limiting — 100 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, slow down.' }
}));

// Health check route — to verify server is running
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CampusConnect API is running' });
});
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chat', chatRoutes);
// 404 handler — for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — must be last
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    errors: err.errors || [],
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;