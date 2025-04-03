import nodemailer from 'nodemailer';
import { Insight, User, BankStatement, Goal } from '@shared/schema';

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '465', 10);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';

// Create transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Email templates
export const emailTemplates = {
  // Welcome email
  welcome: (user: User) => ({
    subject: 'Welcome to FinSavvy - Your Personal Finance Assistant',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h1 style="color: #3DD598; margin-bottom: 20px;">Welcome to FinSavvy!</h1>
        <p>Hi ${user.name},</p>
        <p>Thank you for joining FinSavvy, your personal finance assistant. We're excited to help you take control of your financial journey.</p>
        <p>Here's what you can do with FinSavvy:</p>
        <ul>
          <li>Upload your bank statements for AI-powered analysis</li>
          <li>Set and track your financial goals</li>
          <li>Get personalized insights on your spending habits</li>
          <li>Receive recommendations for saving more effectively</li>
        </ul>
        <p>To get started, simply log in to your account and upload your first bank statement.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://finsavvy.app/dashboard" style="background-color: #3DD598; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Dashboard</a>
        </div>
        <p>If you have any questions, simply reply to this email. We're here to help!</p>
        <p>Best regards,<br>The FinSavvy Team</p>
      </div>
    `
  }),

  // Weekly analysis report
  weeklyReport: (user: User, insights: Insight[], stats: { income: number; expenses: number; savings: number }) => ({
    subject: 'Your Weekly Financial Summary - FinSavvy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h1 style="color: #3DD598; margin-bottom: 20px;">Your Weekly Financial Summary</h1>
        <p>Hi ${user.name},</p>
        <p>Here's your financial summary for the past week:</p>
        
        <!-- Financial Stats -->
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <div style="margin-bottom: 10px;">
            <span style="font-weight: bold;">Income:</span> 
            <span style="float: right; color: #10b981;">${user.currency} ${stats.income.toFixed(2)}</span>
          </div>
          <div style="margin-bottom: 10px;">
            <span style="font-weight: bold;">Expenses:</span> 
            <span style="float: right; color: #ef4444;">${user.currency} ${stats.expenses.toFixed(2)}</span>
          </div>
          <div style="font-weight: bold;">
            <span>Savings:</span> 
            <span style="float: right; color: #3b82f6;">${user.currency} ${stats.savings.toFixed(2)}</span>
          </div>
        </div>
        
        <!-- AI Insights -->
        <h2 style="color: #4A56E2; margin-top: 30px;">AI-Powered Insights</h2>
        ${insights.map(insight => `
          <div style="margin-bottom: 15px; padding: 15px; border-left: 4px solid ${
            insight.type === 'info' ? '#3b82f6' : 
            insight.type === 'warning' ? '#f59e0b' : 
            '#10b981'
          }; background-color: #f8fafc;">
            <h3 style="margin-top: 0; color: #1f2937;">${insight.title}</h3>
            <p style="margin-bottom: 0; color: #4b5563;">${insight.description}</p>
          </div>
        `).join('')}
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://finsavvy.app/dashboard" style="background-color: #4A56E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Detailed Analysis</a>
        </div>
        
        <p>Need help managing your finances? We're here for you!</p>
        <p>Best regards,<br>The FinSavvy Team</p>
      </div>
    `
  }),

  // Bank statement upload reminder
  uploadReminder: (user: User) => ({
    subject: 'Reminder: Upload Your Bank Statement - FinSavvy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h1 style="color: #3DD598; margin-bottom: 20px;">Upload Your Bank Statement</h1>
        <p>Hi ${user.name},</p>
        <p>This is a friendly reminder to upload your weekly bank statement to FinSavvy.</p>
        <p>Regular uploads help us provide you with more accurate financial insights and personalized recommendations.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://finsavvy.app/dashboard/upload" style="background-color: #4A56E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Upload Bank Statement</a>
        </div>
        
        <p>If you've already uploaded this week's statement, you can ignore this reminder.</p>
        <p>Best regards,<br>The FinSavvy Team</p>
      </div>
    `
  }),

  // Bank statement analysis complete
  analysisComplete: (user: User, bankStatement: BankStatement, insights: Insight[]) => ({
    subject: 'Your Bank Statement Analysis is Ready - FinSavvy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h1 style="color: #3DD598; margin-bottom: 20px;">Analysis Complete</h1>
        <p>Hi ${user.name},</p>
        <p>We've analyzed your recently uploaded bank statement (${bankStatement.fileName}) and have some insights for you.</p>
        
        <!-- AI Insights -->
        <h2 style="color: #4A56E2; margin-top: 30px;">Key Insights</h2>
        ${insights.map(insight => `
          <div style="margin-bottom: 15px; padding: 15px; border-left: 4px solid ${
            insight.type === 'info' ? '#3b82f6' : 
            insight.type === 'warning' ? '#f59e0b' : 
            '#10b981'
          }; background-color: #f8fafc;">
            <h3 style="margin-top: 0; color: #1f2937;">${insight.title}</h3>
            <p style="margin-bottom: 0; color: #4b5563;">${insight.description}</p>
          </div>
        `).join('')}
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="https://finsavvy.app/dashboard" style="background-color: #4A56E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Full Analysis</a>
        </div>
        
        <p>Thank you for using FinSavvy to manage your finances!</p>
        <p>Best regards,<br>The FinSavvy Team</p>
      </div>
    `
  }),

  // Goal progress notification
  goalProgress: (user: User, goal: Goal) => {
    const progressPercentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
    
    return {
      subject: `Goal Progress Update: ${goal.name} - FinSavvy`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h1 style="color: #3DD598; margin-bottom: 20px;">Goal Progress Update</h1>
          <p>Hi ${user.name},</p>
          <p>You're making progress towards your financial goal!</p>
          
          <!-- Goal Details -->
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1f2937;">${goal.name}</h2>
            <p style="color: #4b5563;">${goal.description}</p>
            
            <!-- Progress Bar -->
            <div style="background-color: #e2e8f0; border-radius: 9999px; height: 12px; margin: 15px 0;">
              <div style="background-color: ${
                progressPercentage < 30 ? '#ef4444' : 
                progressPercentage < 70 ? '#f59e0b' : 
                '#10b981'
              }; border-radius: 9999px; height: 12px; width: ${progressPercentage}%;"></div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
              <span style="color: #4b5563; font-size: 14px;">${progressPercentage}% complete</span>
              <span style="color: #4b5563; font-size: 14px;">${user.currency} ${goal.currentAmount.toFixed(2)} of ${user.currency} ${goal.targetAmount.toFixed(2)}</span>
            </div>
            
            ${goal.deadline ? `<p style="margin-top: 15px; color: #4b5563;">Target date: ${new Date(goal.deadline).toLocaleDateString()}</p>` : ''}
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://finsavvy.app/goals" style="background-color: #4A56E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Your Goals</a>
          </div>
          
          <p>Keep up the good work!</p>
          <p>Best regards,<br>The FinSavvy Team</p>
        </div>
      `
    };
  }
};

// Email service
export const emailService = {
  // Send welcome email
  sendWelcomeEmail: async (user: User) => {
    const { subject, html } = emailTemplates.welcome(user);
    
    return transporter.sendMail({
      from: `"FinSavvy" <${EMAIL_USER}>`,
      to: user.email,
      subject,
      html
    });
  },
  
  // Send weekly report
  sendWeeklyReport: async (user: User, insights: Insight[], stats: { income: number; expenses: number; savings: number }) => {
    const { subject, html } = emailTemplates.weeklyReport(user, insights, stats);
    
    return transporter.sendMail({
      from: `"FinSavvy" <${EMAIL_USER}>`,
      to: user.email,
      subject,
      html
    });
  },
  
  // Send upload reminder
  sendUploadReminder: async (user: User) => {
    const { subject, html } = emailTemplates.uploadReminder(user);
    
    return transporter.sendMail({
      from: `"FinSavvy" <${EMAIL_USER}>`,
      to: user.email,
      subject,
      html
    });
  },
  
  // Send analysis complete notification
  sendAnalysisComplete: async (user: User, bankStatement: BankStatement, insights: Insight[]) => {
    const { subject, html } = emailTemplates.analysisComplete(user, bankStatement, insights);
    
    return transporter.sendMail({
      from: `"FinSavvy" <${EMAIL_USER}>`,
      to: user.email,
      subject,
      html
    });
  },
  
  // Send goal progress notification
  sendGoalProgress: async (user: User, goal: Goal) => {
    const { subject, html } = emailTemplates.goalProgress(user, goal);
    
    return transporter.sendMail({
      from: `"FinSavvy" <${EMAIL_USER}>`,
      to: user.email,
      subject,
      html
    });
  }
};
