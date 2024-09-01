import argon2 from "argon2";
import jwt from "jsonwebtoken";
import {
  JWT_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
} from "../config";
const secret_key: string = JWT_SECRET || "";
const expire_time: string = JWT_EXPIRE || "";
const refresh_secret_key: string = JWT_REFRESH_SECRET;
const refresh_expire_time: string = JWT_REFRESH_EXPIRE || "";
// Hash the password
export const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password);
};

// Verify the password
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await argon2.verify(hashedPassword, password);
};

// Create a token
export const createToken = (payload: object): string => {
  return jwt.sign(payload, secret_key, { expiresIn: expire_time });
};

// Verify a token
export const verifyToken = (
  token: string,
  name?: string
): object | string | boolean => {
  try {
    return jwt.verify(token, secret_key);
  } catch (err: any) {
    console.log(err);

    // if token is expired, return an error message
    if (err.name === "TokenExpiredError") {
      return false;
    }
    throw new Error("Invalid Token");
  }
};

// Create a refresh token
export const createRefreshToken = (payload: object): string => {
  return jwt.sign(payload, refresh_secret_key, {
    expiresIn: refresh_expire_time,
  });
};

// Verify a refresh token
export const verifyRefreshToken = (
  token: string
): object | string | boolean => {
  try {
    return jwt.verify(token, refresh_secret_key);
  } catch (err: any) {
    throw new Error("Invalid Token");
  }
};
