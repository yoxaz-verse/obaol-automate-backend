// src/utils/passwordUtils.ts

import bcrypt from "bcryptjs";

const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
