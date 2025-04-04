import nodemailer from 'nodemailer';
import { User, BankStatement, Insight, Goal } from '@shared/schema';

interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

// Get email configuration from environment variables
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '465');
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER || 'notifications@finsavvy.com';

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Email templates
export const emailTemplates = {
  welcome: (user: User) => ({
    subject: 'Welcome to FinVue - Your Financial Journey Begins',
    text: `Hello ${user.name},\n\nWelcome to FinVue! We're excited to help you take control of your financial future.\n\nTo get started:\n1. Upload your bank statements for instant analysis\n2. Set personalized financial goals\n3. Get AI-powered insights\n4. Track your spending patterns\n\nIf you have any questions, our support team is here to help.\n\nBest regards,\nThe FinVue Team`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: #0F172A; color: white; padding: 32px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px; color: #E2E8F0;">Welcome to FinVue</h1>
        </div>
        <div style="padding: 32px 24px; color: #1E293B;">
          <p style="font-size: 16px; margin-bottom: 24px;">Hello ${user.name},</p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Welcome to FinVue! We're excited to help you achieve your financial goals with our intelligent financial management platform.</p>
          <div style="background-color: #F8FAFC; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #0F172A; font-size: 20px; margin-top: 0;">Get Started in 4 Simple Steps:</h2>
            <ol style="padding-left: 20px;">
              <li style="margin-bottom: 12px; color: #334155;">Upload your bank statements for instant analysis</li>
              <li style="margin-bottom: 12px; color: #334155;">Set personalized financial goals</li>
              <li style="margin-bottom: 12px; color: #334155;">Get AI-powered insights into your spending</li>
              <li style="margin-bottom: 12px; color: #334155;">Track your progress with interactive dashboards</li>
            </ol>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://finvue.com/dashboard" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Go to Dashboard</a>
          </div>
          <p style="font-size: 16px; margin-top: 32px;">Best regards,<br>The FinVue Team</p>
        </div>
        <div style="background-color: #F1F5F9; padding: 16px; text-align: center; font-size: 14px; color: #64748B; border-radius: 0 0 8px 8px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `
  }),
  
  weeklyReport: (user: User, insights: Insight[], stats: { income: number; expenses: number; savings: number }) => ({
    subject: 'Your Weekly Financial Report',
    text: `Hello ${user.name},\n\nHere's your weekly financial report:\n\nIncome: $${stats.income.toFixed(2)}\nExpenses: $${stats.expenses.toFixed(2)}\nSavings: $${stats.savings.toFixed(2)}\n\nInsights:\n${insights.map(i => `- ${i.title}: ${i.description}`).join('\n')}\n\nCheck your dashboard for more details.\n\nBest,\nThe Finance Hub Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
          <h1>Your Weekly Financial Report</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${user.name},</p>
          <p>Here's your weekly financial report:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Income:</strong> $${stats.income.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Expenses:</strong> $${stats.expenses.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Savings:</strong> $${stats.savings.toFixed(2)}</p>
          </div>
          <h2>Insights</h2>
          <ul>
            ${insights.map(i => `<li><strong>${i.title}:</strong> ${i.description}</li>`).join('')}
          </ul>
          <p>Check your <a href="#">dashboard</a> for more details.</p>
          <p>Best,<br>The Finance Hub Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `
  }),
  
  uploadReminder: (user: User) => ({
    subject: 'Reminder: Upload Your Bank Statement',
    text: `Hello ${user.name},\n\nThis is a friendly reminder to upload your latest bank statement to Finance Hub. Regular uploads help us provide you with accurate insights and recommendations.\n\nLog in to your account to upload your statement.\n\nBest,\nThe Finance Hub Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center;">
          <h1>Upload Reminder</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${user.name},</p>
          <p>This is a friendly reminder to upload your latest bank statement to Finance Hub. Regular uploads help us provide you with accurate insights and recommendations.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upload Statement</a>
          </div>
          <p>Best,<br>The Finance Hub Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `
  }),
  
  analysisComplete: (user: User, bankStatement: BankStatement, insights: Insight[]) => ({
    subject: 'Bank Statement Analysis Complete',
    text: `Hello ${user.name},\n\nWe've analyzed your recently uploaded bank statement and generated ${insights.length} insights.\n\nHere are some highlights:\n${insights.slice(0, 3).map(i => `- ${i.title}: ${i.description}`).join('\n')}\n\nLog in to your account to view all insights and recommendations.\n\nBest,\nThe Finance Hub Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4caf50; color: white; padding: 20px; text-align: center;">
          <h1>Analysis Complete</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${user.name},</p>
          <p>We've analyzed your recently uploaded bank statement and generated ${insights.length} insights.</p>
          <h2>Highlights</h2>
          <ul>
            ${insights.slice(0, 3).map(i => `<li><strong>${i.title}:</strong> ${i.description}</li>`).join('')}
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View All Insights</a>
          </div>
          <p>Best,<br>The Finance Hub Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `
  }),
  
  goalProgress: (user: User, goal: Goal) => {
    const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
    const progressText = `${progress.toFixed(0)}%`;
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    
    return {
      subject: `Goal Progress Update: ${goal.name}`,
      text: `Hello ${user.name},\n\nHere's an update on your financial goal "${goal.name}":\n\nProgress: ${progressText}\nCurrent Amount: $${goal.currentAmount.toFixed(2)}\nTarget Amount: $${goal.targetAmount.toFixed(2)}\nRemaining: $${remainingAmount.toFixed(2)}\n\nKeep up the good work!\n\nBest,\nThe Finance Hub Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #673ab7; color: white; padding: 20px; text-align: center;">
            <h1>Goal Progress Update</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hello ${user.name},</p>
            <p>Here's an update on your financial goal "${goal.name}":</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Progress:</strong> ${progressText}</p>
              <div style="background-color: #e0e0e0; border-radius: 10px; height: 20px; margin: 10px 0;">
                <div style="background-color: #4caf50; border-radius: 10px; height: 100%; width: ${progressText};">&nbsp;</div>
              </div>
              <p style="margin: 5px 0;"><strong>Current Amount:</strong> $${goal.currentAmount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Target Amount:</strong> $${goal.targetAmount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Remaining:</strong> $${remainingAmount.toFixed(2)}</p>
            </div>
            <p>Keep up the good work!</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Goal Details</a>
            </div>
            <p>Best,<br>The Finance Hub Team</p>
          </div>
          <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `
    };
  }
};

// Email service functions
export const emailService = {
  sendWelcomeEmail: async (user: User) => {
    try {
      const template = emailTemplates.welcome(user);
      
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      
      console.log(`Welcome email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  },
  
  sendWeeklyReport: async (user: User, insights: Insight[], stats: { income: number; expenses: number; savings: number }) => {
    try {
      const template = emailTemplates.weeklyReport(user, insights, stats);
      
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      
      console.log(`Weekly report sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error sending weekly report:', error);
      return false;
    }
  },
  
  sendUploadReminder: async (user: User) => {
    try {
      const template = emailTemplates.uploadReminder(user);
      
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      
      console.log(`Upload reminder sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error sending upload reminder:', error);
      return false;
    }
  },
  
  sendAnalysisComplete: async (user: User, bankStatement: BankStatement, insights: Insight[]) => {
    try {
      const template = emailTemplates.analysisComplete(user, bankStatement, insights);
      
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      
      console.log(`Analysis complete notification sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error sending analysis complete notification:', error);
      return false;
    }
  },
  
  sendGoalProgress: async (user: User, goal: Goal) => {
    try {
      const template = emailTemplates.goalProgress(user, goal);
      
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      
      console.log(`Goal progress update sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('Error sending goal progress update:', error);
      return false;
    }
  },

  // Send test email (for testing nodemailer setup)
  sendTestEmail: async (email: string) => {
    try {
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Test Email from Finance Hub (Nodemailer)',
        text: `This is a test email from Finance Hub. If you're receiving this, it means your email configuration is working correctly. Current time: ${new Date().toLocaleString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
              <h1>Test Email (Nodemailer)</h1>
            </div>
            <div style="padding: 20px;">
              <p>This is a test email from Finance Hub.</p>
              <p>If you're receiving this, it means your nodemailer email configuration is working correctly.</p>
              <p>Current time: ${new Date().toLocaleString()}</p>
              <p>Best,<br>The Finance Hub Team</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
              <p>This is an automated test email. Please do not reply to this message.</p>
            </div>
          </div>
        `,
      });
      
      console.log(`Test email sent to ${email} via Nodemailer`);
      return true;
    } catch (error) {
      console.error('Error sending test email with Nodemailer:', error);
      return false;
    }
  },
};