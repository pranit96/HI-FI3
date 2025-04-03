import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { insertUserSchema } from '@shared/schema';
import { storage } from '../storage';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-for-development-only';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validation = insertUserSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid user data',
        details: validation.error.format()
      });
    }

    const { email, password, username, fullName } = validation.data;

    // Check if user with this email already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await storage.createUser({
      email,
      username,
      password: hashedPassword,
      fullName,
      role: 'user'
    });

    // Remove password from response
    const { password: _, ...safeUserData } = user;

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user and token
    return res.status(201).json({
      message: 'User registered successfully',
      user: safeUserData,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: (error as Error).message
    });
  }
};

export default handler;