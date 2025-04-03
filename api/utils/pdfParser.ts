import { promises as fs } from 'fs';
import * as pdfParse from 'pdf-parse';
import { InsertTransaction } from '@shared/schema';

type PDFData = {
  text: string;
};

// Supported bank types
export enum BankType {
  HDFC = "HDFC",
  ICICI = "ICICI",
  UNKNOWN = "UNKNOWN"
}

// Structure for parsed bank statement
interface ParsedBankStatement {
  bankType: BankType;
  accountNumber: string;
  accountHolderName: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  transactions: InsertTransaction[];
}

/**
 * Detect bank type from content
 */
function detectBankType(content: string): BankType {
  const contentLower = content.toLowerCase();
  
  if (contentLower.includes('hdfc bank') || contentLower.includes('hdfc statement')) {
    return BankType.HDFC;
  } else if (contentLower.includes('icici bank') || contentLower.includes('icici statement')) {
    return BankType.ICICI;
  }
  
  // If no match, try to guess based on format patterns
  if (contentLower.includes('date description') && contentLower.includes('withdrawal amt')) {
    return BankType.HDFC;
  } else if (contentLower.includes('transaction date') && contentLower.includes('withdrawal amount')) {
    return BankType.ICICI;
  }
  
  return BankType.UNKNOWN;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date {
  // Support multiple date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
  let date: Date;
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const [_, day, month, year] = dmyMatch;
    date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try MM/DD/YYYY or MM-DD-YYYY
  const mdyMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdyMatch) {
    const [_, month, day, year] = mdyMatch;
    date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try YYYY-MM-DD
  const isoMatch = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const [_, year, month, day] = isoMatch;
    date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Try parsing directly
  date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  throw new Error(`Unrecognized date format: ${dateStr}`);
}

/**
 * Parse HDFC Bank statement
 */
function parseHDFCStatement(content: string, userId: number, bankAccountId: number): ParsedBankStatement {
  const lines = content.split('\n').map(line => line.trim());
  
  // Extract account information
  let accountNumber = '';
  let accountHolderName = '';
  let statementPeriod = '';
  let startDate = '';
  let endDate = '';
  
  // Find account info
  for (let i = 0; i < 50 && i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (line.includes('account number') || line.includes('a/c no')) {
      const match = lines[i].match(/(?:Account Number|A\/C No)[:\s]+([0-9X]+)/i);
      if (match && match[1]) {
        accountNumber = match[1].trim();
      }
    }
    
    if (line.includes('name') && !line.includes('branch name')) {
      const nameIndex = i;
      if (nameIndex < lines.length - 1) {
        accountHolderName = lines[nameIndex + 1].trim();
      }
    }
    
    if (line.includes('statement period') || line.includes('statement from')) {
      statementPeriod = lines[i];
      
      // Extract dates from statement period
      const dateMatch = statementPeriod.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+to\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
      if (dateMatch) {
        startDate = dateMatch[1];
        endDate = dateMatch[2];
      }
    }
  }
  
  // If statement period not found in header, try to infer from transaction dates
  if (!startDate || !endDate) {
    const dateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g;
    const allDates = [];
    let match;
    
    // Collect all dates from the statement
    const contentToSearch = content.substring(0, Math.min(content.length, 10000)); // Limit search area
    while ((match = dateRegex.exec(contentToSearch)) !== null) {
      allDates.push(match[0]);
    }
    
    if (allDates.length >= 2) {
      // Sort dates and use first and last
      const sortedDates = allDates.map(d => parseDate(d).toISOString())
        .sort();
      
      startDate = allDates[0];
      endDate = allDates[allDates.length - 1];
    }
  }
  
  // Parse transactions
  const transactions: InsertTransaction[] = [];
  
  // Find where transaction list begins
  let transactionStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('date') && 
        (lines[i].toLowerCase().includes('description') || lines[i].toLowerCase().includes('particulars')) &&
        (lines[i].toLowerCase().includes('withdrawal') || lines[i].toLowerCase().includes('debit'))) {
      transactionStartIndex = i + 1;
      break;
    }
  }
  
  if (transactionStartIndex === -1) {
    // Try alternative header pattern
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/date.*narration.*debit.*credit.*balance/i)) {
        transactionStartIndex = i + 1;
        break;
      }
    }
  }
  
  if (transactionStartIndex !== -1) {
    // Process transactions
    let currentDate = '';
    
    for (let i = transactionStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.toLowerCase().includes('opening balance') || line.toLowerCase().includes('closing balance')) {
        continue;
      }
      
      // Check if line starts with a date
      const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
      
      if (dateMatch) {
        currentDate = dateMatch[1];
        
        // Extract transaction details
        // Format: Date Description Withdrawal Credit Balance
        const debitMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})(.+?)(\d+\.\d{2})\s+(?:\s+|-)(\d+\.\d{2})$/);
        const creditMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})$/);
        
        if (debitMatch) {
          const [_, date, description, amount, balance] = debitMatch;
          transactions.push({
            userId,
            bankAccountId,
            date: parseDate(date).toISOString().split('T')[0],
            description: description.trim(),
            amount: parseFloat(amount),
            type: 'debit',
            balance: parseFloat(balance),
            reference: null,
          });
        } else if (creditMatch) {
          const [_, date, description, amount, balance] = creditMatch;
          transactions.push({
            userId,
            bankAccountId,
            date: parseDate(date).toISOString().split('T')[0],
            description: description.trim(),
            amount: parseFloat(amount),
            type: 'credit',
            balance: parseFloat(balance),
            reference: null,
          });
        }
      }
    }
  }
  
  // Convert dates to ISO format
  const parsedStartDate = startDate ? parseDate(startDate).toISOString().split('T')[0] : '';
  const parsedEndDate = endDate ? parseDate(endDate).toISOString().split('T')[0] : '';
  
  return {
    bankType: BankType.HDFC,
    accountNumber,
    accountHolderName,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    transactions
  };
}

/**
 * Parse ICICI Bank statement
 */
function parseICICIStatement(content: string, userId: number, bankAccountId: number): ParsedBankStatement {
  const lines = content.split('\n').map(line => line.trim());
  
  // Extract account information
  let accountNumber = '';
  let accountHolderName = '';
  let startDate = '';
  let endDate = '';
  
  // Find account info
  for (let i = 0; i < 50 && i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (line.includes('account number') || line.includes('account no')) {
      const match = lines[i].match(/(?:Account Number|Account No)[:\s]+([0-9X]+)/i);
      if (match && match[1]) {
        accountNumber = match[1].trim();
      }
    }
    
    if (line.includes('name') && (line.includes('customer') || line.includes('account holder'))) {
      const nameIndex = i;
      if (nameIndex < lines.length - 1) {
        accountHolderName = lines[nameIndex + 1].trim();
      }
    }
    
    if (line.includes('statement period') || line.includes('statement from') || line.includes('period')) {
      const dateMatch = lines[i].match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+to\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
      if (dateMatch) {
        startDate = dateMatch[1];
        endDate = dateMatch[2];
      }
    }
  }
  
  // If statement period not found in header, try to infer from transaction dates
  if (!startDate || !endDate) {
    const dateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g;
    const allDates = [];
    let match;
    
    // Collect all dates from the statement
    const contentToSearch = content.substring(0, Math.min(content.length, 10000)); // Limit search area
    while ((match = dateRegex.exec(contentToSearch)) !== null) {
      allDates.push(match[0]);
    }
    
    if (allDates.length >= 2) {
      // Sort dates and use first and last
      const sortedDates = allDates.map(d => parseDate(d))
        .sort((a, b) => a.getTime() - b.getTime());
      
      startDate = allDates[0];
      endDate = allDates[allDates.length - 1];
    }
  }
  
  // Parse transactions
  const transactions: InsertTransaction[] = [];
  
  // Find where transaction list begins
  let transactionStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i].toLowerCase().includes('date') || lines[i].toLowerCase().includes('transaction date')) && 
        (lines[i].toLowerCase().includes('description') || lines[i].toLowerCase().includes('narration')) &&
        (lines[i].toLowerCase().includes('debit') || lines[i].toLowerCase().includes('withdrawal'))) {
      transactionStartIndex = i + 1;
      break;
    }
  }
  
  if (transactionStartIndex === -1) {
    // Try alternative header pattern
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/s\.no\..*value date.*description.*cheque.*debit.*credit.*balance/i)) {
        transactionStartIndex = i + 1;
        break;
      }
    }
  }
  
  if (transactionStartIndex !== -1) {
    // Process transactions
    for (let i = transactionStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.toLowerCase().includes('opening balance') || line.toLowerCase().includes('closing balance')) {
        continue;
      }
      
      // Check for transaction line patterns
      // Format 1: Date Description Withdrawal Deposit Balance
      const transactionMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})(.+?)(\d+\.\d{2})\s+(\d+\.\d{2})$/);
      
      if (transactionMatch) {
        const [_, date, description, amount, balance] = transactionMatch;
        
        // Determine if it's a debit or credit
        const isDebit = line.toLowerCase().includes('debit') || line.toLowerCase().includes('withdrawal');
        
        transactions.push({
          userId,
          bankAccountId,
          date: parseDate(date).toISOString().split('T')[0],
          description: description.trim(),
          amount: parseFloat(amount),
          type: isDebit ? 'debit' : 'credit',
          balance: parseFloat(balance),
          reference: null,
        });
      } else {
        // Try alternative format: Date Reference Description Debit Credit Balance
        const altMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+(\w+)\s+(.+?)\s+(\d+\.\d{2})\s+\-\s+(\d+\.\d{2})$/);
        
        if (altMatch) {
          const [_, date, reference, description, amount, balance] = altMatch;
          
          transactions.push({
            userId,
            bankAccountId,
            date: parseDate(date).toISOString().split('T')[0],
            description: description.trim(),
            amount: parseFloat(amount),
            type: 'debit',
            balance: parseFloat(balance),
            reference,
          });
        } else {
          // Try credit transaction format
          const creditMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+(\w+)\s+(.+?)\s+\-\s+(\d+\.\d{2})\s+(\d+\.\d{2})$/);
          
          if (creditMatch) {
            const [_, date, reference, description, amount, balance] = creditMatch;
            
            transactions.push({
              userId,
              bankAccountId,
              date: parseDate(date).toISOString().split('T')[0],
              description: description.trim(),
              amount: parseFloat(amount),
              type: 'credit',
              balance: parseFloat(balance),
              reference,
            });
          }
        }
      }
    }
  }
  
  // Convert dates to ISO format
  const parsedStartDate = startDate ? parseDate(startDate).toISOString().split('T')[0] : '';
  const parsedEndDate = endDate ? parseDate(endDate).toISOString().split('T')[0] : '';
  
  return {
    bankType: BankType.ICICI,
    accountNumber,
    accountHolderName,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    transactions
  };
}

/**
 * Read file as text
 */
async function readFileAsText(filePath: string): Promise<string> {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * Main function to parse bank statement
 */
export async function parseBankStatement(filePath: string, userId: number, bankAccountId: number): Promise<ParsedBankStatement> {
  try {
    const content = await readFileAsText(filePath);
    
    // Detect bank type
    const bankType = detectBankType(content);
    
    switch (bankType) {
      case BankType.HDFC:
        return parseHDFCStatement(content, userId, bankAccountId);
      case BankType.ICICI:
        return parseICICIStatement(content, userId, bankAccountId);
      default:
        throw new Error('Unsupported bank statement format. Currently supported banks: HDFC, ICICI');
    }
  } catch (error) {
    console.error('Error parsing bank statement:', error);
    throw error;
  }
}