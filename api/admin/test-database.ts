import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../db';

/*
 * API Route to test database connection
 * GET /api/admin/test-database
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        message: 'Database URL is not configured. Check your environment variables.'
      });
    }
    
    // Perform a simple query to verify connection
    const result = await db.execute('SELECT NOW() as current_time');
    
    return res.status(200).json({
      success: true,
      message: 'Successfully connected to the database',
      timestamp: result?.rows?.[0]?.current_time || new Date().toISOString()
    });
  } catch (error) {
    console.error('Database test error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to connect to the database: ${error.message || 'Unknown error'}`
    });
  }
}