import { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { storage } from '../storage';
import { parseBankStatement } from '../utils/pdfParser';
import { categorizeTransactions } from '../utils/groqAI';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Create uploads directory if it doesn't exist
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir('./uploads', { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
};

// Process multer middleware
const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// Handler for bank statement upload
const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure uploads directory exists
    await ensureUploadsDir();

    // Process file upload
    await runMiddleware(req, res, upload.single('statement'));

    // Get uploaded file
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get bank account ID from request
    const bankAccountId = parseInt(req.body.bankAccountId);
    if (isNaN(bankAccountId)) {
      return res.status(400).json({ error: 'Invalid bank account ID' });
    }

    // Verify bank account belongs to user
    const bankAccount = await storage.getBankAccount(bankAccountId);
    if (!bankAccount || bankAccount.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized access to this bank account' });
    }

    // Parse bank statement
    const parsedStatement = await parseBankStatement(
      file.path,
      req.user.id,
      bankAccountId
    );

    // Create bank statement record
    const bankStatement = await storage.createBankStatement({
      userId: req.user.id,
      bankAccountId,
      fileName: file.originalname,
      startDate: parsedStatement.startDate,
      endDate: parsedStatement.endDate,
    });

    // Add bank statement ID to transactions
    const transactions = parsedStatement.transactions.map(t => ({
      ...t,
      bankStatementId: bankStatement.id
    }));

    // Categorize transactions using Groq AI
    const categorizedTransactions = await categorizeTransactions(transactions);

    // Save transactions to database
    const savedTransactions = await storage.createManyTransactions(categorizedTransactions);

    // Update bank statement as processed
    await storage.updateBankStatement(bankStatement.id, { processed: true });

    // Return success response
    return res.status(200).json({
      success: true,
      bankStatement,
      transactionCount: savedTransactions.length,
      accountInfo: {
        accountNumber: parsedStatement.accountNumber,
        accountHolderName: parsedStatement.accountHolderName,
        bankType: parsedStatement.bankType
      }
    });
  } catch (error) {
    console.error('Error processing bank statement:', error);
    return res.status(500).json({
      error: 'Failed to process bank statement',
      message: (error as Error).message
    });
  } finally {
    // Clean up uploaded file
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('Error deleting temporary file:', err);
      }
    }
  }
};

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll use multer
  },
};

export default withAuth(handler);