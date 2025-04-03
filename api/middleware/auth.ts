import { NextApiRequest, NextApiResponse } from 'next';
import { User } from '@shared/schema';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-for-development-only';

// Extended request with user property and multer fields
export interface AuthenticatedRequest extends NextApiRequest {
  user?: User;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// Verify JWT token
const verifyToken = async (token: string): Promise<User | null> => {
  try {
    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    
    // Get user from database
    const user = await storage.getUser(decoded.id);
    return user || null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Extract token from request
const getTokenFromRequest = (req: NextApiRequest): string | null => {
  // First check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Then check auth-token header (used by client)
  const authTokenHeader = req.headers['auth-token'];
  if (authTokenHeader) {
    return Array.isArray(authTokenHeader) ? authTokenHeader[0] : authTokenHeader;
  }
  
  // Finally check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
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