import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import userRoutes from './routes/github';
import dotenv from 'dotenv';

const app = express();
const PORT = process.env.PORT || 3000;

dotenv.config();
app.use(cors());
app.use(express.json());


app.use((req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('x-api-key');
  if (process.env.GITHUB_TOKEN && apiKey !== process.env.GITHUB_TOKEN) {
    res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    return;
  }
  next();
});

// Use user-related routes
app.use('/users', userRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
