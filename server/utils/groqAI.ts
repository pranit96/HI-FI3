import { Transaction, Insight, Goal, InsertInsight, InsertGoal } from '@shared/schema';

// Groq API Key
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Function to categorize transactions
export async function categorizeTransactions(transactions: Transaction[]): Promise<Transaction[]> {
  try {
    // Skip if no Groq API key
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY is not set. Skipping transaction categorization.');
      return transactions;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `You are a financial assistant that categorizes bank transactions. Categories include: Groceries, Dining, Transport, Entertainment, Shopping, Utilities, Healthcare, Education, Housing, Income, Transfer, Savings, Investment, Travel, Subscription, Other.`
          },
          {
            role: 'user',
            content: `Categorize each of the following transactions into one of the predefined categories. Return a JSON array with transaction ID and corresponding category.
            Transaction list:
            ${JSON.stringify(transactions.map(t => ({
              id: t.id,
              description: t.description,
              amount: t.amount,
              type: t.type
            })))}
            `
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[([\s\S]*?)\]/);
    
    if (jsonMatch) {
      const categorizedTransactions = JSON.parse(jsonMatch[0].replace(/```json\n|\n```/g, ''));
      
      // Map categories back to transactions
      return transactions.map(transaction => {
        const categorized = categorizedTransactions.find(c => c.id === transaction.id);
        if (categorized && categorized.category) {
          return { ...transaction, category: categorized.category };
        }
        return transaction;
      });
    }
    
    // If no valid JSON found, return original transactions
    console.warn('Failed to parse categories from Groq response');
    return transactions;
  } catch (error) {
    console.error('Error categorizing transactions:', error);
    return transactions;
  }
}

// Function to generate spending insights
export async function generateSpendingInsights(
  transactions: Transaction[],
  previousPeriodTransactions: Transaction[] = []
): Promise<Insight[]> {
  try {
    // Skip if no Groq API key
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY is not set. Skipping insight generation.');
      return [];
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `You are a financial advisor that analyzes bank transactions and provides helpful insights and savings recommendations. You provide actionable and specific advice based on real spending patterns.`
          },
          {
            role: 'user',
            content: `Analyze these transactions and provide 3-5 key financial insights with specific advice on how to save money.
            
            Current period transactions:
            ${JSON.stringify(transactions.map(t => ({
              date: t.date,
              description: t.description,
              category: t.category,
              amount: t.amount,
              type: t.type
            })))}
            
            Previous period transactions (for comparison):
            ${JSON.stringify(previousPeriodTransactions.map(t => ({
              date: t.date,
              description: t.description,
              category: t.category,
              amount: t.amount,
              type: t.type
            })))}
            
            Return a JSON array with objects containing:
            {
              "title": "Short insight title",
              "description": "Detailed, specific, and actionable advice",
              "type": "info|warning|success",
              "category": "Relevant spending category"
            }
            `
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[([\s\S]*?)\]/);
    
    if (jsonMatch) {
      const rawInsights = JSON.parse(jsonMatch[0].replace(/```json\n|\n```/g, ''));
      
      // Format insights
      const userId = transactions.length > 0 ? transactions[0].userId : 0;
      
      return rawInsights.map((insight: any) => ({
        userId,
        title: insight.title,
        description: insight.description,
        type: insight.type || 'info',
        category: insight.category || null,
        relevantTransactions: null
      }));
    }
    
    // If no valid JSON found, return empty array
    console.warn('Failed to parse insights from Groq response');
    return [];
  } catch (error) {
    console.error('Error generating insights:', error);
    return [];
  }
}

// Function to suggest financial goals
export async function suggestFinancialGoals(
  userId: number,
  transactions: Transaction[],
  existingGoals: Goal[] = []
): Promise<InsertGoal[]> {
  try {
    // Skip if no Groq API key
    if (!GROQ_API_KEY) {
      console.warn('GROQ_API_KEY is not set. Skipping goal suggestions.');
      return [];
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `You are a financial advisor that helps people set realistic financial goals based on their income and spending patterns.`
          },
          {
            role: 'user',
            content: `Based on the following transactions and existing financial goals, suggest 1-3 new financial goals that would be beneficial for this user.
            
            Recent transactions:
            ${JSON.stringify(transactions.map(t => ({
              date: t.date,
              description: t.description,
              category: t.category,
              amount: t.amount,
              type: t.type
            })))}
            
            Existing goals:
            ${JSON.stringify(existingGoals.map(g => ({
              name: g.name,
              targetAmount: g.targetAmount,
              currentAmount: g.currentAmount,
              deadline: g.deadline,
              description: g.description
            })))}
            
            Return a JSON array with objects containing:
            {
              "name": "Goal name",
              "targetAmount": number,
              "deadline": "YYYY-MM-DD",
              "description": "Detailed description of the goal and its benefits"
            }
            `
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[([\s\S]*?)\]/);
    
    if (jsonMatch) {
      const rawGoals = JSON.parse(jsonMatch[0].replace(/```json\n|\n```/g, ''));
      
      // Format goals
      return rawGoals.map((goal: any) => ({
        userId,
        name: goal.name,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline ? new Date(goal.deadline) : null,
        description: goal.description,
        isAIGenerated: true,
        status: 'active'
      }));
    }
    
    // If no valid JSON found, return empty array
    console.warn('Failed to parse goals from Groq response');
    return [];
  } catch (error) {
    console.error('Error suggesting goals:', error);
    return [];
  }
}
