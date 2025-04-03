import { NextApiRequest, NextApiResponse } from 'next';
import { sendgridService } from '../utils/sendgridService';

/*
 * API Route to test email delivery using SendGrid
 * POST /api/admin/test-email
 * Request Body: { email: string, type: 'welcome' | 'report' | 'reminder' | 'analysis' | 'goal' }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, type } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    if (!type || !['welcome', 'report', 'reminder', 'analysis', 'goal'].includes(type)) {
      return res.status(400).json({ 
        message: 'Valid email type is required',
        validTypes: ['welcome', 'report', 'reminder', 'analysis', 'goal']
      });
    }
    
    // Create a mock user
    const mockUser = {
      id: 999,
      email,
      fullName: 'Test User',
      currency: '$'
    };
    
    // Send email based on type
    let result = false;
    
    switch (type) {
      case 'welcome':
        result = await sendgridService.sendWelcomeEmail(mockUser as any);
        break;
        
      case 'report':
        // Mock insights and stats
        const mockInsights = [
          { 
            id: 1, 
            userId: 999, 
            title: 'Reduced Food Spending', 
            description: 'Your food expenses are 15% lower than last month. Great job on grocery budgeting!',
            type: 'success',
            category: 'Food'
          },
          {
            id: 2,
            userId: 999,
            title: 'High Entertainment Costs',
            description: 'Entertainment spending is 30% higher than average. Consider setting a monthly limit.',
            type: 'warning',
            category: 'Entertainment'
          }
        ];
        
        const mockStats = {
          income: 5000,
          expenses: 3200,
          savings: 1800
        };
        
        result = await sendgridService.sendWeeklyReport(mockUser as any, mockInsights as any, mockStats);
        break;
        
      case 'reminder':
        result = await sendgridService.sendUploadReminder(mockUser as any);
        break;
        
      case 'analysis':
        // Mock bank statement and insights
        const mockStatement = {
          id: 1,
          userId: 999,
          bankAccountId: 1,
          fileName: 'test_statement.pdf',
          uploadDate: new Date(),
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate: new Date(),
          processed: true
        };
        
        const mockAnalysisInsights = [
          { 
            id: 3, 
            userId: 999, 
            title: 'Recurring Subscriptions', 
            description: 'You have 5 subscription services totaling $65.97 monthly. Review if all are necessary.',
            type: 'info',
            category: 'Subscription'
          },
          {
            id: 4,
            userId: 999,
            title: 'Dining Out Frequency',
            description: 'You spent $320 on restaurants this month, which is 20% of your total expenses.',
            type: 'info',
            category: 'Dining'
          }
        ];
        
        result = await sendgridService.sendAnalysisComplete(mockUser as any, mockStatement as any, mockAnalysisInsights as any);
        break;
        
      case 'goal':
        // Mock goal
        const mockGoal = {
          id: 1,
          userId: 999,
          name: 'Emergency Fund',
          targetAmount: 10000,
          currentAmount: 5500,
          deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
          description: 'Building a 6-month emergency fund for unexpected expenses',
          isAIGenerated: false,
          status: 'in_progress'
        };
        
        result = await sendgridService.sendGoalProgress(mockUser as any, mockGoal as any);
        break;
    }
    
    if (result) {
      return res.status(200).json({ 
        message: `Test email of type "${type}" sent successfully to ${email}` 
      });
    } else {
      return res.status(500).json({ 
        message: 'Failed to send test email',
        error: 'Email service error, check server logs for details'
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message || 'Unknown error'
    });
  }
}