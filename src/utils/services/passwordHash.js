const bcrypt = require('bcrypt');
/**
 * The number of salt rounds to use for hashing passwords.
 */
const saltRounds = 10;

/**
 * Generates a hash for the given password using bcrypt.
 * @param {string} password - The password to generate a hash for.
 * @returns {string} - The hashed password.
 */
exports.generatePasswordHash = (password)=>{
    return bcrypt.hashSync(password, saltRounds);
}

/**
 * Compare a plain text password with a hashed password using bcrypt.
 * @param {string} password - The plain text password to compare.
 * @param {string} hashedPassword - The hashed password to compare against.
 * @returns {boolean} - True if the passwords match, false otherwise.
 */
exports.comparePassword = (password, hashedPassword)=>{
    return bcrypt.compareSync(password, hashedPassword);
}