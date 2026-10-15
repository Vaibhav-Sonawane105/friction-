import express from 'express';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';
import authRouter from './routes/auth.js';
import syncRouter from './routes/sync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/sync', syncRouter);

// Health endpoint with live Supabase ping
app.get('/health', async (req, res) => {
  let supabaseStatus = 'disconnected';
  try {
    const { error } = await supabase.auth.getSession();
    supabaseStatus = error ? `error: ${error.message}` : 'connected';
  } catch (err) {
    supabaseStatus = `failed: ${err.message}`;
  }

  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    supabase: supabaseStatus
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Malformed JSON payload provided'
    });
  }

  return res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server (only if not running under a test runner)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
