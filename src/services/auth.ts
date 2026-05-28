import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRole } from "../models/types";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}
