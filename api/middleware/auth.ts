import { NextApiRequest, NextApiResponse } from 'next';
import { User } from '@shared/schema';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: User;
}

export const withAuth = (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<any>) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Support both header and cookie auth
      let token = req.cookies?.token || req.headers['x-auth-token'];

// Also check Authorization header
const authHeader = req.headers.authorization;
if (!token && authHeader?.startsWith('Bearer ')) {
  token = authHeader.substring(7);
}

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Add rate limiting for file uploads
      if (req.url?.includes('/upload')) {
        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const uploadKey = `upload:${userIp}`;
        const uploadCount = await storage.getRateLimit(uploadKey);
        
        if (uploadCount > 10) { // 10 uploads per hour
          return res.status(429).json({ error: 'Too many upload attempts' });
        }
        await storage.incrementRateLimit(uploadKey, 3600); // 1 hour expiry
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const user = await storage.getUser(decoded.id);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      return handler(req, res);
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};