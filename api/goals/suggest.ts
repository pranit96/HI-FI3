import { NextApiResponse } from 'next';
import { storage } from '../storage';
import { suggestFinancialGoals } from '../utils/groqAI';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get date range from request body (optional)
    const { startDate, endDate, saveGoals } = req.body;
    
    // Use default date range if not provided (last 3 months)
    const endDateValue = endDate ? new Date(endDate) : new Date();
    const startDateValue = startDate ? new Date(startDate) : new Date();
    if (!startDate) {
      startDateValue.setMonth(startDateValue.getMonth() - 3);
    }

    // Get transactions for the date range
    const transactions = await storage.getTransactions(req.user.id, {
      startDate: startDateValue,
      endDate: endDateValue
    });

    if (transactions.length === 0) {
      return res.status(404).json({
        error: 'No transactions found for the specified date range',
        message: 'Please upload bank statements or select a different date range'
      });
    }

    // Get user details for personalized goals
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get existing goals to avoid repetition
    const existingGoals = await storage.getGoals(req.user.id);

    // Generate goal suggestions using Groq AI
    const suggestedGoals = await suggestFinancialGoals(user, transactions, existingGoals);

    if (suggestedGoals.length === 0) {
      return res.status(404).json({
        message: 'No goal suggestions could be generated from the available data',
        suggestedAction: 'Try uploading more bank statements or adjusting the date range'
      });
    }

    // Save goals to database if requested
    if (saveGoals === true) {
      const savedGoals = [];
      for (const goal of suggestedGoals) {
        const savedGoal = await storage.createGoal(goal);
        savedGoals.push(savedGoal);
      }

      return res.status(200).json({
        success: true,
        message: 'Goals suggested and saved successfully',
        goals: savedGoals,
        count: savedGoals.length
      });
    }

    // Otherwise just return the suggested goals without saving
    return res.status(200).json({
      success: true,
      message: 'Goals suggested successfully',
      goals: suggestedGoals,
      count: suggestedGoals.length,
      note: 'These goals have not been saved. Set saveGoals=true in the request to save them.'
    });
  } catch (error) {
    console.error('Error suggesting goals:', error);
    return res.status(500).json({
      error: 'Failed to suggest financial goals',
      message: (error as Error).message
    });
  }
};

export default withAuth(handler);