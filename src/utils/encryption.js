const crypto = require('crypto');

const algorithm = 'aes-256-gcm';

const getEncryptionKey = () => {
    const key = process.env.WALLET_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('WALLET_ENCRYPTION_KEY is not defined in environment variables');
    }
    // Key must be 32 bytes (64 hex characters)
    return Buffer.from(key, 'hex');
};

const encrypt = (text) => {
    if (text === null || text === undefined) return text;
    
    // Ensure text is string
    const textString = String(text);
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 16 bytes IV for GCM
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(textString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

const decrypt = (encryptedText) => {
    if (!encryptedText) return encryptedText;
    
    // Check if it matches format iv:authTag:encryptedData
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        // Fallback for unencrypted data during migration or dev (optional)
        // If data is just a number string, return it? 
        // For strict security, we'll assume everything must be encrypted.
        // But for development robustness, if it's not encrypted, we might return it as is or throw.
        // Let's protect against crashing:
        return encryptedText; 
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
};

module.exports = {
    encrypt,
    decrypt
};
