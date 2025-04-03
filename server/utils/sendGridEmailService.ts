import { MailService } from '@sendgrid/mail';
import type { User } from '@shared/schema';

// Check if SendGrid API key is available
const apiKey = process.env.SENDGRID_API_KEY || '';
const sendgridEnabled = apiKey !== '' && apiKey.startsWith('SG.');

// Initialize SendGrid client
const mailService = new MailService();
try {
  if (sendgridEnabled) {
    mailService.setApiKey(apiKey);
    console.log('SendGrid initialized successfully');
  } else {
    console.warn('SendGrid API key is invalid or not provided. Email delivery via SendGrid will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize SendGrid:', error);
}

/**
 * SendGrid Email Service
 * This service provides email functionality using SendGrid as a delivery provider.
 * All methods check for a valid API key before attempting to send emails.
 */
export const sendGridEmailService = {
  /**
   * Send a welcome email to a newly registered user
   */
  async sendWelcomeEmail(user: User, overrideEmail?: string): Promise<boolean> {
    if (!sendgridEnabled) return false;
    
    const to = overrideEmail || user.email;
    const from = process.env.EMAIL_FROM || 'noreply@finvue.com';
    
    try {
      await mailService.send({
        to,
        from,
        subject: 'Welcome to Finvue - Your Personal Finance Assistant',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Welcome to Finvue!</h1>
            <p>Hello ${user.name},</p>
            <p>Thank you for creating your Finvue account. We're excited to help you take control of your finances.</p>
            <p>With Finvue, you can:</p>
            <ul>
              <li>Upload and analyze bank statements automatically</li>
              <li>Track your spending patterns and detect areas for improvement</li>
              <li>Set and monitor financial goals</li>
              <li>Receive personalized insights about your financial health</li>
            </ul>
            <p>To get started, log in to your account and upload your first bank statement.</p>
            <p>If you have any questions, feel free to reply to this email.</p>
            <p>Best regards,<br>The Finvue Team</p>
          </div>
        `
      });
      return true;
    } catch (error) {
      console.error('SendGrid welcome email error:', error);
      return false;
    }
  },
  
  /**
   * Send a weekly financial report
   */
  async sendWeeklyReport(user: User, overrideEmail?: string): Promise<boolean> {
    if (!sendgridEnabled) return false;
    
    const to = overrideEmail || user.email;
    const from = process.env.EMAIL_FROM || 'noreply@finvue.com';
    
    try {
      await mailService.send({
        to,
        from,
        subject: 'Your Weekly Financial Report - Finvue',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Your Weekly Financial Report</h1>
            <p>Hello ${user.name},</p>
            <p>Here's a summary of your financial activity this week:</p>
            
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #4B5563; font-size: 18px;">Summary</h2>
              <p><strong>Total Income:</strong> ${user.currency}1,200.00</p>
              <p><strong>Total Expenses:</strong> ${user.currency}850.00</p>
              <p><strong>Top Spending Category:</strong> Groceries (${user.currency}250.00)</p>
            </div>
            
            <p>Log in to your Finvue dashboard to see more detailed insights and recommendations.</p>
            <p>Best regards,<br>The Finvue Team</p>
          </div>
        `
      });
      return true;
    } catch (error) {
      console.error('SendGrid weekly report email error:', error);
      return false;
    }
  },
  
  /**
   * Send a reminder to upload a bank statement
   */
  async sendUploadReminder(user: User, overrideEmail?: string): Promise<boolean> {
    if (!sendgridEnabled) return false;
    
    const to = overrideEmail || user.email;
    const from = process.env.EMAIL_FROM || 'noreply@finvue.com';
    
    try {
      await mailService.send({
        to,
        from,
        subject: 'Reminder: Upload Your Bank Statement - Finvue',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Bank Statement Reminder</h1>
            <p>Hello ${user.name},</p>
            <p>It's been a while since you've uploaded a bank statement to Finvue. To get the most out of our financial insights and recommendations, we recommend uploading your latest statement.</p>
            <p>Regular updates help us provide more accurate analysis of your spending patterns and progress toward your financial goals.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Upload Statement Now</a>
            </div>
            <p>Best regards,<br>The Finvue Team</p>
          </div>
        `
      });
      return true;
    } catch (error) {
      console.error('SendGrid upload reminder email error:', error);
      return false;
    }
  },
  
  /**
   * Send an email notification that statement analysis is complete
   */
  async sendAnalysisComplete(
    user: User, 
    statement: any, 
    insights: any[], 
    overrideEmail?: string
  ): Promise<boolean> {
    if (!sendgridEnabled) return false;
    
    const to = overrideEmail || user.email;
    const from = process.env.EMAIL_FROM || 'noreply@finvue.com';
    
    try {
      let insightsHtml = '';
      if (insights && insights.length > 0) {
        insightsHtml = insights.map(insight => `
          <div style="padding: 12px; border-left: 4px solid #4F46E5; margin-bottom: 16px; background-color: #f9fafb;">
            <p style="margin: 0;">${insight.content}</p>
          </div>
        `).join('');
      } else {
        insightsHtml = '<p>No specific insights found for this statement.</p>';
      }
      
      await mailService.send({
        to,
        from,
        subject: 'Your Statement Analysis is Complete - Finvue',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Statement Analysis Complete</h1>
            <p>Hello ${user.name},</p>
            <p>We've finished analyzing your bank statement "${statement.fileName}" and have some insights for you:</p>
            
            <div style="margin: 24px 0;">
              <h2 style="color: #4B5563; font-size: 18px;">Key Insights</h2>
              ${insightsHtml}
            </div>
            
            <p>Log in to your Finvue dashboard to explore more detailed insights and recommendations based on your financial activity.</p>
            <p>Best regards,<br>The Finvue Team</p>
          </div>
        `
      });
      return true;
    } catch (error) {
      console.error('SendGrid analysis complete email error:', error);
      return false;
    }
  },
  
  /**
   * Send a notification about goal progress
   */
  async sendGoalProgress(user: User, goal: any, overrideEmail?: string): Promise<boolean> {
    if (!sendgridEnabled) return false;
    
    const to = overrideEmail || user.email;
    const from = process.env.EMAIL_FROM || 'noreply@finvue.com';
    
    // Calculate goal progress percentage
    const progress = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
    
    // Calculate time remaining
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    try {
      await mailService.send({
        to,
        from,
        subject: `Goal Update: ${goal.name} - Finvue`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Goal Progress Update</h1>
            <p>Hello ${user.name},</p>
            <p>Here's an update on your financial goal: <strong>${goal.name}</strong></p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <div style="margin-bottom: 16px;">
                <p style="margin: 0 0 8px 0; font-weight: bold;">Progress: ${progress}%</p>
                <div style="background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background-color: #4F46E5; height: 100%; width: ${progress}%;"></div>
                </div>
              </div>
              
              <p><strong>Current Amount:</strong> ${user.currency}${goal.currentAmount.toFixed(2)}</p>
              <p><strong>Target Amount:</strong> ${user.currency}${goal.targetAmount.toFixed(2)}</p>
              <p><strong>Time Remaining:</strong> ${daysRemaining} days</p>
            </div>
            
            <p>Keep up the good work! Check your Finvue dashboard for more insights and recommendations to help you reach your goal.</p>
            <p>Best regards,<br>The Finvue Team</p>
          </div>
        `
      });
      return true;
    } catch (error) {
      console.error('SendGrid goal progress email error:', error);
      return false;
    }
  }
};