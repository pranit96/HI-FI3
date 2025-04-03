import { NextApiRequest, NextApiResponse } from 'next';
import { User } from '@shared/schema';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

// Extended request with user property and multer fields
export interface AuthenticatedRequest extends NextApiRequest {
  user?: User;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

const verifyToken = async (token: string): Promise<User | null> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }; // Match token payload
    const user = await storage.getUser(decoded.userId); // Use correct property name
    return user || null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Update header extraction to be case-insensitive
const getTokenFromRequest = (req: NextApiRequest): string | null => {
  const headers = req.headers;
  
  // Check Authorization header (case-insensitive)
  const authHeader = headers.authorization || headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // Check all case variations for auth-token
  const authTokenKey = Object.keys(headers).find(k => k.toLowerCase() === 'auth-token');
  if (authTokenKey) {
    const token = headers[authTokenKey];
    return Array.isArray(token) ? token[0] : token;
  }

  // Check cookies
  return req.cookies?.token || null;
};

// Authentication middleware
export const withAuth = (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<any>) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Get token from request
      const token = getTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify token and get user
      const user = await verifyToken(token);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      // Attach user to request
      req.user = user;
      
      // Call the original handler
      return handler(req, res);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({ error: 'Authentication error', message: (error as Error).message });
    }
  };
};
