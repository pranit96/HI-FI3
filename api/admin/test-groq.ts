import { NextApiRequest, NextApiResponse } from 'next';
import { Groq } from 'groq-sdk';

/*
 * API Route to test Groq API integration
 * POST /api/admin/test-groq
 * Request Body: { text: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Text prompt is required' });
    }
    
    // Check if Groq API key is available
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ 
        message: 'Groq API key is not configured',
        error: 'GROQ_API_KEY environment variable is missing'
      });
    }
    
    // Initialize Groq client
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial advisor. Keep your answers concise and focused on personal finance.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.5,
      max_tokens: 800,
    });
    
    // Return the response
    return res.status(200).json({ 
      message: 'Groq API test successful',
      response: completion.choices[0]?.message?.content || 'No response from API'
    });
  } catch (error) {
    console.error('Groq API test error:', error);
    return res.status(500).json({ 
      message: 'Failed to test Groq API',
      error: error.message || 'Unknown error'
    });
  }
}