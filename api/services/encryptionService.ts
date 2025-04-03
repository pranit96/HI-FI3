import * as CryptoJS from 'crypto-js';
import * as crypto from 'crypto';

// Environment variable for encryption key or generate a fallback
// In production, always use an environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'finvue-secure-encryption-key-12345';

/**
 * Service to handle encryption and decryption of sensitive data
 */
class EncryptionService {
  private key: string;
  
  constructor() {
    this.key = ENCRYPTION_KEY;
    this.validateKey();
  }
  
  /**
   * Ensure the encryption key meets minimum security requirements
   */
  private validateKey(): void {
    if (!this.key || this.key.length < 16) {
      console.warn('Warning: Encryption key is too short or not set. Using a short key reduces security.');
    }
  }
  
  /**
   * Encrypt a string value
   * @param text Plain text to encrypt
   * @returns Encrypted string
   */
  encrypt(text: string): string {
    if (!text) return '';
    
    try {
      // Create a random initialization vector for additional security
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // Encrypt the data using AES with the key and IV
      const encrypted = CryptoJS.AES.encrypt(text, this.key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Combine the IV and encrypted data for storage
      // The IV doesn't need to be secret, but it should be included with the ciphertext
      const result = iv.toString() + ':' + encrypted.toString();
      return result;
    } catch (error) {
      console.error('Encryption error:', error);
      return '';
    }
  }
  
  /**
   * Decrypt an encrypted string
   * @param encryptedText Text to decrypt
   * @returns Decrypted string
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    
    try {
      // Extract the IV from the stored data
      const textParts = encryptedText.split(':');
      if (textParts.length !== 2) {
        throw new Error('Invalid encrypted text format');
      }
      
      const iv = CryptoJS.enc.Hex.parse(textParts[0]);
      const encryptedData = textParts[1];
      
      // Decrypt using the IV and encryption key
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Convert to UTF8 string
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }
  
  /**
   * Encrypt an object by encrypting sensitive fields
   * @param data Object to encrypt
   * @param fieldsToEncrypt Array of field names to encrypt
   * @returns New object with encrypted fields
   */
  encryptObject<T extends Record<string, any>>(data: T, fieldsToEncrypt: string[]): T {
    if (!data) return data;
    
    const encryptedData = { ...data };
    
    for (const field of fieldsToEncrypt) {
      if (typeof encryptedData[field] === 'string' && encryptedData[field]) {
        encryptedData[field] = this.encrypt(encryptedData[field]);
      } else if (encryptedData[field] !== undefined && encryptedData[field] !== null) {
        // For non-string values (like numbers), convert to string first
        encryptedData[field] = this.encrypt(String(encryptedData[field]));
      }
    }
    
    return encryptedData;
  }
  
  /**
   * Decrypt an object by decrypting sensitive fields
   * @param data Object with encrypted fields
   * @param fieldsToDecrypt Array of field names to decrypt
   * @returns New object with decrypted fields
   */
  decryptObject<T extends Record<string, any>>(data: T, fieldsToDecrypt: string[]): T {
    if (!data) return data;
    
    const decryptedData = { ...data };
    
    for (const field of fieldsToDecrypt) {
      if (typeof decryptedData[field] === 'string' && decryptedData[field]) {
        const decrypted = this.decrypt(decryptedData[field]);
        
        // Try to convert back to number if it was a number
        if (!isNaN(Number(decrypted))) {
          decryptedData[field] = Number(decrypted);
        } else {
          decryptedData[field] = decrypted;
        }
      }
    }
    
    return decryptedData;
  }
  
  /**
   * Encrypt an array of objects
   * @param dataArray Array of objects to encrypt
   * @param fieldsToEncrypt Fields to encrypt in each object
   * @returns New array with encrypted objects
   */
  encryptArray<T extends Record<string, any>>(dataArray: T[], fieldsToEncrypt: string[]): T[] {
    if (!dataArray || !Array.isArray(dataArray)) return dataArray;
    
    return dataArray.map(item => this.encryptObject(item, fieldsToEncrypt));
  }
  
  /**
   * Decrypt an array of objects
   * @param dataArray Array of objects with encrypted fields
   * @param fieldsToDecrypt Fields to decrypt in each object
   * @returns New array with decrypted objects
   */
  decryptArray<T extends Record<string, any>>(dataArray: T[], fieldsToDecrypt: string[]): T[] {
    if (!dataArray || !Array.isArray(dataArray)) return dataArray;
    
    return dataArray.map(item => this.decryptObject(item, fieldsToDecrypt));
  }
  
  /**
   * Generate a secure random string for use as salt, tokens, etc.
   * @param length Length of the random string to generate
   * @returns Random string
   */
  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }
}

export const encryptionService = new EncryptionService();

// Define fields that need encryption in various models
export const sensitiveUserFields = ['monthlySalary'];
export const sensitiveBankAccountFields = ['accountNumber', 'balance'];
export const sensitiveTransactionFields = ['amount', 'balance', 'description'];
export const sensitiveGoalFields = ['targetAmount', 'currentAmount'];
export const sensitiveBudgetFields = ['amount'];