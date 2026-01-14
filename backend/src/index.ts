/**
 * Main Application Entry Point
 * Agribank CRM Backend API Server
 */

import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import projectsRoutes from './routes/projects';
import transactionsRoutes from './routes/transactions';
import uploadRoutes from './routes/upload';
import bankRoutes from './routes/bank';
import usersRoutes from './routes/users';
import adminRoutes from './routes/admin';

// Import services
import { startCronJobs, stopCronJobs } from './services/cronJobs';

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// CORS configuration
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// HEALTH CHECK ROUTE
// ============================================

app.get('/health', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================
// DATABASE CONNECTION & SERVER STARTUP
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start cron jobs
    startCronJobs();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║   🏦 Agribank CRM Backend Server Started 🚀   ║');
      console.log('╚════════════════════════════════════════════════╝');
      console.log('');
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 API base URL: http://localhost:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🎯 Frontend URL: ${FRONTEND_URL}`);
      console.log('');
      console.log('📍 Available endpoints:');
      console.log('  - POST   /api/auth/login');
      console.log('  - GET    /api/projects');
      console.log('  - GET    /api/transactions');
      console.log('  - POST   /api/upload/excel');
      console.log('  - GET    /api/bank/account');
      console.log('  - GET    /api/users');
      console.log('  - GET    /api/admin/audit-logs');
      console.log('');
      console.log('⏰ Cron jobs enabled:');
      console.log('  - Daily interest check (00:01 daily)');
      console.log('  - Monthly capitalization (02:00 on 1st)');
      console.log('');
      console.log('✨ Server is ready to accept requests!');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const shutdown = async (signal: string) => {
  console.log('');
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);

  // Stop cron jobs
  stopCronJobs();

  // Close database connection
  await prisma.$disconnect();
  console.log('✅ Database disconnected');

  // Exit process
  console.log('👋 Server stopped');
  process.exit(0);
};

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// ============================================
// START THE SERVER
// ============================================

startServer();

// Export app for testing
export default app;
