const crypto = require("crypto");
require("dotenv").config();

function encrypt(text, privateKey) {
  // Derive a key from the private key using SHA256
  const key = crypto.createHash("sha256").update(privateKey).digest();

  // Generate an initialization vector (IV)
  const iv = crypto.randomBytes(16);

  // Create a cipher using AES-256-CBC
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  // Encrypt the data
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Return the encrypted data as a base64 string
  return Buffer.concat([iv, encrypted]).toString("base64");
}

function decrypt(encryptedText, privateKey) {
  try {
    // Derive the key from the private key
    const key = crypto.createHash("sha256").update(privateKey).digest();

    // Get the IV from the encrypted data
    const encryptedBuffer = Buffer.from(encryptedText, "base64");
    const iv = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);

    // Create a decipher
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

    // Decrypt the data
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    throw new Error("Invalid License Key");
  }
}

const privateKey = process.env.ENCRIPTION_PRIVATE_KEY;

exports.encryptedData = (data) => encrypt(data, privateKey);

exports.decryptedData = (encryptedData) => decrypt(encryptedData, privateKey);
