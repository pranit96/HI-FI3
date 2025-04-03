import { Groq } from 'groq-sdk';
import { Transaction, User, Insight, Goal } from '@shared/schema';

// Initialize Groq client with API key
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Categorize transactions using Groq AI
 */
export async function categorizeTransactions(transactions: Transaction[]): Promise<Transaction[]> {
  if (!transactions.length) return transactions;
  
  try {
    // Create batch chunks to avoid token limits
    const BATCH_SIZE = 20;
    const batches = [];
    
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      batches.push(transactions.slice(i, i + BATCH_SIZE));
    }
    
    const categorizedTransactionBatches = [];
    
    for (const batch of batches) {
      // Prepare the prompt for categorization
      const transactionDescriptions = batch.map(t => 
        `Date: ${t.date}, Description: ${t.description}, Amount: ${t.amount}, Type: ${t.type}`
      ).join('\n');
      
      const prompt = `
        I have a list of bank transactions that need to be categorized. Please analyze each transaction
        and assign the most appropriate category from this list:
        
        Categories:
        - Housing (rent, mortgage, utilities, repairs)
        - Transportation (fuel, public transport, vehicle maintenance)
        - Food (groceries, restaurants, takeout)
        - Shopping (clothing, electronics, household items)
        - Entertainment (movies, games, subscriptions)
        - Health (medical expenses, pharmacy, fitness)
        - Education (tuition, books, courses)
        - Personal Care (haircuts, cosmetics, spa)
        - Travel (flights, hotels, vacations)
        - Insurance (health, auto, home insurance)
        - Savings (deposits to savings accounts)
        - Investments (stocks, bonds, retirement)
        - Income (salary, freelance work, etc)
        - Gifts (presents for others, donations)
        - Taxes (income tax, property tax)
        - Miscellaneous (anything that doesn't fit above)
        
        For each transaction, respond with ONLY the category name, nothing else. Keep the same order as the input.
        
        Transactions to categorize:
        ${transactionDescriptions}
      `;
      
      // Call Groq API
      const categoriesResponse = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a financial analysis expert who categorizes banking transactions accurately.' },
          { role: 'user', content: prompt }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.1,
      });
      
      // Parse the response
      const categoriesText = categoriesResponse.choices[0].message.content;
      if (!categoriesText) {
        throw new Error('Failed to get categories from Groq AI');
      }
      
      // Split by new lines to get categories array
      const categories = categoriesText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // Apply categories to transactions
      if (categories.length === batch.length) {
        const categorizedBatch = batch.map((transaction, index) => ({
          ...transaction,
          category: categories[index]
        }));
        
        categorizedTransactionBatches.push(categorizedBatch);
      } else {
        console.error(`Category count mismatch: expected ${batch.length}, got ${categories.length}`);
        categorizedTransactionBatches.push(batch); // Use original batch without categories
      }
    }
    
    // Combine all batches
    return categorizedTransactionBatches.flat();
  } catch (error) {
    console.error('Error categorizing transactions:', error);
    return transactions; // Return original transactions if categorization fails
  }
}

/**
 * Generate spending insights based on transactions
 */
export async function generateSpendingInsights(
  user: User,
  transactions: Transaction[],
  existingInsights: Insight[] = []
): Promise<Insight[]> {
  if (!transactions.length) return [];
  
  try {
    // Create a summary of transaction data for the AI
    const transactionSummary = transactions.reduce((acc, t) => {
      if (!acc[t.category || 'Uncategorized']) {
        acc[t.category || 'Uncategorized'] = { count: 0, total: 0 };
      }
      acc[t.category || 'Uncategorized'].count += 1;
      acc[t.category || 'Uncategorized'].total += t.amount;
      return acc;
    }, {} as Record<string, { count: number, total: number }>);
    
    // Prepare list of existing insight titles to avoid repetition
    const existingInsightTitles = existingInsights.map(i => i.title);
    
    // Prepare the prompt for insights generation
    const prompt = `
      I need to generate actionable financial insights for a user based on their transaction data.
      
      User Information:
      - Name: ${user.fullName}
      - Monthly Salary: ${user.monthlySalary ? `$${user.monthlySalary}` : 'Unknown'}
      
      Transaction Summary by Category:
      ${Object.entries(transactionSummary).map(([category, data]) => 
        `- ${category}: ${data.count} transactions, total $${data.total.toFixed(2)}`
      ).join('\n')}
      
      Existing Insights (to avoid repetition):
      ${existingInsightTitles.length ? existingInsightTitles.join('\n') : 'None'}
      
      Please generate 3-5 unique, specific, and actionable financial insights based on this data.
      For each insight, include:
      1. A concise title (max 10 words)
      2. A detailed explanation (2-3 sentences)
      3. Relevant categories
      4. A specific suggestion for improvement
      
      Respond in valid JSON format like this:
      [
        {
          "title": "Insight title",
          "description": "Detailed explanation of the insight",
          "category": "Relevant category name",
          "suggestion": "Specific suggestion for improvement"
        }
      ]
    `;
    
    // Call Groq API
    const insightsResponse = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a financial advisor who provides personalized spending insights and suggestions.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
    });
    
    // Parse the response
    const insightsText = insightsResponse.choices[0].message.content;
    if (!insightsText) {
      throw new Error('Failed to get insights from Groq AI');
    }
    
    // Extract JSON from response
    const jsonRegex = /\[[\s\S]*\]/;
    const jsonMatch = insightsText.match(jsonRegex);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse insights JSON from Groq AI response');
    }
    
    const insightsJson = JSON.parse(jsonMatch[0]);
    
    // Transform to Insight objects
    return insightsJson.map((insight: any) => ({
      userId: user.id,
      title: insight.title,
      description: insight.description,
      category: insight.category,
      type: 'spending',
      relevantTransactions: JSON.stringify(
        transactions
          .filter(t => t.category === insight.category)
          .slice(0, 5)
          .map(t => ({ date: t.date, description: t.description, amount: t.amount }))
      )
    }));
  } catch (error) {
    console.error('Error generating insights:', error);
    return [];
  }
}

/**
 * Suggest financial goals based on transaction history
 */
export async function suggestFinancialGoals(
  user: User,
  transactions: Transaction[],
  existingGoals: Goal[] = []
): Promise<Goal[]> {
  if (!transactions.length) return [];
  
  try {
    // Calculate monthly income and expenses
    const income = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Get expense breakdown by category
    const expensesByCategory = transactions
      .filter(t => t.type === 'debit')
      .reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        if (!acc[category]) acc[category] = 0;
        acc[category] += t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    // Prepare list of existing goal names to avoid repetition
    const existingGoalNames = existingGoals.map(g => g.name);
    
    // Prepare the prompt for goal suggestions
    const prompt = `
      I need to suggest personalized financial goals for a user based on their transaction data.
      
      User Information:
      - Name: ${user.fullName}
      - Monthly Salary: ${user.monthlySalary ? `$${user.monthlySalary}` : 'Unknown'}
      - Total Income (from transactions): $${income.toFixed(2)}
      - Total Expenses (from transactions): $${expenses.toFixed(2)}
      
      Expense Breakdown by Category:
      ${Object.entries(expensesByCategory).map(([category, amount]) => 
        `- ${category}: $${amount.toFixed(2)}`
      ).join('\n')}
      
      Existing Goals (to avoid repetition):
      ${existingGoalNames.length ? existingGoalNames.join('\n') : 'None'}
      
      Please suggest 3-4 realistic financial goals tailored to this user's spending patterns. 
      For each goal, include:
      1. A specific name
      2. A target amount
      3. A clear description explaining the benefit
      4. A realistic timeframe (deadline)
      
      Goals should be diverse and include both savings goals and spending reduction goals.
      
      Respond in valid JSON format like this:
      [
        {
          "name": "Goal name",
          "targetAmount": 1000,
          "currentAmount": 0,
          "description": "Detailed description of the goal",
          "deadline": "2023-12-31",
          "isAIGenerated": true,
          "status": "in_progress"
        }
      ]
    `;
    
    // Call Groq API
    const goalsResponse = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a financial planner who creates personalized financial goals.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
    });
    
    // Parse the response
    const goalsText = goalsResponse.choices[0].message.content;
    if (!goalsText) {
      throw new Error('Failed to get goals from Groq AI');
    }
    
    // Extract JSON from response
    const jsonRegex = /\[[\s\S]*\]/;
    const jsonMatch = goalsText.match(jsonRegex);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse goals JSON from Groq AI response');
    }
    
    const goalsJson = JSON.parse(jsonMatch[0]);
    
    // Transform to Goal objects
    return goalsJson.map((goal: any) => ({
      userId: user.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount || 0,
      description: goal.description,
      deadline: goal.deadline,
      isAIGenerated: true,
      status: 'in_progress'
    }));
  } catch (error) {
    console.error('Error suggesting goals:', error);
    return [];
  }
}