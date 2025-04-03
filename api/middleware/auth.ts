
import { NextApiRequest, NextApiResponse } from 'next';
import { User } from '@shared/schema';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: User;
}

export const withAuth = (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<any>) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.token;
      const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.split(' ')[1]
        : cookieToken;

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
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
