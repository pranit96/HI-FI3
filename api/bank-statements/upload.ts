import { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { storage } from '../storage';
import { parseBankStatement, parseMultipleBankStatements, ParseResult } from '../utils/pdfParser';
import { categorizeTransactions } from '../utils/groqAI';
import { withAuth, AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './uploads');
    },
    filename: (req, file, cb) => {
      const randomBytes = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const filename = `${timestamp}-${randomBytes}${path.extname(file.originalname)}`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Allow up to 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
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

  // Array to track uploaded files to ensure cleanup
  const uploadedFiles: Express.Multer.File[] = [];

  try {
    // Ensure uploads directory exists
    await ensureUploadsDir();

    // Check if it's a multi-file or single file upload
    const isMultipleFiles = req.headers['x-upload-type'] === 'multiple';

    if (isMultipleFiles) {
      // Process multiple file uploads
      await runMiddleware(req, res, upload.array('statements', 5));

      // Access files from req.files
      if (!Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Track files for cleanup
      uploadedFiles.push(...req.files);
    } else {
      // Process single file upload for backward compatibility
      await runMiddleware(req, res, upload.single('statement'));

      // Access file from req.file
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Track file for cleanup
      uploadedFiles.push(req.file);
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

    // Process multiple files
    if (isMultipleFiles && Array.isArray(req.files)) {
      const filePaths = req.files.map(file => file.path);

      // Parse multiple bank statements in parallel
      const parseResults = await parseMultipleBankStatements(
        filePaths,
        req.user.id,
        bankAccountId
      );

      // Process each parsed statement
      const processedStatements = [];
      let totalTransactions = 0;

      for (const result of parseResults.results) {
        // Create bank statement record
        const bankStatement = await storage.createBankStatement({
          userId: req.user.id,
          bankAccountId,
          fileName: req.files[parseResults.results.indexOf(result)].originalname,
          startDate: result.statement.startDate,
          endDate: result.statement.endDate,
        });

        // Add bank statement ID to transactions
        const transactions = result.statement.transactions.map(t => ({
          ...t,
          bankStatementId: bankStatement.id
        }));

        // Categorize transactions using Groq AI
        const categorizedTransactions = await categorizeTransactions(transactions);

        // Save transactions to database
        const savedTransactions = await storage.createManyTransactions(categorizedTransactions);
        totalTransactions += savedTransactions.length;

        // Update bank statement as processed
        await storage.updateBankStatement(bankStatement.id, { processed: true });

        processedStatements.push({
          bankStatement,
          transactionCount: savedTransactions.length,
          accountInfo: {
            accountNumber: result.statement.accountNumber,
            accountHolderName: result.statement.accountHolderName,
            bankType: result.statement.bankType
          },
          stats: result.stats
        });
      }

      // Return success response with combined statistics
      return res.status(200).json({
        success: true,
        processedStatements,
        combinedStats: {
          ...parseResults.combinedStats,
          totalTransactions
        }
      });
    } 
    // Process single file
    else {
      // Parse single bank statement
      const parseResult = await parseBankStatement(
        req.file.path,
        req.user.id,
        bankAccountId
      );

      // Create bank statement record
      const bankStatement = await storage.createBankStatement({
        userId: req.user.id,
        bankAccountId,
        fileName: req.file.originalname,
        startDate: parseResult.statement.startDate,
        endDate: parseResult.statement.endDate,
      });

      // Add bank statement ID to transactions
      const transactions = parseResult.statement.transactions.map(t => ({
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
          accountNumber: parseResult.statement.accountNumber,
          accountHolderName: parseResult.statement.accountHolderName,
          bankType: parseResult.statement.bankType
        },
        stats: parseResult.stats
      });
    }
  } catch (error) {
    console.error('Error processing bank statement:', error);
    return res.status(500).json({
      error: 'Failed to process bank statement',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Clean up all uploaded files
    for (const file of uploadedFiles) {
      try {
        await fs.unlink(file.path);
      } catch (err) {
        console.error(`Error deleting temporary file ${file.path}:`, err);
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