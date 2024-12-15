require('dotenv').config()
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, User } from '@prisma/client';
import { prisma } from './config/prisma';

const app = express();

app.use(express.json());

const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION } = process.env;

const generateAccessToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET as string, { expiresIn: JWT_ACCESS_EXPIRATION });
};

const generateRefreshToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_REFRESH_SECRET as string, { expiresIn: JWT_REFRESH_EXPIRATION });
};

export const verifyAccessToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_SECRET as string);
    } catch (error) {
        return null;
    }
};

const verifyRefreshToken = (token: string) => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET as string);
    } catch (error) {
        return null;
    }
};

app.post('/register', async (req: Request, res: Response): Promise<void> => {
    const { name, email, password }: User = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        await prisma.user.create({
            data: { name, email, password: hashedPassword }
        });
        res.status(201).json({ message: "Registration Successful!" });
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            // Handle specific Prisma errors (e.g. unique constraint violations, etc.)
            console.error('Prisma error:', err.message);
            res.status(400).json({ error: 'Prisma error occurred', details: err.message });
        } else if (err instanceof Prisma.PrismaClientValidationError) {
            // Handle validation errors
            console.error('Validation error:', err.message);
            res.status(400).json({ error: 'Validation error', details: err.message });
        } else {
            // Handle other types of errors
            console.error('Unknown error:', err);
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }

});

// Login route
app.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) throw new Error('User not found');

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new Error('Invalid credentials');

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);


        // Send the refresh token as HTTP-only cookie
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set to true in production
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({ accessToken });
    } catch (error) {
        res.status(400).json({ error: "Invalid credentials!" });
    }
});

// Logout route
app.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('refresh_token');
    res.status(200).send('Logged out');
});

// Define the root route
app.get('/', (req: Request, res: Response): void => {
    res.send('Hello World');
});

// Define the users GET route
app.get('/users', async (req: Request, res: Response): Promise<void> => {
    const users: User[] = await prisma.user.findMany();
    res.json(users);
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
