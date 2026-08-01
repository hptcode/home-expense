// Password hashing with argon2id via @node-argon2 (native, the current gold
// standard — NOT hand-rolled crypto). Install: npm i @node-argon2
import argon2 from 'argon2';

export async function hashPassword(plain: string): Promise<string> {
  // argon2id, OWASP-ish params (memory 19 MiB, parallelism 1, iterations 2).
  return argon2.hash(plain, { type: argon2.argon2id, memoryCost: 19456, parallelism: 1, timeCost: 2 });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
