import { NextApiResponse } from 'next';
import { storage } from '../storage';
import { generateSpendingInsights } from '../utils/groqAI';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get date range from request body
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get transactions for the date range
    const transactions = await storage.getTransactions(req.user.id, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    if (transactions.length === 0) {
      return res.status(404).json({
        error: 'No transactions found for the specified date range',
        message: 'Please upload bank statements or select a different date range'
      });
    }

    // Get user details for personalized insights
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get existing insights to avoid repetition
    const existingInsights = await storage.getInsights(req.user.id);

    // Generate insights using Groq AI
    const newInsights = await generateSpendingInsights(user, transactions, existingInsights);

    if (newInsights.length === 0) {
      return res.status(404).json({
        message: 'No new insights could be generated from the available data',
        suggestedAction: 'Try uploading more bank statements or adjusting the date range'
      });
    }

    // Save new insights to database
    const savedInsights = [];
    for (const insight of newInsights) {
      const savedInsight = await storage.createInsight(insight);
      savedInsights.push(savedInsight);
    }

    return res.status(200).json({
      success: true,
      insights: savedInsights,
      count: savedInsights.length,
      transactionsAnalyzed: transactions.length
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    return res.status(500).json({
      error: 'Failed to generate insights',
      message: (error as Error).message
    });
  }
};

export default withAuth(handler);