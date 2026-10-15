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

// Supabase can redirect email confirmations here. This page does not consume
// tokens or claim verification succeeded; sign-in remains in the extension.
app.get(['/auth/confirmed', '/'], (req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  });
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Return to your extension</title>
<style>body{margin:0;padding:32px;font:18px/1.6 system-ui,sans-serif;background:#f5f5f5;color:#111}main{max-width:560px;margin:10vh auto;padding:32px;background:white;border:1px solid black;border-radius:6px;box-shadow:6px 4px black}h1{line-height:1.2}strong{background:#fbe76d}</style></head>
<body><main><h1>Return to your extension</h1>
<p>If you arrived after confirming your email, open the extension popup, expand <strong>Account &amp; automatic sync</strong>, and sign in with your email and password.</p>
<p>This page does not sign you in or verify a link itself. If sign-in says your email is not confirmed, check Supabase Authentication or request a fresh confirmation email.</p>
<p>You can close this tab.</p></main></body></html>`);
});

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
