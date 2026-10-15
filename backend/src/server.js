import express from 'express';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export default app;
