import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRouter from './server/routes/index';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// CORS
app.use((req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL;

  if (frontendUrl) {
    res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-session-token'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// API
app.use('/api', apiRouter);

// Simple health check
app.get('/', (_req, res) => {
  res.json({
    message: 'Najah Portal Backend is running 🚀',
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend running on port ${PORT}`);
  });
}

export default app;