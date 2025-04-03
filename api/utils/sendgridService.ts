import { MailService } from '@sendgrid/mail';
import { User, BankStatement, Insight, Goal } from '@shared/schema';

// Initialize SendGrid with API key
const sendgrid = new MailService();

// Set API key from environment variable
if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set. Email functionality will not work.');
} else {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email templates (can be shared with the existing emailService.ts)
export const emailTemplates = {
  welcome: (user: User) => ({
    subject: 'Welcome to Finance Hub!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to Finance Hub!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${user.fullName},</p>
          <p>Welcome to Finance Hub! We're excited to help you manage your finances and achieve your financial goals.</p>
          <p>To get started, you can:</p>
          <ol>
            <li>Add your bank accounts</li>
            <li>Upload your bank statements</li>
            <li>Set your financial goals</li>
          </ol>
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          <p>Best,<br>The Finance Hub Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `
  }),
  
  weeklyReport: (user: User, insights: Insight[], stats: { income: number; expenses: number; savings: number }) => ({
    subject: 'Your Weekly Financial Report',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
          <h1>Your Weekly Financial Report</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${user.fullName},</p>
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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff9800; color: white; padding: 20px; text-align: center;">
          <h1>Upload Reminder</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${user.fullName},</p>
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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4caf50; color: white; padding: 20px; text-align: center;">
          <h1>Analysis Complete</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hello ${user.fullName},</p>
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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #673ab7; color: white; padding: 20px; text-align: center;">
            <h1>Goal Progress Update</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hello ${user.fullName},</p>
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

// Define the email sender configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'notifications@financehub.com';

// SendGrid email service
export const sendgridService = {
  // Send welcome email
  sendWelcomeEmail: async (user: User): Promise<boolean> => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY is not set. Unable to send welcome email.');
        return false;
      }
      
      const template = emailTemplates.welcome(user);
      
      await sendgrid.send({
        to: user.email,
        from: EMAIL_FROM,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`Welcome email sent to ${user.email} via SendGrid`);
      return true;
    } catch (error) {
      console.error('Error sending welcome email with SendGrid:', error);
      return false;
    }
  },
  
  // Send weekly financial report
  sendWeeklyReport: async (user: User, insights: Insight[], stats: { income: number; expenses: number; savings: number }): Promise<boolean> => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY is not set. Unable to send weekly report.');
        return false;
      }
      
      const template = emailTemplates.weeklyReport(user, insights, stats);
      
      await sendgrid.send({
        to: user.email,
        from: EMAIL_FROM,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`Weekly report sent to ${user.email} via SendGrid`);
      return true;
    } catch (error) {
      console.error('Error sending weekly report with SendGrid:', error);
      return false;
    }
  },
  
  // Send bank statement upload reminder
  sendUploadReminder: async (user: User): Promise<boolean> => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY is not set. Unable to send upload reminder.');
        return false;
      }
      
      const template = emailTemplates.uploadReminder(user);
      
      await sendgrid.send({
        to: user.email,
        from: EMAIL_FROM,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`Upload reminder sent to ${user.email} via SendGrid`);
      return true;
    } catch (error) {
      console.error('Error sending upload reminder with SendGrid:', error);
      return false;
    }
  },
  
  // Send analysis complete notification
  sendAnalysisComplete: async (user: User, bankStatement: BankStatement, insights: Insight[]): Promise<boolean> => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY is not set. Unable to send analysis complete notification.');
        return false;
      }
      
      const template = emailTemplates.analysisComplete(user, bankStatement, insights);
      
      await sendgrid.send({
        to: user.email,
        from: EMAIL_FROM,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`Analysis complete notification sent to ${user.email} via SendGrid`);
      return true;
    } catch (error) {
      console.error('Error sending analysis complete notification with SendGrid:', error);
      return false;
    }
  },
  
  // Send goal progress notification
  sendGoalProgress: async (user: User, goal: Goal): Promise<boolean> => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY is not set. Unable to send goal progress notification.');
        return false;
      }
      
      const template = emailTemplates.goalProgress(user, goal);
      
      await sendgrid.send({
        to: user.email,
        from: EMAIL_FROM,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`Goal progress update sent to ${user.email} via SendGrid`);
      return true;
    } catch (error) {
      console.error('Error sending goal progress update with SendGrid:', error);
      return false;
    }
  },
};