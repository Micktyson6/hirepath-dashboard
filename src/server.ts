import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import candidatesRouter from './routes/candidates.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://hirepath-dashboard.onrender.com'] 
    : ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/candidates', candidatesRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Catch-all handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`👥 Candidates API: http://localhost:${PORT}/api/candidates`);
});