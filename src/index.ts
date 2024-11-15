import express, { Request, Response } from 'express';
import { PrismaClient, User } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Define the root route
app.get('/', (req: Request, res: Response): void => {
  res.send('Hello World');
});

// Define the users GET route
app.get('/users', async (req: Request, res: Response): Promise<void> => {
  const users: User[] = await prisma.user.findMany();
  res.json(users);
});

// Define the users POST route
app.post('/users', async (req: Request, res: Response): Promise<void> => {
  const { name, email }: { name: string; email: string } = req.body;
  const user: User = await prisma.user.create({
    data: { name, email }
  });
  res.json(user);
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
