/**
 * server.js
 * Main Express Server Entry Point for 1RM Backend
 * 
 * Runs all modules:
 *   - workout_model: Schema and Mongoose models
 *   - workout_controller: Business logic and HTTP response handlers
 *   - workout_routes: REST API endpoints for /api/workouts and /api/exercises
 *   - workout_seed: Automatically seeds 232 exercises into MongoDB if empty
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import workoutRouter from './workout_routes/workout.routes.js';
import { autoSeedIfEmpty } from './workout_seed/workout.seed.js';

// 1. Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/1rm';

// 2. Configure CORS
const allowedOrigins = [
  'https://1rm27.netlify.app',
  process.env.CORS_ORIGIN,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (allowedOrigins.includes(origin) || isLocal) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// 3. Body parser with 10MB limit for base64 workout images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Health Check Endpoint
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: '1RM API is live and healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// 5. Mount Workout & Exercise Routes
app.use('/api', workoutRouter);

// Teammate integration point:
// Teammates can mount their routes here:
// import authRouter from './auth_routes/auth.routes.js';
// app.use('/api/auth', authRouter);

// 6. 404 Handler for undefined routes
app.use((req, res, next) => {
  return res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// 7. Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `An entry with this ${field} already exists`,
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload too large: workout photos exceed 10MB limit. Try fewer or smaller photos.',
    });
  }

  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 8. Connect to MongoDB and start server
export const connectDB = async (uri = MONGO_URI) => {
  try {
    await mongoose.connect(uri);
    console.log(`[MongoDB] Connected successfully to database: ${mongoose.connection.name}`);
    
    // Auto-seed exercises if DB is empty (no manual seed script needed!)
    await autoSeedIfEmpty();
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    console.error('[MongoDB] Please check your MONGO_URI in .env and MongoDB Atlas IP whitelist (0.0.0.0/0).');
  }
};

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[1RM Server] Running on http://localhost:${PORT}`);
      console.log(`[1RM Server] Health check: http://localhost:${PORT}/api/health`);
    });
  });
}

export default app;
