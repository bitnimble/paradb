import bcrypt from 'bcrypt';

export const SALT_ROUNDS = 10;

export function createPassword(plaintext: string) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export function validatePassword(plaintext: string, hashed: string) {
  return bcrypt.compare(plaintext, hashed);
}
